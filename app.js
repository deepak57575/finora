const STORAGE_KEY = "finora-finance-state";

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
    { id: crypto.randomUUID(), month: currentMonth(), type: "income", amount: 85000, category: "Salary", note: "Primary income" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "income", amount: 12000, category: "Freelance", note: "Side project" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "expense", amount: 22000, category: "Rent", note: "Apartment" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "expense", amount: 9200, category: "Groceries", note: "Monthly essentials" },
    { id: crypto.randomUUID(), month: currentMonth(), type: "expense", amount: 4500, category: "Transport", note: "Fuel and rides" },
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
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoState);

  try {
    return JSON.parse(saved);
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
  return state.transactions.filter((entry) => entry.month === state.activeMonth);
}

function totals() {
  const entries = selectedTransactions();
  const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const activeEmi = state.emis.filter((emi) => emi.status === "active").reduce((sum, emi) => sum + Number(emi.amount), 0);
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
  const activeEmis = state.emis.filter((emi) => emi.status === "active");

  $("#dash-income").textContent = formatMoney(summary.income);
  $("#dash-income-sub").textContent = `${incomeCount} income ${incomeCount === 1 ? "entry" : "entries"}`;
  $("#dash-expenses").textContent = formatMoney(summary.expenses);
  $("#dash-expense-sub").textContent = `${expenseCount} expense ${expenseCount === 1 ? "entry" : "entries"}`;
  $("#dash-emi").textContent = formatMoney(summary.activeEmi);
  $("#dash-emi-sub").textContent = `${activeEmis.length} active ${activeEmis.length === 1 ? "EMI" : "EMIs"}`;
  $("#dash-balance").textContent = formatMoney(summary.balance);
  $("#sidebar-balance").textContent = formatMoney(summary.balance);
  $("#loan-given").textContent = formatMoney(summary.loanGiven);
  $("#loan-taken").textContent = formatMoney(summary.loanTaken);

  renderCategoryBars(summary);
  renderGoalPreview();
  renderEmiPreview();
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

function renderEmiPreview() {
  const emis = [...state.emis]
    .filter((emi) => emi.status === "active")
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
    : `<div class="empty-state">No active EMIs due.</div>`;
}

function renderTransactions() {
  const entries = [...selectedTransactions()].reverse();
  $("#transaction-list").innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="list-item">
              <div>
                <span class="pill">${entry.type}</span>
                <h3>${escapeHtml(entry.category)}</h3>
                <p>${escapeHtml(entry.note || "No note")} · ${entry.month}</p>
              </div>
              <div class="item-actions">
                <strong class="amount ${entry.type}">${entry.type === "income" ? "+" : "-"}${formatMoney(entry.amount)}</strong>
                <button class="danger-button" data-delete="transactions" data-id="${entry.id}" type="button">Delete</button>
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
              <button class="ghost-button" data-add-saving="${goal.id}" type="button">Add saved</button>
              <button class="danger-button" data-delete="goals" data-id="${goal.id}" type="button">Delete</button>
            </div>`
          : ""
      }
    </article>
  `;
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
  renderDashboard();
  renderTransactions();
  renderLoans();
  renderEmis();
  renderGoals();
  bindDynamicActions();
}

function bindDynamicActions() {
  $$("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const collection = button.dataset.delete;
      state[collection] = state[collection].filter((item) => item.id !== button.dataset.id);
      saveState();
      renderAll();
    });
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
    const form = new FormData(event.currentTarget);
    state.transactions.push({
      id: crypto.randomUUID(),
      month: state.activeMonth,
      type: form.get("type"),
      amount: Number(form.get("amount")),
      category: form.get("category").trim(),
      note: form.get("note").trim(),
    });
    event.currentTarget.reset();
    saveState();
    renderAll();
  });

  $("#loan-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.loans.push({
      id: crypto.randomUUID(),
      direction: form.get("direction"),
      person: form.get("person").trim(),
      amount: Number(form.get("amount")),
      dueDate: form.get("dueDate"),
      status: form.get("status"),
    });
    event.currentTarget.reset();
    saveState();
    renderAll();
  });

  $("#emi-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.emis.push({
      id: crypto.randomUUID(),
      name: form.get("name").trim(),
      amount: Number(form.get("amount")),
      dueDay: Number(form.get("dueDay")),
      monthsLeft: Number(form.get("monthsLeft")),
      status: form.get("status"),
    });
    event.currentTarget.reset();
    saveState();
    renderAll();
  });

  $("#goal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.goals.push({
      id: crypto.randomUUID(),
      name: form.get("name").trim(),
      target: Number(form.get("target")),
      saved: Number(form.get("saved")),
      targetDate: form.get("targetDate"),
    });
    event.currentTarget.reset();
    saveState();
    renderAll();
  });
}

function bindNavigation() {
  const menuButton = $("#mobile-menu-button");
  const backdrop = $("#menu-backdrop");
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
    if (event.key === "Escape") closeMenu();
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

  $("#reset-demo").addEventListener("click", () => {
    state = structuredClone(demoState);
    state.activeMonth = currentMonth();
    state.transactions = state.transactions.map((entry) => ({ ...entry, id: crypto.randomUUID(), month: currentMonth() }));
    state.loans = state.loans.map((entry) => ({ ...entry, id: crypto.randomUUID() }));
    state.emis = state.emis.map((entry) => ({ ...entry, id: crypto.randomUUID() }));
    state.goals = state.goals.map((entry) => ({ ...entry, id: crypto.randomUUID() }));
    saveState();
    renderAll();
  });
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
bindForms();
renderAll();
