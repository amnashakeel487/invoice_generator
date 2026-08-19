/**
 * history.js — Invoice History Tab
 */

async function refreshHistory() {
  const query = document.getElementById('history-search')?.value?.trim() || '';
  const list  = document.getElementById('history-list');
  if (!list) return;

  const invoices = await window.api.getInvoices(query);
  list.innerHTML = '';

  if (!invoices.length) {
    list.innerHTML = '<div class="empty-state">📋 No invoices found.</div>';
    return;
  }

  invoices.forEach(inv => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const amount = parseFloat(inv.invoice_amount || 0).toLocaleString('en-PK');

    card.innerHTML = `
      <div class="history-info">
        <div class="history-inv-no">${inv.invoice_no}</div>
        <div class="history-meta">
          👤 ${inv.delivered_to_name || '—'} &nbsp;|&nbsp;
          📅 ${inv.invoice_date || '—'} &nbsp;|&nbsp;
          #${inv.invoice_hash || '—'}
        </div>
      </div>
      <div>
        <div class="history-amount">PKR ${amount}</div>
        <div class="history-date">${inv.created_at ? inv.created_at.slice(0,10) : ''}</div>
      </div>
      <div class="history-actions">
        ${inv.pdf_path ? `<button class="btn-icon" title="Open PDF" data-action="open" data-path="${inv.pdf_path}">📄</button>` : ''}
        <button class="btn-icon" title="Edit / Re-generate" data-action="edit" data-id="${inv.id}">✏️</button>
        <button class="btn-icon danger" title="Delete" data-action="delete" data-id="${inv.id}">🗑️</button>
      </div>
    `;

    // Action handlers
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;

        if (action === 'open') {
          window.api.openFile(btn.dataset.path);

        } else if (action === 'edit') {
          const all = await window.api.getInvoices('');
          const target = all.find(i => i.id === parseInt(btn.dataset.id));
          if (target && typeof window.populateFromInvoice === 'function') {
            await window.populateFromInvoice(target);
            showTab('invoice');
          }

        } else if (action === 'delete') {
          if (!confirmAction(`Delete invoice ${inv.invoice_no}?`)) return;
          await window.api.deleteInvoice(parseInt(btn.dataset.id));
          showToast(`Invoice ${inv.invoice_no} deleted.`, 'success');
          refreshHistory();
        }
      });
    });

    list.appendChild(card);
  });
}

// Search with debounce
let histSearchTimer = null;
document.getElementById('history-search')?.addEventListener('input', () => {
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(refreshHistory, 250);
});
