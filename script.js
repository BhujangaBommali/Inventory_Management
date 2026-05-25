document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = e => {if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.ctrlKey && e.keyCode === 85)) return false;};
const CONFIG = {WEBAPP_URL: "https://script.google.com/macros/s/AKfycbx_lMJ3TaGPTABdhd9Zn9iePICYlPi_0Vz133XOXsvMuccDpYjSGt96aczQ4A42T81Z/exec"};
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
document.getElementById('login-pass-input').focus();return;}currentUser = 'harnath';} else {currentUser = 'staff';}
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
function canDelete() {return currentUser === 'harnath';}
function applyDeletePermissions() {document.querySelectorAll('.delete-gated').forEach(el => {el.style.display = canDelete() ? '' : 'none';});}
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
function toDMY(d) {const dd= String(d.getDate()).padStart(2, '0');const mm= String(d.getMonth() + 1).padStart(2, '0');const yyyy = d.getFullYear();return `${dd}-${mm}-${yyyy}`;}
function parseDMY(str) {
if (!str) return null;
if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
const [y, m, d] = str.split('-');
return new Date(+y, +m - 1, +d);
}
const numMatch = str.match(/^(\d{1,2})-(\d{2})-(\d{4})$/);
if (numMatch) {
const d = +numMatch[1], m = +numMatch[2], y = +numMatch[3];
if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return new Date(y, m - 1, d);
}
const m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
if (!m) return null;
const mi = MONTHS.findIndex(x => x.toLowerCase() === m[2].toLowerCase());
if (mi < 0) return null;
return new Date(+m[3], mi, +m[1]);
}
function isValidDMY(str) {
return parseDMY(str) !== null;
}
function formatDateInput(input) {let v = input.value.replace(/[^0-9\-]/g, '');input.value = v;
if (v.length === 10) {input.style.borderColor = isValidDMY(v) ? 'var(--green)' : 'var(--red)';} else {input.style.borderColor = '';}}
function addDays(dmyStr, n) {const d = parseDMY(dmyStr);if (!d) return dmyStr;d.setDate(d.getDate() + n);return toDMY(d);}
function migrateDateField(val) {if (!val) return '';if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;const d = parseDMY(val);if (d && !isNaN(d)) return toDMY(d);const nd = new Date(val);if (!isNaN(nd)) return toDMY(nd);return val;}
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
try {const res= await fetch(url.toString(), opts);const json = await res.json();
if (json.success === false) throw new Error(json.error || 'API error');setSyncState('ok');lastSyncTime = new Date();return json;} catch (e) {setSyncState('error');throw e;}}
async function readSheet(sheet){ return (await sheetsAPI('read', sheet)).data || []; }
async function appendRow(sheet, row) { return await sheetsAPI('append',sheet, { row }); }
async function updateRow(sheet, id, row) { return await sheetsAPI('update',sheet, { id, row }); }
async function deleteRow(sheet, id){ return await sheetsAPI('delete',sheet, { id }); }
function setSyncState(state) {
const dot= document.getElementById('sync-dot');
const label= document.getElementById('sync-label');
const gsDot= document.getElementById('gs-dot');
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
}}
async function loadAllData() {
const overlay = document.getElementById('loading-overlay');
const msg = document.getElementById('loading-msg');
overlay.style.display = 'flex';
try {const sheets = ['suppliers','customers','items','purchases','invoices','settings'];
for (const s of sheets) {msg.textContent = `Loading ${s}…`;
try {const data = await readSheet(s);if (s === 'settings') {DB.settings = data[0] || {};applySettings();} else {DB[s] = data;}} catch(e) {console.warn('Could not load', s, e.message);}}
renderAll();
overlay.style.display = 'none';
showToast('Data loaded from Google Sheets ✓', 'success');
} catch(e) {
overlay.style.display = 'none';
showToast('Could not connect to Google Sheets. Check your Web App URL.', 'error');
setSyncState('error');
}
}
async function refreshAllData() {showToast('Refreshing from Google Sheets…', 'info');await loadAllData();}
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
const titles = {dashboard: 'Dashboard', purchases: 'Purchases', invoices: 'Tax Invoices',inventory: 'Inventory', suppliers: 'Suppliers', customers: 'Customers',gst: 'GST Summary', reports: 'Reports', settings: 'Company Setup'};
document.getElementById('page-title').innerHTML = (titles[id] || id) + ' <span>' + (id === 'dashboard' ? 'Overview' : id === 'gst' ? 'GSTR View' : '') + '</span>';}
function handleTopAction() { openNewInvoice(); }
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function showToast(msg, type = 'info') {const t = document.createElement('div');t.className = 'toast ' + type;t.innerText = msg;document.getElementById('toasts').appendChild(t);setTimeout(() => t.remove(), 4000);}
function filterTable(tbodyId, value) {const rows = document.querySelectorAll(`#${tbodyId} tr`);value = value.toLowerCase();rows.forEach(r => { r.style.display = r.innerText.toLowerCase().includes(value) ? '' : 'none'; });}
function updateDashboard() {
const totalRevenue = DB.invoices.reduce((s, i) => s + parseFloat(i.total|| 0), 0);
const totalPurchases = DB.purchases.reduce((s, p) => s + parseFloat(p.total|| 0), 0);
const outputGST= DB.invoices.reduce((s, i) => s + parseFloat(i.gst|| 0), 0);
const inputGST = DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt|| 0), 0);
const lowStock = DB.items.filter(i => parseFloat(i.stock || 0) <= parseFloat(i.minStock || 0)).length;
fmt(document.getElementById('stat-revenue'), totalRevenue);
fmt(document.getElementById('stat-purchases'), totalPurchases);
fmt(document.getElementById('stat-gst-collected'), outputGST);
document.getElementById('stat-items').textContent = DB.items.length;
document.getElementById('stat-customers').textContent = DB.customers.length;
fmt(document.getElementById('stat-net-gst'), Math.max(0, outputGST - inputGST));
document.getElementById('stat-revenue-change').textContent = '↑ ' + DB.invoices.length+ ' invoices';
document.getElementById('stat-pur-change').textContent = '↑ ' + DB.purchases.length + ' entries';
document.getElementById('stat-gst-credit').textContent = 'Input credit: ₹' + inputGST.toFixed(2);
document.getElementById('stat-items-change').textContent = lowStock + ' low stock';
document.getElementById('stat-sup-count').textContent= DB.suppliers.length + ' suppliers';
const di = document.getElementById('dash-invoices');
const inv5 = DB.invoices.slice(-5).reverse();
di.innerHTML = inv5.length
? `<table><tbody>${inv5.map(i => `<tr><td><strong>${i.invNum || '-'}</strong></td><td>${i.customer || '-'}</td><td style="color:var(--gold)">₹${parseFloat(i.total || 0).toFixed(2)}</td><td>${badge(i.status || 'Pending')}</td></tr>`).join('')}</tbody></table>`
: `<div class="empty-state"><div class="empty-icon">📄</div><h3>No invoices yet</h3></div>`;
const dp = document.getElementById('dash-purchases');
const pur5 = DB.purchases.slice(-5).reverse();
dp.innerHTML = pur5.length
? `<table><tbody>${pur5.map(p => `<tr><td><strong>${p.po || '-'}</strong></td><td>${p.supplier || '-'}</td><td style="color:var(--gold)">₹${parseFloat(p.total || 0).toFixed(2)}</td><td>${badge(p.status || 'Paid')}</td></tr>`).join('')}</tbody></table>`
: `<div class="empty-state"><div class="empty-icon">🛒</div><h3>No purchases yet</h3></div>`;
const profit = totalRevenue - totalPurchases;
document.getElementById('rep-revenue').textContent= '₹' + totalRevenue.toFixed(2);
document.getElementById('rep-purchase').textContent = '₹' + totalPurchases.toFixed(2);
document.getElementById('rep-profit').textContent = '₹' + profit.toFixed(2);
document.getElementById('rep-profit').style.color = profit >= 0 ? 'var(--gold)' : 'var(--red)';
}
function fmt(el, val) { el.textContent = '₹' + val.toFixed(2); }
function badge(status) {const map = { Paid: 'badge-green', Pending: 'badge-orange', Overdue: 'badge-red', Partial: 'badge-blue', Saved: 'badge-teal' };return `<span class="badge ${map[status] || 'badge-blue'}">${status}</span>`;}
function openNewPurchase() {
  document.getElementById('pur-po').value = 'PO-' + Date.now();
  document.getElementById('pur-date').value = todayDMY();
  document.getElementById('pur-supplier').value = '';
  document.getElementById('pur-gst-type').value = 'intra';
  document.getElementById('pur-status').value = 'Paid';
  document.getElementById('pur-billno').value = '';
  document.getElementById('pur-billdate').value = '';
  document.getElementById('pur-notes').value = '';
  document.getElementById('pur-line-items').innerHTML = '';
  addPurchaseRow();
  calcPurTotal();
  openModal('modal-purchase');
}

function addPurchaseRow() {
  const tbody = document.getElementById('pur-line-items');
  const rowNum = tbody.rows.length + 1;
  const row = document.createElement('tr');
  const itemOpts = DB.items.map(i =>
    `<option value="${i.name}" data-hsn="${i.hsn || ''}" data-pprice="${i.pprice || 0}" data-gst="${i.gst || 18}" data-unit="${i.unit || 'Nos'}">${i.name}</option>`
  ).join('');
  row.innerHTML = `
    <td>${rowNum}</td>
    <td><select onchange="autofillPurchaseRow(this)" style="min-width:140px"><option value="">— Select Item —</option>${itemOpts}</select></td>
    <td><input placeholder="HSN/SAC" style="width:80px"></td>
    <td><input type="number" value="1" min="0.001" step="0.001" oninput="calcPurTotal()" style="width:70px"></td>
    <td><input type="number" value="0" step="0.01" oninput="calcPurTotal()" style="width:90px"></td>
    <td><select onchange="calcPurTotal()" style="width:90px"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18" selected>18%</option><option value="28">28%</option></select></td>
    <td class="pur-taxable-cell" style="color:var(--teal)">0.00</td>
    <td class="pur-gst-cell" style="color:var(--green)">0.00</td>
    <td class="pur-rowtotal-cell" style="color:var(--gold);font-weight:600">0.00</td>
    <td><button onclick="this.closest('tr').remove();calcPurTotal()" style="background:var(--red-dim);border:none;color:var(--red);border-radius:4px;padding:4px 8px;cursor:pointer">✕</button></td>`;
  tbody.appendChild(row);
}

function autofillPurchaseRow(sel) {
  const opt = sel.selectedOptions[0];
  if (!opt || !opt.value) return;
  const row = sel.closest('tr');
  row.children[2].querySelector('input').value = opt.dataset.hsn || '';
  row.children[4].querySelector('input').value = opt.dataset.pprice || '';
  row.children[5].querySelector('select').value = opt.dataset.gst || '18';
  calcPurTotal();
}

function calcPurTotal() {
  const type = document.getElementById('pur-gst-type').value;
  let totalTaxable = 0, totalGST = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;
  document.querySelectorAll('#pur-line-items tr').forEach(row => {
    const qty = parseFloat(row.children[3].querySelector('input').value) || 0;
    const price = parseFloat(row.children[4].querySelector('input').value) || 0;
    const rate = parseFloat(row.children[5].querySelector('select').value) || 0;
    const taxable = qty * price;
    const gst = taxable * rate / 100;
    const rowTotal = taxable + gst;
    row.querySelector('.pur-taxable-cell').textContent = taxable.toFixed(2);
    row.querySelector('.pur-gst-cell').textContent = gst.toFixed(2);
    row.querySelector('.pur-rowtotal-cell').textContent = rowTotal.toFixed(2);
    totalTaxable += taxable;
    totalGST += gst;
    if (type === 'intra') { totalCGST += gst / 2; totalSGST += gst / 2; } else { totalIGST += gst; }
  });
  document.getElementById('pur-subtotal').textContent = '₹' + totalTaxable.toFixed(2);
  document.getElementById('pur-gst-amt').textContent = '₹' + totalGST.toFixed(2);
  document.getElementById('pur-total').textContent = '₹' + (totalTaxable + totalGST).toFixed(2);
  if (type === 'intra') {
    document.getElementById('pur-gs-cgst-row').style.display = '';
    document.getElementById('pur-gs-sgst-row').style.display = '';
    document.getElementById('pur-gs-igst-row').style.display = 'none';
    document.getElementById('pur-gs-cgst').textContent = '₹' + totalCGST.toFixed(2);
    document.getElementById('pur-gs-sgst').textContent = '₹' + totalSGST.toFixed(2);
  } else {
    document.getElementById('pur-gs-cgst-row').style.display = 'none';
    document.getElementById('pur-gs-sgst-row').style.display = 'none';
    document.getElementById('pur-gs-igst-row').style.display = '';
    document.getElementById('pur-gs-igst').textContent = '₹' + totalIGST.toFixed(2);
  }
}

async function savePurchase() {
  const supplier = document.getElementById('pur-supplier').value;
  if (!supplier) { showToast('Please select a supplier', 'error'); return; }
  const purDate = document.getElementById('pur-date').value.trim();
  const btn = document.getElementById('save-purchase-btn');
  if (!purDate || !isValidDMY(purDate)) {
    showFieldError('pur-date', 'Enter a valid date in DD-MM-YYYY format (e.g. 19-04-2026)');
    return;
  }
  const billno = document.getElementById('pur-billno').value.trim();
  if (!billno) { showFieldError('pur-billno', 'Supplier Invoice # is required before saving'); return; }
  const billdate = document.getElementById('pur-billdate').value.trim();
  if (!billdate || !isValidDMY(billdate)) {
    showFieldError('pur-billdate', 'Enter a valid Supplier Invoice Date in DD-MM-YYYY format');
    return;
  }
  // Collect line items
  const lineItems = [];
  let hasError = false;
  document.querySelectorAll('#pur-line-items tr').forEach((row, idx) => {
    const itemName = row.children[1].querySelector('select').value;
    if (!itemName) return;
    const qty = parseFloat(row.children[3].querySelector('input').value) || 0;
    if (qty <= 0) {
      showToast(`Row ${idx + 1}: Quantity must be greater than 0`, 'error');
      hasError = true; return;
    }
    const price = parseFloat(row.children[4].querySelector('input').value) || 0;
    const gstRate = parseFloat(row.children[5].querySelector('select').value) || 0;
    const taxable = qty * price;
    const gstAmt = taxable * gstRate / 100;
    lineItems.push({ item: itemName, hsn: row.children[2].querySelector('input').value, qty, price, gstRate, taxable, gstAmt, total: taxable + gstAmt });
  });
  if (hasError) return;
  if (lineItems.length === 0) { showToast('Please add at least one item with a valid selection', 'error'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  const type = document.getElementById('pur-gst-type').value;
  const po = document.getElementById('pur-po').value;
  const status = document.getElementById('pur-status').value;
  const notes = document.getElementById('pur-notes').value;
  const createdAt = new Date().toISOString();
  // Save ONE row per line item to Google Sheets, all sharing the same PO number
  try {
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      const cgst = type === 'intra' ? (li.gstAmt / 2) : 0;
      const sgst = type === 'intra' ? (li.gstAmt / 2) : 0;
      const igst = type === 'inter' ? li.gstAmt : 0;
      const row = {
        id: 'PUR-' + Date.now() + '-' + i,
        po,
        date: purDate,
        supplier,
        item: li.item,
        qty: li.qty.toString(),
        taxable: li.taxable.toFixed(2),
        gstAmt: li.gstAmt.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        igst: igst.toFixed(2),
        total: li.total.toFixed(2),
        status,
        billno,
        billdate,
        notes,
        gstRate: li.gstRate,
        gstType: type,
        createdAt
      };
      await appendRow('purchases', row);
      DB.purchases.push(row);
    }
    const affectedItems = [...new Set(lineItems.map(li => li.item))];
    for (const itemName of affectedItems) { await recomputeStock(itemName); }
    renderPurchases(); renderItems(); updateDashboard();
    closeModal('modal-purchase');
    showToast(`Purchase saved — ${lineItems.length} item row(s) added to sheet ✓`, 'success');
    // Reset form fields
    document.getElementById('pur-supplier').value = '';
    document.getElementById('pur-billno').value = '';
    document.getElementById('pur-billdate').value = '';
    document.getElementById('pur-notes').value = '';
    document.getElementById('pur-status').value = 'Paid';
    document.getElementById('pur-gst-type').value = 'intra';
    document.getElementById('pur-line-items').innerHTML = '';
  } catch(e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
  btn.disabled = false; btn.innerHTML = 'Save Purchase';
}
function renderPurchases() {
const tbody = document.getElementById('pur-tbody');
if (!DB.purchases.length) {
tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">🛒</div><h3>No purchases recorded</h3></div></td></tr>`;
return;
}
// Group rows by PO number, preserving order of first occurrence (reversed for newest first)
const poMap = new Map();
DB.purchases.slice().reverse().forEach(p => {
  const po = p.po || p.id;
  if (!poMap.has(po)) poMap.set(po, []);
  poMap.get(po).push(p);
});
let html = '';
poMap.forEach((rows, po) => {
  const first = rows[0];
  const poTotal = rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const poTaxable = rows.reduce((s, r) => s + parseFloat(r.taxable || 0), 0);
  const poCGST = rows.reduce((s, r) => s + parseFloat(r.cgst || 0), 0);
  const poSGST = rows.reduce((s, r) => s + parseFloat(r.sgst || 0), 0);
  const poIGST = rows.reduce((s, r) => s + parseFloat(r.igst || 0), 0);
  const multiItem = rows.length > 1;
  if (multiItem) {
    // Header row for the PO group
    html += `<tr style="background:var(--surface2)">
<td><strong>${first.billno || '-'}</strong></td><td>${migrateDateField(first.billdate) || '-'}</td>
<td>${first.supplier || '-'}</td>
<td style="color:var(--text2);font-style:italic">${rows.length} items</td>
<td>₹${poTaxable.toFixed(2)}</td>
<td>₹${poCGST.toFixed(2)}</td>
<td>₹${poSGST.toFixed(2)}</td>
<td>₹${poIGST.toFixed(2)}</td>
<td style="color:var(--gold);font-weight:700">₹${poTotal.toFixed(2)}</td>
<td>${badge(first.status || 'Paid')}</td>
<td><button class="btn btn-red btn-sm delete-gated" onclick="deletePurchaseByPO('${po}')" title="Delete all items in this PO" style="display:${canDelete() ? '' : 'none'}">🗑 All</button></td>
</tr>`;
    // One sub-row per item
    rows.forEach(p => {
      html += `<tr style="background:var(--surface1)">
<td style="padding-left:24px;color:var(--text3);font-size:12px">↳</td>
<td style="color:var(--text3);font-size:12px">${p.billno || '-'}</td>
<td style="color:var(--text3);font-size:12px">—</td>
<td style="font-size:13px">${p.item || '-'} <small style="color:var(--text3)">×${p.qty}</small></td>
<td style="font-size:12px">₹${parseFloat(p.taxable || 0).toFixed(2)}</td>
<td style="font-size:12px">₹${parseFloat(p.cgst || 0).toFixed(2)}</td>
<td style="font-size:12px">₹${parseFloat(p.sgst || 0).toFixed(2)}</td>
<td style="font-size:12px">₹${parseFloat(p.igst || 0).toFixed(2)}</td>
<td style="color:var(--gold);font-size:12px">₹${parseFloat(p.total || 0).toFixed(2)}</td>
<td></td>
<td><button class="btn btn-red btn-sm delete-gated" onclick="deletePurchase('${p.id}')" title="Delete this item" style="display:${canDelete() ? '' : 'none'}">🗑</button></td>
</tr>`;
    });
  } else {
    // Single item — plain row
    const p = rows[0];
    html += `<tr>
<td><strong>${p.billno || '-'}</strong></td>
<td>${migrateDateField(p.billdate) || '-'}</td>
<td>${p.supplier || '-'}</td>
<td>${p.item || '-'} <small style="color:var(--text3)">×${p.qty}</small></td>
<td>₹${parseFloat(p.taxable || 0).toFixed(2)}</td>
<td>₹${parseFloat(p.cgst || 0).toFixed(2)}</td>
<td>₹${parseFloat(p.sgst || 0).toFixed(2)}</td>
<td>₹${parseFloat(p.igst || 0).toFixed(2)}</td>
<td style="color:var(--gold)">₹${parseFloat(p.total || 0).toFixed(2)}</td>
<td>${badge(p.status || 'Paid')}</td>
<td><button class="btn btn-red btn-sm delete-gated" onclick="deletePurchase('${p.id}')" style="display:${canDelete() ? '' : 'none'}">🗑</button></td>
</tr>`;
  }
});
tbody.innerHTML = html;
}
async function deletePurchaseByPO(po) {
if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
const rows = DB.purchases.filter(p => (p.po || p.id) === po);
if (!rows.length) return;
if (!confirm(`Delete all ${rows.length} item(s) under PO ${po}? Stock will be adjusted.`)) return;
try {
  const affectedItems = new Set();
  for (const p of rows) {
    await deleteRow('purchases', p.id);
    if (p.item) affectedItems.add(p.item);
  }
  DB.purchases = DB.purchases.filter(p => (p.po || p.id) !== po);
  for (const itemName of affectedItems) { await recomputeStock(itemName); }
  renderPurchases(); renderItems(); updateDashboard();
  showToast(`PO ${po} deleted — stock adjusted ✓`, 'info');
} catch(e) { showToast('Delete failed: ' + e.message, 'error'); }
}
async function deletePurchase(id) {
if (!canDelete()) { showToast('⛔ Only Harnath (Admin) can delete records.', 'error'); return; }
if (!confirm('Delete this item row? Stock will be adjusted accordingly.')) return;
try {
const pur = DB.purchases.find(p => p.id === id);
await deleteRow('purchases', id);
DB.purchases = DB.purchases.filter(p => p.id !== id);
if (pur && pur.item) { await recomputeStock(pur.item); }
renderPurchases(); renderItems(); updateDashboard();
showToast('Item row deleted & stock adjusted ✓', 'info');
} catch(e) { showToast('Delete failed: ' + e.message, 'error'); }
}
function openNewInvoice() {
const prefix = DB.settings.invPrefix || 'INV-';
const num= DB.invoices.length + 1;
document.getElementById('inv-num').value= prefix + String(num).padStart(4, '0');
document.getElementById('inv-date').value = todayDMY();
document.getElementById('inv-due').value= addDays(todayDMY(), 30);
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
const val = parseFloat(qtyInput.value);
if (!isNaN(val)) qtyInput.value = Math.round(val);
qtyInput.title = 'Whole numbers only for ' + (unit || 'Pcs/Nos');
}
}
function addInvoiceRow() {
const tbody= document.getElementById('inv-line-items');
const rowNum = tbody.rows.length + 1;
const row= document.createElement('tr');
const itemOpts = DB.items.map(i =>
`<option value="${i.name}" data-hsn="${i.hsn || ''}" data-rate="${i.sprice || 0}" data-gst="${i.gst || 18}" data-unit="${i.unit || 'Nos'}" data-category="${i.category || ''}">${i.name}</option>`
).join('');
row.innerHTML = `
<td>${rowNum}</td>
<td><select onchange="autofillInvoiceRow(this)" style="min-width:140px"><option value="">— Select —</option>${itemOpts}</select></td>
<td><input placeholder="HSN/SAC"></td>
<td><input placeholder="Category" readonly style="background:var(--surface);color:var(--text-muted)"></td>
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
const opening = parseFloat(stockItem.openingStock ?? stockItem.stock ?? 0);
// Each purchase row is one item; p.item and p.qty are direct fields
const purchased = DB.purchases.reduce((s, p) => {
  if (p.item === productName) { const q = parseFloat(p.qty); return s + (isNaN(q) ? 0 : q); }
  return s;
}, 0);
let alreadyInvoiced = 0;
DB.invoices.forEach(inv => {
try { JSON.parse(inv.items || '[]').forEach(li => { if (li.product === productName) { const q = parseFloat(li.qty); alreadyInvoiced += isNaN(q) ? 0 : q; } }); } catch(e){}
});
return Math.max(0, opening + purchased - alreadyInvoiced);
}
function validateQtyInput(qtyInput) {
const row = qtyInput.closest('tr');
const unitVal = row ? row.children[5].querySelector('input').value : '';
const productName = row ? row.children[1].querySelector('select').value : '';
if (!isFractionalUnit(unitVal)) {
const raw = parseFloat(qtyInput.value);
if (!isNaN(raw) && raw !== Math.round(raw)) {
const snapped = Math.round(raw);
qtyInput.value = snapped;
showToast(`⚠ "${unitVal || 'Nos/Pcs'}" cannot be issued in decimals — rounded to ${snapped}`, 'error');
}
}
if (productName) {
const available = getAvailableStock(productName);
if (available !== null) {
const entered = parseFloat(qtyInput.value) || 0;
if (entered > available) {
qtyInput.value = available;
qtyInput.style.borderColor = 'var(--red)';
qtyInput.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.25)';
showToast(`⚠ Only ${available} units available for "${productName}" — quantity capped`, 'error');
} else {
qtyInput.style.borderColor = entered > 0 ? 'var(--green)' : '';
qtyInput.style.boxShadow = '';
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
const opt= sel.selectedOptions[0];
const row= sel.closest('tr');
const unit = opt.dataset.unit || 'Pcs';
const qtyInput = row.children[4].querySelector('input');
row.children[2].querySelector('input').value = opt.dataset.hsn|| '';
row.children[3].querySelector('input').value = opt.dataset.category || '';
row.children[6].querySelector('input').value = opt.dataset.rate || 0;
row.children[7].querySelector('input').value = opt.dataset.gst|| 18;
row.children[5].querySelector('input').value = unit;
setQtyInputMode(qtyInput, unit);
const productName = opt.value;
if (productName) {
const available = getAvailableStock(productName);
if (available !== null) {
qtyInput.max = available;
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
const coState = DB.settings.state || 'Telangana';
document.getElementById('inv-gst-type').value = (custState && custState !== coState) ? 'inter' : 'intra';
recalcInvoice();
}
}
function recalcInvoice() {
let subtotal = 0, totalGST = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
const gstType = document.getElementById('inv-gst-type').value;
document.querySelectorAll('#inv-line-items tr').forEach(r => {
const qtyInput = r.children[4].querySelector('input');
const unitVal= r.children[5].querySelector('input').value;
const rawQty = parseFloat(qtyInput.value) || 0;
const qty= isFractionalUnit(unitVal) ? rawQty : Math.round(rawQty);
if (!isFractionalUnit(unitVal) && rawQty !== qty) {
qtyInput.value = qty; // update the field immediately
}
const rate= +r.children[6].querySelector('input').value || 0;
const gstRate = +r.children[7].querySelector('input').value || 0;
const amt = qty * rate;
const tax = amt * gstRate / 100;
subtotal += amt; totalGST += tax;
if (gstType === 'intra') { cgstTotal += tax / 2; sgstTotal += tax / 2; } else { igstTotal += tax; }
r.querySelector('.amt').textContent = amt.toFixed(2);
});
const discPct = +document.getElementById('inv-discount').value || 0;
const disc= (subtotal + totalGST) * discPct / 100;
const beforeRound = subtotal + totalGST - disc;
const rounded = Math.round(beforeRound);
const roundOff= rounded - beforeRound;
document.getElementById('inv-subtotal').textContent= '₹' + subtotal.toFixed(2);
document.getElementById('inv-tax-amt').textContent = '₹' + totalGST.toFixed(2);
document.getElementById('inv-disc-amt').textContent= '-₹' + disc.toFixed(2);
document.getElementById('inv-roundoff').textContent= '₹' + roundOff.toFixed(2);
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
const rawQty= parseFloat(r.children[4].querySelector('input').value) || 0;
const qty = isFractionalUnit(rawUnit) ? rawQty : Math.round(rawQty);
items.push({
product: r.children[1].querySelector('select').value,
hsn: r.children[2].querySelector('input').value,
desc:r.children[3].querySelector('input').value,
qty: qty.toString(),
unit:rawUnit,
rate:r.children[6].querySelector('input').value,
gst: r.children[7].querySelector('input').value,
amount:r.querySelector('.amt').textContent
});
});
const validItems = items.filter(li => li.product && parseFloat(li.qty) > 0);
if (validItems.length === 0) {
btn.disabled = false; btn.innerHTML = 'Save Invoice';
showToast('⚠ Please add at least one item with a product and quantity before saving.', 'error');
return;
}
const incompleteItems = items.filter(li => li.product && !(parseFloat(li.qty) > 0));
if (incompleteItems.length > 0) {
btn.disabled = false; btn.innerHTML = 'Save Invoice';
showToast(`⚠ "${incompleteItems[0].product}" has no quantity entered. Please fill in all item quantities.`, 'error');
return;
}
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
const gstType= document.getElementById('inv-gst-type').value;
const subtotal = parseFloat(document.getElementById('inv-subtotal').textContent.replace('₹', ''))|| 0;
const totalGST = parseFloat(document.getElementById('inv-tax-amt').textContent.replace('₹', '')) || 0;
const total= parseFloat(document.getElementById('inv-total-amt').textContent.replace('₹', '')) || 0;
const row = {
id: 'INV-' + Date.now(),
invNum:document.getElementById('inv-num').value,
date:document.getElementById('inv-date').value,
dueDate: document.getElementById('inv-due').value,
customer,
custGstin: document.getElementById('inv-cust-gstin').value,
gstType,
pos: document.getElementById('inv-pos').value,
rca: document.getElementById('inv-rca').value,
eway:document.getElementById('inv-eway').value,
taxable: subtotal.toFixed(2),
cgst:gstType === 'intra' ? (totalGST / 2).toFixed(2) : 0,
sgst:gstType === 'intra' ? (totalGST / 2).toFixed(2) : 0,
igst:gstType === 'inter' ? totalGST.toFixed(2): 0,
gst: totalGST.toFixed(2),
discount:document.getElementById('inv-discount').value,
total: total.toFixed(2),
status:'Pending',
notes: document.getElementById('inv-notes').value,
items: JSON.stringify(items),
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
<td>₹${parseFloat(i.gst || 0).toFixed(2)}</td>
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
if (!customer) { showToast('Please select a customer before previewing.', 'error'); return; }
const items= [];
document.querySelectorAll('#inv-line-items tr').forEach(r => {
items.push({
product: r.children[1].querySelector('select').value,
hsn: r.children[2].querySelector('input').value,
desc:r.children[3].querySelector('input').value,
qty: r.children[4].querySelector('input').value,
unit:r.children[5].querySelector('input').value,
rate:r.children[6].querySelector('input').value,
gst: r.children[7].querySelector('input').value,
amount:r.querySelector('.amt').textContent
});
});
const validItems = items.filter(li => li.product && parseFloat(li.qty) > 0);
if (validItems.length === 0) {
showToast('⚠ Please add at least one item with a product and quantity before previewing.', 'error');
return;
}
const inv = {
invNum: document.getElementById('inv-num').value,
date: document.getElementById('inv-date').value,
dueDate:document.getElementById('inv-due').value,
customer,
custGstin:document.getElementById('inv-cust-gstin').value,
gstType:document.getElementById('inv-gst-type').value,
gst:document.getElementById('inv-tax-amt').textContent.replace('₹', ''),
total:document.getElementById('inv-total-amt').textContent.replace('₹', ''),
taxable:document.getElementById('inv-subtotal').textContent.replace('₹', ''),
cgst: document.getElementById('inv-cgst-amt').textContent.replace('₹', ''),
sgst: document.getElementById('inv-sgst-amt').textContent.replace('₹', ''),
igst: document.getElementById('inv-igst-amt').textContent.replace('₹', ''),
notes:document.getElementById('inv-notes').value,
status: 'Draft'
};
const previewEl = document.getElementById('invoice-preview-content');
previewEl.innerHTML = buildInvoiceHTML(inv, DB.settings, items, false);
previewEl.dataset.invId= '';
previewEl.dataset.draftInv = JSON.stringify(inv);
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
const total = Math.round(amount * 100);
const rupees= Math.floor(total / 100);
const paise = total % 100;
if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
let words = '';
if (rupees > 0) {
const crore = Math.floor(rupees / 10000000);
const lakh= Math.floor((rupees % 10000000) / 100000);
const thou= Math.floor((rupees % 100000) / 1000);
const rest= rupees % 1000;
if (crore) words += threeDigits(crore) + ' Crore ';
if (lakh)words += threeDigits(lakh)+ ' Lakh ';
if (thou)words += threeDigits(thou)+ ' Thousand ';
if (rest)words += threeDigits(rest);
words = words.trim() + ' Rupees';
}
if (paise > 0) words += ' and ' + twoDigits(paise) + ' Paise';
words += ' Only';
return words.replace(/\s+/g, ' ').trim();
}
function buildInvoiceHTML(inv, co, items, printMode = false) {
const gstType = inv.gstType;
const grandTotal = parseFloat(inv.total || 0);
const totalWords = amountInWords(grandTotal);
const tableHead = printMode
? `<thead><tr><th>#</th><th>Product</th><th>HSN/SAC</th><th>Category</th><th>Qty</th><th>Unit</th></tr></thead>`
: `<thead><tr><th>#</th><th>Product</th><th>HSN/SAC</th><th>Category</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>`;
const tableRows = items.map((item, i) => {
const qtyRaw = parseFloat(item.qty); const qtyFormatted = (isNaN(qtyRaw) ? 0 : qtyRaw).toFixed(3);
const category = item.desc || (DB.items.find(it => it.name === item.product) || {}).category || '—';
if (printMode) {
return `<tr><td>${i+1}</td><td>${item.product}</td><td>${item.hsn || '—'}</td><td>${category}</td><td><strong>${qtyFormatted}</strong></td><td>${item.unit || '—'}</td></tr>`;
}
return `<tr><td>${i+1}</td><td>${item.product}</td><td>${item.hsn || '—'}</td><td>${category}</td><td>${qtyFormatted}</td><td>${item.unit || '—'}</td><td>₹${parseFloat(item.amount || 0).toFixed(2)}</td></tr>`;
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
<div class="inv-company">${co.name || 'Kiran Agency'}</div>
<div class="inv-company-sub">
		${co.address || '#39-24-22/4, GROUND FLOOR, NARASIMHANAGAR'}<br>
GSTIN: ${co.gstin || '37AHSPT4698Q1ZQ'} ; STATE :<b>VISAKHAPATNAM - </b>530007<br>
		PHONE : ${co.phone || '8886441199'} ; Email :${co.email || 'harnathbabu@gmail.com'}
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
</div>`;
}
function printInvoice() {
const previewEl = document.getElementById('invoice-preview-content');
const invId = previewEl.dataset.invId;
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
inv = JSON.parse(previewEl.dataset.draftInv || '{}');
items = JSON.parse(previewEl.dataset.draftItems || '[]');
printContent = buildInvoiceHTML(inv, co, items, true);
} catch(e) {
printContent = previewEl.innerHTML;
}
}
const printCSS = `
@page{size:A4;margin:10mm 12mm 10mm 12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#fff}
.invoice-preview{max-width:800px;margin:0 auto;padding:4px;color:#000}
.inv-header{display:flex;justify-content:space-between;margin-bottom:2px;padding-bottom:20px;border-bottom:2px solid #f0f0f0}
.inv-company{font-size:24px;font-family:'DM Serif Display',serif;color:#000}
.inv-company-sub{font-size:12px;color:#000;margin-top:4px;line-height:1.6}
.inv-badge{background:#ffffff;color:#000;padding:8px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:2px}
.inv-meta{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:14px}
.inv-meta-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#000;margin-bottom:1px}
.inv-meta-value{font-size:14px;color:#000;font-weight:500;line-height:1.5}
.inv-table{width:100%;border-collapse:collapse;margin-bottom:2px}
.inv-table th{background:#ffffff;color:#000;padding:11px 14px;font-size:11px;font-weight:700;text-align:left;text-transform:uppercase}
.inv-table td{padding:11px 14px;border-bottom:1px solid #f0f0f0;font-size:13px}
.inv-totals{display:flex;justify-content:flex-end;margin-bottom:8px}
.inv-totals-box{width:300px}
.inv-totals-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#000}
.inv-totals-row.bold{font-weight:700;color:#000;font-size:16px;border-bottom:none;border-top:2px solid #1a1a2e;margin-top:4px;padding-top:12px}
.inv-totals-row.gst-row{color:#2d7a2d;font-size:12px}
.inv-amount-words{background:#ffffff;border:1px solid #e8c97a;border-radius:6px;padding:10px 16px;margin-bottom:6px;font-size:13px;color:#000}
.inv-words-label{font-weight:700;margin-right:8px;color:#000}
.inv-words-text{font-style:italic}
.inv-footer{background:#fff;border-radius:8px;padding:16px;font-size:12px;color:#000;margin-top:10px}
.inv-bank-details{background:#f0f7ff;border:1px solid #d0e8ff;border-radius:6px;padding:12px;font-size:12px;color:#444;margin-top:10px}
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
const opening = parseFloat(item.openingStock ?? item.stock ?? 0);
// Each purchase row is one item (new format); also handles legacy rows
const purchased = DB.purchases.reduce((s, p) => {
  if (p.item === itemName) { const q = parseFloat(p.qty); return s + (isNaN(q) ? 0 : q); }
  return s;
}, 0);
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
sku:document.getElementById('item-sku').value,
name,
type: document.getElementById('item-type').value,
category: document.getElementById('item-cat').value,
hsn:document.getElementById('item-hsn').value,
gst:document.getElementById('item-gst').value,
unit: document.getElementById('item-unit').value,
cess: document.getElementById('item-cess').value || 0,
openingStock: openingQty,
stock:openingQty,
minStock: document.getElementById('item-minstock').value || 0,
pprice: document.getElementById('item-pprice').value || 0,
sprice: document.getElementById('item-sprice').value || 0,
desc: document.getElementById('item-desc').value,
createdAt:new Date().toISOString()
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
const opening= parseFloat(i.openingStock ?? i.stock ?? 0);
const purchased = purchasedMap[i.name] || 0;
const invoiced= invoicedMap[i.name]|| 0;
const stock = Math.max(0, opening + purchased - invoiced);
const minStock= parseFloat(i.minStock || 0);
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
const badgeEl= looksCorrupted
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
const itemId = input.dataset.itemId;
const itemName = input.dataset.itemName;
const newOpening = parseFloat(input.value) || 0;
const item = DB.items.find(i => i.id === itemId);
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
email: document.getElementById('sup-email').value,
phone: document.getElementById('sup-phone').value,
gstin: document.getElementById('sup-gstin').value,
pan: document.getElementById('sup-pan').value,
state: document.getElementById('sup-state').value,
city:document.getElementById('sup-city').value,
address: document.getElementById('sup-address').value,
terms: document.getElementById('sup-terms').value,
bank:document.getElementById('sup-bank').value,
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
document.getElementById('sup-email').value = s.email || '';
document.getElementById('sup-phone').value = s.phone || '';
document.getElementById('sup-gstin').value = s.gstin || '';
document.getElementById('sup-pan').value = s.pan || '';
document.getElementById('sup-state').value = s.state || '';
document.getElementById('sup-city').value= s.city|| '';
document.getElementById('sup-address').value = s.address || '';
document.getElementById('sup-terms').value = s.terms || '';
document.getElementById('sup-bank').value= s.bank|| '';
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
const custType= document.getElementById('cust-type').value;
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
type:document.getElementById('cust-type').value,
email: document.getElementById('cust-email').value,
phone: document.getElementById('cust-phone').value,
gstin: document.getElementById('cust-gstin').value,
pan: document.getElementById('cust-pan').value,
state: document.getElementById('cust-state').value,
city:document.getElementById('cust-city').value,
address: document.getElementById('cust-address').value,
credit:document.getElementById('cust-credit').value || 0,
terms: document.getElementById('cust-terms').value,
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
document.getElementById('cust-name').value= c.name|| '';
document.getElementById('cust-type').value= c.type|| 'B2C';
document.getElementById('cust-email').value = c.email || '';
document.getElementById('cust-phone').value = c.phone || '';
document.getElementById('cust-gstin').value = c.gstin || '';
document.getElementById('cust-pan').value = c.pan || '';
document.getElementById('cust-state').value = c.state || '';
document.getElementById('cust-city').value= c.city|| '';
document.getElementById('cust-address').value = c.address || '';
document.getElementById('cust-credit').value= c.credit|| '';
document.getElementById('cust-terms').value = c.terms || '';
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
const purSup= document.getElementById('pur-supplier');
const curSup= purSup.value;
purSup.innerHTML = '<option value="">— Select Supplier —</option>' + DB.suppliers.map(s => `<option value="${s.company}">${s.company}</option>`).join('');
purSup.value = curSup;
const invCust = document.getElementById('inv-customer');
const curCust = invCust.value;
invCust.innerHTML = '<option value="">— Select Customer —</option>' + DB.customers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
invCust.value = curCust;
}
function updateGSTSummary() {
const outputGST = DB.invoices.reduce((s, i) => s + parseFloat(i.gst|| 0), 0);
const inputGST= DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt|| 0), 0);
const netGST= Math.max(0, outputGST - inputGST);
document.getElementById('gst-output').textContent = '₹' + outputGST.toFixed(2);
document.getElementById('gst-input').textContent= '₹' + inputGST.toFixed(2);
document.getElementById('gst-net').textContent= '₹' + netGST.toFixed(2);
const rates = {};
DB.invoices.forEach(inv => {
try {
JSON.parse(inv.items || '[]').forEach(item => {
const r = parseFloat(item.gst || 18);
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
const tbody= document.getElementById('gst-rate-tbody');
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
if (s.name)document.getElementById('co-name').value= s.name;
if (s.gstin) document.getElementById('co-gstin').value = s.gstin;
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
id:'SETTINGS',
name:document.getElementById('co-name').value,
gstin: document.getElementById('co-gstin').value,
pan: document.getElementById('co-pan').value,
state: document.getElementById('co-state').value,
stateCode: document.getElementById('co-state-code').value,
phone: document.getElementById('co-phone').value,
email: document.getElementById('co-email').value,
website: document.getElementById('co-website').value,
address: document.getElementById('co-address').value,
bank:document.getElementById('co-bank').value,
branch:document.getElementById('co-branch').value,
accno: document.getElementById('co-accno').value,
ifsc:document.getElementById('co-ifsc').value,
acctype: document.getElementById('co-acctype').value,
upi: document.getElementById('co-upi').value,
invPrefix: document.getElementById('co-inv-prefix').value,
payTerms:document.getElementById('co-pay-terms').value,
gstType: document.getElementById('co-gst-type').value,
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
purchases: { data: DB.purchases, cols: ['id','po','date','supplier','item','qty','availableStock','taxable','cgst','sgst','igst','total','status','billno','billdate','notes'] },
invoices:{ data: DB.invoices,cols: ['id','invNum','date','dueDate','customer','custGstin','gstType','taxable','cgst','sgst','igst','gst','total','status'] },
inventory: { data: DB.items, cols: ['id','sku','name','type','category','hsn','gst','unit','openingStock','stock','minStock','pprice','sprice'] },
suppliers: { data: DB.suppliers, cols: ['id','company','contact','email','phone','state','city','gstin','pan'] },
customers: { data: DB.customers, cols: ['id','name','type','email','phone','state','city','gstin','pan','credit'] }
};
const m = maps[type];
if (!m || !m.data.length) { showToast('No data to export', 'error'); return; }
// For purchases: compute current availableStock for each row by looking up DB.items
const rowsToExport = type === 'purchases'
  ? m.data.map(r => {
      const stockItem = DB.items.find(i => i.name === r.item);
      const opening = parseFloat(stockItem ? (stockItem.openingStock != null ? stockItem.openingStock : stockItem.stock) : 0) || 0;
      const purchased = DB.purchases.reduce((s, p) => {
        if (p.item === r.item) { const q = parseFloat(p.qty); return s + (isNaN(q) ? 0 : q); }
        return s;
      }, 0);
      let invoiced = 0;
      DB.invoices.forEach(inv => {
        try { JSON.parse(inv.items || '[]').forEach(li => { if (li.product === r.item) { const q = parseFloat(li.qty); invoiced += isNaN(q) ? 0 : q; } }); } catch(e){}
      });
      const avail = stockItem ? Math.max(0, opening + purchased - invoiced) : '';
      return Object.assign({}, r, { availableStock: avail.toString() });
    })
  : type === 'inventory'
  ? m.data.map(r => Object.assign({}, r, {
      openingStock: (r.openingStock != null && r.openingStock !== '') ? r.openingStock : (r.stock ?? '0')
    }))
  : m.data;
const csv = [m.cols.join(','), ...rowsToExport.map(r => m.cols.map(c => `"${(r[c] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
const a = document.createElement('a');
a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
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
a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
a.download = 'GSTR1_' + new Date().toISOString().split('T')[0] + '.csv';
a.click();
showToast('GSTR-1 exported ✓', 'success');
}
function exportGSTR3B() {
const output = DB.invoices.reduce((s, i) => s + parseFloat(i.gst|| 0), 0);
const input= DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt|| 0), 0);
const csv = `GSTR-3B Summary\nOutput Tax (Sales),${output.toFixed(2)}\nInput Tax Credit (Purchases),${input.toFixed(2)}\nNet Tax Payable,${Math.max(0, output - input).toFixed(2)}`;
const a = document.createElement('a');
a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
a.download = 'GSTR3B_' + new Date().toISOString().split('T')[0] + '.csv';
a.click();showToast('GSTR-3B exported ✓', 'success');}
function exportAll() {['purchases','invoices','inventory','suppliers','customers'].forEach((t, i) => setTimeout(() => exportData(t), i * 300));}
/* ═══════════════════════════════════════════════════════════
   REPORTS ENGINE — Full implementation
   ═══════════════════════════════════════════════════════════ */

function generateReport(type) {
  showToast(`Generating ${type} report…`, 'info');
  const container = document.getElementById('report-output');
  if (!container) return;
  container.innerHTML = '';
  container.style.display = 'block';

  switch (type) {
    case 'sales':     renderSalesReport(container);     break;
    case 'purchases': renderPurchasesReport(container); break;
    case 'inventory': renderInventoryReport(container); break;
    case 'pl':        renderPLReport(container);        break;
    case 'monthly':   renderMonthlyReport(container);   break;
  }

  // Scroll into view
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Shared helpers ────────────────────────────────────────── */
function fmtRs(n) { return '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function reportHeader(title, subtitle, icon) {
  return `<div class="rpt-header">
    <div class="rpt-header-icon">${icon}</div>
    <div>
      <div class="rpt-title">${title}</div>
      <div class="rpt-subtitle">${subtitle}</div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="document.getElementById('report-output').style.display='none'">✕ Close</button>
  </div>`;
}
function reportKPI(label, value, color, sub) {
  return `<div class="rpt-kpi" style="--kpi-color:${color}">
    <div class="rpt-kpi-value">${value}</div>
    <div class="rpt-kpi-label">${label}</div>
    ${sub ? `<div class="rpt-kpi-sub">${sub}</div>` : ''}
  </div>`;
}
function reportTable(headers, rows, emptyMsg) {
  if (!rows.length) return `<div class="empty-state"><div class="empty-icon">📋</div><h3>${emptyMsg || 'No data available'}</h3></div>`;
  return `<div class="rpt-table-wrap"><table class="rpt-table">
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}

/* ── SALES REPORT — Customer Dropdown + Month-on-Month ──────── */
function renderSalesReport(container) {
  // Collect unique customers who have at least one invoice
  const custNames = [...new Set(DB.invoices.map(i => i.customer).filter(Boolean))].sort();

  container.innerHTML = `
    ${reportHeader('Sales Report', 'Customer-wise · Month-on-Month Consumption', '📊')}

    <div class="rpt-customer-selector">
      <div class="rpt-cs-label">Select Customer</div>
      <div class="rpt-cs-row">
        <div class="rpt-cs-select-wrap">
          <select id="rpt-cust-dropdown" onchange="onSalesCustomerChange()">
            <option value="">— All Customers —</option>
            ${custNames.map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-gold btn-sm" onclick="exportSalesReportCSV()">↓ Export CSV</button>
      </div>
    </div>

    <div id="rpt-sales-body"></div>`;

  // Render with "All Customers" by default
  renderSalesBody('');
}

function onSalesCustomerChange() {
  const sel = document.getElementById('rpt-cust-dropdown');
  renderSalesBody(sel ? sel.value : '');
}

function renderSalesBody(selectedCustomer) {
  const body = document.getElementById('rpt-sales-body');
  if (!body) return;

  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function getMonthKey(dateStr) {
    const d = parseDMY(dateStr);
    if (!d || isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function getMonthLabel(key) {
    const [y, m] = key.split('-');
    return `${MONTHS_FULL[+m - 1]} ${y}`;
  }
  function fmtQty(q) { return q % 1 === 0 ? q : parseFloat(q).toFixed(3); }

  // Filter invoices
  const invs = selectedCustomer
    ? DB.invoices.filter(i => i.customer === selectedCustomer)
    : DB.invoices;

  if (!invs.length) {
    body.innerHTML = `<div class="rpt-empty-body"><div class="empty-state"><div class="empty-icon">📊</div><h3>No invoices found${selectedCustomer ? ` for "${selectedCustomer}"` : ''}</h3></div></div>`;
    return;
  }

  // ── KPIs ──────────────────────────────────────────────────
  const totalRevenue = invs.reduce((s, i) => s + parseFloat(i.total   || 0), 0);
  const totalTaxable = invs.reduce((s, i) => s + parseFloat(i.taxable || 0), 0);
  const totalGST     = invs.reduce((s, i) => s + parseFloat(i.gst     || 0), 0);
  const paid         = invs.filter(i => i.status === 'Paid');
  const pending      = invs.filter(i => i.status === 'Pending');

  // ── Build month map + overall item map ────────────────────
  const monthMap   = {};  // { monthKey: { invoices, revenue, taxable, gst, items: { prod: {qty,amount,unit} } } }
  const overallItems = {}; // { prod: { qty, amount, unit, months: { monthKey: {qty,amount} } } }

  invs.forEach(inv => {
    const k = getMonthKey(inv.date);
    if (!k) return;
    if (!monthMap[k]) monthMap[k] = { invoices: [], revenue: 0, taxable: 0, gst: 0, items: {} };
    monthMap[k].invoices.push(inv);
    monthMap[k].revenue  += parseFloat(inv.total   || 0);
    monthMap[k].taxable  += parseFloat(inv.taxable || 0);
    monthMap[k].gst      += parseFloat(inv.gst     || 0);

    try {
      JSON.parse(inv.items || '[]').forEach(li => {
        const prod = li.product || 'Unknown';
        const qty  = parseFloat(li.qty    || 0);
        const amt  = parseFloat(li.amount || 0);
        const unit = li.unit || '';

        // per-month items
        if (!monthMap[k].items[prod]) monthMap[k].items[prod] = { qty: 0, amount: 0, unit };
        monthMap[k].items[prod].qty    += qty;
        monthMap[k].items[prod].amount += amt;

        // overall items
        if (!overallItems[prod]) overallItems[prod] = { qty: 0, amount: 0, unit, months: {} };
        overallItems[prod].qty    += qty;
        overallItems[prod].amount += amt;
        if (!overallItems[prod].months[k]) overallItems[prod].months[k] = { qty: 0, amount: 0 };
        overallItems[prod].months[k].qty    += qty;
        overallItems[prod].months[k].amount += amt;
      });
    } catch(e){}
  });

  const sortedKeys = Object.keys(monthMap).sort();

  // ── Month-on-Month summary rows ───────────────────────────
  const momRows = sortedKeys.map((k, idx) => {
    const d    = monthMap[k];
    const prev = idx > 0 ? monthMap[sortedKeys[idx - 1]] : null;
    const growth = prev && prev.revenue > 0
      ? ((d.revenue - prev.revenue) / prev.revenue * 100).toFixed(1)
      : null;
    const growthBadge = growth !== null
      ? `<span class="rpt-growth ${+growth >= 0 ? 'up' : 'down'}">${+growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%</span>`
      : `<span style="font-size:10px;color:var(--text3)">—</span>`;
    return `<tr>
      <td><strong>${getMonthLabel(k)}</strong></td>
      <td>${d.invoices.length}</td>
      <td>${fmtRs(d.taxable)}</td>
      <td style="color:var(--green)">${fmtRs(d.gst)}</td>
      <td style="color:var(--gold);font-weight:700">${fmtRs(d.revenue)}</td>
      <td>${growthBadge}</td>
    </tr>`;
  });

  // ── Overall item-wise summary table ───────────────────────
  const overallItemRows = Object.entries(overallItems)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([prod, v], idx) => {
      const share = totalTaxable > 0 ? (v.amount / totalTaxable * 100).toFixed(1) : 0;
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${prod}</strong></td>
        <td style="color:var(--text3);font-size:11px">${v.unit || '—'}</td>
        <td style="color:var(--teal);font-weight:600">${fmtQty(v.qty)}</td>
        <td style="color:var(--gold);font-weight:700">${fmtRs(v.amount)}</td>
        <td>
          <div class="rpt-bar-wrap">
            <div class="rpt-bar-fill" style="width:${Math.min(100, share)}%"></div>
            <span class="rpt-bar-label">${share}%</span>
          </div>
        </td>
      </tr>`;
    });

  // ── Item × Month pivot table ──────────────────────────────
  // Columns: Item | Unit | Total Qty | Total Amt | [month1 amt] | [month2 amt] ...
  const pivotItemsSorted = Object.entries(overallItems).sort((a, b) => b[1].amount - a[1].amount);
  const pivotMonthHeaders = sortedKeys.map(k => `<th class="rpt-pivot-month">${getMonthLabel(k)}<br><span style="font-size:9px;font-weight:400;color:var(--text3)">Qty / Amt</span></th>`).join('');
  const pivotRows = pivotItemsSorted.map(([prod, v]) => {
    const monthCells = sortedKeys.map(k => {
      const m = v.months[k];
      if (!m) return `<td class="rpt-pivot-cell empty">—</td>`;
      return `<td class="rpt-pivot-cell">
        <span class="rpt-pivot-qty">${fmtQty(m.qty)} ${v.unit || ''}</span>
        <span class="rpt-pivot-amt">${fmtRs(m.amount)}</span>
      </td>`;
    }).join('');
    return `<tr>
      <td><strong>${prod}</strong></td>
      <td style="color:var(--text3);font-size:11px">${v.unit || '—'}</td>
      <td style="color:var(--teal);font-weight:700">${fmtQty(v.qty)}</td>
      <td style="color:var(--gold);font-weight:700">${fmtRs(v.amount)}</td>
      ${monthCells}
    </tr>`;
  }).join('');

  // Pivot totals row
  const pivotTotalCells = sortedKeys.map(k => {
    const d = monthMap[k];
    return `<td class="rpt-pivot-cell" style="font-weight:700;color:var(--gold)">${fmtRs(d.revenue)}</td>`;
  }).join('');

  // ── Per-month accordion blocks ────────────────────────────
  const monthBlocks = sortedKeys.map(k => {
    const d = monthMap[k];
    const itemEntries = Object.entries(d.items).sort((a, b) => b[1].amount - a[1].amount);

    const itemRows = itemEntries.map(([prod, v]) =>
      `<tr>
        <td><strong>${prod}</strong></td>
        <td style="color:var(--text3);font-size:11px">${v.unit || '—'}</td>
        <td style="color:var(--teal);font-weight:600">${fmtQty(v.qty)}</td>
        <td style="color:var(--gold);font-weight:700">${fmtRs(v.amount)}</td>
      </tr>`
    ).join('');

    const custCol  = !selectedCustomer ? '<th>Customer</th>' : '';
    const custCell = !selectedCustomer ? inv => `<td>${inv.customer || '-'}</td>` : () => '';
    const invRows  = d.invoices.map(inv =>
      `<tr>
        <td><strong>${inv.invNum || inv.id}</strong></td>
        <td>${migrateDateField(inv.date) || '-'}</td>
        ${custCell(inv)}
        <td>${fmtRs(inv.taxable)}</td>
        <td style="color:var(--green)">${fmtRs(inv.gst)}</td>
        <td style="color:var(--gold);font-weight:700">${fmtRs(inv.total)}</td>
        <td>${badge(inv.status || 'Pending')}</td>
      </tr>`
    ).join('');

    return `
      <div class="rpt-month-block">
        <div class="rpt-month-header" onclick="toggleMonthBlock(this)">
          <div class="rpt-month-label">
            <span class="rpt-month-chevron">▶</span>
            <strong>${getMonthLabel(k)}</strong>
            <span class="rpt-month-inv-count">${d.invoices.length} invoice${d.invoices.length !== 1 ? 's' : ''}</span>
            <span class="rpt-month-inv-count" style="color:var(--teal);border-color:rgba(78,205,196,.25)">${itemEntries.length} item${itemEntries.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="rpt-month-total">${fmtRs(d.revenue)}</div>
        </div>
        <div class="rpt-month-body" style="display:none">
          <div class="rpt-month-two-col">
            <div>
              <div class="rpt-mini-title">Items Consumed</div>
              <table class="rpt-table rpt-mini-table">
                <thead><tr><th>Product</th><th>Unit</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>${itemRows || '<tr><td colspan="4" style="color:var(--text3);padding:10px 16px">No item data</td></tr>'}</tbody>
              </table>
            </div>
            <div>
              <div class="rpt-mini-title">Invoices</div>
              <table class="rpt-table rpt-mini-table">
                <thead><tr><th>Invoice #</th><th>Date</th>${custCol}<th>Taxable</th><th>GST</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>${invRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  // ── Assemble full body ────────────────────────────────────
  body.innerHTML = `
    <div class="rpt-kpi-grid">
      ${reportKPI('Total Revenue',  fmtRs(totalRevenue),  'var(--gold)',   `${invs.length} invoices`)}
      ${reportKPI('Taxable Amount', fmtRs(totalTaxable),  'var(--teal)',   'Excl. GST')}
      ${reportKPI('GST Collected',  fmtRs(totalGST),      'var(--green)',  'Output tax')}
      ${reportKPI('Paid',           fmtRs(paid.reduce((s,i)=>s+parseFloat(i.total||0),0)),    'var(--green)',  `${paid.length} invoices`)}
      ${reportKPI('Pending',        fmtRs(pending.reduce((s,i)=>s+parseFloat(i.total||0),0)), 'var(--orange)', `${pending.length} invoices`)}
      ${reportKPI('Months Active',  sortedKeys.length, 'var(--blue)', selectedCustomer ? 'For this customer' : 'Total months')}
    </div>

    <div class="rpt-section-title">Month-on-Month Revenue Summary</div>
    <div class="rpt-table-wrap">
      ${reportTable(['Month','Invoices','Taxable','GST','Revenue','vs Prev Month'], momRows, 'No data')}
    </div>

    <div class="rpt-section-title" style="margin-top:4px">Item-wise Consumption — Overall Totals</div>
    <div class="rpt-table-wrap">
      ${overallItemRows.length
        ? `<table class="rpt-table">
            <thead><tr><th>#</th><th>Product</th><th>Unit</th><th>Total Qty</th><th>Total Amount</th><th style="min-width:160px">Share of Revenue</th></tr></thead>
            <tbody>${overallItemRows.join('')}</tbody>
           </table>`
        : `<div class="empty-state" style="padding:30px"><div class="empty-icon">📦</div><h3>No item data</h3></div>`
      }
    </div>

    <div class="rpt-section-title" style="margin-top:4px">Item × Month Pivot — Consumption Trend</div>
    <div class="rpt-table-wrap rpt-pivot-wrap">
      ${pivotItemsSorted.length
        ? `<table class="rpt-table rpt-pivot-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th>Total Qty</th>
                <th>Total Amt</th>
                ${pivotMonthHeaders}
              </tr>
            </thead>
            <tbody>
              ${pivotRows}
              <tr class="rpt-pivot-total-row">
                <td colspan="2"><strong>Month Total</strong></td>
                <td>—</td>
                <td style="color:var(--gold);font-weight:700">${fmtRs(totalRevenue)}</td>
                ${pivotTotalCells}
              </tr>
            </tbody>
           </table>`
        : `<div class="empty-state" style="padding:30px"><div class="empty-icon">📊</div><h3>No pivot data</h3></div>`
      }
    </div>

    <div class="rpt-section-title" style="margin-top:4px">Monthly Consumption Detail</div>
    <div class="rpt-month-accordion">${monthBlocks}</div>

    <div class="rpt-actions">
      <button class="btn btn-gold btn-sm" onclick="exportSalesReportCSV()">↓ Export Invoice CSV</button>
      <button class="btn btn-teal btn-sm" onclick="exportItemWiseCSV()">↓ Export Item-wise CSV</button>
      <button class="btn btn-outline btn-sm" onclick="exportPivotCSV()">↓ Export Pivot CSV</button>
    </div>`;
}

function toggleMonthBlock(header) {
  const body = header.nextElementSibling;
  const chevron = header.querySelector('.rpt-month-chevron');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  chevron.textContent = isOpen ? '▶' : '▼';
  chevron.style.color = isOpen ? '' : 'var(--gold)';
}

function exportSalesReportCSV() {
  const sel = document.getElementById('rpt-cust-dropdown');
  const selectedCustomer = sel ? sel.value : '';
  const invs = selectedCustomer
    ? DB.invoices.filter(i => i.customer === selectedCustomer)
    : DB.invoices;

  if (!invs.length) { showToast('No data to export', 'error'); return; }

  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function getMonthLabel(dateStr) {
    const d = parseDMY(dateStr);
    if (!d || isNaN(d)) return '-';
    return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Flatten invoice + item lines
  const header = 'Month,Invoice #,Date,Customer,Product,Qty,Unit,Rate,Amount,Taxable,GST,Invoice Total,Status';
  const rows = [];
  invs.slice().sort((a, b) => {
    const da = parseDMY(a.date), db = parseDMY(b.date);
    return (da || 0) - (db || 0);
  }).forEach(inv => {
    let lineItems = [];
    try { lineItems = JSON.parse(inv.items || '[]'); } catch(e){}
    if (lineItems.length) {
      lineItems.forEach(li => {
        rows.push([
          `"${getMonthLabel(inv.date)}"`,
          `"${inv.invNum || inv.id}"`,
          `"${migrateDateField(inv.date) || ''}"`,
          `"${inv.customer || ''}"`,
          `"${li.product || ''}"`,
          li.qty || 0,
          `"${li.unit || ''}"`,
          li.rate || 0,
          parseFloat(li.amount || 0).toFixed(2),
          parseFloat(inv.taxable || 0).toFixed(2),
          parseFloat(inv.gst || 0).toFixed(2),
          parseFloat(inv.total || 0).toFixed(2),
          `"${inv.status || ''}"`
        ].join(','));
      });
    } else {
      rows.push([
        `"${getMonthLabel(inv.date)}"`,
        `"${inv.invNum || inv.id}"`,
        `"${migrateDateField(inv.date) || ''}"`,
        `"${inv.customer || ''}"`,
        '""', 0, '""', 0, 0,
        parseFloat(inv.taxable || 0).toFixed(2),
        parseFloat(inv.gst || 0).toFixed(2),
        parseFloat(inv.total || 0).toFixed(2),
        `"${inv.status || ''}"`
      ].join(','));
    }
  });

  const csv = [header, ...rows].join('\n');
  const filename = selectedCustomer
    ? `Sales_${selectedCustomer.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.csv`
    : `Sales_All_${new Date().toISOString().split('T')[0]}.csv`;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
  showToast('Sales report exported ✓', 'success');
}

function exportItemWiseCSV() {
  const sel = document.getElementById('rpt-cust-dropdown');
  const selectedCustomer = sel ? sel.value : '';
  const invs = selectedCustomer
    ? DB.invoices.filter(i => i.customer === selectedCustomer)
    : DB.invoices;
  if (!invs.length) { showToast('No data to export', 'error'); return; }

  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function getMonthKey(dateStr) {
    const d = parseDMY(dateStr);
    if (!d || isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  function getMonthLabel(k) {
    const [y, m] = k.split('-');
    return `${MONTHS_FULL[+m-1]} ${y}`;
  }

  // Build overall item map
  const itemMap = {};
  invs.forEach(inv => {
    const mk = getMonthKey(inv.date);
    try {
      JSON.parse(inv.items || '[]').forEach(li => {
        const prod = li.product || 'Unknown';
        const qty  = parseFloat(li.qty || 0);
        const amt  = parseFloat(li.amount || 0);
        const unit = li.unit || '';
        if (!itemMap[prod]) itemMap[prod] = { unit, totalQty: 0, totalAmt: 0, months: {} };
        itemMap[prod].totalQty += qty;
        itemMap[prod].totalAmt += amt;
        if (mk) {
          if (!itemMap[prod].months[mk]) itemMap[prod].months[mk] = { qty: 0, amount: 0 };
          itemMap[prod].months[mk].qty    += qty;
          itemMap[prod].months[mk].amount += amt;
        }
      });
    } catch(e){}
  });

  const sortedMonths = [...new Set(invs.map(i => getMonthKey(i.date)).filter(Boolean))].sort();
  const header = ['Product','Unit','Total Qty','Total Amount', ...sortedMonths.map(getMonthLabel).flatMap(m => [`${m} Qty`, `${m} Amt`])].join(',');
  const rows = Object.entries(itemMap).sort((a,b)=>b[1].totalAmt-a[1].totalAmt).map(([prod, v]) => {
    const monthCols = sortedMonths.flatMap(k => {
      const m = v.months[k];
      return m ? [m.qty, m.amount.toFixed(2)] : [0, '0.00'];
    });
    return [`"${prod}"`, `"${v.unit}"`, v.totalQty, v.totalAmt.toFixed(2), ...monthCols].join(',');
  });

  const suffix = selectedCustomer ? `_${selectedCustomer.replace(/\s+/g,'_')}` : '_All';
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([header,...rows].join('\n'));
  a.download = `ItemWise${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Item-wise report exported ✓', 'success');
}

function exportPivotCSV() {
  const sel = document.getElementById('rpt-cust-dropdown');
  const selectedCustomer = sel ? sel.value : '';
  const invs = selectedCustomer
    ? DB.invoices.filter(i => i.customer === selectedCustomer)
    : DB.invoices;
  if (!invs.length) { showToast('No data to export', 'error'); return; }

  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function getMonthKey(dateStr) {
    const d = parseDMY(dateStr);
    if (!d || isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  function getMonthLabel(k) {
    const [y, m] = k.split('-');
    return `${MONTHS_FULL[+m-1]} ${y}`;
  }

  const sortedMonths = [...new Set(invs.map(i => getMonthKey(i.date)).filter(Boolean))].sort();
  const itemMap = {};
  invs.forEach(inv => {
    const mk = getMonthKey(inv.date);
    try {
      JSON.parse(inv.items || '[]').forEach(li => {
        const prod = li.product || 'Unknown';
        if (!itemMap[prod]) itemMap[prod] = { unit: li.unit || '', months: {} };
        if (mk) {
          if (!itemMap[prod].months[mk]) itemMap[prod].months[mk] = { qty: 0, amount: 0 };
          itemMap[prod].months[mk].qty    += parseFloat(li.qty || 0);
          itemMap[prod].months[mk].amount += parseFloat(li.amount || 0);
        }
      });
    } catch(e){}
  });

  const header = ['Product','Unit', ...sortedMonths.map(getMonthLabel).flatMap(m => [`${m} Qty`,`${m} Amt`])].join(',');
  const rows = Object.entries(itemMap).map(([prod, v]) => {
    const cols = sortedMonths.flatMap(k => {
      const m = v.months[k];
      return m ? [m.qty, m.amount.toFixed(2)] : [0,'0.00'];
    });
    return [`"${prod}"`,`"${v.unit}"`, ...cols].join(',');
  });

  const suffix = selectedCustomer ? `_${selectedCustomer.replace(/\s+/g,'_')}` : '_All';
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([header,...rows].join('\n'));
  a.download = `Pivot${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Pivot report exported ✓', 'success');
}


function renderPurchasesReport(container) {
  const purs = DB.purchases;
  const totalAmt = purs.reduce((s, p) => s + parseFloat(p.total || 0), 0);
  const totalGST = purs.reduce((s, p) => s + parseFloat(p.gstAmt || 0), 0);
  const totalTaxable = purs.reduce((s, p) => s + parseFloat(p.taxable || 0), 0);

  // Supplier-wise
  const supMap = {};
  purs.forEach(p => {
    const s = p.supplier || 'Unknown';
    if (!supMap[s]) supMap[s] = { count: 0, total: 0, gst: 0 };
    supMap[s].count++;
    supMap[s].total += parseFloat(p.total || 0);
    supMap[s].gst += parseFloat(p.gstAmt || 0);
  });
  const supRows = Object.entries(supMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d], idx) => `<tr>
      <td>${idx + 1}</td>
      <td><strong>${name}</strong></td>
      <td>${d.count}</td>
      <td>${fmtRs(d.total - d.gst)}</td>
      <td style="color:var(--green)">${fmtRs(d.gst)}</td>
      <td style="color:var(--gold);font-weight:700">${fmtRs(d.total)}</td>
    </tr>`);

  // Item-wise
  const itemMap = {};
  purs.forEach(p => {
    const it = p.item || 'Unknown';
    if (!itemMap[it]) itemMap[it] = { count: 0, qty: 0, total: 0 };
    itemMap[it].count++;
    itemMap[it].qty += parseFloat(p.qty || 0);
    itemMap[it].total += parseFloat(p.total || 0);
  });
  const itemRows = Object.entries(itemMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d], idx) => `<tr>
      <td>${idx + 1}</td>
      <td><strong>${name}</strong></td>
      <td>${d.count}</td>
      <td>${d.qty}</td>
      <td style="color:var(--gold);font-weight:700">${fmtRs(d.total)}</td>
    </tr>`);

  container.innerHTML = `
    ${reportHeader('Purchase Report', `${purs.length} entries · All time`, '🛒')}
    <div class="rpt-kpi-grid">
      ${reportKPI('Total Purchases', fmtRs(totalAmt), 'var(--gold)', `${purs.length} entries`)}
      ${reportKPI('Taxable Amount', fmtRs(totalTaxable), 'var(--teal)', 'Excl. GST')}
      ${reportKPI('GST Paid (ITC)', fmtRs(totalGST), 'var(--green)', 'Input tax credit')}
      ${reportKPI('Suppliers', DB.suppliers.length, 'var(--orange)', 'Active suppliers')}
    </div>

    <div class="rpt-section-title">Supplier-wise Purchases</div>
    ${reportTable(['#','Supplier','Orders','Taxable','GST (ITC)','Total'], supRows, 'No supplier data')}

    <div class="rpt-section-title" style="margin-top:24px">Item-wise Purchases</div>
    ${reportTable(['#','Item','Orders','Total Qty','Total Paid'], itemRows, 'No item data')}

    <div class="rpt-actions">
      <button class="btn btn-gold btn-sm" onclick="exportReportCSV('purchases')">↓ Export CSV</button>
    </div>`;
}

/* ── INVENTORY REPORT ─────────────────────────────────────── */
function renderInventoryReport(container) {
  const items = DB.items;
  const purchasedMap = {};
  DB.purchases.forEach(p => {
    if (p.item) { const q = parseFloat(p.qty); purchasedMap[p.item] = (purchasedMap[p.item] || 0) + (isNaN(q) ? 0 : q); }
  });
  const invoicedMap = {};
  DB.invoices.forEach(inv => {
    try { JSON.parse(inv.items || '[]').forEach(li => {
      if (li.product) { const q = parseFloat(li.qty); invoicedMap[li.product] = (invoicedMap[li.product] || 0) + (isNaN(q) ? 0 : q); }
    }); } catch(e){}
  });

  let totalStockValue = 0, lowStockCount = 0, outOfStock = 0;
  const itemRows = items.map((item, idx) => {
    const opening = parseFloat(item.openingStock ?? item.stock ?? 0);
    const purchased = purchasedMap[item.name] || 0;
    const invoiced = invoicedMap[item.name] || 0;
    const stock = Math.max(0, opening + purchased - invoiced);
    const minStock = parseFloat(item.minStock || 0);
    const stockValue = stock * parseFloat(item.pprice || 0);
    totalStockValue += stockValue;
    if (stock <= 0) outOfStock++;
    else if (stock <= minStock) lowStockCount++;
    const statusColor = stock <= 0 ? 'var(--red)' : stock <= minStock ? 'var(--orange)' : 'var(--green)';
    const statusLabel = stock <= 0 ? 'Out of Stock' : stock <= minStock ? 'Low Stock' : 'In Stock';
    return `<tr>
      <td>${idx + 1}</td>
      <td><strong>${item.name}</strong></td>
      <td><small style="color:var(--text3)">${item.category || '-'}</small></td>
      <td>${opening}</td>
      <td style="color:var(--teal)">+${purchased}</td>
      <td style="color:var(--orange)">-${invoiced}</td>
      <td style="color:${statusColor};font-weight:700">${stock}</td>
      <td>${minStock}</td>
      <td>${fmtRs(item.pprice || 0)}</td>
      <td style="color:var(--gold);font-weight:700">${fmtRs(stockValue)}</td>
      <td><span class="badge ${stock <= 0 ? 'badge-red' : stock <= minStock ? 'badge-orange' : 'badge-green'}">${statusLabel}</span></td>
    </tr>`;
  });

  container.innerHTML = `
    ${reportHeader('Inventory Report', `${items.length} products · Stock snapshot`, '📦')}
    <div class="rpt-kpi-grid">
      ${reportKPI('Total Items', items.length, 'var(--gold)', 'SKUs in inventory')}
      ${reportKPI('Stock Value', fmtRs(totalStockValue), 'var(--teal)', 'At purchase price')}
      ${reportKPI('Low Stock', lowStockCount, 'var(--orange)', 'Need reorder')}
      ${reportKPI('Out of Stock', outOfStock, 'var(--red)', 'Zero quantity')}
    </div>

    <div class="rpt-section-title">Stock Ledger</div>
    ${reportTable(['#','Product','Category','Opening','Purchased','Invoiced','Current','Min Stock','Buy Price','Stock Value','Status'], itemRows, 'No inventory data')}

    <div class="rpt-actions">
      <button class="btn btn-gold btn-sm" onclick="exportData('inventory')">↓ Export CSV</button>
    </div>`;
}

/* ── PROFIT & LOSS ────────────────────────────────────────── */
function renderPLReport(container) {
  const totalRevenue = DB.invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const totalRevenueTaxable = DB.invoices.reduce((s, i) => s + parseFloat(i.taxable || 0), 0);
  const outputGST = DB.invoices.reduce((s, i) => s + parseFloat(i.gst || 0), 0);
  const totalPurchases = DB.purchases.reduce((s, p) => s + parseFloat(p.total || 0), 0);
  const totalPurTaxable = DB.purchases.reduce((s, p) => s + parseFloat(p.taxable || 0), 0);
  const inputGST = DB.purchases.reduce((s, p) => s + parseFloat(p.gstAmt || 0), 0);
  const grossProfit = totalRevenueTaxable - totalPurTaxable;
  const netGST = Math.max(0, outputGST - inputGST);
  const netProfit = grossProfit - netGST;
  const margin = totalRevenueTaxable > 0 ? (grossProfit / totalRevenueTaxable * 100).toFixed(1) : 0;

  // Category-wise P&L
  const catMap = {};
  DB.invoices.forEach(inv => {
    try {
      JSON.parse(inv.items || '[]').forEach(li => {
        const item = DB.items.find(i => i.name === li.product);
        const cat = item?.category || 'Uncategorized';
        const rev = parseFloat(li.amount || 0);
        const cost = parseFloat(li.qty || 0) * parseFloat(item?.pprice || 0);
        if (!catMap[cat]) catMap[cat] = { revenue: 0, cost: 0 };
        catMap[cat].revenue += rev;
        catMap[cat].cost += cost;
      });
    } catch(e){}
  });
  const catRows = Object.entries(catMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([cat, d], idx) => {
      const profit = d.revenue - d.cost;
      const catMargin = d.revenue > 0 ? (profit / d.revenue * 100).toFixed(1) : 0;
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${cat}</strong></td>
        <td>${fmtRs(d.revenue)}</td>
        <td>${fmtRs(d.cost)}</td>
        <td style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${fmtRs(profit)}</td>
        <td style="color:${catMargin >= 0 ? 'var(--teal)' : 'var(--red)'}">${catMargin}%</td>
      </tr>`;
    });

  container.innerHTML = `
    ${reportHeader('Profit & Loss', 'Revenue vs Cost analysis · All time', '💰')}
    <div class="rpt-kpi-grid">
      ${reportKPI('Total Revenue', fmtRs(totalRevenue), 'var(--gold)', 'Incl. GST')}
      ${reportKPI('Taxable Revenue', fmtRs(totalRevenueTaxable), 'var(--teal)', 'Excl. GST')}
      ${reportKPI('Total Purchases', fmtRs(totalPurchases), 'var(--red)', 'Cost of goods')}
      ${reportKPI('Gross Profit', fmtRs(grossProfit), grossProfit >= 0 ? 'var(--green)' : 'var(--red)', `${margin}% margin`)}
      ${reportKPI('Net GST Payable', fmtRs(netGST), 'var(--orange)', 'Output − Input')}
      ${reportKPI('Net Profit (est.)', fmtRs(netProfit), netProfit >= 0 ? 'var(--green)' : 'var(--red)', 'After GST liability')}
    </div>

    <div class="rpt-pl-statement">
      <div class="rpt-section-title" style="margin-bottom:12px">P&L Statement</div>
      <div class="rpt-pl-row"><span>Revenue (Taxable)</span><span style="color:var(--gold)">${fmtRs(totalRevenueTaxable)}</span></div>
      <div class="rpt-pl-row"><span>Output GST Collected</span><span style="color:var(--green)">${fmtRs(outputGST)}</span></div>
      <div class="rpt-pl-row bold"><span>Gross Revenue (Incl. GST)</span><span>${fmtRs(totalRevenue)}</span></div>
      <div class="rpt-pl-divider"></div>
      <div class="rpt-pl-row"><span>Cost of Purchases (Taxable)</span><span style="color:var(--red)">- ${fmtRs(totalPurTaxable)}</span></div>
      <div class="rpt-pl-row"><span>Input Tax Credit (ITC)</span><span style="color:var(--green)">+ ${fmtRs(inputGST)}</span></div>
      <div class="rpt-pl-row bold"><span>Gross Profit</span><span style="color:${grossProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtRs(grossProfit)}</span></div>
      <div class="rpt-pl-divider"></div>
      <div class="rpt-pl-row"><span>Net GST Payable (Output − ITC)</span><span style="color:var(--orange)">- ${fmtRs(netGST)}</span></div>
      <div class="rpt-pl-row bold final"><span>Estimated Net Profit</span><span style="color:${netProfit >= 0 ? 'var(--gold)' : 'var(--red)'}">${fmtRs(netProfit)}</span></div>
    </div>

    ${catRows.length ? `<div class="rpt-section-title" style="margin-top:24px">Category-wise Profitability</div>
    ${reportTable(['#','Category','Revenue','Est. Cost','Gross Profit','Margin'], catRows, 'No category data')}` : ''}

    <div class="rpt-actions">
      <button class="btn btn-gold btn-sm" onclick="exportPLCSV()">↓ Export P&L CSV</button>
    </div>`;
}

/* ── MONTHLY SUMMARY ──────────────────────────────────────── */
function renderMonthlyReport(container) {
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Build month map
  const monthMap = {};
  function getKey(dateStr) {
    const d = parseDMY(dateStr);
    if (!d || isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function getLabel(key) {
    const [y, m] = key.split('-');
    return `${MONTHS_FULL[+m - 1]} ${y}`;
  }

  DB.invoices.forEach(i => {
    const k = getKey(i.date);
    if (!k) return;
    if (!monthMap[k]) monthMap[k] = { revenue: 0, purchases: 0, gstOut: 0, gstIn: 0, invCount: 0, purCount: 0 };
    monthMap[k].revenue += parseFloat(i.total || 0);
    monthMap[k].gstOut += parseFloat(i.gst || 0);
    monthMap[k].invCount++;
  });
  DB.purchases.forEach(p => {
    const k = getKey(p.date);
    if (!k) return;
    if (!monthMap[k]) monthMap[k] = { revenue: 0, purchases: 0, gstOut: 0, gstIn: 0, invCount: 0, purCount: 0 };
    monthMap[k].purchases += parseFloat(p.total || 0);
    monthMap[k].gstIn += parseFloat(p.gstAmt || 0);
    monthMap[k].purCount++;
  });

  const sortedKeys = Object.keys(monthMap).sort();
  const monthRows = sortedKeys.map(k => {
    const d = monthMap[k];
    const profit = d.revenue - d.purchases;
    const netGST = Math.max(0, d.gstOut - d.gstIn);
    return `<tr>
      <td><strong>${getLabel(k)}</strong></td>
      <td>${d.invCount}</td>
      <td style="color:var(--gold)">${fmtRs(d.revenue)}</td>
      <td>${d.purCount}</td>
      <td style="color:var(--red)">${fmtRs(d.purchases)}</td>
      <td style="color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${fmtRs(profit)}</td>
      <td style="color:var(--teal)">${fmtRs(d.gstOut)}</td>
      <td style="color:var(--green)">${fmtRs(d.gstIn)}</td>
      <td style="color:var(--orange)">${fmtRs(netGST)}</td>
    </tr>`;
  });

  // Totals row
  const totals = sortedKeys.reduce((acc, k) => {
    const d = monthMap[k];
    acc.revenue += d.revenue; acc.purchases += d.purchases;
    acc.gstOut += d.gstOut; acc.gstIn += d.gstIn;
    acc.invCount += d.invCount; acc.purCount += d.purCount;
    return acc;
  }, { revenue: 0, purchases: 0, gstOut: 0, gstIn: 0, invCount: 0, purCount: 0 });

  const bestMonthKey = sortedKeys.reduce((best, k) => (!best || monthMap[k].revenue > monthMap[best].revenue) ? k : best, null);
  const bestMonth = bestMonthKey ? getLabel(bestMonthKey) : '-';

  container.innerHTML = `
    ${reportHeader('Monthly Summary', `${sortedKeys.length} months of data`, '📅')}
    <div class="rpt-kpi-grid">
      ${reportKPI('Total Revenue', fmtRs(totals.revenue), 'var(--gold)', `${totals.invCount} invoices`)}
      ${reportKPI('Total Purchases', fmtRs(totals.purchases), 'var(--red)', `${totals.purCount} entries`)}
      ${reportKPI('Gross Profit', fmtRs(totals.revenue - totals.purchases), (totals.revenue >= totals.purchases) ? 'var(--green)' : 'var(--red)', 'Revenue − Purchases')}
      ${reportKPI('Best Month', bestMonth, 'var(--teal)', bestMonthKey ? fmtRs(monthMap[bestMonthKey].revenue) : '-')}
    </div>

    <div class="rpt-section-title">Month-by-Month Breakdown</div>
    ${sortedKeys.length
      ? reportTable(
          ['Month','Invoices','Revenue','Purchases','Purchase Cost','Gross Profit','GST Output','GST Input','Net GST'],
          monthRows
        )
      : `<div class="empty-state"><div class="empty-icon">📅</div><h3>No monthly data yet</h3></div>`
    }

    <div class="rpt-actions">
      <button class="btn btn-gold btn-sm" onclick="exportMonthlyCSV()">↓ Export CSV</button>
    </div>`;
}

/* ── Export helpers ──────────────────────────────────────── */
function exportReportCSV(type) { exportData(type === 'sales' ? 'invoices' : 'purchases'); }

function exportPLCSV() {
  const totalRevenue = DB.invoices.reduce((s,i)=>s+parseFloat(i.total||0),0);
  const totalTaxable = DB.invoices.reduce((s,i)=>s+parseFloat(i.taxable||0),0);
  const outputGST = DB.invoices.reduce((s,i)=>s+parseFloat(i.gst||0),0);
  const totalPurTaxable = DB.purchases.reduce((s,p)=>s+parseFloat(p.taxable||0),0);
  const inputGST = DB.purchases.reduce((s,p)=>s+parseFloat(p.gstAmt||0),0);
  const grossProfit = totalTaxable - totalPurTaxable;
  const netGST = Math.max(0, outputGST - inputGST);
  const csv = `Profit & Loss Report\nMetric,Amount\nRevenue (Taxable),${totalTaxable.toFixed(2)}\nOutput GST,${outputGST.toFixed(2)}\nGross Revenue (Incl GST),${totalRevenue.toFixed(2)}\nCost of Purchases,${totalPurTaxable.toFixed(2)}\nInput Tax Credit,${inputGST.toFixed(2)}\nGross Profit,${grossProfit.toFixed(2)}\nNet GST Payable,${netGST.toFixed(2)}\nEstimated Net Profit,${(grossProfit - netGST).toFixed(2)}`;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'PL_Report_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('P&L exported ✓', 'success');
}

function exportMonthlyCSV() {
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function getKey(dateStr) {
    const d = parseDMY(dateStr);
    if (!d || isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  const monthMap = {};
  DB.invoices.forEach(i => {
    const k = getKey(i.date); if (!k) return;
    if (!monthMap[k]) monthMap[k] = {revenue:0,purchases:0,gstOut:0,gstIn:0,invCount:0,purCount:0};
    monthMap[k].revenue += parseFloat(i.total||0); monthMap[k].gstOut += parseFloat(i.gst||0); monthMap[k].invCount++;
  });
  DB.purchases.forEach(p => {
    const k = getKey(p.date); if (!k) return;
    if (!monthMap[k]) monthMap[k] = {revenue:0,purchases:0,gstOut:0,gstIn:0,invCount:0,purCount:0};
    monthMap[k].purchases += parseFloat(p.total||0); monthMap[k].gstIn += parseFloat(p.gstAmt||0); monthMap[k].purCount++;
  });
  const sortedKeys = Object.keys(monthMap).sort();
  const header = 'Month,Invoices,Revenue,Purchases,Gross Profit,GST Output,GST Input,Net GST';
  const rows = sortedKeys.map(k => {
    const d = monthMap[k];
    const label = `${MONTHS_FULL[+k.split('-')[1]-1]} ${k.split('-')[0]}`;
    return `"${label}",${d.invCount},${d.revenue.toFixed(2)},${d.purchases.toFixed(2)},${(d.revenue-d.purchases).toFixed(2)},${d.gstOut.toFixed(2)},${d.gstIn.toFixed(2)},${Math.max(0,d.gstOut-d.gstIn).toFixed(2)}`;
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([header,...rows].join('\n'));
  a.download = 'Monthly_Report_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('Monthly report exported ✓', 'success');
}
document.addEventListener('DOMContentLoaded', () => {});