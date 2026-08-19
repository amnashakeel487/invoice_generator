/**
 * Poultry Smart Traders — Electron Main Process
 * Manages BrowserWindow, IPC handlers for DB, PDF, and file operations.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Paths ────────────────────────────────────────────────────────
const USER_DATA = app.getPath('userData');
const DB_PATH   = path.join(USER_DATA, 'invoices.db');
const PDF_DIR   = path.join(USER_DATA, 'generated_invoices');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// ── Lazy-load DB & PDF (after app ready) ─────────────────────────
let db, pdfGenerator;

function loadModules() {
  const Database = require(path.join(__dirname, 'src', 'db', 'database.js'));
  db = new Database(DB_PATH);
  pdfGenerator = require(path.join(__dirname, 'src', 'pdf', 'generator.js'));
}

// ── Window ───────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#12141a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Show window gracefully after paint
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  loadModules();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ─────────────────────────────────────────────────

// Invoice CRUD
ipcMain.handle('get-next-invoice-number', () => db.getNextInvoiceNumber());
ipcMain.handle('save-invoice', (_, data) => db.saveInvoice(data));
ipcMain.handle('get-invoices', (_, query) => db.getInvoices(query));
ipcMain.handle('delete-invoice', (_, id) => db.deleteInvoice(id));

// Settings
ipcMain.handle('get-settings', () => db.getSettings());
ipcMain.handle('save-settings', (_, settings) => db.saveSettings(settings));

// PDF Generation
ipcMain.handle('generate-pdf', async (_, { invoiceData, settings, savePath }) => {
  try {
    await pdfGenerator.generate(invoiceData, settings, savePath);
    return { success: true, path: savePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// File dialogs
ipcMain.handle('show-save-dialog', async (_, { defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Invoice PDF',
    defaultPath: path.join(PDF_DIR, defaultName),
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
  });
  return result.filePath || null;
});

ipcMain.handle('show-open-dialog', async (_, { title, filters }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title,
    filters,
    properties: ['openFile'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('open-file', (_, filePath) => {
  shell.openPath(filePath);
  return true;
});

ipcMain.handle('open-folder', (_, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});
