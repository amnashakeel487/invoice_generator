# Poultry Smart Traders — Electron Invoice Generator

A modern desktop application built with **Electron + HTML/CSS/JavaScript + PDFKit** for generating, archiving, and managing professional poultry sale invoices.

---

## Features

- ⚡ **Instant & Smooth**: GPU-accelerated CSS animations, instant startup, zero resize lag
- 📋 **Document Details Grid**: 2 rows × 3 columns (Invoice No, Ref #, Date, Order #, DC #, 2nd DC #)
- 🚚 **Delivery & Dispatch Cards**: Delivered To & Invoiced To (with "Same as delivered" toggle) + inline dispatch bar
- 📦 **Dynamic Line Items Table**: `+ Add Row`, real-time auto-calculation (Qty × Rate = Amount), unit-tolerant parser (`10kg`, `5 liter`)
- 🔢 **Pakistani Currency Converter**: Automatic Lac/Crore word formatting (*"One Lac Fifty One Thousand Five Hundred"*)
- 📄 **Pixel-Perfect PDF Generation**: Navy banner, 8-row table, totals box, circular stamp, Sales Coordinator signature (*"Dennis"*), and curved bottom wave ribbons
- 📜 **Invoice History**: Instant search, PDF viewer, re-generate / edit, and delete
- ⚙️ **Settings**: Company branding, logo/stamp picker, and invoice prefixes
- 💾 **Dual Storage Engine**: SQLite with zero-dependency fallback for 100% portable execution

---

## Getting Started

### 1. Run in Development Mode
```bash
cd electron_app
npm start
```

### 2. Build Standalone Windows Installer / EXE
```bash
npm run build
```
The installer will be generated in `electron_app/dist/`.

---

## File Structure

```
electron_app/
├── package.json               # Node & Electron metadata & build scripts
├── main.js                    # Main process (window creation & IPC handlers)
├── preload.js                 # Safe context bridge for IPC
├── assets/                    # Logo, stamp & icon images
├── src/
│   ├── renderer/
│   │   ├── index.html         # Application shell (sidebar & 3 tabs)
│   │   ├── style.css          # Dark-theme stylesheet & animations
│   │   ├── app.js             # Tab navigation router & toasts
│   │   ├── invoice.js         # Invoice form logic & calculations
│   │   ├── history.js         # Invoice history manager & search
│   │   └── settings.js        # Company settings manager
│   ├── db/
│   │   └── database.js        # SQLite + JSON persistent database
│   ├── pdf/
│   │   └── generator.js       # PDFKit-based exact reference generator
│   └── utils/
│       ├── num2words.js       # Pakistani Lac/Crore word converter
│       └── helpers.js         # Number formatters & string helpers
```
