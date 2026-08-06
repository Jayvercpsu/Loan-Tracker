const STORAGE_KEY = "loanTrackerData_v4";
const THEME_KEY = "loanTrackerTheme_v3";

const DEMO_DATA = [
  {
    id: crypto.randomUUID(),
    provider: "Tiktok",
    payments: [{ id: crypto.randomUUID(), date: "2026-08-16", amount: 616.68, paid: false }]
  },
  {
    id: crypto.randomUUID(),
    provider: "Billease",
    payments: [
      { id: crypto.randomUUID(), date: "2026-08-03", amount: 150, paid: false },
      { id: crypto.randomUUID(), date: "2026-08-03", amount: 226, paid: false },
      { id: crypto.randomUUID(), date: "2026-08-17", amount: 264, paid: false },
      { id: crypto.randomUUID(), date: "2026-08-17", amount: 599, paid: false }
    ]
  },
  {
    id: crypto.randomUUID(),
    provider: "Atome",
    payments: [
      { id: crypto.randomUUID(), date: "2026-08-01", amount: 657, paid: false },
      { id: crypto.randomUUID(), date: "2026-08-21", amount: 583, paid: false }
    ]
  },
  {
    id: crypto.randomUUID(),
    provider: "Gcash",
    payments: [{ id: crypto.randomUUID(), date: "2026-08-04", amount: 685, paid: false }]
  },
  {
    id: crypto.randomUUID(),
    provider: "Home Credit",
    payments: [{ id: crypto.randomUUID(), date: "2026-08-02", amount: 1542, paid: false }]
  }
];

let state = {
  expenses: [],
  paidHistory: [],
  deleteHistory: [],
  currentView: "active",
  selectedPayments: []
};

let pendingAction = null;
let editContext = null;
let deleteContext = null;

const ICONS = {
  edit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>'
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

document.addEventListener("DOMContentLoaded", init);

function init() {
  loadData();
  loadTheme();
  bindEvents();
  renderAll();
  closeSidebar();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    expenses: state.expenses,
    paidHistory: state.paidHistory,
    deleteHistory: state.deleteHistory
  }));
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      state.expenses = data.expenses || [];
      state.paidHistory = data.paidHistory || [];
      state.deleteHistory = data.deleteHistory || [];
      if (state.expenses.length || state.paidHistory.length || state.deleteHistory.length) return;
    } catch { return; }
  }
  const savedV3 = localStorage.getItem("loanTrackerData_v3");
  if (savedV3) {
    try {
      const data = JSON.parse(savedV3);
      state.expenses = data.expenses || [];
      const history = data.history || [];
      state.paidHistory = history.filter(h => h.status === "Completed").map(h => ({ ...h }));
      state.deleteHistory = history.filter(h => h.status === "Removed").map(h => ({ ...h }));
      localStorage.removeItem("loanTrackerData_v3");
      saveData();
      if (state.expenses.length || state.paidHistory.length || state.deleteHistory.length) return;
    } catch {}
  }
  state.expenses = JSON.parse(JSON.stringify(DEMO_DATA));
  state.paidHistory = [];
  state.deleteHistory = [];
  saveData();
}

function loadTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme !== "dark") {
    document.body.classList.add("light-mode");
    updateThemeIcons(true);
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle("light-mode");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
  updateThemeIcons(isLight);
}

function updateThemeIcons(isLight) {
  const icon = isLight ? "☾" : "☀";
  const text = isLight ? "Dark Mode" : "Light Mode";
  $("#themeToggle").textContent = icon;
  $("#sidebarThemeIcon").textContent = icon;
  $("#sidebarThemeText").textContent = text;
}

function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
}

function formatDate(dateString) {
  const d = new Date(dateString + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getExpenseTotal(expense) {
  return expense.payments.reduce((t, p) => t + Number(p.amount), 0);
}

function getExpensePaid(expense) {
  return expense.payments.reduce((t, p) => p.paid ? t + Number(p.amount) : t, 0);
}

function isExpenseCompleted(expense) {
  return expense.payments.length > 0 && expense.payments.every(p => p.paid);
}

function updateOverallTotal() {
  const total = state.expenses.reduce((s, e) => s + getExpenseTotal(e), 0);
  $("#overallTotal").textContent = `Total: ${formatCurrency(total)}`;
}

/* ── Sidebar ── */
function openSidebar() {
  $("#sidebarDrawer").classList.add("open");
  $("#sidebarBackdrop").classList.add("open");
}

function closeSidebar() {
  $("#sidebarDrawer").classList.remove("open");
  $("#sidebarBackdrop").classList.remove("open");
}

/* ── View Switching ── */
function switchView(view) {
  state.currentView = view;
  clearSelection();
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  $$(".drawer-item[data-view]").forEach(d => d.classList.toggle("active", d.dataset.view === view));
  $$(".view").forEach(v => v.classList.remove("active-view"));
  $(`#${view}View`).classList.add("active-view");
  closeSidebar();
  if (view === "add") initAddForm();
}

/* ── Render ── */
function renderAll() {
  updateOverallTotal();
  renderLoans();
  renderPaidHistory();
  renderDeleteHistory();
  updateSelectionBar();
}

function renderLoans() {
  const container = $("#loanContainer");
  container.innerHTML = "";
  if (!state.expenses.length) {
    $("#loanEmpty").classList.remove("hidden");
    return;
  }
  $("#loanEmpty").classList.add("hidden");
  state.expenses.forEach((expense, i) => {
    container.appendChild(createLoanCard(expense, i));
  });
}

function createLoanCard(expense, index) {
  const total = getExpenseTotal(expense);
  const completed = isExpenseCompleted(expense);
  const card = document.createElement("div");
  card.className = "loan-card" + (completed ? " completed" : "");
  card.style.animationDelay = `${index * 0.06}s`;

  const isSelected = id => state.selectedPayments.some(s => s.expenseId === expense.id && s.paymentId === id);

  const paymentsHTML = [...expense.payments]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(p => createLoanItem(expense, p, isSelected(p.id)))
    .join("");

  card.innerHTML = `
    <div class="loan-header">
      <div class="loan-name">${escapeHTML(expense.provider)}</div>
      <div class="loan-total">${formatCurrency(total)}</div>
    </div>
    <div class="loan-payments">${paymentsHTML}</div>
    <div class="loan-actions">
      <button class="add-pay-btn" data-action="toggle-add-form" data-expense-id="${expense.id}">+ Add</button>
      <button class="remove-btn" data-action="remove-expense" data-expense-id="${expense.id}">× Delete</button>
    </div>
    <div class="card-add-form hidden" data-expense-id="${expense.id}">
      <div class="add-pay-row">
        <div class="add-pay-field">
          <label>Date</label>
          <input type="date" class="add-pay-date">
        </div>
        <div class="add-pay-field">
          <label>Amount</label>
          <input type="number" step="0.01" min="0" class="add-pay-amount" placeholder="0.00">
        </div>
      </div>
      <div class="card-add-actions">
        <button class="add-pay-cancel">Cancel</button>
        <button class="add-pay-add">Add</button>
      </div>
    </div>
  `;
  return card;
}

/* ── Loan Item Component ── */
function createLoanItem(expense, payment, isSelected = false) {
  const paid = !!payment.paid;
  const note = (payment.notes || "").trim();
  return `
    <div class="payment-item${paid ? " paid" : ""}${isSelected ? " selected" : ""}" data-expense-id="${expense.id}" data-payment-id="${payment.id}">
      <label class="payment-checkbox">
        <input type="checkbox"${paid ? " checked" : ""} data-action="toggle-payment" data-expense-id="${expense.id}" data-payment-id="${payment.id}" aria-label="Mark payment as ${paid ? "unpaid" : "paid"}">
      </label>
      <div class="payment-main">
        <span class="payment-date${paid ? " paid" : ""}">${formatDate(payment.date)}</span>
        ${note ? `<span class="payment-note">${escapeHTML(note)}</span>` : ""}
      </div>
      <div class="payment-side">
        <span class="payment-amount">${formatCurrency(payment.amount)}</span>
        <span class="pay-move-icon${paid ? "" : " hidden"}" role="button" tabindex="${paid ? "0" : "-1"}" aria-label="Move to Paid History">−</span>
        <div class="payment-actions">
          <button type="button" class="payment-action edit" data-action="edit-payment" data-expense-id="${expense.id}" data-payment-id="${payment.id}" aria-label="Edit payment for ${escapeHTML(expense.provider)}">${ICONS.edit}</button>
          <button type="button" class="payment-action delete" data-action="delete-payment" data-expense-id="${expense.id}" data-payment-id="${payment.id}" aria-label="Delete payment for ${escapeHTML(expense.provider)}">${ICONS.trash}</button>
        </div>
      </div>
    </div>
  `;
}

/* ── Edit Loan Modal ── */
function openEditLoanModal(expenseId, paymentId) {
  const expense = state.expenses.find(e => e.id === expenseId);
  const payment = expense?.payments.find(p => p.id === paymentId);
  if (!expense || !payment) return;
  editContext = { expenseId, paymentId };
  $("#editLoanDate").value = payment.date || "";
  $("#editLoanAmount").value = payment.amount ?? "";
  $("#editLoanNotes").value = payment.notes || "";
  openModal("editLoanModal");
  $("#editLoanDate").focus();
}

function saveEditLoan() {
  if (!editContext) return;
  const date = $("#editLoanDate").value;
  const amount = parseFloat($("#editLoanAmount").value);
  const notes = $("#editLoanNotes").value.trim();
  if (!date) { showToast("Select a date", "!"); $("#editLoanDate").focus(); return; }
  if (!amount || isNaN(amount) || amount <= 0) {
    showToast("Enter a valid amount", "!");
    $("#editLoanAmount").focus();
    return;
  }
  const expense = state.expenses.find(e => e.id === editContext.expenseId);
  const payment = expense?.payments.find(p => p.id === editContext.paymentId);
  if (!expense || !payment) { closeModal("editLoanModal"); editContext = null; return; }
  payment.date = date;
  payment.amount = amount;
  if (notes) payment.notes = notes; else delete payment.notes;
  expense.payments.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveData();
  closeModal("editLoanModal");
  editContext = null;
  renderLoans();
  updateOverallTotal();
  updateSelectionBar();
  showToast("Changes saved");
}

/* ── Delete Loan Confirm Modal ── */
function openDeleteLoanModal(expenseId, paymentId) {
  const expense = state.expenses.find(e => e.id === expenseId);
  const payment = expense?.payments.find(p => p.id === paymentId);
  if (!expense || !payment) return;
  deleteContext = { expenseId, paymentId };
  $("#deleteLoanDetails").textContent = `${expense.provider} · ${formatDate(payment.date)} · ${formatCurrency(payment.amount)}`;
  openModal("deleteLoanModal");
  $("#confirmDeleteLoanBtn").focus();
}

function confirmDeleteLoan() {
  if (!deleteContext) return;
  const { expenseId, paymentId } = deleteContext;
  deleteContext = null;
  const item = document.querySelector(`.payment-item[data-expense-id="${expenseId}"][data-payment-id="${paymentId}"]`);
  closeModal("deleteLoanModal");
  if (item) {
    item.classList.add("removing");
    setTimeout(() => deletePayment(expenseId, paymentId), 220);
  } else {
    deletePayment(expenseId, paymentId);
  }
}

function deletePayment(expenseId, paymentId) {
  const expense = state.expenses.find(e => e.id === expenseId);
  if (!expense) return;
  const pidx = expense.payments.findIndex(p => p.id === paymentId);
  if (pidx === -1) return;
  const paymentAmount = Number(expense.payments[pidx].amount);
  expense.payments.splice(pidx, 1);
  let loanRemoved = false;
  if (expense.payments.length === 0) {
    const eidx = state.expenses.findIndex(e => e.id === expenseId);
    if (eidx > -1) {
      state.deleteHistory.push({
        id: crypto.randomUUID(),
        provider: expense.provider,
        originalTotal: paymentAmount,
        actionDate: new Date().toISOString()
      });
      state.expenses.splice(eidx, 1);
      loanRemoved = true;
    }
  }
  saveData();
  renderAll();
  showToast(loanRemoved ? "Payment deleted · Loan moved to Delete History" : "Payment deleted");
}

function renderPaidHistory() {
  const container = $("#paidContainer");
  container.innerHTML = "";
  if (!state.paidHistory.length) {
    $("#paidEmpty").classList.remove("hidden");
    return;
  }
  $("#paidEmpty").classList.add("hidden");
  [...state.paidHistory].sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate)).forEach((record, i) => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="history-card-top">
        <div class="history-provider">${escapeHTML(record.provider)}</div>
        <span class="history-status completed">✓ Paid</span>
      </div>
      <div class="history-total">${formatCurrency(record.amount)}</div>
      <div class="history-date">${formatDate(record.date)} — ${formatDateTime(record.actionDate)}</div>
      <div class="history-actions">
        <button class="restore-btn" data-action="restore-from-paid" data-history-id="${record.id}">Restore</button>
        <button class="remove-btn" data-action="delete-from-paid" data-history-id="${record.id}">× Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderDeleteHistory() {
  const container = $("#deleteContainer");
  container.innerHTML = "";
  if (!state.deleteHistory.length) {
    $("#deleteEmpty").classList.remove("hidden");
    return;
  }
  $("#deleteEmpty").classList.add("hidden");
  [...state.deleteHistory].sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate)).forEach((record, i) => {
    const card = document.createElement("div");
    card.className = "history-card removed";
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="history-card-top">
        <div class="history-provider">${escapeHTML(record.provider)}</div>
        <span class="history-status removed">× Removed</span>
      </div>
      <div class="history-total">${formatCurrency(record.originalTotal)}</div>
      <div class="history-date">Removed: ${formatDateTime(record.actionDate)}</div>
      <div class="history-actions">
        <button class="btn btn-danger" data-action="permanent-delete" data-history-id="${record.id}">Permanently Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ── Add Form ── */
function initAddForm() {
  $("#formProvider").value = "";
  const container = $("#formPayments");
  container.innerHTML = "";
  addPaymentRow();
}

function addPaymentRow(date, amount) {
  const container = $("#formPayments");
  const row = document.createElement("div");
  row.className = "add-payment-row";
  row.innerHTML = `
    <div class="payment-field">
      <label>Date</label>
      <input type="date" class="form-date" value="${date || ""}">
    </div>
    <div class="payment-field">
      <label>Amount</label>
      <input type="number" step="0.01" min="0" class="form-amount" placeholder="0.00" value="${amount || ""}">
    </div>
    <button class="remove-payment-btn" aria-label="Remove payment">×</button>
  `;
  row.querySelector(".remove-payment-btn").addEventListener("click", () => {
    if ($$("#formPayments .add-payment-row").length > 1) {
      row.remove();
    } else {
      showToast("Need at least one payment", "!");
    }
  });
  container.appendChild(row);
  const dateInput = row.querySelector(".form-date");
  if (!date) dateInput.focus();
}

function saveLoanFromForm() {
  const provider = $("#formProvider").value.trim();
  if (!provider) {
    showToast("Enter a provider name", "!");
    $("#formProvider").focus();
    return;
  }
  const rows = $$("#formPayments .add-payment-row");
  const payments = [];
  for (const row of rows) {
    const date = row.querySelector(".form-date").value;
    const amount = parseFloat(row.querySelector(".form-amount").value);
    if (!date) {
      showToast("Fill in all payment dates", "!");
      return;
    }
    if (!amount || amount <= 0) {
      showToast("Fill in all payment amounts", "!");
      return;
    }
    payments.push({ id: crypto.randomUUID(), date, amount, paid: false });
  }
  payments.sort((a, b) => new Date(a.date) - new Date(b.date));
  const existing = state.expenses.find(e => e.provider.toLowerCase() === provider.toLowerCase());
  if (existing) {
    existing.payments.push(...payments);
    existing.payments.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else {
    state.expenses.push({ id: crypto.randomUUID(), provider, payments });
  }
  saveData();
  renderAll();
  switchView("active");
  showToast("Loan added successfully");
}

/* ── Actions ── */
function togglePayment(expenseId, paymentId) {
  const expense = state.expenses.find(e => e.id === expenseId);
  if (!expense) return;
  const payment = expense.payments.find(p => p.id === paymentId);
  if (!payment) return;
  payment.paid = !payment.paid;
  const item = document.querySelector(`.payment-item[data-expense-id="${expenseId}"][data-payment-id="${paymentId}"]`);
  if (item) {
    item.classList.toggle("paid");
    item.querySelector(".payment-date").classList.toggle("paid");
    const cb = item.querySelector("input[type='checkbox']");
    if (cb) cb.checked = payment.paid;
    const icon = item.querySelector(".pay-move-icon");
    if (icon) icon.classList.toggle("hidden", !payment.paid);
  }
  updateCompleteStatus(expense);
  saveData();
  updateOverallTotal();
  updateSelectionBar();
  showToast(payment.paid ? "Payment marked as paid" : "Payment marked as unpaid");
}

function addPaymentToExpense(expenseId, date, amount) {
  const expense = state.expenses.find(e => e.id === expenseId);
  if (!expense) return;
  const payment = { id: crypto.randomUUID(), date, amount, paid: false };
  expense.payments.push(payment);
  expense.payments.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveData();
  renderLoans();
  updateOverallTotal();
  updateSelectionBar();
  showToast("Payment added");
}

function updateCompleteStatus(expense) {
  const btn = document.querySelector(`[data-action="remove-expense"][data-expense-id="${expense.id}"]`);
  if (!btn) return;
  const card = btn.closest(".loan-card");
  if (!card) return;
  const completed = expense.payments.length > 0 && expense.payments.every(p => p.paid);
  card.classList.toggle("completed", completed);
}

function movePaymentToPaidHistory(expenseId, paymentId) {
  const expense = state.expenses.find(e => e.id === expenseId);
  if (!expense) return;
  const pidx = expense.payments.findIndex(p => p.id === paymentId);
  if (pidx === -1) return;
  const payment = expense.payments[pidx];
  state.paidHistory.push({
    id: crypto.randomUUID(),
    provider: expense.provider,
    amount: payment.amount,
    date: payment.date,
    actionDate: new Date().toISOString()
  });
  expense.payments.splice(pidx, 1);
  if (expense.payments.length === 0) {
    const eidx = state.expenses.findIndex(e => e.id === expenseId);
    if (eidx > -1) state.expenses.splice(eidx, 1);
  }
  saveData();
  renderAll();
  showToast("Moved to Paid History");
}

function restoreFromPaid(historyId) {
  const idx = state.paidHistory.findIndex(r => r.id === historyId);
  if (idx === -1) return;
  const record = state.paidHistory[idx];
  let expense = state.expenses.find(e => e.provider.toLowerCase() === record.provider.toLowerCase());
  if (!expense) {
    expense = { id: crypto.randomUUID(), provider: record.provider, payments: [] };
    state.expenses.push(expense);
  }
  expense.payments.push({
    id: crypto.randomUUID(),
    date: record.date,
    amount: record.amount,
    paid: false
  });
  expense.payments.sort((a, b) => new Date(a.date) - new Date(b.date));
  state.paidHistory.splice(idx, 1);
  saveData();
  renderAll();
  switchView("active");
  showToast("Restored to Active Loans");
}

function moveToDeleteHistory(expenseId) {
  const idx = state.expenses.findIndex(e => e.id === expenseId);
  if (idx === -1) return;
  const expense = state.expenses[idx];
  state.deleteHistory.push({
    id: crypto.randomUUID(),
    provider: expense.provider,
    originalTotal: getExpenseTotal(expense),
    actionDate: new Date().toISOString()
  });
  state.expenses.splice(idx, 1);
  saveData();
  renderAll();
  showToast("Moved to Delete History");
}

function moveToDeleteFromPaid(historyId) {
  const idx = state.paidHistory.findIndex(r => r.id === historyId);
  if (idx === -1) return;
  const record = state.paidHistory[idx];
  state.deleteHistory.push({
    id: crypto.randomUUID(),
    provider: record.provider,
    originalTotal: record.amount,
    actionDate: new Date().toISOString()
  });
  state.paidHistory.splice(idx, 1);
  saveData();
  renderAll();
  showToast("Moved to Delete History");
}

function permanentDelete(historyId) {
  state.deleteHistory = state.deleteHistory.filter(r => r.id !== historyId);
  saveData();
  renderAll();
  showToast("Deleted permanently");
}

function clearAllDeleteHistory() {
  state.deleteHistory = [];
  saveData();
  renderAll();
  showToast("Delete History cleared");
}

/* ── Selection ── */
function toggleSelectPayment(expenseId, paymentId) {
  const idx = state.selectedPayments.findIndex(s => s.expenseId === expenseId && s.paymentId === paymentId);
  const item = document.querySelector(`.payment-item[data-expense-id="${expenseId}"][data-payment-id="${paymentId}"]`);
  if (idx > -1) {
    state.selectedPayments.splice(idx, 1);
    item.classList.remove("selected");
  } else {
    state.selectedPayments.push({ expenseId, paymentId });
    item.classList.add("selected");
  }
  updateSelectionBar();
}

function clearSelection() {
  $$(".payment-item.selected").forEach(el => el.classList.remove("selected"));
  state.selectedPayments = [];
  updateSelectionBar();
}

function updateSelectionBar() {
  const bar = $("#selectionBar");
  if (!state.selectedPayments.length || state.currentView !== "active") {
    bar.classList.add("hidden");
    return;
  }
  let total = 0;
  for (const sel of state.selectedPayments) {
    const expense = state.expenses.find(e => e.id === sel.expenseId);
    if (!expense) continue;
    const payment = expense.payments.find(p => p.id === sel.paymentId);
    if (!payment) continue;
    total += Number(payment.amount);
  }
  $("#selAmount").textContent = formatCurrency(total);
  $("#selCount").textContent = `(${state.selectedPayments.length})`;
  bar.classList.remove("hidden");
}

/* ── Modal ── */
function openModal(modalId) {
  $(`#${modalId}`).classList.add("open");
}

function closeModal(modalId) {
  $(`#${modalId}`).classList.remove("open");
}

function openConfirmModal(title, message, action) {
  pendingAction = action;
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  openModal("confirmModal");
}

let toastTimer;
function showToast(message, icon = "✓") {
  $("#toastMessage").textContent = message;
  $("#toastIcon").textContent = icon;
  const toast = $("#toast");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

/* ── Events ── */
function bindEvents() {
  /* Theme */
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#sidebarThemeToggle").addEventListener("click", toggleTheme);

  /* Mobile sidebar */
  $("#mobileMenu").addEventListener("click", openSidebar);
  $("#sidebarClose").addEventListener("click", closeSidebar);
  $("#sidebarBackdrop").addEventListener("click", closeSidebar);

  /* Tab navigation */
  $$(".tab").forEach(tab => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  /* Drawer navigation */
  $$(".drawer-item[data-view]").forEach(item => {
    item.addEventListener("click", () => switchView(item.dataset.view));
  });

  /* Add Loan button */
  $("#addLoanBtn").addEventListener("click", () => switchView("add"));

  /* Add form */
  $("#addPaymentRowBtn").addEventListener("click", () => addPaymentRow());
  $("#saveLoanBtn").addEventListener("click", saveLoanFromForm);
  $("#cancelAddBtn").addEventListener("click", () => switchView("active"));
  $("#cancelAddBtn2").addEventListener("click", () => switchView("active"));

  /* Payment toggle */
  $("#loanContainer").addEventListener("change", event => {
    if (event.target.dataset.action === "toggle-payment") {
      togglePayment(event.target.dataset.expenseId, event.target.dataset.paymentId);
    }
  });

  /* Payment selection / pay move icon / edit / delete */
  $("#loanContainer").addEventListener("click", event => {
    const actionBtn = event.target.closest("[data-action='edit-payment'], [data-action='delete-payment']");
    if (actionBtn) {
      if (actionBtn.dataset.action === "edit-payment") {
        openEditLoanModal(actionBtn.dataset.expenseId, actionBtn.dataset.paymentId);
      } else {
        openDeleteLoanModal(actionBtn.dataset.expenseId, actionBtn.dataset.paymentId);
      }
      return;
    }
    const icon = event.target.closest(".pay-move-icon");
    if (icon) {
      const item = icon.closest(".payment-item");
      if (!item) return;
      const expenseId = item.dataset.expenseId;
      const paymentId = item.dataset.paymentId;
      const expense = state.expenses.find(e => e.id === expenseId);
      const payment = expense?.payments.find(p => p.id === paymentId);
      openConfirmModal("Move to Paid History?", `${formatCurrency(payment?.amount)} payment for ${expense?.provider} will be moved to Paid History.`, () => movePaymentToPaidHistory(expenseId, paymentId));
      return;
    }
    const item = event.target.closest(".payment-item");
    if (!item) return;
    if (event.target.closest(".payment-checkbox")) return;
    toggleSelectPayment(item.dataset.expenseId, item.dataset.paymentId);
  });

  /* Keyboard support: move-to-paid-history icon */
  $("#loanContainer").addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const icon = event.target.closest(".pay-move-icon");
    if (icon) {
      event.preventDefault();
      icon.click();
    }
  });

  /* Active loan remove */
  $("#loanContainer").addEventListener("click", event => {
    if (event.target.dataset.action === "remove-expense") {
      const expenseId = event.target.dataset.expenseId;
      const expense = state.expenses.find(e => e.id === expenseId);
      openConfirmModal("Move to Delete History?", `${expense.provider} will be moved to Delete History.`, () => moveToDeleteHistory(expenseId));
    }
  });

  /* Add payment inline form */
  $("#loanContainer").addEventListener("click", event => {
    const form = event.target.closest(".card-add-form");
    if (event.target.dataset.action === "toggle-add-form") {
      const el = document.querySelector(`.card-add-form[data-expense-id="${event.target.dataset.expenseId}"]`);
      el.classList.toggle("hidden");
      if (!el.classList.contains("hidden")) el.querySelector(".add-pay-date").focus();
    } else if (event.target.classList.contains("add-pay-cancel")) {
      form.classList.add("hidden");
      form.querySelector(".add-pay-date").value = "";
      form.querySelector(".add-pay-amount").value = "";
    } else if (event.target.classList.contains("add-pay-add")) {
      const date = form.querySelector(".add-pay-date").value;
      const amount = parseFloat(form.querySelector(".add-pay-amount").value);
      if (!date) { showToast("Select a date", "!"); return; }
      if (!amount || amount <= 0) { showToast("Enter a valid amount", "!"); return; }
      addPaymentToExpense(form.dataset.expenseId, date, amount);
      form.classList.add("hidden");
      form.querySelector(".add-pay-date").value = "";
      form.querySelector(".add-pay-amount").value = "";
    }
  });

  /* Paid history: restore / delete */
  $("#paidContainer").addEventListener("click", event => {
    if (event.target.dataset.action === "restore-from-paid") {
      const id = event.target.dataset.historyId;
      const record = state.paidHistory.find(r => r.id === id);
      openConfirmModal("Restore Loan?", `${record.provider} will be moved back to Active Loans with all payments unpaid.`, () => restoreFromPaid(id));
    }
    if (event.target.dataset.action === "delete-from-paid") {
      const id = event.target.dataset.historyId;
      const record = state.paidHistory.find(r => r.id === id);
      openConfirmModal("Move to Delete History?", `${record.provider} will be moved to Delete History.`, () => moveToDeleteFromPaid(id));
    }
  });

  /* Delete history: permanent delete */
  $("#deleteContainer").addEventListener("click", event => {
    if (event.target.dataset.action === "permanent-delete") {
      const id = event.target.dataset.historyId;
      const record = state.deleteHistory.find(r => r.id === id);
      openConfirmModal("Delete permanently?", `${record.provider} will be permanently deleted. Cannot be undone.`, () => permanentDelete(id));
    }
  });

  /* Clear all delete history */
  $("#clearHistoryBtn").addEventListener("click", () => {
    if (!state.deleteHistory.length) { showToast("Delete History is already empty"); return; }
    openConfirmModal("Clear All Delete History?", "All delete history records will be permanently deleted. Cannot be undone.", clearAllDeleteHistory);
  });

  /* Clear selection */
  $("#clearSelectionBtn").addEventListener("click", clearSelection);

  /* Confirm action */
  $("#confirmActionBtn").addEventListener("click", () => {
    if (pendingAction) { pendingAction(); pendingAction = null; }
    closeModal("confirmModal");
  });

  /* Edit loan modal */
  $("#editLoanForm").addEventListener("submit", e => {
    e.preventDefault();
    saveEditLoan();
  });

  /* Delete loan modal */
  $("#confirmDeleteLoanBtn").addEventListener("click", confirmDeleteLoan);

  /* Close modal buttons */
  $$("[data-close-modal]").forEach(b => {
    b.addEventListener("click", () => closeModal("confirmModal"));
  });
  $$("[data-close]").forEach(b => {
    b.addEventListener("click", () => closeModal(b.dataset.close));
  });

  /* Close modal on overlay click */
  $$(".modal-overlay").forEach(o => {
    o.addEventListener("click", e => { if (e.target === o) o.classList.remove("open"); });
  });

  /* Escape key */
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if ($("#sidebarDrawer").classList.contains("open")) closeSidebar();
      $$(".modal-overlay").forEach(m => m.classList.remove("open"));
    }
  });
}
