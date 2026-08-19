/**
 * invoice.js — Create Invoice Tab Logic
 * Handles form state, live calculations, and PDF generation.
 */

// ── Helpers (inlined subset for renderer) ─────────────────────
function parseFloatSafely(val) {
  if (!val && val !== 0) return 0;
  const s = String(val).replace(/,/g, '').trim();
  const m = s.match(/[-+]?(?:\d+\.?\d*|\.\d+)/);
  return m ? parseFloat(m[0]) : 0;
}

function formatNum(n) {
  const f = parseFloatSafely(n);
  return f % 1 === 0 ? f.toLocaleString('en-PK') : f.toFixed(2);
}

function todayStr() {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

// ── DOM Refs ──────────────────────────────────────────────────
const invNo      = () => document.getElementById('inv-no');
const invHash    = () => document.getElementById('inv-hash');
const invDate    = () => document.getElementById('inv-date');
const invOrder   = () => document.getElementById('inv-order');
const invDc      = () => document.getElementById('inv-dc');
const invDc2     = () => document.getElementById('inv-dc2');
const delivName  = () => document.getElementById('deliv-name');
const delivAddr  = () => document.getElementById('deliv-addr');
const sameCheck  = () => document.getElementById('same-as-deliv');
const invName    = () => document.getElementById('inv-name');
const invAddr    = () => document.getElementById('inv-addr');
const dispInfo   = () => document.getElementById('dispatch-info');
const discountIn = () => document.getElementById('discount-val');
const salesCoord = () => document.getElementById('sales-coord');
const grossEl    = () => document.getElementById('gross-amt');
const invAmtEl   = () => document.getElementById('invoice-amt');
const dueEl      = () => document.getElementById('total-due');
const wordsEl    = () => document.getElementById('amount-words');
const rowsContEl = () => document.getElementById('rows-container');

// ── State ─────────────────────────────────────────────────────
let rowsData = [];
let debounceTimer = null;

// ── Calculations (debounced) ──────────────────────────────────
function scheduleRecalc() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(recalcTotals, 120);
}

function recalcTotals() {
  let gross = 0;
  rowsData.forEach(r => {
    const qty  = parseFloatSafely(r.qty.value);
    const rate = parseFloatSafely(r.rate.value);
    gross += qty * rate;
  });

  const disc   = parseFloatSafely(discountIn().value);
  const invAmt = Math.max(0, gross - disc);

  grossEl().textContent  = formatNum(gross);
  invAmtEl().textContent = formatNum(invAmt);
  dueEl().textContent    = formatNum(invAmt);
  wordsEl().textContent  = numToWordsPk(invAmt);
}

// ── Amount in Words (embedded) ────────────────────────────────
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function two(n) {
  if (!n) return '';
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n/10)] + (n%10 ? ' '+ONES[n%10] : '');
}
function three(n) {
  const h=Math.floor(n/100), r=n%100;
  return (h?ONES[h]+' Hundred ':'')+two(r);
}
function numToWordsPk(num) {
  num = parseFloat(num) || 0;
  if (num === 0) return 'Rupees Zero Only';
  const i   = Math.floor(num);
  const dec = Math.round((num - i) * 100);
  const arab  = Math.floor(i / 1e9);
  const crore = Math.floor((i % 1e9) / 1e7);
  const lac   = Math.floor((i % 1e7) / 1e5);
  const thou  = Math.floor((i % 1e5) / 1e3);
  const rest  = i % 1e3;
  const parts = [];
  if (arab)  parts.push(three(arab).trim()  + ' Arab');
  if (crore) parts.push(two(crore).trim()   + ' Crore');
  if (lac)   parts.push(two(lac).trim()     + ' Lac');
  if (thou)  parts.push(two(thou).trim()    + ' Thousand');
  if (rest)  parts.push(three(rest).trim());
  let w = 'Rupees ' + parts.join(' ');
  if (dec)   w += ` and ${two(dec).trim()} Paisas`;
  return w + ' Only';
}

// ── Add Row ───────────────────────────────────────────────────
function addItemRow(data = null) {
  const idx = rowsData.length;

  const row = document.createElement('div');
  row.className = 'table-row';

  const sno = document.createElement('div');
  sno.className = 'row-sno';
  sno.textContent = idx + 1;

  const mkInput = (placeholder, align = 'left', readonly = false) => {
    const el = document.createElement('input');
    el.className = 'field-input' + (readonly ? ' row-amount' : '');
    el.type = 'text';
    el.placeholder = placeholder;
    el.style.textAlign = align;
    if (readonly) el.readOnly = true;
    return el;
  };

  const name   = mkInput('Product name');
  const pack   = mkInput('e.g. 1kg');
  const qty    = mkInput('0', 'center');
  const bonus  = mkInput('0', 'center');
  const rate   = mkInput('0', 'right');
  const amount = mkInput('0.00', 'right', true);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.textContent = '✕';
  delBtn.title = 'Remove row';

  row.append(sno, name, pack, qty, bonus, rate, amount, delBtn);
  rowsContEl().appendChild(row);

  const rowObj = { el: row, sno, name, pack, qty, bonus, rate, amount };
  rowsData.push(rowObj);

  // Live amount for this row
  function updateRowAmt() {
    const a = parseFloatSafely(qty.value) * parseFloatSafely(rate.value);
    amount.value = formatNum(a);
    scheduleRecalc();
  }
  qty.addEventListener('input', updateRowAmt);
  rate.addEventListener('input', updateRowAmt);

  // Delete
  delBtn.addEventListener('click', () => {
    if (rowsData.length <= 1) { showToast('At least one row is required.', 'error'); return; }
    rowsData = rowsData.filter(r => r !== rowObj);
    row.remove();
    rowsData.forEach((r, i) => { r.sno.textContent = i + 1; });
    recalcTotals();
  });

  // Pre-fill if loading existing invoice
  if (data) {
    name.value   = data.product_name || '';
    pack.value   = data.packing      || '';
    qty.value    = String(data.qty   || '');
    bonus.value  = String(data.bonus || '');
    rate.value   = String(data.rate  || '');
    updateRowAmt();
  }

  return rowObj;
}

// ── Same-as-Delivered Toggle ──────────────────────────────────
function syncInvoiced() {
  if (sameCheck().checked) {
    invName().value   = delivName().value;
    invAddr().value   = delivAddr().value;
    invName().disabled = true;
    invAddr().disabled = true;
  }
}
function onSameToggle() {
  if (sameCheck().checked) {
    syncInvoiced();
  } else {
    invName().disabled = false;
    invAddr().disabled = false;
    invName().value = '';
    invAddr().value = '';
  }
}

sameCheck().addEventListener('change', onSameToggle);
delivName().addEventListener('input', syncInvoiced);
delivAddr().addEventListener('input', syncInvoiced);

// ── Reset Form ────────────────────────────────────────────────
async function resetForm() {
  rowsData.forEach(r => r.el.remove());
  rowsData = [];

  const nextNo = await window.api.getNextInvoiceNumber();
  const settings = await window.api.getSettings();

  invNo().value    = nextNo;
  invHash().value  = nextNo.replace(/^[A-Z]+-/, '');
  invDate().value  = todayStr();
  invOrder().value = '';
  invDc().value    = '';
  invDc2().value   = '';

  delivName().value = '';
  delivAddr().value = '';
  sameCheck().checked = true;
  onSameToggle();
  dispInfo().value = '';

  discountIn().value = '0';
  salesCoord().value = settings.sales_coordinator || 'Dennis';

  for (let i = 0; i < 3; i++) addItemRow();
  recalcTotals();
}

document.getElementById('btn-reset').addEventListener('click', resetForm);
document.getElementById('btn-add-row').addEventListener('click', () => addItemRow());
discountIn().addEventListener('input', scheduleRecalc);

// ── Generate PDF ──────────────────────────────────────────────
document.getElementById('btn-generate').addEventListener('click', async () => {
  const no   = invNo().value.trim();
  const date = invDate().value.trim();
  const cust = delivName().value.trim();

  if (!no)   { showToast('Please enter an Invoice No.', 'error'); invNo().focus(); return; }
  if (!date) { showToast('Please enter an Invoice Date.', 'error'); invDate().focus(); return; }
  if (!cust) { showToast('Please enter Customer Name.', 'error'); delivName().focus(); return; }

  const validItems = [];
  let gross = 0;

  for (let i = 0; i < rowsData.length; i++) {
    const r = rowsData[i];
    const pName = r.name.value.trim();
    if (!pName) continue;

    const qty  = parseFloatSafely(r.qty.value);
    const rate = parseFloatSafely(r.rate.value);

    if (qty <= 0) {
      showToast(`Row ${i+1}: Qty must be > 0`, 'error'); return;
    }

    const rowAmt = qty * rate;
    gross += rowAmt;

    validItems.push({
      s_no: validItems.length + 1,
      product_name: pName,
      packing:  r.pack.value.trim(),
      qty:      r.qty.value.trim() || String(qty),
      bonus:    r.bonus.value.trim() || '-',
      rate,
      amount: rowAmt,
    });
  }

  if (!validItems.length) {
    showToast('Please add at least one product row.', 'error'); return;
  }

  const disc   = parseFloatSafely(discountIn().value);
  const invAmt = Math.max(0, gross - disc);
  const words  = numToWordsPk(invAmt);

  const invoicedName = sameCheck().checked ? cust : (invName().value.trim() || cust);
  const invoicedAddr = sameCheck().checked
    ? delivAddr().value.trim()
    : (invAddr().value.trim() || delivAddr().value.trim());

  const savePath = await window.api.showSaveDialog({
    defaultName: `Invoice_${no.replace(/\//g, '_')}.pdf`,
  });
  if (!savePath) return;

  const invoiceData = {
    invoice_no:           no,
    invoice_hash:         invHash().value.trim(),
    dc_no:                invDc().value.trim(),
    dc_no_2:              invDc2().value.trim(),
    invoice_date:         date,
    order_no:             invOrder().value.trim(),
    delivered_to_name:    cust,
    delivered_to_address: delivAddr().value.trim(),
    invoiced_to_name:     invoicedName,
    invoiced_to_address:  invoicedAddr,
    dispatch_info:        dispInfo().value.trim(),
    items:                validItems,
    gross_amount:         gross,
    discount:             disc,
    invoice_amount:       invAmt,
    total_due:            invAmt,
    amount_in_words:      words,
    sales_coordinator:    salesCoord().value.trim(),
    pdf_path:             savePath,
  };

  const settings = await window.api.getSettings();
  const result   = await window.api.generatePdf({ invoiceData, settings, savePath });

  if (!result.success) {
    showToast(`PDF Error: ${result.error}`, 'error'); return;
  }

  await window.api.saveInvoice(invoiceData);
  showToast(`Invoice ${no} saved!`, 'success');

  if (confirm(`Invoice saved!\n\nOpen PDF now?\n${savePath}`)) {
    window.api.openFile(savePath);
  }

  await resetForm();
});

// Expose so history.js can call it
window.populateFromInvoice = async function(inv) {
  rowsData.forEach(r => r.el.remove());
  rowsData = [];

  invNo().value    = inv.invoice_no    || '';
  invHash().value  = inv.invoice_hash  || '';
  invDate().value  = inv.invoice_date  || '';
  invOrder().value = inv.order_no      || '';
  invDc().value    = inv.dc_no         || '';
  invDc2().value   = inv.dc_no_2       || '';

  delivName().value = inv.delivered_to_name    || '';
  delivAddr().value = inv.delivered_to_address || '';

  const isSame = !inv.invoiced_to_name || inv.invoiced_to_name === inv.delivered_to_name;
  sameCheck().checked = isSame;
  onSameToggle();
  if (!isSame) {
    invName().value = inv.invoiced_to_name    || '';
    invAddr().value = inv.invoiced_to_address || '';
  }

  dispInfo().value   = inv.dispatch_info     || '';
  discountIn().value = inv.discount          || '0';
  salesCoord().value = inv.sales_coordinator || '';

  (inv.items || []).forEach(item => addItemRow(item));
  if (!inv.items?.length) for (let i=0;i<3;i++) addItemRow();

  recalcTotals();
};

// ── Init ──────────────────────────────────────────────────────
resetForm();
