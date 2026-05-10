const STORAGE_KEY = "finora-finance-state";
const THEME_KEY = "finora-theme";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const currentMonth = () => new Date().toISOString().slice(0, 7);

const demoState = {
  activeMonth: currentMonth(),
  transactions: [
    { id: crypto.randomUUID(), month: currentMonth(), type: "income", entryKind: "regular", amount: 85000, category: "Salary", note: "Primary income" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "income", entryKind: "regular", amount: 12000, category: "Freelance", note: "Side project" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "expense", entryKind: "regular", amount: 22000, category: "Rent", note: "Apartment" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "expense", entryKind: "regular", amount: 9200, category: "Groceries", note: "Monthly essentials" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "expense", entryKind: "regular", amount: 4500, category: "Transport", note: "Fuel and rides" },
  ],
  loans: [
    { id: crypto.randomUUID(), direction: "given", person: "Aarav", amount: 15000, dueDate: "2026-06-15", status: "open" },
    { id: crypto.randomUUID(), direction: "taken", person: "Nisha", amount: 20000, dueDate: "2026-07-01", status: "open" },
  ],
  emis: [
    { id: crypto.randomUUID(), name: "Bike loan", amount: 6400, dueDay: 5, monthsLeft: 14, status: "active" },
    { id: crypto.randomUUID(), name: "Phone", amount: 2800, dueDay: 12, monthsLeft: 6, status: "active" },
  ],
  goals: [
    { id: crypto.randomUUID(), name: "New laptop", target: 90000, saved: 36000, targetDate: "2026-10-20" },
    { id: crypto.randomUUID(), name: "Goa trip", target: 45000, saved: 18000, targetDate: "2026-08-15" },
  ],
  categories: [
    { id: crypto.randomUUID(), name: "Salary", type: "income", budget: 0 },
    { id: crypto.randomUUID(), name: "Freelance", type: "income", budget: 0 },
    { id: crypto.randomUUID(), name: "Rent", type: "expense", budget: 22000 },
    { id: crypto.randomUUID(), name: "Groceries", type: "expense", budget: 12000 },
    { id: crypto.randomUUID(), name: "Transport", type: "expense", budget: 6000 },
  ],
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoState);

  try {
    const parsed = JSON.parse(saved);
    return {
      transactions: parsed.transactions || [],
      loans: parsed.loans || [],
      emis: parsed.emis || [],
      goals: parsed.goals || [],
      categories: parsed.categories || structuredClone(demoState.categories),
      activeMonth: parsed.activeMonth || currentMonth(),
    };
  } catch {
    return structuredClone(demoState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function selectedTransactions() {
  const directEntries = state.transactions
    .filter((entry) => entry.month === state.activeMonth)
    .map((entry) => ({ ...entry, sourceId: entry.id, isVirtual: false }));

  const recurringEntries = state.transactions
    .filter((entry) => entry.recurring && entry.month !== state.activeMonth && isRecurringDue(entry, state.activeMonth))
    .map((entry) => ({
      ...entry,
      id: `recurring:${entry.id}:${state.activeMonth}`,
      sourceId: entry.id,
      month: state.activeMonth,
      isVirtual: true,
    }));

  return [...directEntries, ...recurringEntries];
}

function isRecurringDue(entry, targetMonth) {
  if (!entry.recurring || monthDiff(entry.month, targetMonth) < 0) return false;

  const interval = Math.max(Number(entry.recurring.interval) || 1, 1);
  const diff = monthDiff(entry.month, targetMonth);

  if (entry.recurring.unit === "month") return diff % interval === 0;
  if (entry.recurring.unit === "year") return diff % (interval * 12) === 0;
  return true;
}

function monthDiff(startMonth, targetMonth) {
  const [startYear, start] = startMonth.split("-").map(Number);
  const [targetYear, target] = targetMonth.split("-").map(Number);
  return (targetYear - startYear) * 12 + target - start;
}

function totals() {
  const entries = selectedTransactions();
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const paidEmiIds = new Set(entries.filter((entry) => entry.entryKind === "emi-settlement" && entry.emiId).map((entry) => entry.emiId));
  const activeEmi = state.emis
    .filter((emi) => emi.status === "active" && !paidEmiIds.has(emi.id))
    .reduce((sum, emi) => sum + Number(emi.amount), 0);
  const loanGiven = state.loans
    .filter((loan) => loan.direction === "given" && loan.status === "open")
    .reduce((sum, loan) => sum + Number(loan.amount), 0);
  const loanTaken = state.loans
    .filter((loan) => loan.direction === "taken" && loan.status === "open")
    .reduce((sum, loan) => sum + Number(loan.amount), 0);

  return {
    entries,
    income,
    expenses,
    activeEmi,
    balance: income - expenses - activeEmi,
    loanGiven,
    loanTaken,
  };
}

function renderDashboard() {
  const summary = totals();
  const incomeCount = summary.entries.filter((entry) => entry.type === "income").length;
  const expenseCount = summary.entries.filter((entry) => entry.type === "expense").length;
  const paidEmiIds = new Set(summary.entries.filter((entry) => entry.entryKind === "emi-settlement" && entry.emiId).map((entry) => entry.emiId));
  const activeEmis = state.emis.filter((emi) => emi.status === "active" && !paidEmiIds.has(emi.id));

  $("#dash-income").textContent = formatMoney(summary.income);
  $("#dash-income-sub").textContent = `${incomeCount} income ${incomeCount === 1 ? "entry" : "entries"}`;
  $("#dash-expenses").textContent = formatMoney(summary.expenses);
  $("#dash-expense-sub").textContent = `${expenseCount} expense ${expenseCount === 1 ? "entry" : "entries"}`;
  $("#dash-emi").textContent = formatMoney(summary.activeEmi);
  $("#dash-emi-sub").textContent = `${activeEmis.length} unpaid active ${activeEmis.length === 1 ? "EMI" : "EMIs"}`;
  $("#dash-balance").textContent = formatMoney(summary.balance);
  $("#sidebar-balance").textContent = formatMoney(summary.balance);
  $("#loan-given").textContent = formatMoney(summary.loanGiven);
  $("#loan-taken").textContent = formatMoney(summary.loanTaken);

  renderCategoryBars(summary);
  renderGoalPreview();
  renderEmiPreview(paidEmiIds);
}

function renderCategoryBars(summary) {
  const expenses = summary.entries.filter((entry) => entry.type === "expense");
  const byCategory = expenses.reduce((groups, entry) => {
    groups[entry.category] = (groups[entry.category] || 0) + Number(entry.amount);
    return groups;
  }, {});

  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  $("#category-bars").innerHTML = rows.length
    ? rows
        .map(([category, amount]) => {
          const percent = summary.income ? Math.min((amount / summary.income) * 100, 100) : 0;
          return `
            <div class="bar-item">
              <div class="bar-meta"><span>${escapeHtml(category)}</span><span>${formatMoney(amount)}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width: ${percent}%"></div></div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">No expenses added for this month yet.</div>`;
}

function renderGoalPreview() {
  const goals = [...state.goals].sort((a, b) => progress(b) - progress(a)).slice(0, 3);
  $("#goal-preview").innerHTML = goals.length
    ? goals.map((goal) => goalCard(goal, false)).join("")
    : `<div class="empty-state">Add a saving goal to see progress here.</div>`;
}

function renderEmiPreview(paidEmiIds = new Set()) {
  const emis = [...state.emis]
    .filter((emi) => emi.status === "active" && !paidEmiIds.has(emi.id))
    .sort((a, b) => Number(a.dueDay) - Number(b.dueDay));

  $("#emi-preview").innerHTML = emis.length
    ? emis
        .map(
          (emi) => `
            <div class="compact-item">
              <div>
                <strong>${escapeHtml(emi.name)}</strong>
                <p>Due on day ${emi.dueDay} · ${emi.monthsLeft} months left</p>
              </div>
              <strong>${formatMoney(emi.amount)}</strong>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No unpaid active EMIs due.</div>`;
}

function renderTransactions() {
  const entries = [...selectedTransactions()].reverse();
  $("#transaction-list").innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="list-item">
              <div>
                <span class="pill">${entryLabel(entry)}</span>
                <h3>${escapeHtml(entry.category)}</h3>
                <p>${escapeHtml(entry.note || "No note")} · ${entry.month}${entry.isVirtual ? " · recurring" : ""}</p>
              </div>
              <div class="item-actions">
                <strong class="amount ${entry.type}">${entry.type === "income" ? "+" : "-"}${formatMoney(entry.amount)}</strong>
                <button class="ghost-button" data-edit="transactions" data-id="${entry.sourceId}" type="button">Edit</button>
                <button class="danger-button" data-delete="transactions" data-id="${entry.sourceId}" type="button">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No entries for this month yet.</div>`;
}

function renderLoans() {
  $("#loan-list").innerHTML = state.loans.length
    ? state.loans
        .map(
          (loan) => `
            <article class="list-item">
              <div>
                <span class="pill">${loan.direction} · ${loan.status}</span>
                <h3>${escapeHtml(loan.person)}</h3>
                <p>Due ${formatDate(loan.dueDate)}</p>
              </div>
              <div class="item-actions">
                <strong class="amount ${loan.status === "settled" ? "settled" : loan.direction}">${formatMoney(loan.amount)}</strong>
                <button class="ghost-button" data-edit="loans" data-id="${loan.id}" type="button">Edit</button>
                <button class="ghost-button" data-toggle-loan="${loan.id}" type="button">${loan.status === "open" ? "Settle" : "Reopen"}</button>
                <button class="danger-button" data-delete="loans" data-id="${loan.id}" type="button">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No loans added yet.</div>`;
}

function renderEmis() {
  $("#emi-list").innerHTML = state.emis.length
    ? state.emis
        .map(
          (emi) => `
            <article class="list-item">
              <div>
                <span class="pill">${emi.status}</span>
                <h3>${escapeHtml(emi.name)}</h3>
                <p>Due day ${emi.dueDay} · ${emi.monthsLeft} months left · Total remaining ${formatMoney(emi.amount * emi.monthsLeft)}</p>
              </div>
              <div class="item-actions">
                <strong class="amount ${emi.status}">${formatMoney(emi.amount)}</strong>
                <button class="ghost-button" data-edit="emis" data-id="${emi.id}" type="button">Edit</button>
                <button class="danger-button" data-delete="emis" data-id="${emi.id}" type="button">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No EMI records added yet.</div>`;
}

function renderGoals() {
  $("#goal-list").innerHTML = state.goals.length
    ? state.goals.map((goal) => goalCard(goal, true)).join("")
    : `<div class="empty-state">No saving goals added yet.</div>`;
}

function renderCategories() {
  $("#category-list").innerHTML = state.categories.length
    ? state.categories
        .map(
          (category) => `
            <article class="list-item">
              <div>
                <span class="pill">${category.type}</span>
                <h3>${escapeHtml(category.name)}</h3>
                <p>${category.budget ? `Monthly budget ${formatMoney(category.budget)}` : "No monthly budget set"}</p>
              </div>
              <div class="item-actions">
                <button class="ghost-button" data-edit="categories" data-id="${category.id}" type="button">Edit</button>
                <button class="danger-button" data-delete="categories" data-id="${category.id}" type="button">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No categories added yet.</div>`;
}

function goalCard(goal, includeActions) {
  const percent = progress(goal);
  const remaining = Math.max(Number(goal.target) - Number(goal.saved), 0);
  const monthlyNeed = getMonthlyNeed(remaining, goal.targetDate);

  return `
    <article class="list-item">
      <div>
        <span class="pill">${Math.round(percent)}% saved</span>
        <h3>${escapeHtml(goal.name)}</h3>
        <p>${formatMoney(goal.saved)} of ${formatMoney(goal.target)} · Need ${formatMoney(monthlyNeed)} per month</p>
        <div class="progress-wrap">
          <div class="progress-line"><span style="width: ${percent}%"></span></div>
          <p>Target date ${formatDate(goal.targetDate)} · Remaining ${formatMoney(remaining)}</p>
        </div>
      </div>
      ${
        includeActions
          ? `<div class="item-actions">
              <button class="ghost-button" data-edit="goals" data-id="${goal.id}" type="button">Edit</button>
              <button class="ghost-button" data-add-saving="${goal.id}" type="button">Add saved</button>
              <button class="danger-button" data-delete="goals" data-id="${goal.id}" type="button">Delete</button>
            </div>`
          : ""
      }
    </article>
  `;
}

function entryLabel(entry) {
  if (entry.entryKind === "emi-settlement") return "EMI settlement";
  if (entry.entryKind === "loan-settlement") return "Loan settlement";
  if (entry.entryKind === "goal-saving") return "Saving deposit";
  if (entry.recurring) return `${entry.type} · recurring`;
  return entry.type;
}

function progress(goal) {
  return Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100) || 0;
}

function getMonthlyNeed(remaining, targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const months = Math.max((target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth(), 1);
  return Math.ceil(remaining / months);
}

function renderAll() {
  $("#active-month").value = state.activeMonth;
  populateSpecialEntryOptions();
  renderDashboard();
  renderTransactions();
  renderLoans();
  renderEmis();
  renderGoals();
  renderCategories();
  bindDynamicActions();
}

function bindDynamicActions() {
  $$("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const collection = button.dataset.delete;
      const record = state[collection].find((item) => item.id === button.dataset.id);
      if (collection === "transactions" && record) applySettlementSideEffects(record, -1);
      state[collection] = state[collection].filter((item) => item.id !== button.dataset.id);
      saveState();
      renderAll();
    });
  });

  $$("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditModal(button.dataset.edit, button.dataset.id));
  });

  $$("[data-toggle-loan]").forEach((button) => {
    button.addEventListener("click", () => {
      const loan = state.loans.find((item) => item.id === button.dataset.toggleLoan);
      loan.status = loan.status === "open" ? "settled" : "open";
      saveState();
      renderAll();
    });
  });

  $$("[data-add-saving]").forEach((button) => {
    button.addEventListener("click", () => {
      const goal = state.goals.find((item) => item.id === button.dataset.addSaving);
      const amount = Number(prompt(`Add saved amount for ${goal.name}`, "1000"));
      if (!amount || amount < 0) return;
      goal.saved = Math.min(Number(goal.saved) + amount, Number(goal.target));
      saveState();
      renderAll();
    });
  });
}

function bindForms() {
  $("#transaction-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const id = form.get("id") || crypto.randomUUID();
    const entryKind = form.get("entryKind");
    const previous = state.transactions.find((entry) => entry.id === id);
    if (previous) applySettlementSideEffects(previous, -1);
    const values = getTransactionDraft(formElement, entryKind);

    const record = {
      id,
      month: getExistingMonth("transactions", id) || state.activeMonth,
      type: values.type,
      entryKind,
      emiId: entryKind === "emi-settlement" ? form.get("emiId") : "",
      loanId: entryKind === "loan-settlement" ? form.get("loanId") : "",
      loanSettlementType: entryKind === "loan-settlement" ? form.get("loanSettlementType") : "",
      goalId: entryKind === "goal-saving" ? form.get("goalId") : "",
      amount: values.amount,
      category: values.category,
      note: values.note,
      recurring: entryKind === "regular" && form.get("isRecurring")
        ? {
            unit: form.get("recurringUnit"),
            interval: Math.max(Number(form.get("recurringInterval")) || 1, 1),
          }
        : null,
    };
    upsert("transactions", record);
    applySettlementSideEffects(record, 1);
    closeActiveModal();
    saveState();
    renderAll();
  });

  $("#loan-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = form.get("id") || crypto.randomUUID();
    upsert("loans", {
      id,
      direction: form.get("direction"),
      person: form.get("person").trim(),
      amount: Number(form.get("amount")),
      dueDate: form.get("dueDate"),
      status: form.get("status"),
    });
    closeActiveModal();
    saveState();
    renderAll();
  });

  $("#emi-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = form.get("id") || crypto.randomUUID();
    upsert("emis", {
      id,
      name: form.get("name").trim(),
      amount: Number(form.get("amount")),
      dueDay: Number(form.get("dueDay")),
      monthsLeft: Number(form.get("monthsLeft")),
      status: form.get("status"),
    });
    closeActiveModal();
    saveState();
    renderAll();
  });

  $("#goal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = form.get("id") || crypto.randomUUID();
    upsert("goals", {
      id,
      name: form.get("name").trim(),
      target: Number(form.get("target")),
      saved: Number(form.get("saved")),
      targetDate: form.get("targetDate"),
    });
    closeActiveModal();
    saveState();
    renderAll();
  });

  $("#category-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = form.get("id") || crypto.randomUUID();
    upsert("categories", {
      id,
      name: form.get("name").trim(),
      type: form.get("type"),
      budget: Number(form.get("budget")) || 0,
    });
    closeActiveModal();
    saveState();
    renderAll();
  });
}

function upsert(collection, record) {
  const index = state[collection].findIndex((item) => item.id === record.id);
  if (index >= 0) {
    state[collection][index] = record;
  } else {
    state[collection].push(record);
  }
}

function getTransactionDraft(form, entryKind) {
  if (entryKind === "emi-settlement") {
    return {
      type: "expense",
      amount: Number(form.elements.emiAmount.value),
      category: form.elements.emiCategory.value.trim(),
      note: form.elements.emiNote.value.trim(),
    };
  }

  if (entryKind === "loan-settlement") {
    const loan = state.loans.find((item) => item.id === form.elements.loanId.value);
    return {
      type: loan?.direction === "given" ? "income" : "expense",
      amount: Number(form.elements.loanAmount.value),
      category: form.elements.loanCategory.value.trim(),
      note: form.elements.loanNote.value.trim(),
    };
  }

  if (entryKind === "goal-saving") {
    return {
      type: "expense",
      amount: Number(form.elements.goalAmount.value),
      category: form.elements.goalCategory.value.trim(),
      note: form.elements.goalNote.value.trim(),
    };
  }

  return {
    type: form.elements.transactionMode.value === "credit" ? "income" : "expense",
    amount: Number(form.elements.amount.value),
    category: form.elements.categorySelect.value,
    note: form.elements.note.value.trim(),
  };
}

function getExistingMonth(collection, id) {
  return state[collection].find((item) => item.id === id)?.month;
}

function bindNavigation() {
  const menuButton = $("#mobile-menu-button");
  const backdrop = $("#menu-backdrop");
  const themeToggle = $("#theme-toggle");
  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  };
  const toggleMenu = () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  };

  menuButton.addEventListener("click", toggleMenu);
  backdrop.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      closeActiveModal();
    }
  });

  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;
      $$(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      $$(".section-view").forEach((view) => view.classList.toggle("active", view.id === section));
      $("#page-title").textContent = button.innerText.trim();
      closeMenu();
    });
  });

  $("#active-month").addEventListener("change", (event) => {
    state.activeMonth = event.target.value;
    saveState();
    renderAll();
  });

  themeToggle.addEventListener("click", toggleTheme);
}

function bindModals() {
  $$("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => openCreateModal(button.dataset.openModal));
  });

  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeActiveModal);
  });

  $$(".modal-layer").forEach((layer) => {
    layer.addEventListener("click", (event) => {
      if (event.target === layer) closeActiveModal();
    });
  });

  const transactionForm = $("#transaction-form");
  transactionForm.elements.entryKind.addEventListener("change", () => {
    resetSpecialEntryDraft();
    updateTransactionFormMode();
  });
  transactionForm.elements.emiId.addEventListener("change", fillFromSelectedSpecialEntry);
  transactionForm.elements.loanId.addEventListener("change", fillFromSelectedSpecialEntry);
  transactionForm.querySelectorAll('input[name="loanSettlementType"]').forEach((input) => {
    input.addEventListener("change", fillFromSelectedSpecialEntry);
  });
  transactionForm.elements.goalId.addEventListener("change", fillFromSelectedSpecialEntry);
  transactionForm.elements.isRecurring.addEventListener("change", updateRecurringControls);
  transactionForm.elements.transactionMode.addEventListener("change", () => {
    transactionForm.elements.type.value = transactionForm.elements.transactionMode.value === "credit" ? "income" : "expense";
    populateCategoryOptions();
  });
}

function openCreateModal(modalId) {
  const modal = $(`#${modalId}`);
  const form = modal.querySelector("form");
  form.reset();
  form.elements.id.value = "";
  modal.querySelector("h2").textContent = modalIdToTitle(modalId, false);
  if (modalId === "transaction-modal") {
    populateSpecialEntryOptions();
    updateTransactionFormMode();
    updateRecurringControls();
  }
  openModal(modal);
}

function openEditModal(collection, id) {
  const item = state[collection].find((record) => record.id === id);
  if (!item) return;

  if (collection === "transactions") fillTransactionForm(item);
  if (collection === "loans") fillLoanForm(item);
  if (collection === "emis") fillEmiForm(item);
  if (collection === "goals") fillGoalForm(item);
  if (collection === "categories") fillCategoryForm(item);
}

function fillTransactionForm(item) {
  const modal = $("#transaction-modal");
  const form = $("#transaction-form");
  form.reset();
  populateSpecialEntryOptions();
  form.elements.id.value = item.id;
  form.elements.transactionMode.value = item.type === "income" ? "credit" : "debit";
  form.elements.type.value = item.type || "expense";
  form.elements.entryKind.value = item.entryKind || "regular";
  form.elements.emiId.value = item.emiId || "";
  form.elements.loanId.value = item.loanId || "";
  form.elements.loanSettlementType.value = item.loanSettlementType || "partial";
  form.elements.goalId.value = item.goalId || "";
  updateTransactionFormMode();
  populateCategoryOptions();
  form.elements.amount.value = item.amount;
  form.elements.categorySelect.value = item.category;
  form.elements.note.value = item.note || "";
  form.elements.emiAmount.value = item.amount;
  form.elements.emiCategory.value = item.category;
  form.elements.emiNote.value = item.note || "";
  form.elements.loanAmount.value = item.amount;
  form.elements.loanCategory.value = item.category;
  form.elements.loanNote.value = item.note || "";
  form.elements.goalAmount.value = item.amount;
  form.elements.goalCategory.value = item.category;
  form.elements.goalNote.value = item.note || "";
  form.elements.isRecurring.checked = Boolean(item.recurring);
  form.elements.recurringUnit.value = item.recurring?.unit || "month";
  form.elements.recurringInterval.value = item.recurring?.interval || 1;
  modal.querySelector("h2").textContent = "Edit entry";
  updateRecurringControls();
  openModal(modal);
}

function fillLoanForm(item) {
  const modal = $("#loan-modal");
  const form = $("#loan-form");
  form.reset();
  form.elements.id.value = item.id;
  form.elements.direction.value = item.direction;
  form.elements.person.value = item.person;
  form.elements.amount.value = item.amount;
  form.elements.dueDate.value = item.dueDate;
  form.elements.status.value = item.status;
  modal.querySelector("h2").textContent = "Edit loan";
  openModal(modal);
}

function fillEmiForm(item) {
  const modal = $("#emi-modal");
  const form = $("#emi-form");
  form.reset();
  form.elements.id.value = item.id;
  form.elements.name.value = item.name;
  form.elements.amount.value = item.amount;
  form.elements.dueDay.value = item.dueDay;
  form.elements.monthsLeft.value = item.monthsLeft;
  form.elements.status.value = item.status;
  modal.querySelector("h2").textContent = "Edit EMI";
  openModal(modal);
}

function fillGoalForm(item) {
  const modal = $("#goal-modal");
  const form = $("#goal-form");
  form.reset();
  form.elements.id.value = item.id;
  form.elements.name.value = item.name;
  form.elements.target.value = item.target;
  form.elements.saved.value = item.saved;
  form.elements.targetDate.value = item.targetDate;
  modal.querySelector("h2").textContent = "Edit goal";
  openModal(modal);
}

function fillCategoryForm(item) {
  const modal = $("#category-modal");
  const form = $("#category-form");
  form.reset();
  form.elements.id.value = item.id;
  form.elements.name.value = item.name;
  form.elements.type.value = item.type;
  form.elements.budget.value = item.budget || "";
  modal.querySelector("h2").textContent = "Edit category";
  openModal(modal);
}

function openModal(modal) {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeActiveModal() {
  const modal = $(".modal-layer.active");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function modalIdToTitle(modalId) {
  const titles = {
    "transaction-modal": "Add entry",
    "loan-modal": "Add loan",
    "emi-modal": "Add EMI",
    "goal-modal": "Add goal",
    "category-modal": "Add category",
  };
  return titles[modalId];
}

function populateSpecialEntryOptions() {
  populateEmiOptions();
  populateLoanOptions();
  populateGoalOptions();
  populateCategoryOptions();
}

function populateEmiOptions() {
  const select = $("#transaction-form").elements.emiId;
  const activeEmis = state.emis.filter((emi) => emi.status === "active");
  select.innerHTML = activeEmis.length
    ? activeEmis.map((emi) => `<option value="${emi.id}">${escapeHtml(emi.name)} · ${formatMoney(emi.amount)}</option>`).join("")
    : `<option value="">No active EMIs</option>`;
}

function populateLoanOptions() {
  const select = $("#transaction-form").elements.loanId;
  select.innerHTML = state.loans.length
    ? state.loans.map((loan) => `<option value="${loan.id}">${escapeHtml(loan.person)} · ${loan.direction} · ${loan.status} · ${formatMoney(loan.amount)}</option>`).join("")
    : `<option value="">No loans</option>`;
}

function populateGoalOptions() {
  const select = $("#transaction-form").elements.goalId;
  select.innerHTML = state.goals.length
    ? state.goals.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)} · ${formatMoney(goal.saved)} saved</option>`).join("")
    : `<option value="">No saving goals</option>`;
}

function populateCategoryOptions() {
  const form = $("#transaction-form");
  const selectedType = form.elements.transactionMode.value === "credit" ? "income" : "expense";
  const matchingCategories = state.categories.filter((category) => category.type === selectedType);
  const fallbackCategories = state.categories.length ? state.categories : demoState.categories;
  const categories = matchingCategories.length ? matchingCategories : fallbackCategories;
  form.elements.categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`)
    .join("");
}

function updateTransactionFormMode() {
  const form = $("#transaction-form");
  const entryKind = form.elements.entryKind.value;
  const isRegular = entryKind === "regular";
  $("#regular-entry-fields").classList.toggle("active", isRegular);
  $("#emi-select-field").classList.toggle("active", entryKind === "emi-settlement");
  $("#loan-select-field").classList.toggle("active", entryKind === "loan-settlement");
  $("#goal-select-field").classList.toggle("active", entryKind === "goal-saving");
  setTransactionFieldRequirements(entryKind);
  populateCategoryOptions();
  if (isRegular) {
    updateRecurringControls();
  } else {
    form.elements.isRecurring.checked = false;
    updateRecurringControls();
    fillFromSelectedSpecialEntry();
  }
}

function fillFromSelectedSpecialEntry() {
  const form = $("#transaction-form");
  const entryKind = form.elements.entryKind.value;
  if (entryKind === "emi-settlement") {
    const emi = state.emis.find((item) => item.id === form.elements.emiId.value);
    if (!emi) return;
    form.elements.emiAmount.value = emi.amount;
    form.elements.emiCategory.value = emi.name;
    form.elements.emiNote.value = `EMI paid for ${emi.name}`;
  }
  if (entryKind === "loan-settlement") {
    const loan = state.loans.find((item) => item.id === form.elements.loanId.value);
    if (!loan) return;
    const isFull = form.elements.loanSettlementType.value === "full";
    form.elements.loanAmount.value = isFull ? loan.amount : form.elements.loanAmount.value || "";
    form.elements.loanAmount.readOnly = isFull;
    form.elements.loanCategory.value = `Loan ${loan.direction}: ${loan.person}`;
    form.elements.loanNote.value = `${isFull ? "Full" : "Partial"} loan settlement`;
  }
  if (entryKind === "goal-saving") {
    const goal = state.goals.find((item) => item.id === form.elements.goalId.value);
    if (!goal) return;
    const percent = Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100) || 0;
    const remaining = Math.max(Number(goal.target) - Number(goal.saved), 0);
    $("#goal-context").innerHTML = `
      <strong>${formatMoney(goal.saved)} saved (${Math.round(percent)}%)</strong>
      <span>Remaining ${formatMoney(remaining)} of ${formatMoney(goal.target)}</span>
    `;
    form.elements.goalCategory.value = goal.name;
    form.elements.goalNote.value = `Added savings for ${goal.name}`;
  }
}

function updateRecurringControls() {
  $("#recurring-settings").classList.toggle("active", $("#transaction-form").elements.isRecurring.checked);
}

function resetSpecialEntryDraft() {
  const form = $("#transaction-form");
  form.elements.amount.value = "";
  form.elements.note.value = "";
  form.elements.emiAmount.value = "";
  form.elements.emiCategory.value = "";
  form.elements.emiNote.value = "";
  form.elements.loanAmount.value = "";
  form.elements.loanAmount.readOnly = false;
  form.elements.loanCategory.value = "";
  form.elements.loanNote.value = "";
  form.elements.goalAmount.value = "";
  form.elements.goalCategory.value = "";
  form.elements.goalNote.value = "";
  $("#goal-context").innerHTML = "";
}

function setTransactionFieldRequirements(entryKind) {
  const form = $("#transaction-form");
  const fieldNames = ["amount", "categorySelect", "emiAmount", "loanAmount", "goalAmount"];
  fieldNames.forEach((name) => {
    if (form.elements[name]) form.elements[name].required = false;
  });

  if (entryKind === "regular") {
    form.elements.amount.required = true;
    form.elements.categorySelect.required = true;
  }
  if (entryKind === "emi-settlement") form.elements.emiAmount.required = true;
  if (entryKind === "loan-settlement") form.elements.loanAmount.required = true;
  if (entryKind === "goal-saving") form.elements.goalAmount.required = true;
}

function applySettlementSideEffects(record, direction) {
  if (record.entryKind === "goal-saving") applyGoalSaving(record, Number(record.amount) * direction);
  if (record.entryKind === "loan-settlement") applyLoanSettlement(record, direction);
}

function applyLoanSettlement(record, direction) {
  const loan = state.loans.find((item) => item.id === record.loanId);
  if (!loan) return;

  if (record.loanSettlementType === "full") {
    if (direction > 0) loan.status = "settled";
    if (direction < 0) loan.status = "open";
    return;
  }

  loan.amount = Math.max(Number(loan.amount) - Number(record.amount) * direction, 0);
  if (loan.amount === 0) loan.status = "settled";
  if (direction < 0 && Number(record.amount) > 0) loan.status = "open";
}

function applyGoalSaving(record, amount) {
  const goal = state.goals.find((item) => item.id === record.goalId);
  if (!goal) return;
  goal.saved = Math.min(Math.max(Number(goal.saved) + amount, 0), Number(goal.target));
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  $("#theme-toggle").setAttribute("aria-pressed", String(isDark));
  $("#theme-label").textContent = isDark ? "Dark" : "Light";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("dark-theme") ? "light" : "dark");
}

function restoreTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateString));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

bindNavigation();
bindModals();
bindForms();
restoreTheme();
renderAll();
