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
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
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
    .map(p => {
      const paidClass = p.paid ? " paid" : "";
      const dateClass = p.paid ? " paid" : "";
      const selClass = isSelected(p.id) ? " selected" : "";
      return `
        <div class="payment-item${paidClass}${selClass}" data-expense-id="${expense.id}" data-payment-id="${p.id}">
          <label class="payment-checkbox">
            <input type="checkbox"${p.paid ? " checked" : ""} data-action="toggle-payment" data-expense-id="${expense.id}" data-payment-id="${p.id}">
          </label>
          <div class="payment-info">
            <div class="payment-date${dateClass}">${formatDate(p.date)}</div>
          </div>
          <div class="payment-amount">${formatCurrency(p.amount)}</div>
        </div>
      `;
    }).join("");

  card.innerHTML = `
    <div class="loan-header">
      <div class="loan-name">${escapeHTML(expense.provider)}</div>
      <div class="loan-header-right">
        <div class="loan-total">${formatCurrency(total)}</div>
        <span class="minus-move-icon${completed ? '' : ' hidden'}" data-expense-id="${expense.id}">−</span>
      </div>
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
        <span class="history-status completed">✓ Completed</span>
      </div>
      <div class="history-total">${formatCurrency(record.originalTotal)}</div>
      <div class="history-date">Completed: ${formatDateTime(record.actionDate)}</div>
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
  const btn = document.querySelector(`[data-action="remove-expense"][data-expense-id="${expenseId}"]`);
  if (!btn) return;
  const card = btn.closest(".loan-card");
  if (!card) return;
  const container = card.querySelector(".loan-payments");
  const totalEl = card.querySelector(".loan-total");
  const div = document.createElement("div");
  div.className = "payment-item";
  div.dataset.expenseId = expenseId;
  div.dataset.paymentId = payment.id;
  div.innerHTML = `
    <label class="payment-checkbox">
      <input type="checkbox" data-action="toggle-payment" data-expense-id="${expenseId}" data-payment-id="${payment.id}">
    </label>
    <div class="payment-info">
      <div class="payment-date">${formatDate(date)}</div>
    </div>
    <div class="payment-amount">${formatCurrency(amount)}</div>
  `;
  container.appendChild(div);
  totalEl.textContent = formatCurrency(getExpenseTotal(expense));
  const minus = card.querySelector(".minus-move-icon");
  if (minus) minus.classList.toggle("hidden", !isExpenseCompleted(expense));
  updateOverallTotal();
  showToast("Payment added");
}

function updateCompleteStatus(expense) {
  const btn = document.querySelector(`[data-action="remove-expense"][data-expense-id="${expense.id}"]`);
  if (!btn) return;
  const card = btn.closest(".loan-card");
  if (!card) return;
  const completed = expense.payments.length > 0 && expense.payments.every(p => p.paid);
  card.classList.toggle("completed", completed);
  const minus = card.querySelector(".minus-move-icon");
  if (minus) minus.classList.toggle("hidden", !completed);
}

function moveToPaidHistory(expenseId) {
  const idx = state.expenses.findIndex(e => e.id === expenseId);
  if (idx === -1) return;
  const expense = state.expenses[idx];
  state.paidHistory.push({
    id: crypto.randomUUID(),
    provider: expense.provider,
    originalTotal: getExpenseTotal(expense),
    actionDate: new Date().toISOString()
  });
  state.expenses.splice(idx, 1);
  saveData();
  renderAll();
  showToast("Moved to Paid History");
}

function restoreFromPaid(historyId) {
  const idx = state.paidHistory.findIndex(r => r.id === historyId);
  if (idx === -1) return;
  const record = state.paidHistory[idx];
  const provider = record.provider;
  const existing = state.expenses.find(e => e.provider.toLowerCase() === provider.toLowerCase());
  if (existing) {
    showToast("Loan already exists in Active", "!");
    return;
  }
  const newExpense = {
    id: crypto.randomUUID(),
    provider: provider,
    payments: []
  };
  const amountPerPayment = record.originalTotal;
  newExpense.payments.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    amount: amountPerPayment,
    paid: false
  });
  state.paidHistory.splice(idx, 1);
  state.expenses.push(newExpense);
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
    originalTotal: record.originalTotal,
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

  /* Payment selection / minus move icon */
  $("#loanContainer").addEventListener("click", event => {
    const minus = event.target.closest(".minus-move-icon");
    if (minus) {
      const expenseId = minus.dataset.expenseId;
      const expense = state.expenses.find(e => e.id === expenseId);
      openConfirmModal("Move to Paid History?", `${expense.provider} is fully paid. Move to Paid History?`, () => moveToPaidHistory(expenseId));
      return;
    }
    const item = event.target.closest(".payment-item");
    if (!item) return;
    if (event.target.closest(".payment-checkbox")) return;
    toggleSelectPayment(item.dataset.expenseId, item.dataset.paymentId);
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
