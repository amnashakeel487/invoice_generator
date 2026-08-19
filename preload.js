/**
 * Preload Script — Context Bridge
 * Safely exposes main-process IPC channels to the renderer via window.api
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Invoice
  getNextInvoiceNumber: ()         => ipcRenderer.invoke('get-next-invoice-number'),
  saveInvoice:          (data)     => ipcRenderer.invoke('save-invoice', data),
  getInvoices:          (query)    => ipcRenderer.invoke('get-invoices', query),
  deleteInvoice:        (id)       => ipcRenderer.invoke('delete-invoice', id),

  // Settings
  getSettings:          ()         => ipcRenderer.invoke('get-settings'),
  saveSettings:         (settings) => ipcRenderer.invoke('save-settings', settings),

  // PDF
  generatePdf:          (args)     => ipcRenderer.invoke('generate-pdf', args),
  showSaveDialog:       (args)     => ipcRenderer.invoke('show-save-dialog', args),
  showOpenDialog:       (args)     => ipcRenderer.invoke('show-open-dialog', args),
  openFile:             (filePath) => ipcRenderer.invoke('open-file', filePath),
  openFolder:           (filePath) => ipcRenderer.invoke('open-folder', filePath),
});
