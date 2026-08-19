/**
 * PDF Generator — PDFKit
 * Generates pixel-perfect A4 Sale Invoice matching the reference document.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { numberToWordsPk } = require('../utils/num2words');

const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');

// Colors
const C_NAVY  = '#0d1b4c';
const C_RED   = '#c62828';
const C_BLUE  = '#1a3b8b';
const C_BLACK = '#111111';

async function generate(invoiceData, settings = {}, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const PW = doc.page.width;   // 595.28
      const PH = doc.page.height;  // 841.89
      const MX = 24;               // horizontal margin
      const CW = PW - 2 * MX;     // content width ~547.28

      // ── 1. Header ──────────────────────────────────────────────
      const logoFile = settings.logo_path || path.join(ASSETS_DIR, 'logo.png');
      if (fs.existsSync(logoFile)) {
        doc.image(logoFile, MX, 18, { width: 175, height: 54 });
      }

      const companyName = (settings.company_name || 'POULTRY SMART TRADERS').toUpperCase();
      const address     = settings.company_address || '23-A Gulshan Iqbal Alla Din Park, Karachi (Pak.)';
      const email       = settings.company_email   || 'poultrysmarttraders01@gmail.com';

      const rightCX = MX + 185 + (CW - 185) / 2;
      doc.font('Helvetica-Bold').fontSize(23).fillColor(C_NAVY)
         .text(companyName, MX + 190, 20, { width: CW - 190, align: 'center' });

      doc.moveTo(MX + 195, 47).lineTo(MX + 225, 47).strokeColor(C_RED).lineWidth(1.8).stroke();
      doc.moveTo(MX + 225, 47).lineTo(MX + CW - 10, 47).strokeColor(C_NAVY).stroke();

      doc.font('Helvetica').fontSize(9).fillColor(C_BLACK)
         .text(address, MX + 190, 51, { width: CW - 190, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C_RED)
         .text(`\u2709  ${email}`, MX + 190, 63, { width: CW - 190, align: 'center' });

      // ── 2. SALE INVOICE Banner ─────────────────────────────────
      const bannerY = 82;
      doc.rect(MX, bannerY, CW, 20).fillColor(C_NAVY).fill();
      doc.font('Helvetica-Bold').fontSize(12.5).fillColor('white')
         .text('SALE INVOICE', MX, bannerY + 5.5, { width: CW, align: 'center' });

      // ── 3. Info Grid ───────────────────────────────────────────
      const gridTop = bannerY + 20;
      const gridH   = 104;
      const gridBot = gridTop + gridH;
      const c1W = 145, c2W = 145, c3W = CW - 290;

      doc.rect(MX, gridTop, CW, gridH).strokeColor(C_BLACK).lineWidth(0.8).stroke();

      // Row 1
      const r1Y = gridTop + 20;
      doc.moveTo(MX, r1Y).lineTo(MX + CW, r1Y).stroke();
      doc.moveTo(MX + c1W, gridTop).lineTo(MX + c1W, r1Y).stroke();
      doc.moveTo(MX + c1W + c2W, gridTop).lineTo(MX + c1W + c2W, r1Y).stroke();

      _labelVal(doc, MX + 6, gridTop + 6, 'No:', invoiceData.invoice_no || '', 52);
      _labelVal(doc, MX + c1W + 6, gridTop + 6, 'Invoice #:', invoiceData.invoice_hash || '', 62);
      _labelVal(doc, MX + c1W + c2W + 6, gridTop + 6, 'DC#:', invoiceData.dc_no || '', 38);

      // Row 2
      const r2Y = r1Y + 20;
      doc.moveTo(MX, r2Y).lineTo(MX + CW, r2Y).stroke();
      doc.moveTo(MX + c1W, r1Y).lineTo(MX + c1W, r2Y).stroke();
      doc.moveTo(MX + c1W + c2W, r1Y).lineTo(MX + c1W + c2W, r2Y).stroke();

      _labelVal(doc, MX + 6, r1Y + 6, 'Date:', invoiceData.invoice_date || '', 38);
      _labelVal(doc, MX + c1W + 6, r1Y + 6, 'Order #:', invoiceData.order_no || '', 62);
      _labelVal(doc, MX + c1W + c2W + 6, r1Y + 6, 'DC#:', invoiceData.dc_no_2 || '', 38);

      // Row 3+4 — Delivered To / Invoiced To
      const delivW = CW * 0.63;
      doc.moveTo(MX + delivW, r2Y).lineTo(MX + delivW, gridBot).stroke();

      const midDelivY = r2Y + 32;
      doc.moveTo(MX, midDelivY).lineTo(MX + delivW, midDelivY).stroke();

      _labelVal(doc, MX + 6, r2Y + 7, 'Delivered To:', invoiceData.delivered_to_name || '', 68);
      _labelVal(doc, MX + 6, midDelivY + 7, 'Address:', invoiceData.delivered_to_address || '', 54);

      const invToName = invoiceData.invoiced_to_name;
      const invDisplay = (!invToName || invToName === invoiceData.delivered_to_name) ? 'Same' : invToName;
      _labelVal(doc, MX + delivW + 6, r2Y + 7, 'Invoiced To:', invDisplay, 64);

      // ── 4. Dispatch Box ─────────────────────────────────────────
      const dispY = gridBot;
      doc.rect(MX, dispY, CW, 20).strokeColor(C_BLACK).lineWidth(0.8).stroke();
      doc.moveTo(MX + 108, dispY).lineTo(MX + 108, dispY + 20).stroke();
      doc.font('Helvetica').fontSize(9).fillColor(C_BLACK)
         .text('Dispatch Information:', MX + 6, dispY + 6);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C_BLUE)
         .text(invoiceData.dispatch_info || '', MX + 115, dispY + 6, { width: CW - 120 });

      // ── 5. Line Items Table ─────────────────────────────────────
      const tblTop = dispY + 20;
      const colW   = [32, 185, 58, 56, 56, 78, 82.28];
      const hdrs   = ['S No', 'Name of Product', 'Packing', 'Qty', 'Bonus', 'Unit Rate\n(Rs.)', 'Amount (Rs.)'];
      const hdrH   = 22, rowH = 20, totalRows = 8;
      const tblH   = hdrH + totalRows * rowH;
      const tblBot = tblTop + tblH;

      // Navy header bg
      doc.rect(MX, tblTop, CW, hdrH).fillColor(C_NAVY).fill();

      // Header titles
      doc.fillColor('white').font('Helvetica-Bold').fontSize(8.5);
      let cx = MX;
      hdrs.forEach((title, i) => {
        const cxCenter = cx + colW[i] / 2;
        if (title.includes('\n')) {
          const [l1, l2] = title.split('\n');
          doc.text(l1, cx, tblTop + 4, { width: colW[i], align: 'center', lineBreak: false });
          doc.text(l2, cx, tblTop + 12, { width: colW[i], align: 'center', lineBreak: false });
        } else {
          doc.text(title, cx, tblTop + 7, { width: colW[i], align: 'center', lineBreak: false });
        }
        cx += colW[i];
      });

      // 8 Data rows
      const items = invoiceData.items || [];
      for (let r = 0; r < totalRows; r++) {
        const rowY = tblTop + hdrH + r * rowH;
        const item = items[r];

        // S No
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C_BLACK)
           .text(`${r + 1}`, MX, rowY + 5.5, { width: colW[0], align: 'center', lineBreak: false });

        if (item) {
          const rateStr   = _numStr(item.rate);
          const amountStr = _numStr(item.amount);

          let x = MX + colW[0];
          doc.font('Helvetica-Bold').fontSize(10).fillColor(C_BLUE);
          doc.text(String(item.product_name || '').substring(0, 35), x + 5, rowY + 5.5, { lineBreak: false });
          x += colW[1];
          doc.text(String(item.packing || ''), x, rowY + 5.5, { width: colW[2], align: 'center', lineBreak: false });
          x += colW[2];
          doc.text(String(item.qty || ''), x, rowY + 5.5, { width: colW[3], align: 'center', lineBreak: false });
          x += colW[3];
          const bonus = String(item.bonus || '');
          doc.text(['0','0.0','-',''].includes(bonus) ? '' : bonus, x, rowY + 5.5, { width: colW[4], align: 'center', lineBreak: false });
          x += colW[4];
          doc.text(rateStr, x, rowY + 5.5, { width: colW[5], align: 'center', lineBreak: false });
          x += colW[5];
          doc.text(amountStr, x, rowY + 5.5, { width: colW[6], align: 'center', lineBreak: false });
        }
      }

      // Table borders
      doc.strokeColor(C_BLACK).lineWidth(0.8);
      doc.rect(MX, tblTop, CW, tblH).stroke();
      for (let r = 0; r <= totalRows; r++) {
        const ly = tblTop + hdrH + r * rowH;
        doc.moveTo(MX, ly).lineTo(MX + CW, ly).stroke();
      }
      let vx = MX;
      colW.slice(0, -1).forEach(w => { vx += w; doc.moveTo(vx, tblTop).lineTo(vx, tblBot).stroke(); });

      // ── 6. Footer ───────────────────────────────────────────────
      const ftTop  = tblBot;
      const totW   = 230;
      const leftW  = CW - totW;
      const totX   = MX + leftW;

      const gross  = parseFloat(invoiceData.gross_amount || 0);
      const disc   = parseFloat(invoiceData.discount || 0);
      const invAmt = parseFloat(invoiceData.invoice_amount || gross - disc);
      const due    = parseFloat(invoiceData.total_due || invAmt);

      // Totals table (4 rows)
      const totRows = [
        ['Gross Amount :', _numStr(gross), false],
        ['Discount:',      disc > 0 ? _numStr(disc) : '', false],
        ['Invoice Amount:', _numStr(invAmt), true],
        ['Total Due:',     _numStr(due), false],
      ];
      const tRowH = 20;

      totRows.forEach(([lbl, val, hi], idx) => {
        const ry = ftTop + idx * tRowH;
        if (hi) {
          doc.rect(totX, ry, totW, tRowH).fillColor(C_NAVY).fill();
          doc.font('Helvetica-Bold').fontSize(10).fillColor('white');
        } else {
          doc.font('Helvetica').fontSize(9.5).fillColor(C_BLACK);
        }
        doc.text(lbl, totX + 8, ry + 6, { lineBreak: false });
        if (hi) {
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor('white');
        } else {
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C_BLUE);
        }
        doc.text(val, totX + 110, ry + 6, { width: totW - 115, align: 'right', lineBreak: false });
      });

      // Totals grid lines
      doc.strokeColor(C_BLACK).lineWidth(0.8);
      doc.rect(totX, ftTop, totW, tRowH * 4).stroke();
      doc.moveTo(totX + 110, ftTop).lineTo(totX + 110, ftTop + tRowH * 4).stroke();
      for (let i = 1; i < 4; i++) {
        doc.moveTo(totX, ftTop + i * tRowH).lineTo(totX + totW, ftTop + i * tRowH).stroke();
      }

      // Amount in words
      const rawWords = invoiceData.amount_in_words || numberToWordsPk(invAmt);
      const cleanWords = rawWords.replace(/^Rupees /, '').replace(/ Only$/, '');
      doc.font('Helvetica').fontSize(10).fillColor(C_BLACK)
         .text('Rupees:', MX + 6, ftTop + 8, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C_BLACK)
         .text(cleanWords, MX + 52, ftTop + 8, { width: leftW - 58, lineBreak: true });

      // Stamp
      const stampFile = settings.stamp_path || path.join(ASSETS_DIR, 'stamp.png');
      if (fs.existsSync(stampFile)) {
        doc.image(stampFile, MX + 240, ftTop + tRowH * 4 + 5, { width: 78, height: 78 });
      }

      // Signature
      const sigY  = ftTop + tRowH * 4 + 10;
      const sigCX = totX + totW / 2;
      doc.font('Times-Italic').fontSize(24).fillColor(C_NAVY)
         .text(settings.sales_coordinator || 'Dennis', totX, sigY + 8, { width: totW, align: 'center', lineBreak: false });
      doc.strokeColor(C_BLACK).lineWidth(0.8)
         .moveTo(totX + 15, sigY + 36).lineTo(totX + totW - 15, sigY + 36).stroke();
      doc.font('Helvetica').fontSize(9.5).fillColor(C_BLACK)
         .text('Sales Coordinator', totX, sigY + 40, { width: totW, align: 'center', lineBreak: false });

      // ── 7. Bottom Waves ─────────────────────────────────────────
      doc.save();
      doc.fillColor(C_NAVY)
         .moveTo(0, PH).lineTo(0, PH - 36)
         .bezierCurveTo(80, PH - 52, 220, PH - 10, PW * 0.65, PH - 2)
         .lineTo(PW * 0.65, PH).closePath().fill();
      doc.fillColor(C_RED)
         .moveTo(0, PH - 36)
         .bezierCurveTo(80, PH - 52, 220, PH - 10, PW * 0.65, PH - 2)
         .lineTo(PW * 0.62, PH - 5)
         .bezierCurveTo(210, PH - 18, 75, PH - 62, 0, PH - 48)
         .closePath().fill();
      doc.restore();

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

function _labelVal(doc, x, y, label, val, labelW) {
  doc.font('Helvetica').fontSize(9.5).fillColor(C_BLACK).text(label, x, y, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C_BLUE).text(String(val), x + labelW, y, { lineBreak: false });
}

function _numStr(n) {
  const f = parseFloat(n) || 0;
  return f % 1 === 0 ? String(f) : f.toFixed(2);
}

module.exports = { generate };
