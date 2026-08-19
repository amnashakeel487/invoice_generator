/**
 * settings.js — Settings Tab
 */

async function loadSettings() {
  const s = await window.api.getSettings();
  document.getElementById('s-company-name').value    = s.company_name    || '';
  document.getElementById('s-company-address').value = s.company_address || '';
  document.getElementById('s-company-email').value   = s.company_email   || '';
  document.getElementById('s-company-phone').value   = s.company_phone   || '';
  document.getElementById('s-sales-coord').value     = s.sales_coordinator || '';
  document.getElementById('s-inv-prefix').value      = s.invoice_prefix  || 'PST-';
  document.getElementById('s-logo-path').value       = s.logo_path       || '';
  document.getElementById('s-stamp-path').value      = s.stamp_path      || '';
}

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const settings = {
    company_name:       document.getElementById('s-company-name').value.trim(),
    company_address:    document.getElementById('s-company-address').value.trim(),
    company_email:      document.getElementById('s-company-email').value.trim(),
    company_phone:      document.getElementById('s-company-phone').value.trim(),
    sales_coordinator:  document.getElementById('s-sales-coord').value.trim(),
    invoice_prefix:     document.getElementById('s-inv-prefix').value.trim() || 'PST-',
    logo_path:          document.getElementById('s-logo-path').value.trim(),
    stamp_path:         document.getElementById('s-stamp-path').value.trim(),
  };

  await window.api.saveSettings(settings);
  showToast('Settings saved!', 'success');
});

// File pickers
document.getElementById('btn-pick-logo').addEventListener('click', async () => {
  const filePath = await window.api.showOpenDialog({
    title: 'Select Company Logo',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
  });
  if (filePath) document.getElementById('s-logo-path').value = filePath;
});

document.getElementById('btn-pick-stamp').addEventListener('click', async () => {
  const filePath = await window.api.showOpenDialog({
    title: 'Select Stamp Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
  });
  if (filePath) document.getElementById('s-stamp-path').value = filePath;
});
