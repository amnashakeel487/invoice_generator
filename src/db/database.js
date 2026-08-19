/**
 * Database Module
 * Uses SQLite (better-sqlite3) when native binary is loaded,
 * with automatic fallback to JSON-file storage for 100% portable zero-dependency operation.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  company_name: 'POULTRY SMART TRADERS',
  company_address: '23-A Gulshan Iqbal Alla Din Park, Karachi (Pak.)',
  company_email: 'poultrysmarttraders01@gmail.com',
  company_phone: '',
  sales_coordinator: 'Dennis',
  invoice_prefix: 'PST-',
  logo_path: '',
  stamp_path: '',
};

class AppDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.jsonPath = dbPath.replace(/\.db$/, '.json');
    this.mode = 'json';
    this._sqlite = null;

    // Try better-sqlite3
    try {
      const Database = require('better-sqlite3');
      this._sqlite = new Database(dbPath);
      this._sqlite.pragma('journal_mode = WAL');
      this._initSqlite();
      this.mode = 'sqlite';
      console.log('Using SQLite (better-sqlite3) backend.');
    } catch (e) {
      console.log('Using JSON storage backend (zero-native fallback).');
      this.mode = 'json';
      this._initJson();
    }
  }

  // -------------------------------------------------------------
  // SQLITE IMPLEMENTATION
  // -------------------------------------------------------------
  _initSqlite() {
    this._sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no       TEXT NOT NULL,
        invoice_hash     TEXT,
        dc_no            TEXT,
        dc_no_2          TEXT,
        invoice_date     TEXT,
        order_no         TEXT,
        delivered_to_name    TEXT,
        delivered_to_address TEXT,
        invoiced_to_name     TEXT,
        invoiced_to_address  TEXT,
        dispatch_info    TEXT,
        items_json       TEXT,
        gross_amount     REAL DEFAULT 0,
        discount         REAL DEFAULT 0,
        invoice_amount   REAL DEFAULT 0,
        total_due        REAL DEFAULT 0,
        amount_in_words  TEXT,
        sales_coordinator TEXT,
        pdf_path         TEXT,
        created_at       TEXT DEFAULT (datetime('now','localtime'))
      );
    `);

    const insert = this._sqlite.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run(k, v);
    }
  }

  // -------------------------------------------------------------
  // JSON FALLBACK IMPLEMENTATION
  // -------------------------------------------------------------
  _initJson() {
    if (!fs.existsSync(this.jsonPath)) {
      const initial = {
        settings: { ...DEFAULT_SETTINGS },
        invoices: [],
        next_id: 1,
      };
      fs.writeFileSync(this.jsonPath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  _readJson() {
    try {
      const content = fs.readFileSync(this.jsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { settings: { ...DEFAULT_SETTINGS }, invoices: [], next_id: 1 };
    }
  }

  _writeJson(data) {
    fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // -------------------------------------------------------------
  // PUBLIC API (Common to both backends)
  // -------------------------------------------------------------

  getSettings() {
    if (this.mode === 'sqlite') {
      const rows = this._sqlite.prepare('SELECT key, value FROM settings').all();
      return Object.fromEntries(rows.map(r => [r.key, r.value]));
    }
    const data = this._readJson();
    return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  }

  saveSettings(settings) {
    if (this.mode === 'sqlite') {
      const upsert = this._sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const transaction = this._sqlite.transaction((obj) => {
        for (const [k, v] of Object.entries(obj)) upsert.run(k, v ?? '');
      });
      transaction(settings);
      return true;
    }
    const data = this._readJson();
    data.settings = { ...data.settings, ...settings };
    this._writeJson(data);
    return true;
  }

  getNextInvoiceNumber() {
    const settings = this.getSettings();
    const prefix = settings.invoice_prefix || 'PST-';

    if (this.mode === 'sqlite') {
      const row = this._sqlite.prepare('SELECT invoice_no FROM invoices ORDER BY id DESC LIMIT 1').get();
      if (!row) return `${prefix}1001`;
      const last = row.invoice_no.replace(prefix, '');
      const num = parseInt(last, 10);
      return `${prefix}${isNaN(num) ? 1001 : num + 1}`;
    }

    const data = this._readJson();
    if (!data.invoices || !data.invoices.length) return `${prefix}1001`;
    const lastInv = data.invoices[data.invoices.length - 1];
    const last = (lastInv.invoice_no || '').replace(prefix, '');
    const num = parseInt(last, 10);
    return `${prefix}${isNaN(num) ? 1001 : num + 1}`;
  }

  saveInvoice(invoiceData) {
    if (this.mode === 'sqlite') {
      const stmt = this._sqlite.prepare(`
        INSERT INTO invoices (
          invoice_no, invoice_hash, dc_no, dc_no_2, invoice_date, order_no,
          delivered_to_name, delivered_to_address, invoiced_to_name, invoiced_to_address,
          dispatch_info, items_json, gross_amount, discount, invoice_amount,
          total_due, amount_in_words, sales_coordinator, pdf_path
        ) VALUES (
          @invoice_no, @invoice_hash, @dc_no, @dc_no_2, @invoice_date, @order_no,
          @delivered_to_name, @delivered_to_address, @invoiced_to_name, @invoiced_to_address,
          @dispatch_info, @items_json, @gross_amount, @discount, @invoice_amount,
          @total_due, @amount_in_words, @sales_coordinator, @pdf_path
        )
      `);
      const result = stmt.run({
        ...invoiceData,
        items_json: JSON.stringify(invoiceData.items || []),
      });
      return { id: result.lastInsertRowid };
    }

    const data = this._readJson();
    const id = data.next_id || (data.invoices.length + 1);
    data.next_id = id + 1;

    const record = {
      id,
      ...invoiceData,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    data.invoices.push(record);
    this._writeJson(data);
    return { id };
  }

  getInvoices(query = '') {
    if (this.mode === 'sqlite') {
      let sql = 'SELECT * FROM invoices';
      const params = [];
      if (query) {
        sql += ` WHERE invoice_no LIKE ? OR delivered_to_name LIKE ?
                 OR invoice_date LIKE ? OR invoice_hash LIKE ?`;
        const q = `%${query}%`;
        params.push(q, q, q, q);
      }
      sql += ' ORDER BY id DESC';
      const rows = this._sqlite.prepare(sql).all(...params);
      return rows.map(r => ({
        ...r,
        items: JSON.parse(r.items_json || '[]'),
      }));
    }

    const data = this._readJson();
    let list = [...(data.invoices || [])];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(inv =>
        (inv.invoice_no || '').toLowerCase().includes(q) ||
        (inv.delivered_to_name || '').toLowerCase().includes(q) ||
        (inv.invoice_date || '').toLowerCase().includes(q) ||
        (inv.invoice_hash || '').toLowerCase().includes(q)
      );
    }
    list.reverse();
    return list;
  }

  deleteInvoice(id) {
    if (this.mode === 'sqlite') {
      this._sqlite.prepare('DELETE FROM invoices WHERE id = ?').run(id);
      return true;
    }

    const data = this._readJson();
    data.invoices = (data.invoices || []).filter(i => i.id !== id);
    this._writeJson(data);
    return true;
  }
}

module.exports = AppDatabase;
