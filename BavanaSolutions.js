document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = e => {if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.ctrlKey && e.keyCode === 85)) return false;};
const CONFIG = {WEBAPP_URL: "https://script.google.com/macros/s/AKfycbzw5bNEiDcGcG1IgoUwwaUT755rI9GBNVEKY7pMH5cBpEw1KxT_nGD89e7ZrRMerV2k/exec"};
const HARNATH_PASSWORD = 'harnath@bavana';
let currentUser = null;
let selectedLoginRole = null;
function selectRole(role) {
  selectedLoginRole = role;
  document.getElementById('role-staff').classList.toggle('selected', role === 'staff');
  document.getElementById('role-harnath').classList.toggle('selected', role === 'harnath');
  const pwSection = document.getElementById('login-password-section');
  pwSection.style.display = role === 'harnath' ? 'block' : 'none';
  document.getElementById('login-error').textContent = '';
  if (role === 'harnath') setTimeout(() => document.getElementById('login-pass-input').focus(), 50);
}
function doLogin() {
  if (!selectedLoginRole) {
    const err = document.getElementById('login-error');
    err.style.textAlign = 'center';
    err.style.display = 'block';
    err.textContent = 'Please select a role to continue.';
    return;
  }
  if (selectedLoginRole === 'harnath') {
    const pwd = document.getElementById('login-pass-input').value;
    if (pwd !== HARNATH_PASSWORD) {
      document.getElementById('login-error').textContent = '✗ Incorrect password. Please try again.';
      document.getElementById('login-pass-input').value = '';
      document.getElementById('login-pass-input').focus();
      return;
    }
    currentUser = 'harnath';
  } else {
    currentUser = 'staff';
  }
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('user-chip-label').textContent = currentUser === 'harnath' ? '🔐 Harnath' : 'Staff';
  document.getElementById('user-chip').title = 'Signed in as ' + (currentUser === 'harnath' ? 'Harnath (Admin)' : 'Staff') + ' — Click to log out';
  loadAllData();
  applyDeletePermissions();
}
function logoutUser() {
  if (!confirm('Sign out and return to login screen?')) return;
  currentUser = null;
  selectedLoginRole = null;
  document.getElementById('role-staff').classList.remove('selected');
  document.getElementById('role-harnath').classList.remove('selected');
  document.getElementById('login-password-section').style.display = 'none';
  document.getElementById('login-pass-input').value = '';
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-overlay').style.display = 'flex';
}
function canDelete() {
  return currentUser === 'harnath';
}
function applyDeletePermissions() {
  document.querySelectorAll('.delete-gated').forEach(el => {
    el.style.display = canDelete() ? '' : 'none';
  });
}
function validateGSTIN(gstin) {
  if (!gstin) return true;
  const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/;
  return gstinRegex.test(gstin.trim().toUpperCase());
}
function validatePhone(phone) {
  if (!phone) return true;
  const digits = phone.trim().replace(/^(\+91|91|0)/, '').replace(/\D/g, '');
  return digits.length === 10;
}
function showFieldError(inputId, message) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.15)';
  el.addEventListener('input', () => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, { once: true });
  showToast(message, 'error');
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function todayDMY() { return toDMY(new Date());}
function toDMY(d) {
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
function parseDMY(str) {
  if (!str) return null;
  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return new Date(+y, +m - 1, +d);
  }
  // New numeric format: DD-MM-YYYY
  const numMatch = str.match(/^(\d{1,2})-(\d{2})-(\d{4})$/);
  if (numMatch) {
    const d = +numMatch[1], m = +numMatch[2], y = +numMatch[3];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d);
  }
  // Legacy format: DD-MMM-YYYY (backward compat for old stored data)
  const m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const mi = MONTHS.findIndex(x => x.toLowerCase() === m[2].toLowerCase());
  if (mi < 0) return null;
  return new Date(+m[3], mi, +m[1]);
}
function isValidDMY(str) {
  return parseDMY(str) !== null;
}
function formatDateInput(input) {
  let v = input.value.replace(/[^0-9\-]/g, '');
  input.value = v;
  if (v.length === 10) {
    input.style.borderColor = isValidDMY(v) ? 'var(--green)' : 'var(--red)';
  } else {
    input.style.borderColor = '';
  }
}
function addDays(dmyStr, n) {
  const d = parseDMY(dmyStr);
  if (!d) return dmyStr;
  d.setDate(d.getDate() + n);
  return toDMY(d);
}
function migrateDateField(val) {
  if (!val) return '';
  // Already DD-MM-YYYY numeric format
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  // Try parseDMY first (handles ISO YYYY-MM-DD and legacy DD-MMM-YYYY)
  const d = parseDMY(val);
  if (d && !isNaN(d)) return toDMY(d);
  // Fallback: try native Date parsing (handles JS Date.toString() like 'Wed Apr 22 2026 ...')
  const nd = new Date(val);
  if (!isNaN(nd)) return toDMY(nd);
  return val;
}
let DB = {
  purchases: [],
  invoices: [],
  items: [],
  suppliers: [],
  customers: [],
  settings: {}
};
let isSyncing = false;
let lastSyncTime = null;
async function sheetsAPI(action, sheet, data = null) {
  setSyncState('syncing');
  const url = new URL(CONFIG.WEBAPP_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('sheet', sheet);
  const opts = { method: 'GET' };
  if (data) {
    opts.method = 'POST';
    opts.body = JSON.stringify(data);
    opts.headers = { 'Content-Type': 'text/plain' };
  }
  try {
    const res  = await fetch(url.toString(), opts);
    const json = await res.json();
    if (json.success === false) throw new Error(json.error || 'API error');
    setSyncState('ok');
    lastSyncTime = new Date();
    return json;
  } catch (e) {
    setSyncState('error');
    throw e;
  }
}
async function readSheet(sheet)          { return (await sheetsAPI('read',   sheet)).data || []; }
async function appendRow(sheet, row)     { return await sheetsAPI('append',  sheet, { row }); }
async function updateRow(sheet, id, row) { return await sheetsAPI('update',  sheet, { id, row }); }
async function deleteRow(sheet, id)      { return await sheetsAPI('delete',  sheet, { id }); }
function setSyncState(state) {
  const dot    = document.getElementById('sync-dot');
  const label  = document.getElementById('sync-label');
  const gsDot  = document.getElementById('gs-dot');
  const gsText = document.getElementById('gs-status-text');
  if (state === 'syncing') {
    dot.className = 'sync-dot syncing'; label.textContent = 'Syncing…';
    gsDot.style.background = 'var(--gold)'; gsText.textContent = 'Syncing…';
  } else if (state === 'ok') {
    dot.className = 'sync-dot'; label.textContent = 'Synced';
    gsDot.style.background = 'var(--green)'; gsText.textContent = 'Connected';
  } else {
    dot.className = 'sync-dot error'; label.textContent = 'Offline';
    gsDot.style.background = 'var(--red)'; gsText.textContent = 'Error';
  }
}
async function loadAllData() {
  const overlay = document.getElementById('loading-overlay');
  const msg     = document.getElementById('loading-msg');
  overlay.style.display = 'flex';
  try {
    const sheets = ['suppliers','customers','items','purchases','invoices','settings'];
    for (const s of sheets) {
      msg.textContent = `Loading ${s}…`;
      try {
        const data = await readSheet(s);
        if (s === 'settings') {
          DB.settings = data[0] || {};
          applySettings();
        } else {
          DB[s] = data;
        }
      } catch(e) {
        console.warn('Could not load', s, e.message);
      }
    }
    renderAll();
    overlay.style.display = 'none';
    showToast('Data loaded from Google Sheets ✓', 'success');
  } catch(e) {
    overlay.style.display = 'none';
    showToast('Could not connect to Google Sheets. Check your Web App URL.', 'error');
    setSyncState('error');
  }
}
async function refreshAllData() {
  showToast('Refreshing from Google Sheets…', 'info');
  await loadAllData();
}
function renderAll() {
  renderPurchases();
  renderInvoices();
  renderItems();
  renderSuppliers();
  renderCustomers();
  updateDashboard();
  updateGSTSummary();
  populateDropdowns();
  applyDeletePermissions();
}
function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', purchases: 'Purchases', invoices: 'Tax Invoices',
    inventory: 'Inventory', suppliers: 'Suppliers', customers: 'Customers',
    gst: 'GST Summary', reports: 'Reports', settings: 'Company Setup'
  };
  document.getElementById('page-title').innerHTML =
    (titles[id] || id) + ' <span>' + (id === 'dashboard' ? 'Overview' : id === 'gst' ? 'GSTR View' : '') + '</span>';
}
function handleTopAction() { openNewInvoice(); }
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerText = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
function filterTable(tbodyId, value) {
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  value = value.toLowerCase();
  rows.forEach(r => { r.style.display = r.innerText.toLowerCase().includes(value) ? '' : 'none'; });
}
function updateDashboard() {
  const totalRevenue   = DB.invoices.reduce((s, i) => s + parseFloat(i.total  || 0), 0);
  const totalPurchases = DB.purchases.reduce((s, p) => s + parseFloat(p.total  || 0), 0);
  const outputGST      = DB.invoices.reduce((s, i) => s + parseFloat(i.gst    || 0), 0);
  const inputGST       = DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt|| 0), 0);
  const lowStock       = DB.items.filter(i => parseFloat(i.stock || 0) <= parseFloat(i.minStock || 0)).length;
  fmt(document.getElementById('stat-revenue'),       totalRevenue);
  fmt(document.getElementById('stat-purchases'),     totalPurchases);
  fmt(document.getElementById('stat-gst-collected'), outputGST);
  document.getElementById('stat-items').textContent     = DB.items.length;
  document.getElementById('stat-customers').textContent = DB.customers.length;
  fmt(document.getElementById('stat-net-gst'), Math.max(0, outputGST - inputGST));
  document.getElementById('stat-revenue-change').textContent = '↑ ' + DB.invoices.length  + ' invoices';
  document.getElementById('stat-pur-change').textContent     = '↑ ' + DB.purchases.length + ' entries';
  document.getElementById('stat-gst-credit').textContent     = 'Input credit: ₹' + inputGST.toFixed(2);
  document.getElementById('stat-items-change').textContent   = lowStock + ' low stock';
  document.getElementById('stat-sup-count').textContent      = DB.suppliers.length + ' suppliers';

  // Recent invoices
  const di   = document.getElementById('dash-invoices');
  const inv5 = DB.invoices.slice(-5).reverse();
  di.innerHTML = inv5.length
    ? `<table><tbody>${inv5.map(i => `<tr><td><strong>${i.invNum || '-'}</strong></td><td>${i.customer || '-'}</td><td style="color:var(--gold)">₹${parseFloat(i.total || 0).toFixed(2)}</td><td>${badge(i.status || 'Pending')}</td></tr>`).join('')}</tbody></table>`
    : `<div class="empty-state"><div class="empty-icon">📄</div><h3>No invoices yet</h3></div>`;

  // Recent purchases
  const dp   = document.getElementById('dash-purchases');
  const pur5 = DB.purchases.slice(-5).reverse();
  dp.innerHTML = pur5.length
    ? `<table><tbody>${pur5.map(p => `<tr><td><strong>${p.po || '-'}</strong></td><td>${p.supplier || '-'}</td><td style="color:var(--gold)">₹${parseFloat(p.total || 0).toFixed(2)}</td><td>${badge(p.status || 'Paid')}</td></tr>`).join('')}</tbody></table>`
    : `<div class="empty-state"><div class="empty-icon">🛒</div><h3>No purchases yet</h3></div>`;

  // Reports summary
  const profit = totalRevenue - totalPurchases;
  document.getElementById('rep-revenue').textContent  = '₹' + totalRevenue.toFixed(2);
  document.getElementById('rep-purchase').textContent = '₹' + totalPurchases.toFixed(2);
  document.getElementById('rep-profit').textContent   = '₹' + profit.toFixed(2);
  document.getElementById('rep-profit').style.color   = profit >= 0 ? 'var(--gold)' : 'var(--red)';
}

function fmt(el, val) { el.textContent = '₹' + val.toFixed(2); }
function badge(status) {
  const map = { Paid: 'badge-green', Pending: 'badge-orange', Overdue: 'badge-red', Partial: 'badge-blue', Saved: 'badge-teal' };
  return `<span class="badge ${map[status] || 'badge-blue'}">${status}</span>`;
}
function openNewPurchase() {
  document.getElementById('pur-po').value   = 'PO-' + Date.now();
  document.getElementById('pur-date').value = todayDMY();
  calcPurTotal();
  openModal('modal-purchase');
}

function autofillPurchasePrice() {
  const itemName = document.getElementById('pur-item').value;
  const item = DB.items.find(i => i.name === itemName);
  if (item) {
    document.getElementById('pur-price').value = item.pprice || '';
    document.getElementById('pur-tax').value   = item.gst    || '18';
    calcPurTotal();
  }
}

function calcPurTotal() {
  const qty    = +document.getElementById('pur-qty').value   || 0;
  const price  = +document.getElementById('pur-price').value || 0;
  const rate   = +document.getElementById('pur-tax').value   || 0;
  const type   = document.getElementById('pur-gst-type').value;
  const taxable = qty * price;
  const gst     = taxable * rate / 100;
  let cgst = 0, sgst = 0, igst = 0;
  if (type === 'intra') { cgst = sgst = gst / 2; } else { igst = gst; }

  document.getElementById('pur-taxable').value  = taxable.toFixed(2);
  document.getElementById('pur-gst-amt').value  = gst.toFixed(2);
  document.getElementById('pur-total').value    = (taxable + gst).toFixed(2);

  const bd = document.getElementById('pur-gst-breakdown');
  if (taxable > 0) {
    bd.style.display = 'block';
    document.getElementById('pur-gs-taxable').textContent = '₹' + taxable.toFixed(2);
    document.getElementById('pur-gs-total').textContent   = '₹' + (taxable + gst).toFixed(2);
    if (type === 'intra') {
      document.getElementById('pur-gs-cgst-row').style.display = '';
      document.getElementById('pur-gs-sgst-row').style.display = '';
      document.getElementById('pur-gs-igst-row').style.display = 'none';
      document.getElementById('pur-gs-cgst-rate').textContent  = (rate / 2) + '';
      document.getElementById('pur-gs-sgst-rate').textContent  = (rate / 2) + '';
      document.getElementById('pur-gs-cgst').textContent       = '₹' + cgst.toFixed(2);
      document.getElementById('pur-gs-sgst').textContent       = '₹' + sgst.toFixed(2);
    } else {
      document.getElementById('pur-gs-cgst-row').style.display = 'none';
      document.getElementById('pur-gs-sgst-row').style.display = 'none';
      document.getElementById('pur-gs-igst-row').style.display = '';
      document.getElementById('pur-gs-igst-rate').textContent  = rate + '';
      document.getElementById('pur-gs-igst').textContent       = '₹' + igst.toFixed(2);
    }
  } else { bd.style.display = 'none'; }
}

async function savePurchase() {
  const supplier = document.getElementById('pur-supplier').value;
  const item     = document.getElementById('pur-item').value;
  if (!supplier || !item) { showToast('Please select supplier and item', 'error'); return; }

  const qty = parseFloat(document.getElementById('pur-qty').value) || 0;
  if (qty <= 0) { showFieldError('pur-qty', 'Quantity must be greater than 0'); return; }

  const purDate = document.getElementById('pur-date').value.trim();
  const btn     = document.getElementById('save-purchase-btn');
  if (!purDate || !isValidDMY(purDate)) {
    showFieldError('pur-date', 'Enter a valid date in DD-MM-YYYY format (e.g. 19-04-2026)');
    btn.disabled = false; btn.innerHTML = 'Save Purchase';
    return;
  }

  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';

  const taxable = +document.getElementById('pur-taxable').value || 0;
  const gstAmt  = +document.getElementById('pur-gst-amt').value || 0;
  const type    = document.getElementById('pur-gst-type').value;
  const rate    = +document.getElementById('pur-tax').value || 0;

  const row = {
    id: 'PUR-' + Date.now(),
    po: document.getElementById('pur-po').value,
    date: purDate, supplier, item, qty: qty.toString(),
    taxable, gstAmt,
    cgst: type === 'intra' ? (gstAmt / 2).toFixed(2) : 0,
    sgst: type === 'intra' ? (gstAmt / 2).toFixed(2) : 0,
    igst: type === 'inter' ? gstAmt.toFixed(2)        : 0,
    total:   document.getElementById('pur-total').value,
    status:  document.getElementById('pur-status').value,
    billno:  document.getElementById('pur-billno').value,
    billdate:document.getElementById('pur-billdate').value,
    notes:   document.getElementById('pur-notes').value,
    gstRate: rate, gstType: type,
    createdAt: new Date().toISOString()
  };

  try {
    await appendRow('purchases', row);
    DB.purchases.push(row);
    await recomputeStock(item);
    renderPurchases(); renderItems(); updateDashboard();
    closeModal('modal-purchase');
    showToast('Purchase saved to Google Sheets ✓', 'success');
    document.getElementById('modal-purchase').querySelectorAll('input:not([readonly]),select,textarea').forEach(el => { el.value = ''; });
  } catch(e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
  btn.disabled = false; btn.innerHTML = 'Save Purchase';
}

function renderPurchases() {
  const tbody = document.getElementById('pur-tbody');
  if (!DB.purchases.length) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="empty-icon">🛒</div><h3>No purchases recorded</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = DB.purchases.slice().reverse().map(p => `
    <tr>
      <td><strong>${p.po || p.id}</strong></td>
      <td>${migrateDateField(p.date) || '-'}</td>
      <td>${p.supplier || '-'}</td>
      <td>${p.item || '-'}</td>
      <td>${p.qty || 0}</td>
      <td>₹${parseFloat(p.taxable || 0).toFixed(2)}</td>
      <td>₹${parseFloat(p.cgst   || 0).toFixed(2)}</td>
      <td>₹${parseFloat(p.sgst   || 0).toFixed(2)}</td>
      <td>₹${parseFloat(p.igst   || 0).toFixed(2)}</td>
      <td style="color:var(--gold)">₹${parseFloat(p.total || 0).toFixed(2)}</td>
      <td>${badge(p.status || 'Paid')}</td>
      <td><button class="btn btn-red btn-sm delete-gated" onclick="deletePurchase('${p.id}')" style="display:${canDelete() ? '' : 'none'}">🗑</button></td>
    </tr>`).join('');
}

async function deletePurchase(id) {
  if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
  if (!confirm('Delete this purchase? Stock will be adjusted accordingly.')) return;
  try {
    const pur = DB.purchases.find(p => p.id === id);
    await deleteRow('purchases', id);
    DB.purchases = DB.purchases.filter(p => p.id !== id);
    if (pur && pur.item) await recomputeStock(pur.item);
    renderPurchases(); renderItems(); updateDashboard();
    showToast('Purchase deleted & stock adjusted ✓', 'info');
  } catch(e) { showToast('Delete failed: ' + e.message, 'error'); }
}
function openNewInvoice() {
  const prefix = DB.settings.invPrefix || 'INV-';
  const num    = DB.invoices.length + 1;
  document.getElementById('inv-num').value  = prefix + String(num).padStart(4, '0');
  document.getElementById('inv-date').value = todayDMY();
  document.getElementById('inv-due').value  = addDays(todayDMY(), 30);
  document.getElementById('inv-line-items').innerHTML = '';
  addInvoiceRow();
  openModal('modal-invoice');
}

function filterInvoices(status, el) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#inv-tbody tr').forEach(r => {
    r.style.display = (status === 'all' || r.innerText.toLowerCase().includes(status.toLowerCase())) ? '' : 'none';
  });
}

// Units that support fractional/decimal quantities
const FRACTIONAL_UNITS = ['kg', 'kgs', 'kilogram', 'kilograms', 'lt', 'lts', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters', 'g', 'gm', 'gms', 'gram', 'grams', 'ml', 'millilitre', 'milliliter', 'ton', 'tons', 'tonne', 'tonnes', 'quintal', 'quintals'];

function isFractionalUnit(unit) {
  return unit && FRACTIONAL_UNITS.includes(unit.trim().toLowerCase());
}

function setQtyInputMode(qtyInput, unit) {
  if (isFractionalUnit(unit)) {
    qtyInput.step = '0.001';
    qtyInput.title = 'Decimal quantities allowed for ' + unit;
  } else {
    qtyInput.step = '1';
    // Snap to integer if a decimal was previously entered
    const val = parseFloat(qtyInput.value);
    if (!isNaN(val)) qtyInput.value = Math.round(val);
    qtyInput.title = 'Whole numbers only for ' + (unit || 'Pcs/Nos');
  }
}

function addInvoiceRow() {
  const tbody  = document.getElementById('inv-line-items');
  const rowNum = tbody.rows.length + 1;
  const row    = document.createElement('tr');
  const itemOpts = DB.items.map(i =>
    `<option value="${i.name}" data-hsn="${i.hsn || ''}" data-rate="${i.sprice || 0}" data-gst="${i.gst || 18}" data-unit="${i.unit || 'Nos'}">${i.name}</option>`
  ).join('');
  row.innerHTML = `
    <td>${rowNum}</td>
    <td><select onchange="autofillInvoiceRow(this)" style="min-width:140px"><option value="">— Select —</option>${itemOpts}</select></td>
    <td><input placeholder="HSN/SAC"></td>
    <td><input placeholder="Description"></td>
    <td><input type="number" value="1" step="1" oninput="validateQtyInput(this)"></td>
    <td><input placeholder="Pcs" oninput="onUnitChange(this)"></td>
    <td><input type="number" value="0" step="0.01" oninput="recalcInvoice()"></td>
    <td><input type="number" value="18" oninput="recalcInvoice()"></td>
    <td class="amt" style="color:var(--gold)">0.00</td>
    <td><button onclick="this.closest('tr').remove();recalcInvoice()" style="background:var(--red-dim);border:none;color:var(--red);border-radius:4px;padding:4px 8px;cursor:pointer">✕</button></td>`;
  tbody.appendChild(row);
}

function getAvailableStock(productName) {
  const stockItem = DB.items.find(i => i.name === productName);
  if (!stockItem) return null;
  const opening   = parseFloat(stockItem.openingStock ?? stockItem.stock ?? 0);
  const purchased = DB.purchases
    .filter(p => p.item === productName)
    .reduce((s, p) => { const q = parseFloat(p.qty); return s + (isNaN(q) ? 0 : q); }, 0);
  let alreadyInvoiced = 0;
  DB.invoices.forEach(inv => {
    try { JSON.parse(inv.items || '[]').forEach(li => { if (li.product === productName) { const q = parseFloat(li.qty); alreadyInvoiced += isNaN(q) ? 0 : q; } }); } catch(e){}
  });
  return Math.max(0, opening + purchased - alreadyInvoiced);
}

function validateQtyInput(qtyInput) {
  const row         = qtyInput.closest('tr');
  const unitVal     = row ? row.children[5].querySelector('input').value : '';
  const productName = row ? row.children[1].querySelector('select').value : '';

  // Step 1: Snap decimals for non-fractional units
  if (!isFractionalUnit(unitVal)) {
    const raw = parseFloat(qtyInput.value);
    if (!isNaN(raw) && raw !== Math.round(raw)) {
      const snapped = Math.round(raw);
      qtyInput.value = snapped;
      showToast(`⚠ "${unitVal || 'Nos/Pcs'}" cannot be issued in decimals — rounded to ${snapped}`, 'error');
    }
  }

  // Step 2: Live stock check — cap qty and warn if over available stock
  if (productName) {
    const available = getAvailableStock(productName);
    if (available !== null) {
      const entered = parseFloat(qtyInput.value) || 0;
      if (entered > available) {
        qtyInput.value = available;
        qtyInput.style.borderColor = 'var(--red)';
        qtyInput.style.boxShadow   = '0 0 0 3px rgba(255,107,107,0.25)';
        showToast(`⚠ Only ${available} units available for "${productName}" — quantity capped`, 'error');
      } else {
        qtyInput.style.borderColor = entered > 0 ? 'var(--green)' : '';
        qtyInput.style.boxShadow   = '';
      }
    }
  }

  recalcInvoice();
}

function onUnitChange(unitInput) {
  const row = unitInput.closest('tr');
  const qtyInput = row.children[4].querySelector('input');
  setQtyInputMode(qtyInput, unitInput.value);
  recalcInvoice();
}

function autofillInvoiceRow(sel) {
  const opt      = sel.selectedOptions[0];
  const row      = sel.closest('tr');
  const unit     = opt.dataset.unit || 'Pcs';
  const qtyInput = row.children[4].querySelector('input');
  row.children[2].querySelector('input').value = opt.dataset.hsn  || '';
  row.children[6].querySelector('input').value = opt.dataset.rate || 0;
  row.children[7].querySelector('input').value = opt.dataset.gst  || 18;
  row.children[5].querySelector('input').value = unit;
  setQtyInputMode(qtyInput, unit);

  // Show available stock as max constraint and tooltip hint
  const productName = opt.value;
  if (productName) {
    const available = getAvailableStock(productName);
    if (available !== null) {
      qtyInput.max   = available;
      qtyInput.title = `Available stock: ${available} ${unit}`;
      qtyInput.placeholder = `Max: ${available}`;
    }
  }

  recalcInvoice();
}

function fillCustomerDetails() {
  const name = document.getElementById('inv-customer').value;
  const cust = DB.customers.find(c => c.name === name);
  if (cust) {
    document.getElementById('inv-cust-gstin').value = cust.gstin || '';
    const custState = cust.state || '';
    const coState   = DB.settings.state || 'Telangana';
    document.getElementById('inv-gst-type').value = (custState && custState !== coState) ? 'inter' : 'intra';
    recalcInvoice();
  }
}

function recalcInvoice() {
  let subtotal = 0, totalGST = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
  const gstType = document.getElementById('inv-gst-type').value;

  document.querySelectorAll('#inv-line-items tr').forEach(r => {
    const qtyInput = r.children[4].querySelector('input');
    const unitVal  = r.children[5].querySelector('input').value;
    const rawQty   = parseFloat(qtyInput.value) || 0;
    // Snap to integer for non-fractional units before any calculation
    const qty      = isFractionalUnit(unitVal) ? rawQty : Math.round(rawQty);
    if (!isFractionalUnit(unitVal) && rawQty !== qty) {
      qtyInput.value = qty; // update the field immediately
    }
    const rate    = +r.children[6].querySelector('input').value || 0;
    const gstRate = +r.children[7].querySelector('input').value || 0;
    const amt     = qty * rate;
    const tax     = amt * gstRate / 100;
    subtotal += amt; totalGST += tax;
    if (gstType === 'intra') { cgstTotal += tax / 2; sgstTotal += tax / 2; } else { igstTotal += tax; }
    r.querySelector('.amt').textContent = amt.toFixed(2);
  });

  const discPct     = +document.getElementById('inv-discount').value || 0;
  const disc        = (subtotal + totalGST) * discPct / 100;
  const beforeRound = subtotal + totalGST - disc;
  const rounded     = Math.round(beforeRound);
  const roundOff    = rounded - beforeRound;

  document.getElementById('inv-subtotal').textContent  = '₹' + subtotal.toFixed(2);
  document.getElementById('inv-tax-amt').textContent   = '₹' + totalGST.toFixed(2);
  document.getElementById('inv-disc-amt').textContent  = '-₹' + disc.toFixed(2);
  document.getElementById('inv-roundoff').textContent  = '₹' + roundOff.toFixed(2);
  document.getElementById('inv-total-amt').textContent = '₹' + rounded.toFixed(2);

  const showIntra = gstType === 'intra';
  document.getElementById('inv-cgst-row').style.display = showIntra ? '' : 'none';
  document.getElementById('inv-sgst-row').style.display = showIntra ? '' : 'none';
  document.getElementById('inv-igst-row').style.display = showIntra ? 'none' : '';
  document.getElementById('inv-cgst-amt').textContent = '₹' + cgstTotal.toFixed(2);
  document.getElementById('inv-sgst-amt').textContent = '₹' + sgstTotal.toFixed(2);
  document.getElementById('inv-igst-amt').textContent = '₹' + igstTotal.toFixed(2);
}

async function saveInvoice() {
  const customer = document.getElementById('inv-customer').value;
  if (!customer) { showToast('Please select a customer', 'error'); return; }

  const invCustGstin = document.getElementById('inv-cust-gstin').value.trim().toUpperCase();
  if (invCustGstin && !validateGSTIN(invCustGstin)) {
    showFieldError('inv-cust-gstin', 'Invalid Customer GSTIN — must be 15 chars, format: 36AABCU9603R1ZX');
    return;
  }
  if (invCustGstin) document.getElementById('inv-cust-gstin').value = invCustGstin;

  const btn = document.getElementById('save-invoice-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';

  const invDateVal = document.getElementById('inv-date').value.trim();
  if (!invDateVal || !isValidDMY(invDateVal)) {
    showFieldError('inv-date', 'Enter a valid date in DD-MM-YYYY format (e.g. 19-04-2026)');
    btn.disabled = false; btn.innerHTML = 'Save Invoice';
    return;
  }

  const items = [];
  document.querySelectorAll('#inv-line-items tr').forEach(r => {
    const rawUnit = r.children[5].querySelector('input').value;
    const rawQty  = parseFloat(r.children[4].querySelector('input').value) || 0;
    const qty     = isFractionalUnit(rawUnit) ? rawQty : Math.round(rawQty);
    items.push({
      product: r.children[1].querySelector('select').value,
      hsn:     r.children[2].querySelector('input').value,
      desc:    r.children[3].querySelector('input').value,
      qty:     qty.toString(),
      unit:    rawUnit,
      rate:    r.children[6].querySelector('input').value,
      gst:     r.children[7].querySelector('input').value,
      amount:  r.querySelector('.amt').textContent
    });
  });

  // Stock availability check
  for (const lineItem of items) {
    if (!lineItem.product) continue;
    const available = getAvailableStock(lineItem.product);
    if (available !== null) {
      const requestedQty = parseFloat(lineItem.qty) || 0;
      if (requestedQty > available) {
        btn.disabled = false; btn.innerHTML = 'Save Invoice';
        showToast(`⚠ Insufficient stock for "${lineItem.product}" — Available: ${available}, Requested: ${requestedQty}`, 'error');
        return;
      }
    }
  }

  const gstType  = document.getElementById('inv-gst-type').value;
  const subtotal = parseFloat(document.getElementById('inv-subtotal').textContent.replace('₹', ''))  || 0;
  const totalGST = parseFloat(document.getElementById('inv-tax-amt').textContent.replace('₹', ''))   || 0;
  const total    = parseFloat(document.getElementById('inv-total-amt').textContent.replace('₹', '')) || 0;

  const row = {
    id: 'INV-' + Date.now(),
    invNum:    document.getElementById('inv-num').value,
    date:      document.getElementById('inv-date').value,
    dueDate:   document.getElementById('inv-due').value,
    customer,
    custGstin: document.getElementById('inv-cust-gstin').value,
    gstType,
    pos:       document.getElementById('inv-pos').value,
    rca:       document.getElementById('inv-rca').value,
    eway:      document.getElementById('inv-eway').value,
    taxable:   subtotal.toFixed(2),
    cgst:      gstType === 'intra' ? (totalGST / 2).toFixed(2) : 0,
    sgst:      gstType === 'intra' ? (totalGST / 2).toFixed(2) : 0,
    igst:      gstType === 'inter' ? totalGST.toFixed(2)        : 0,
    gst:       totalGST.toFixed(2),
    discount:  document.getElementById('inv-discount').value,
    total:     total.toFixed(2),
    status:    'Pending',
    notes:     document.getElementById('inv-notes').value,
    items:     JSON.stringify(items),
    createdAt: new Date().toISOString()
  };

  try {
    await appendRow('invoices', row);
    DB.invoices.push(row);
    const affectedItems = [...new Set(items.map(li => li.product).filter(Boolean))];
    for (const itemName of affectedItems) { await recomputeStock(itemName); }
    renderInvoices(); renderItems(); updateDashboard();
    document.getElementById('inv-count').textContent = DB.invoices.length;
    closeModal('modal-invoice');
    showToast('Invoice saved to Google Sheets ✓', 'success');
  } catch(e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
  btn.disabled = false; btn.innerHTML = 'Save Invoice';
}

function renderInvoices() {
  const tbody = document.getElementById('inv-tbody');
  document.getElementById('inv-count').textContent = DB.invoices.length;
  if (!DB.invoices.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📄</div><h3>No invoices created</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = DB.invoices.slice().reverse().map(i => `
    <tr>
      <td><strong>${i.invNum || i.id}</strong></td>
      <td>${migrateDateField(i.date) || '-'}</td>
      <td>${i.customer || '-'}</td>
      <td><small style="color:var(--text3)">${i.custGstin || '-'}</small></td>
      <td>₹${parseFloat(i.taxable || 0).toFixed(2)}</td>
      <td>₹${parseFloat(i.gst     || 0).toFixed(2)}</td>
      <td style="color:var(--gold)">₹${parseFloat(i.total || 0).toFixed(2)}</td>
      <td><span class="badge ${i.gstType === 'inter' ? 'badge-blue' : 'badge-teal'}">${i.gstType === 'inter' ? 'IGST' : 'CGST/SGST'}</span></td>
      <td>${badge(i.status || 'Pending')}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-teal btn-sm" onclick="viewInvoicePreview('${i.id}')">👁</button>
        <button class="btn btn-green btn-sm" onclick="markPaid('${i.id}')">✓</button>
        <button class="btn btn-red btn-sm delete-gated" onclick="deleteInvoice('${i.id}')" style="display:${canDelete() ? '' : 'none'}">🗑</button>
      </td>
    </tr>`).join('');
}

async function markPaid(id) {
  const inv = DB.invoices.find(i => i.id === id);
  if (!inv) return;
  inv.status = 'Paid';
  try {
    await updateRow('invoices', id, inv);
    renderInvoices(); updateDashboard();
    showToast('Invoice marked as Paid ✓', 'success');
  } catch(e) { showToast('Update failed', 'error'); }
}

async function deleteInvoice(id) {
  if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
  if (!confirm('Delete this invoice? Stock will be restored accordingly.')) return;
  try {
    const inv = DB.invoices.find(i => i.id === id);
    await deleteRow('invoices', id);
    DB.invoices = DB.invoices.filter(i => i.id !== id);
    if (inv) {
      let lineItems = [];
      try { lineItems = JSON.parse(inv.items || '[]'); } catch(e){}
      const affectedItems = [...new Set(lineItems.map(li => li.product).filter(Boolean))];
      for (const itemName of affectedItems) { await recomputeStock(itemName); }
    }
    renderInvoices(); renderItems(); updateDashboard();
    showToast('Invoice deleted & stock restored ✓', 'info');
  } catch(e) { showToast('Delete failed: ' + e.message, 'error'); }
}

function viewInvoicePreview(id) {
  const inv = DB.invoices.find(i => i.id === id);
  if (!inv) return;
  let items = [];
  try { items = JSON.parse(inv.items || '[]'); } catch(e){}
  const previewEl = document.getElementById('invoice-preview-content');
  previewEl.innerHTML = buildInvoiceHTML(inv, DB.settings, items, false);
  previewEl.dataset.invId = id;
  openModal('modal-preview');
}

function previewInvoice() {
  const customer = document.getElementById('inv-customer').value;
  const items    = [];
  document.querySelectorAll('#inv-line-items tr').forEach(r => {
    items.push({
      product: r.children[1].querySelector('select').value,
      hsn:     r.children[2].querySelector('input').value,
      desc:    r.children[3].querySelector('input').value,
      qty:     r.children[4].querySelector('input').value,
      unit:    r.children[5].querySelector('input').value,
      rate:    r.children[6].querySelector('input').value,
      gst:     r.children[7].querySelector('input').value,
      amount:  r.querySelector('.amt').textContent
    });
  });
  const inv = {
    invNum:   document.getElementById('inv-num').value,
    date:     document.getElementById('inv-date').value,
    dueDate:  document.getElementById('inv-due').value,
    customer,
    custGstin:document.getElementById('inv-cust-gstin').value,
    gstType:  document.getElementById('inv-gst-type').value,
    gst:      document.getElementById('inv-tax-amt').textContent.replace('₹', ''),
    total:    document.getElementById('inv-total-amt').textContent.replace('₹', ''),
    taxable:  document.getElementById('inv-subtotal').textContent.replace('₹', ''),
    cgst:     document.getElementById('inv-cgst-amt').textContent.replace('₹', ''),
    sgst:     document.getElementById('inv-sgst-amt').textContent.replace('₹', ''),
    igst:     document.getElementById('inv-igst-amt').textContent.replace('₹', ''),
    notes:    document.getElementById('inv-notes').value,
    status:   'Draft'
  };
  const previewEl = document.getElementById('invoice-preview-content');
  previewEl.innerHTML = buildInvoiceHTML(inv, DB.settings, items, false);
  previewEl.dataset.invId      = '';
  previewEl.dataset.draftInv   = JSON.stringify(inv);
  previewEl.dataset.draftItems = JSON.stringify(items);
  openModal('modal-preview');
}
function amountInWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function threeDigits(n) {
    if (n >= 100) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
    return twoDigits(n);
  }
  const total   = Math.round(amount * 100);
  const rupees  = Math.floor(total / 100);
  const paise   = total % 100;
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  let words = '';
  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    const lakh  = Math.floor((rupees % 10000000) / 100000);
    const thou  = Math.floor((rupees % 100000) / 1000);
    const rest  = rupees % 1000;
    if (crore) words += threeDigits(crore) + ' Crore ';
    if (lakh)  words += threeDigits(lakh)  + ' Lakh ';
    if (thou)  words += threeDigits(thou)  + ' Thousand ';
    if (rest)  words += threeDigits(rest);
    words = words.trim() + ' Rupees';
  }
  if (paise > 0) words += ' and ' + twoDigits(paise) + ' Paise';
  words += ' Only';
  return words.replace(/\s+/g, ' ').trim();
}
function buildInvoiceHTML(inv, co, items, printMode = false) {
  const gstType   = inv.gstType;
  const grandTotal = parseFloat(inv.total || 0);
  const totalWords = amountInWords(grandTotal);

  const tableHead = printMode
    ? `<thead><tr><th>#</th><th>Product</th><th>HSN/SAC</th><th>Description</th><th>Qty</th><th>Unit</th></tr></thead>`
    : `<thead><tr><th>#</th><th>Product</th><th>HSN/SAC</th><th>Description</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>`;
  const tableRows = items.map((item, i) => {
    const qtyRaw = parseFloat(item.qty); const qtyFormatted = (isNaN(qtyRaw) ? 0 : qtyRaw).toFixed(3);
    if (printMode) {
      return `<tr><td>${i+1}</td><td>${item.product}</td><td>${item.hsn || '—'}</td><td>${item.desc || '—'}</td><td><strong>${qtyFormatted}</strong></td><td>${item.unit || '—'}</td></tr>`;
    }
    return `<tr><td>${i+1}</td><td>${item.product}</td><td>${item.hsn || '—'}</td><td>${item.desc || '—'}</td><td>${qtyFormatted}</td><td>${item.unit || '—'}</td><td>₹${parseFloat(item.amount || 0).toFixed(2)}</td></tr>`;
  }).join('');
  const totalsBlock = printMode
    ? `<div class="inv-totals"><div class="inv-totals-box"><div class="inv-totals-row bold"><span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span></div></div></div>
       <div class="inv-amount-words"><span class="inv-words-label">Amount in Words:</span><span class="inv-words-text">${totalWords}</span></div>`
    : `<div class="inv-totals"><div class="inv-totals-box">
        <div class="inv-totals-row"><span>Taxable Amount</span><span>₹${parseFloat(inv.taxable || 0).toFixed(2)}</span></div>
        ${gstType === 'intra'
          ? `<div class="inv-totals-row gst-row"><span>CGST</span><span>₹${parseFloat(inv.cgst || 0).toFixed(2)}</span></div>
             <div class="inv-totals-row gst-row"><span>SGST</span><span>₹${parseFloat(inv.sgst || 0).toFixed(2)}</span></div>`
          : `<div class="inv-totals-row gst-row"><span>IGST</span><span>₹${parseFloat(inv.igst || 0).toFixed(2)}</span></div>`}
        <div class="inv-totals-row"><span>Total GST</span><span>₹${parseFloat(inv.gst || 0).toFixed(2)}</span></div>
        <div class="inv-totals-row bold"><span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span></div>
       </div></div>
       <div class="inv-amount-words"><span class="inv-words-label">Amount in Words:</span><span class="inv-words-text">${totalWords}</span></div>`;
  return `
    <div class="invoice-preview">
      <div class="inv-header">
        <div>
          <div class="inv-company">${co.name || 'Bavana Solutions'}</div>
          <div class="inv-company-sub">
		  ${co.address || ''}<br>
          GSTIN: ${co.gstin || '—'} ; STATE :<b>VISAKHAPATNAM - </b>530007<br>
		  PHONE : ${co.phone || ''} ; Email :  ${co.email || ''}
          </div>
        </div>
        <div style="text-align:right">
          <div class="inv-badge">DELIVERY NOTE</div>
          <div style="margin-top:10px;font-size:13px;color:#555">
            #: <strong>${inv.invNum || '—'}</strong><br>
            Date: ${migrateDateField(inv.date) || '—'}<br>
          </div>
        </div>
      </div>
      <div class="inv-meta">
        <div>
          <div class="inv-meta-label">Issued To</div>
          <div class="inv-meta-value">
            <strong>${inv.customer || '—'}</strong><br>
            GSTIN: ${inv.custGstin || 'Unregistered'}
          </div>
        </div>
        <div>
          <div class="inv-meta-label">Supply Details</div>
          <div class="inv-meta-value">
            Type: ${gstType === 'intra' ? 'Intra-State' : 'Inter-State'}<br>
            GST Treatment: ${gstType === 'intra' ? 'CGST + SGST' : 'IGST'}<br>
            RCM: ${inv.rca === 'Y' ? 'Yes' : 'No'}
          </div>
        </div>
      </div>
      <table class="inv-table">
        ${tableHead}
        <tbody>${tableRows}</tbody>
      </table>
      ${totalsBlock}
      ${co.bank ? `<div class="inv-bank-details">
        <strong>Bank Details for Payment</strong><br>
        Bank: ${co.bank} | Branch: ${co.branch || ''}<br>
        A/C No: ${co.accno || ''} | IFSC: ${co.ifsc || ''} | Type: ${co.acctype || ''}<br>
        UPI: ${co.upi || ''}
      </div>` : ''}
      <div class="inv-footer">
  ${inv.notes || ''}<br>
  <div style="display:flex; justify-content:space-between; margin-top:30px;">
    <div style="text-align:left;">Receiver Signature</div>
    <div style="text-align:center;">Prepared By</div>
  </div>
</div>
      <div class="inv-seal">Authorised Signatory<br>
        <strong>${co.name || 'Bavana Solutions'}</strong><br>
        <small>This is a computer generated invoice</small>
      </div>
    </div>`;
}
function printInvoice() {
  const previewEl = document.getElementById('invoice-preview-content');
  const invId     = previewEl.dataset.invId;
  let inv, co = DB.settings, items = [];
  if (invId) {
    inv = DB.invoices.find(i => i.id === invId);
    if (inv) { try { items = JSON.parse(inv.items || '[]'); } catch(e){} }
  }
  let printContent;
  if (inv) {
    printContent = buildInvoiceHTML(inv, co, items, true);
  } else {
    try {
      inv   = JSON.parse(previewEl.dataset.draftInv   || '{}');
      items = JSON.parse(previewEl.dataset.draftItems || '[]');
      printContent = buildInvoiceHTML(inv, co, items, true);
    } catch(e) {
      printContent = previewEl.innerHTML;
    }
  }
  const printCSS = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#fff}
    .invoice-preview{max-width:800px;margin:0 auto;padding:40px;color:#333}
    .inv-header{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #f0f0f0}
    .inv-company{font-size:24px;font-family:'DM Serif Display',serif;color:#1a1a2e}
    .inv-company-sub{font-size:12px;color:#888;margin-top:4px;line-height:1.6}
    .inv-badge{background:#1a1a2e;color:#e8c97a;padding:8px 20px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:2px}
    .inv-meta{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
    .inv-meta-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#aaa;margin-bottom:4px}
    .inv-meta-value{font-size:14px;color:#1a1a2e;font-weight:500;line-height:1.5}
    .inv-table{width:100%;border-collapse:collapse;margin-bottom:20px}
    .inv-table th{background:#1a1a2e;color:#e8c97a;padding:11px 14px;font-size:11px;font-weight:700;text-align:left;text-transform:uppercase}
    .inv-table td{padding:11px 14px;border-bottom:1px solid #f0f0f0;font-size:13px}
    .inv-totals{display:flex;justify-content:flex-end;margin-bottom:12px}
    .inv-totals-box{width:300px}
    .inv-totals-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555}
    .inv-totals-row.bold{font-weight:700;color:#1a1a2e;font-size:16px;border-bottom:none;border-top:2px solid #1a1a2e;margin-top:4px;padding-top:12px}
    .inv-totals-row.gst-row{color:#2d7a2d;font-size:12px}
    .inv-amount-words{background:#f8f4e8;border:1px solid #e8c97a;border-radius:6px;padding:10px 16px;margin-bottom:16px;font-size:13px;color:#1a1a2e}
    .inv-words-label{font-weight:700;margin-right:8px;color:#7a6000}
    .inv-words-text{font-style:italic}
    .inv-footer{background:#f8f8f8;border-radius:8px;padding:16px;font-size:12px;color:#888;margin-top:16px}
    .inv-bank-details{background:#f0f7ff;border:1px solid #d0e8ff;border-radius:6px;padding:12px;font-size:12px;color:#444;margin-top:12px}
    .inv-seal{text-align:right;margin-top:24px;border-top:1px dashed #ddd;padding-top:16px;font-size:11px;color:#aaa}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  `;

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap" rel="stylesheet">
    <style>${printCSS}</style>
    </head><body>${printContent}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
async function recomputeStock(itemName) {
  const item = DB.items.find(i => i.name === itemName);
  if (!item) return;
  const opening   = parseFloat(item.openingStock ?? item.stock ?? 0);
  const purchased = DB.purchases
    .filter(p => p.item === itemName)
    .reduce((s, p) => { const q = parseFloat(p.qty); return s + (isNaN(q) ? 0 : q); }, 0);
  let invoiced = 0;
  DB.invoices.forEach(inv => {
    try { JSON.parse(inv.items || '[]').forEach(li => { if (li.product === itemName) { const q = parseFloat(li.qty); invoiced += isNaN(q) ? 0 : q; } }); } catch(e){}
  });
  const newStock = Math.max(0, opening + purchased - invoiced);
  item.stock = newStock.toString();
  if (item.openingStock === undefined || item.openingStock === null) {
    item.openingStock = opening.toString();
  }
  try { await updateRow('items', item.id, item); }
  catch(e) { console.warn('recomputeStock: sheet update failed for', itemName, e.message); }
}
async function saveItem() {
  const name = document.getElementById('item-name').value.trim();
  if (!name) { showToast('Product name is required', 'error'); return; }
  const btn = document.getElementById('save-item-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  const openingQty = document.getElementById('item-stock').value || '0';
  const row = {
    id: 'ITM-' + Date.now(),
    sku:          document.getElementById('item-sku').value,
    name,
    type:         document.getElementById('item-type').value,
    category:     document.getElementById('item-cat').value,
    hsn:          document.getElementById('item-hsn').value,
    gst:          document.getElementById('item-gst').value,
    unit:         document.getElementById('item-unit').value,
    cess:         document.getElementById('item-cess').value || 0,
    openingStock: openingQty,
    stock:        openingQty,
    minStock:     document.getElementById('item-minstock').value || 0,
    pprice:       document.getElementById('item-pprice').value   || 0,
    sprice:       document.getElementById('item-sprice').value   || 0,
    desc:         document.getElementById('item-desc').value,
    createdAt:    new Date().toISOString()
  };
  try {
    await appendRow('items', row);
    DB.items.push(row);
    renderItems(); updateDashboard(); populateDropdowns();
    closeModal('modal-item');
    showToast('Item saved to Google Sheets ✓', 'success');
    document.getElementById('modal-item').querySelectorAll('input:not([readonly]),select,textarea').forEach(el => el.value = '');
    document.getElementById('item-gst').value = '18';
  } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
  btn.disabled = false; btn.innerHTML = 'Save Item';
}

function renderItems() {
  const tbody = document.getElementById('item-tbody');
  if (!DB.items.length) {
    tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state"><div class="empty-icon">📦</div><h3>No items in inventory</h3></div></td></tr>`;
    return;
  }

  const purchasedMap = {};
  DB.purchases.forEach(p => {
    if (p.item) { const pq = parseFloat(p.qty); purchasedMap[p.item] = (purchasedMap[p.item] || 0) + (isNaN(pq) ? 0 : pq); }
  });
  const invoicedMap = {};
  DB.invoices.forEach(inv => {
    try { JSON.parse(inv.items || '[]').forEach(li => { if (li.product) { const iq = parseFloat(li.qty); invoicedMap[li.product] = (invoicedMap[li.product] || 0) + (isNaN(iq) ? 0 : iq); } }); } catch(e){}
  });

  tbody.innerHTML = DB.items.slice().reverse().map(i => {
    const opening  = parseFloat(i.openingStock ?? i.stock ?? 0);
    const purchased = purchasedMap[i.name] || 0;
    const invoiced  = invoicedMap[i.name]  || 0;
    const stock     = Math.max(0, opening + purchased - invoiced);
    const minStock  = parseFloat(i.minStock || 0);
    i.stock = stock.toString();

    const stockBadge = stock <= 0 ? 'badge-red' : stock <= minStock ? 'badge-orange' : 'badge-green';
    const stockLabel = stock <= 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';

    return `<tr>
      <td><strong>${i.sku || '-'}</strong></td>
      <td>${i.name}</td>
      <td><span class="gst-rate-badge">${i.hsn || '-'}</span></td>
      <td>${i.category || '-'}</td>
      <td style="color:var(--text2)">${opening}</td>
      <td style="color:var(--teal)">+${purchased}</td>
      <td style="color:var(--orange)">-${invoiced}</td>
      <td style="color:${stock <= minStock ? 'var(--red)' : 'var(--green)'};font-weight:700">${stock}</td>
      <td>${minStock}</td>
      <td><span class="gst-rate-badge">${i.gst || 0}%</span></td>
      <td>₹${parseFloat(i.sprice || 0).toFixed(2)}</td>
      <td>₹${parseFloat(i.pprice || 0).toFixed(2)}</td>
      <td><span class="badge ${stockBadge}">${stockLabel}</span></td>
      <td><button class="btn btn-red btn-sm delete-gated" onclick="deleteItem('${i.id}')" style="display:${canDelete() ? '' : 'none'}">🗑</button></td>
    </tr>`;
  }).join('');
}

async function deleteItem(id) {
  if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
  if (!confirm('Delete this item?')) return;
  try {
    await deleteRow('items', id);
    DB.items = DB.items.filter(i => i.id !== id);
    renderItems(); updateDashboard(); populateDropdowns();
    showToast('Item deleted', 'info');
  } catch(e) { showToast('Delete failed', 'error'); }
}
async function recalculateAllStock() {
  if (!DB.items.length) { showToast('No items to recalculate', 'info'); return; }
  showToast('Recalculating stock from transactions…', 'info');

  let updated = 0, errors = 0;
  for (const item of DB.items) {
    const oldStock = item.stock;
    try {
      await recomputeStock(item.name);
      if (item.stock !== oldStock) updated++;
    } catch(e) { errors++; }
  }

  renderItems(); updateDashboard();
  const bar = document.getElementById('stock-summary-bar');
  bar.style.display = 'block';
  bar.innerHTML = `📦 Stock recalculated — <strong>${updated}</strong> item(s) updated using formula: <em>Opening + Purchases − Invoices</em>. ${errors ? `<span style="color:var(--red)">${errors} error(s).</span>` : 'All synced ✓'} <small style="color:var(--text3)">Last run: ${todayDMY()}</small>`;
  showToast(`Stock recalculated ✓ (${updated} items updated)`, 'success');
}
function openFixOpeningStock() {
  if (!DB.items.length) { showToast('No items loaded yet', 'info'); return; }

  const tbody = document.getElementById('fix-opening-tbody');
  tbody.innerHTML = DB.items.map(item => {
    const currentOpening = parseFloat(item.openingStock ?? item.stock ?? 0);
    const looksCorrupted = !Number.isInteger(currentOpening) || currentOpening > 500;
    const rowStyle = looksCorrupted ? 'background:rgba(255,107,107,0.06)' : '';
    const badgeEl  = looksCorrupted
      ? `<span style="font-size:10px;color:var(--red);font-weight:700;margin-left:6px">⚠ Suspicious</span>`
      : `<span style="font-size:10px;color:var(--green);font-weight:700;margin-left:6px">✓ OK</span>`;
    return `<tr style="${rowStyle}">
      <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid var(--border)">
        <strong>${item.name}</strong>${badgeEl}
        <div style="font-size:11px;color:var(--text3)">${item.sku || ''} · ${item.category || ''}</div>
      </td>
      <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid var(--border);color:var(--red)">${currentOpening}</td>
      <td style="padding:10px 12px;border-bottom:1px solid var(--border)">
        <input type="number" min="0" step="1"
          data-item-id="${item.id}" data-item-name="${item.name}"
          value="${looksCorrupted ? 0 : currentOpening}"
          style="width:100px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:13px;color:var(--text);outline:none"
          onfocus="this.style.borderColor='var(--gold)'"
          onblur="this.style.borderColor='var(--border)'">
      </td>
      <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid var(--border);color:var(--text3)">${item.unit || 'Pcs'}</td>
    </tr>`;
  }).join('');

  openModal('modal-fix-opening');
}

async function saveOpeningStockFix() {
  const inputs = document.querySelectorAll('#fix-opening-tbody input[data-item-id]');
  if (!inputs.length) return;

  const btn = document.getElementById('save-fix-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';

  let saved = 0, errors = 0;
  for (const input of inputs) {
    const itemId     = input.dataset.itemId;
    const itemName   = input.dataset.itemName;
    const newOpening = parseFloat(input.value) || 0;
    const item       = DB.items.find(i => i.id === itemId);
    if (!item) continue;
    const oldOpening = parseFloat(item.openingStock ?? item.stock ?? 0);
    if (newOpening === oldOpening) continue;
    item.openingStock = newOpening.toString();
    try {
      await updateRow('items', item.id, item);
      await recomputeStock(itemName);
      saved++;
    } catch(e) { console.error('Fix opening stock failed for', itemName, e); errors++; }
  }

  btn.disabled = false; btn.innerHTML = '💾 Save All Corrections & Recompute';
  closeModal('modal-fix-opening');
  renderItems(); updateDashboard();
  if (errors) {
    showToast(`Saved ${saved} corrections, ${errors} failed — check console`, 'error');
  } else {
    showToast(`✓ Opening stock corrected for ${saved} item(s). Stock recomputed from source truth.`, 'success');
  }
}
let editingSupplierID = null;
let editingCustomerID = null;
async function saveSupplier() {
  const company = document.getElementById('sup-company').value.trim();
  if (!company) { showToast('Company name is required', 'error'); return; }
  const supPhone = document.getElementById('sup-phone').value.trim();
  if (supPhone && !validatePhone(supPhone)) { showFieldError('sup-phone', 'Phone must be exactly 10 digits (e.g. 9876543210)'); return; }
  const supGstin = document.getElementById('sup-gstin').value.trim().toUpperCase();
  if (supGstin && !validateGSTIN(supGstin)) { showFieldError('sup-gstin', 'Invalid GSTIN — must be 15 chars, format: 36AABCU9603R1ZX'); return; }
  if (supGstin) document.getElementById('sup-gstin').value = supGstin;
  const btn = document.getElementById('save-supplier-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  const isEditingSup = !!editingSupplierID;
  const row = {
    id: editingSupplierID || 'SUP-' + Date.now(),
    company,
    contact: document.getElementById('sup-contact').value,
    email:   document.getElementById('sup-email').value,
    phone:   document.getElementById('sup-phone').value,
    gstin:   document.getElementById('sup-gstin').value,
    pan:     document.getElementById('sup-pan').value,
    state:   document.getElementById('sup-state').value,
    city:    document.getElementById('sup-city').value,
    address: document.getElementById('sup-address').value,
    terms:   document.getElementById('sup-terms').value,
    bank:    document.getElementById('sup-bank').value,
    createdAt: new Date().toISOString()
  };
  try {
    if (editingSupplierID) {
      await updateRow('suppliers', editingSupplierID, row);
      const idx = DB.suppliers.findIndex(s => s.id === editingSupplierID);
      if (idx !== -1) DB.suppliers[idx] = row;
      showToast('Supplier updated ✓', 'success');
    } else {
      await appendRow('suppliers', row);
      DB.suppliers.push(row);
      showToast('Supplier saved to Google Sheets ✓', 'success');
    }
    renderSuppliers(); updateDashboard(); populateDropdowns();
    closeModal('modal-supplier');
    editingSupplierID = null;
    document.getElementById('modal-supplier').querySelectorAll('input,textarea').forEach(el => el.value = '');
    document.getElementById('save-supplier-btn').innerHTML = 'Save Supplier';
  } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
  btn.disabled = false; btn.innerHTML = isEditingSup ? 'Update Supplier' : 'Save Supplier';
}
function openNewSupplier() {
  editingSupplierID = null;
  document.getElementById('modal-supplier').querySelectorAll('input,textarea').forEach(el => el.value = '');
  document.getElementById('save-supplier-btn').innerHTML = 'Save Supplier';
  const titleEl = document.querySelector('#modal-supplier .modal-title');
  if (titleEl) titleEl.textContent = 'Add Supplier';
  openModal('modal-supplier');
}
function openNewCustomer() {
  editingCustomerID = null;
  document.getElementById('modal-customer').querySelectorAll('input,textarea').forEach(el => el.value = '');
  document.getElementById('save-customer-btn').innerHTML = 'Save Customer';
  const titleEl = document.querySelector('#modal-customer .modal-title');
  if (titleEl) titleEl.textContent = 'Add Customer';
  openModal('modal-customer');
}
function editSupplier(id) {
  const s = DB.suppliers.find(x => x.id === id);
  if (!s) return;
  editingSupplierID = id;
  document.getElementById('sup-company').value = s.company || '';
  document.getElementById('sup-contact').value = s.contact || '';
  document.getElementById('sup-email').value   = s.email   || '';
  document.getElementById('sup-phone').value   = s.phone   || '';
  document.getElementById('sup-gstin').value   = s.gstin   || '';
  document.getElementById('sup-pan').value     = s.pan     || '';
  document.getElementById('sup-state').value   = s.state   || '';
  document.getElementById('sup-city').value    = s.city    || '';
  document.getElementById('sup-address').value = s.address || '';
  document.getElementById('sup-terms').value   = s.terms   || '';
  document.getElementById('sup-bank').value    = s.bank    || '';
  document.getElementById('save-supplier-btn').innerHTML = 'Update Supplier';
  const titleEl = document.querySelector('#modal-supplier .modal-title');
  if (titleEl) titleEl.textContent = 'Edit Supplier';
  openModal('modal-supplier');
}
function renderSuppliers() {
  const tbody = document.getElementById('sup-tbody');
  if (!DB.suppliers.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🏭</div><h3>No suppliers added</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = DB.suppliers.slice().reverse().map((s, idx) => `
    <tr>
      <td><strong>S${String(DB.suppliers.length - idx).padStart(3, '0')}</strong></td>
      <td>${s.company}</td>
      <td>${s.contact || '-'}</td>
      <td><small>${s.email || '-'}</small></td>
      <td>${s.phone || '-'}</td>
      <td>${s.state || '-'}</td>
      <td><code>${s.gstin || '-'}</code></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-teal btn-sm" onclick="editSupplier('${s.id}')">✏</button>
        <button class="btn btn-red btn-sm delete-gated" onclick="deleteSupplier('${s.id}')" style="display:${canDelete() ? '' : 'none'}">🗑</button>
      </td>
    </tr>`).join('');
}

async function deleteSupplier(id) {
  if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
  if (!confirm('Delete this supplier?')) return;
  try {
    await deleteRow('suppliers', id);
    DB.suppliers = DB.suppliers.filter(s => s.id !== id);
    renderSuppliers(); populateDropdowns();
    showToast('Supplier deleted', 'info');
  } catch(e) { showToast('Delete failed', 'error'); }
}
async function saveCustomer() {
  const name = document.getElementById('cust-name').value.trim();
  if (!name) { showToast('Customer name is required', 'error'); return; }
  const custPhone = document.getElementById('cust-phone').value.trim();
  if (custPhone && !validatePhone(custPhone)) { showFieldError('cust-phone', 'Phone must be exactly 10 digits (e.g. 9876543210)'); return; }
  const custType  = document.getElementById('cust-type').value;
  const custGstin = document.getElementById('cust-gstin').value.trim().toUpperCase();
  if (custType === 'B2B' && !custGstin) { showFieldError('cust-gstin', 'GSTIN is mandatory for B2B customers'); return; }
  if (custGstin && !validateGSTIN(custGstin)) { showFieldError('cust-gstin', 'Invalid GSTIN — must be 15 chars, format: 36AABCU9603R1ZX'); return; }
  if (custGstin) document.getElementById('cust-gstin').value = custGstin;
  const btn = document.getElementById('save-customer-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  const isEditingCust = !!editingCustomerID;
  const row = {
    id: editingCustomerID || 'CUST-' + Date.now(),
    name,
    type:    document.getElementById('cust-type').value,
    email:   document.getElementById('cust-email').value,
    phone:   document.getElementById('cust-phone').value,
    gstin:   document.getElementById('cust-gstin').value,
    pan:     document.getElementById('cust-pan').value,
    state:   document.getElementById('cust-state').value,
    city:    document.getElementById('cust-city').value,
    address: document.getElementById('cust-address').value,
    credit:  document.getElementById('cust-credit').value || 0,
    terms:   document.getElementById('cust-terms').value,
    createdAt: new Date().toISOString()
  };
  try {
    if (editingCustomerID) {
      await updateRow('customers', editingCustomerID, row);
      const idx = DB.customers.findIndex(c => c.id === editingCustomerID);
      if (idx !== -1) DB.customers[idx] = row;
      showToast('Customer updated ✓', 'success');
    } else {
      await appendRow('customers', row);
      DB.customers.push(row);
      showToast('Customer saved to Google Sheets ✓', 'success');
    }
    renderCustomers(); updateDashboard(); populateDropdowns();
    closeModal('modal-customer');
    editingCustomerID = null;
    document.getElementById('modal-customer').querySelectorAll('input,textarea').forEach(el => el.value = '');
    document.getElementById('save-customer-btn').innerHTML = 'Save Customer';
  } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
  btn.disabled = false; btn.innerHTML = isEditingCust ? 'Update Customer' : 'Save Customer';
}
function editCustomer(id) {
  const c = DB.customers.find(x => x.id === id);
  if (!c) return;
  editingCustomerID = id;
  document.getElementById('cust-name').value    = c.name    || '';
  document.getElementById('cust-type').value    = c.type    || 'B2C';
  document.getElementById('cust-email').value   = c.email   || '';
  document.getElementById('cust-phone').value   = c.phone   || '';
  document.getElementById('cust-gstin').value   = c.gstin   || '';
  document.getElementById('cust-pan').value     = c.pan     || '';
  document.getElementById('cust-state').value   = c.state   || '';
  document.getElementById('cust-city').value    = c.city    || '';
  document.getElementById('cust-address').value = c.address || '';
  document.getElementById('cust-credit').value  = c.credit  || '';
  document.getElementById('cust-terms').value   = c.terms   || '';
  document.getElementById('save-customer-btn').innerHTML = 'Update Customer';
  const titleEl = document.querySelector('#modal-customer .modal-title');
  if (titleEl) titleEl.textContent = 'Edit Customer';
  openModal('modal-customer');
}
function renderCustomers() {
  const tbody = document.getElementById('cust-tbody');
  if (!DB.customers.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👥</div><h3>No customers added</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = DB.customers.slice().reverse().map((c, idx) => `
    <tr>
      <td><strong>C${String(DB.customers.length - idx).padStart(3, '0')}</strong></td>
      <td>${c.name}</td>
      <td><small>${c.email || '-'}</small></td>
      <td>${c.phone || '-'}</td>
      <td>${c.state || '-'}</td>
      <td><code>${c.gstin || 'Unregistered'}</code></td>
      <td><span class="badge ${c.type === 'B2B' ? 'badge-blue' : 'badge-teal'}">${c.type || 'B2C'}</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-teal btn-sm" onclick="editCustomer('${c.id}')">✏</button>
        <button class="btn btn-red btn-sm delete-gated" onclick="deleteCustomer('${c.id}')" style="display:${canDelete() ? '' : 'none'}">🗑</button>
      </td>
    </tr>`).join('');
}

async function deleteCustomer(id) {
  if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
  if (!confirm('Delete this customer?')) return;
  try {
    await deleteRow('customers', id);
    DB.customers = DB.customers.filter(c => c.id !== id);
    renderCustomers(); populateDropdowns();
    showToast('Customer deleted', 'info');
  } catch(e) { showToast('Delete failed', 'error'); }
}
function populateDropdowns() {
  const purSup  = document.getElementById('pur-supplier');
  const curSup  = purSup.value;
  purSup.innerHTML = '<option value="">— Select Supplier —</option>' + DB.suppliers.map(s => `<option value="${s.company}">${s.company}</option>`).join('');
  purSup.value = curSup;

  const purItem = document.getElementById('pur-item');
  const curItem = purItem.value;
  purItem.innerHTML = '<option value="">— Select Item —</option>' + DB.items.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
  purItem.value = curItem;

  const invCust = document.getElementById('inv-customer');
  const curCust = invCust.value;
  invCust.innerHTML = '<option value="">— Select Customer —</option>' + DB.customers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  invCust.value = curCust;
}
function updateGSTSummary() {
  const outputGST = DB.invoices.reduce((s, i) => s + parseFloat(i.gst    || 0), 0);
  const inputGST  = DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt|| 0), 0);
  const netGST    = Math.max(0, outputGST - inputGST);
  document.getElementById('gst-output').textContent = '₹' + outputGST.toFixed(2);
  document.getElementById('gst-input').textContent  = '₹' + inputGST.toFixed(2);
  document.getElementById('gst-net').textContent    = '₹' + netGST.toFixed(2);
  const rates = {};
  DB.invoices.forEach(inv => {
    try {
      JSON.parse(inv.items || '[]').forEach(item => {
        const r   = parseFloat(item.gst || 18);
        if (!rates[r]) rates[r] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
        const amt = parseFloat(item.amount || 0);
        const gst = amt * r / 100;
        rates[r].taxable += amt;
        if (inv.gstType === 'intra') { rates[r].cgst += gst / 2; rates[r].sgst += gst / 2; }
        else { rates[r].igst += gst; }
        rates[r].count++;
      });
    } catch(e){}
  });
  const tbody    = document.getElementById('gst-rate-tbody');
  const rateKeys = Object.keys(rates).sort((a, b) => +a - +b);
  if (!rateKeys.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🧾</div><h3>No GST data</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rateKeys.map(r => {
    const d = rates[r];
    const total = d.cgst + d.sgst + d.igst;
    return `<tr>
      <td><span class="gst-rate-badge">${r}%</span></td>
      <td>₹${d.taxable.toFixed(2)}</td>
      <td>₹${d.cgst.toFixed(2)}</td>
      <td>₹${d.sgst.toFixed(2)}</td>
      <td>₹${d.igst.toFixed(2)}</td>
      <td style="color:var(--green)">₹${total.toFixed(2)}</td>
      <td>${d.count}</td>
    </tr>`;
  }).join('');
}
function applySettings() {
  const s = DB.settings;
  const fields = ['name','gstin','pan','state','state-code','phone','email','website','address','bank','branch','accno','ifsc','acctype','upi','inv-prefix','pay-terms','currency','gst-type','inv-footer'];
  fields.forEach(f => {
    const el = document.getElementById('co-' + f);
    if (el && s[f.replace('-', '')]) el.value = s[f.replace('-', '')] || s[f] || '';
  });
  if (s.name)      document.getElementById('co-name').value      = s.name;
  if (s.gstin)     document.getElementById('co-gstin').value     = s.gstin;
  if (s.invPrefix) document.getElementById('co-inv-prefix').value= s.invPrefix;
}
async function saveCompanySettings() {
  const coPhone = document.getElementById('co-phone').value.trim();
  if (coPhone && !validatePhone(coPhone)) {
    showFieldError('co-phone', 'Phone must be exactly 10 digits (e.g. 9876543210)');
    return;
  }
  const coGstin = document.getElementById('co-gstin').value.trim().toUpperCase();
  if (coGstin && !validateGSTIN(coGstin)) {
    showFieldError('co-gstin', 'Invalid GSTIN — must be 15 chars, format: 36AABCU9603R1ZX');
    return;
  }
  if (coGstin) document.getElementById('co-gstin').value = coGstin;

  const row = {
    id:        'SETTINGS',
    name:      document.getElementById('co-name').value,
    gstin:     document.getElementById('co-gstin').value,
    pan:       document.getElementById('co-pan').value,
    state:     document.getElementById('co-state').value,
    stateCode: document.getElementById('co-state-code').value,
    phone:     document.getElementById('co-phone').value,
    email:     document.getElementById('co-email').value,
    website:   document.getElementById('co-website').value,
    address:   document.getElementById('co-address').value,
    bank:      document.getElementById('co-bank').value,
    branch:    document.getElementById('co-branch').value,
    accno:     document.getElementById('co-accno').value,
    ifsc:      document.getElementById('co-ifsc').value,
    acctype:   document.getElementById('co-acctype').value,
    upi:       document.getElementById('co-upi').value,
    invPrefix: document.getElementById('co-inv-prefix').value,
    payTerms:  document.getElementById('co-pay-terms').value,
    gstType:   document.getElementById('co-gst-type').value,
    invFooter: document.getElementById('co-inv-footer').value,
    updatedAt: todayDMY()
  };

  try {
    if (DB.settings.id) {
      await updateRow('settings', 'SETTINGS', row);
    } else {
      await appendRow('settings', row);
    }
    DB.settings = row;
    showToast('Company settings saved to Google Sheets ✓', 'success');
  } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
}
function exportData(type) {
  const maps = {
    purchases: { data: DB.purchases, cols: ['id','po','date','supplier','item','qty','taxable','cgst','sgst','igst','total','status','billno','billdate','notes'] },
    invoices:  { data: DB.invoices,  cols: ['id','invNum','date','dueDate','customer','custGstin','gstType','taxable','cgst','sgst','igst','gst','total','status'] },
    inventory: { data: DB.items,     cols: ['id','sku','name','type','category','hsn','gst','unit','openingStock','stock','minStock','pprice','sprice'] },
    suppliers: { data: DB.suppliers, cols: ['id','company','contact','email','phone','state','city','gstin','pan'] },
    customers: { data: DB.customers, cols: ['id','name','type','email','phone','state','city','gstin','pan','credit'] }
  };
  const m = maps[type];
  if (!m || !m.data.length) { showToast('No data to export', 'error'); return; }
  const csv = [m.cols.join(','), ...m.data.map(r => m.cols.map(c => `"${(r[c] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = type + '_export_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast(`${type} exported as CSV ✓`, 'success');
}
function exportGSTR1() {
  const rows = DB.invoices.map(i => [
    i.invNum, migrateDateField(i.date), i.customer, i.custGstin,
    i.gstType === 'intra' ? 'B2B' : 'B2C',
    i.taxable, i.cgst, i.sgst, i.igst, i.gst, i.total
  ].join(','));
  const csv = 'Invoice No,Date,Receiver Name,GSTIN,Type,Taxable,CGST,SGST,IGST,Total GST,Invoice Value\n' + rows.join('\n');
  const a = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'GSTR1_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('GSTR-1 exported ✓', 'success');
}
function exportGSTR3B() {
  const output = DB.invoices.reduce((s, i) => s + parseFloat(i.gst    || 0), 0);
  const input  = DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt|| 0), 0);
  const csv = `GSTR-3B Summary\nOutput Tax (Sales),${output.toFixed(2)}\nInput Tax Credit (Purchases),${input.toFixed(2)}\nNet Tax Payable,${Math.max(0, output - input).toFixed(2)}`;
  const a = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'GSTR3B_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('GSTR-3B exported ✓', 'success');
}
function exportAll() {
  ['purchases','invoices','inventory','suppliers','customers'].forEach((t, i) => setTimeout(() => exportData(t), i * 300));
}
function generateReport(type) {
  showToast(`Generating ${type} report…`, 'info');
}
document.addEventListener('DOMContentLoaded', () => {
  // App waits for login — loadAllData() is called by doLogin() after authentication
  // Nothing auto-loads until the user signs in
});


//all Dates should be formatted as "DD-MM-YYYY" only without effecting the actual data updates (within print / pdf all dates should be "DD-MM-YYYY" only) . and also need to mask the Rates and Amounts against each items. Final amount and taxes will be kept same .-->