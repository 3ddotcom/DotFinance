// DotFinance — módulo de Orçamentos
// Carregar depois de js/app.js, pois usa currentUser, categories e window.supabaseClient.

let budgetsCurrentMonth = new Date();
let budgetsCache = [];

function setupBudgets() {
    const form = document.getElementById("budgetForm");
    const monthInput = document.getElementById("budgetMonth");
    const cancelButton = document.getElementById("budgetCancelEdit");
    const list = document.getElementById("budgetsList");

    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    if (monthInput) monthInput.value = getBudgetsMonthValue(budgetsCurrentMonth);

    form.addEventListener("submit", saveBudget);
    if (cancelButton) cancelButton.addEventListener("click", resetBudgetForm);

    const monthPicker = document.getElementById("budgetsMonthFilter");
    if (monthPicker) {
        monthPicker.value = getBudgetsMonthValue(budgetsCurrentMonth);
        monthPicker.addEventListener("change", async () => {
            const [year, month] = monthPicker.value.split("-").map(Number);
            budgetsCurrentMonth = new Date(year, month - 1, 1);
            if (monthInput) monthInput.value = monthPicker.value;
            await loadBudgetsPage();
        });
    }

    if (list) {
        list.addEventListener("click", async (event) => {
            const edit = event.target.closest("[data-budget-edit]");
            const remove = event.target.closest("[data-budget-delete]");
            if (edit) {
                const budget = budgetsCache.find(item => item.id === edit.dataset.budgetEdit);
                if (budget) fillBudgetForm(budget);
            }
            if (remove) {
                await deleteBudget(remove.dataset.budgetDelete);
            }
        });
    }

    populateBudgetCategories();
}

function getBudgetsMonthValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getBudgetsMonthRange(value) {
    const [year, month] = value.split("-").map(Number);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const next = new Date(year, month, 1);
    const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
    return { start, end };
}

function formatBudgetCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency", currency: "BRL"
    }).format(Number(value) || 0);
}

function populateBudgetCategories() {
    const select = document.getElementById("budgetCategory");
    if (!select) return;
    const current = select.value;
    const expenseCategories = (Array.isArray(categories) ? categories : [])
        .filter(item => item && item.id && item.name);
    select.innerHTML = '<option value="">Selecione uma categoria</option>' +
        expenseCategories.map(item =>
            `<option value="${budgetEscapeHtml(item.id)}">${budgetEscapeHtml(item.icon || "•")} ${budgetEscapeHtml(item.name)}</option>`
        ).join("");
    if (current) select.value = current;
}


let budgetsLoadRequest = 0;

async function loadBudgetsPage() {
    if (!currentUser) return;

    const list = document.getElementById("budgetsList");
    if (!list) return;

    const requestId = ++budgetsLoadRequest;

    console.time("Orçamentos: carregamento total");

    try {
        populateBudgetCategories();

        const monthPicker =
            document.getElementById("budgetsMonthFilter");

        const monthValue =
            monthPicker?.value ||
            getBudgetsMonthValue(budgetsCurrentMonth);

        const { start, end } = getBudgetsMonthRange(monthValue);

        list.innerHTML =
            '<div class="budget-empty">Carregando orçamentos...</div>';

        console.time("Orçamentos: consulta budgets");

        const {
            data: budgets,
            error: budgetError
        } = await window.supabaseClient
            .from("budgets")
            .select(
                "id, user_id, category_id, month_start, limit_amount, alert_threshold, categories(name, icon)"
            )
            .eq("user_id", currentUser.id)
            .eq("month_start", start)
            .order("created_at", { ascending: true });

        console.timeEnd("Orçamentos: consulta budgets");

        if (requestId !== budgetsLoadRequest) return;

        if (budgetError) {
            console.error("Erro ao carregar orçamentos:", budgetError);
            list.innerHTML =
                `<div class="budget-empty">Não foi possível carregar os orçamentos. ${budgetEscapeHtml(budgetError.message)}</div>`;
            return;
        }

        console.time("Orçamentos: consulta expenses");

        const {
            data: expenses,
            error: expenseError
        } = await window.supabaseClient
            .from("expenses")
            .select("category_id, amount, date")
            .eq("user_id", currentUser.id)
            .gte("date", start)
            .lt("date", end);

        console.timeEnd("Orçamentos: consulta expenses");

        if (requestId !== budgetsLoadRequest) return;

        if (expenseError) {
            console.error("Erro ao consultar gastos:", expenseError);
            list.innerHTML =
                `<div class="budget-empty">Erro ao consultar gastos: ${budgetEscapeHtml(expenseError.message)}</div>`;
            return;
        }

        console.time("Orçamentos: renderização");

        const spentByCategory = new Map();

        (expenses || []).forEach(expense => {
            const key = String(expense.category_id || "");
            spentByCategory.set(
                key,
                (spentByCategory.get(key) || 0) +
                    Number(expense.amount || 0)
            );
        });

        budgetsCache = (budgets || []).map(budget => {
            const spent =
                spentByCategory.get(String(budget.category_id)) || 0;

            const limit = Number(budget.limit_amount) || 0;
            const percent = limit > 0 ? spent / limit * 100 : 0;

            return {
                ...budget,
                spent,
                limit,
                percent,
                remaining: limit - spent
            };
        });

        const totalLimit =
            budgetsCache.reduce((sum, item) => sum + item.limit, 0);

        const totalSpent =
            budgetsCache.reduce((sum, item) => sum + item.spent, 0);

        const totalRemaining = totalLimit - totalSpent;

        const overCount =
            budgetsCache.filter(item => item.percent >= 100).length;

        const alertCount =
            budgetsCache.filter(item =>
                item.percent >= Number(item.alert_threshold || 80) &&
                item.percent < 100
            ).length;

        setBudgetText("budgetsTotalLimit", formatBudgetCurrency(totalLimit));
        setBudgetText("budgetsTotalSpent", formatBudgetCurrency(totalSpent));
        setBudgetText("budgetsTotalRemaining", formatBudgetCurrency(totalRemaining));
        setBudgetText(
            "budgetsAlertCount",
            `${overCount} estourado(s) · ${alertCount} em alerta`
        );

        if (!budgetsCache.length) {
            list.innerHTML = `
                <div class="budget-empty">
                    <div class="budget-empty-icon">◎</div>
                    <strong>Nenhum orçamento neste mês</strong>
                    <span>Defina um limite por categoria para acompanhar seus gastos e receber alertas visuais.</span>
                </div>`;
            return;
        }

        list.innerHTML = budgetsCache.map(item => {
            const category = item.categories || {};
            const percentDisplay = Math.round(item.percent);
            const safePercent = Math.min(100, Math.max(0, item.percent));

            const state = item.percent >= 100
                ? "over"
                : item.percent >= Number(item.alert_threshold || 80)
                    ? "warning"
                    : "good";

            const statusText = state === "over"
                ? "Limite ultrapassado"
                : state === "warning"
                    ? "Atenção: perto do limite"
                    : "Dentro do planejado";

            const remainingText = item.remaining >= 0
                ? `${formatBudgetCurrency(item.remaining)} restantes`
                : `${formatBudgetCurrency(Math.abs(item.remaining))} acima do limite`;

            return `
                <article class="budget-card ${state}">
                    <div class="budget-card-top">
                        <div class="budget-category">
                            <span class="budget-category-icon">${budgetEscapeHtml(category.icon || "•")}</span>
                            <div>
                                <h3>${budgetEscapeHtml(category.name || "Categoria")}</h3>
                                <p>${budgetEscapeHtml(statusText)}</p>
                            </div>
                        </div>
                        <div class="budget-actions">
                            <button type="button" class="budget-icon-button"
                                data-budget-edit="${budgetEscapeHtml(item.id)}"
                                aria-label="Editar orçamento" title="Editar">✎</button>
                            <button type="button" class="budget-icon-button danger"
                                data-budget-delete="${budgetEscapeHtml(item.id)}"
                                aria-label="Excluir orçamento" title="Excluir">×</button>
                        </div>
                    </div>
                    <div class="budget-numbers">
                        <div><span>Gasto</span><strong>${formatBudgetCurrency(item.spent)}</strong></div>
                        <div><span>Limite mensal</span><strong>${formatBudgetCurrency(item.limit)}</strong></div>
                    </div>
                    <div class="budget-progress-track">
                        <div class="budget-progress-fill" style="width:${safePercent}%"></div>
                    </div>
                    <div class="budget-progress-meta">
                        <span>${percentDisplay}% utilizado</span>
                        <span>${budgetEscapeHtml(remainingText)}</span>
                    </div>
                    <div class="budget-threshold">
                        Alerta configurado em ${Number(item.alert_threshold || 80)}%
                    </div>
                </article>`;
        }).join("");

        console.timeEnd("Orçamentos: renderização");

    } catch (error) {
        console.error("Erro inesperado ao carregar orçamentos:", error);

        if (requestId === budgetsLoadRequest) {
            list.innerHTML =
                '<div class="budget-empty">Ocorreu um erro ao exibir os orçamentos. Consulte o Console.</div>';
        }
    } finally {
        console.timeEnd("Orçamentos: carregamento total");
    }
}


function setBudgetText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

async function saveBudget(event) {
    event.preventDefault();
    if (!currentUser) return;

    const id = document.getElementById("budgetId").value;
    const categoryId = document.getElementById("budgetCategory").value;
    const monthValue = document.getElementById("budgetMonth").value;
    const limitAmount = Number(document.getElementById("budgetLimit").value);
    const threshold = Number(document.getElementById("budgetThreshold").value || 80);
    const message = document.getElementById("budgetFormMessage");
    const submit = document.getElementById("budgetSave");

    if (!categoryId || !monthValue || !Number.isFinite(limitAmount) || limitAmount <= 0) {
        if (message) message.textContent = "Selecione uma categoria, mês e limite maior que zero.";
        return;
    }

    const { start } = getBudgetsMonthRange(monthValue);
    const payload = {
        user_id: currentUser.id,
        category_id: categoryId,
        month_start: start,
        limit_amount: limitAmount,
        alert_threshold: threshold
    };

    if (submit) {
        submit.disabled = true;
        submit.textContent = "Salvando...";
    }
    if (message) message.textContent = "";

    let result;
    if (id) {
        result = await window.supabaseClient.from("budgets").update(payload)
            .eq("id", id).eq("user_id", currentUser.id);
    } else {
        result = await window.supabaseClient.from("budgets").upsert(payload, {
            onConflict: "user_id,category_id,month_start"
        });
    }

    if (submit) {
        submit.disabled = false;
        submit.textContent = id ? "Salvar alterações" : "Criar orçamento";
    }

    if (result.error) {
        console.error("Erro ao salvar orçamento:", result.error);
        if (message) message.textContent = result.error.code === "23505"
            ? "Já existe um orçamento para esta categoria neste mês."
            : `Não foi possível salvar: ${result.error.message}`;
        return;
    }

    resetBudgetForm();
    const monthPicker = document.getElementById("budgetsMonthFilter");
    if (monthPicker) monthPicker.value = monthValue;
    await loadBudgetsPage();
}

function fillBudgetForm(budget) {
    document.getElementById("budgetId").value = budget.id;
    document.getElementById("budgetCategory").value = budget.category_id;
    document.getElementById("budgetMonth").value = budget.month_start.slice(0, 7);
    document.getElementById("budgetLimit").value = Number(budget.limit_amount);
    document.getElementById("budgetThreshold").value = String(budget.alert_threshold || 80);
    const submit = document.getElementById("budgetSave");
    if (submit) submit.textContent = "Salvar alterações";
    const cancel = document.getElementById("budgetCancelEdit");
    if (cancel) cancel.hidden = false;
    setBudgetText("budgetFormHeading", "Editar orçamento");
    document.getElementById("budgetForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setBudgetText("budgetFormMessage", "");
}

function resetBudgetForm() {
    const form = document.getElementById("budgetForm");
    if (form) form.reset();
    const id = document.getElementById("budgetId");
    if (id) id.value = "";
    const month = document.getElementById("budgetMonth");
    const filter = document.getElementById("budgetsMonthFilter");
    const monthValue = filter?.value || getBudgetsMonthValue(budgetsCurrentMonth);
    if (month) month.value = monthValue;
    const threshold = document.getElementById("budgetThreshold");
    if (threshold) threshold.value = "80";
    const submit = document.getElementById("budgetSave");
    if (submit) submit.textContent = "Criar orçamento";
    const cancel = document.getElementById("budgetCancelEdit");
    if (cancel) cancel.hidden = true;
    setBudgetText("budgetFormHeading", "Novo orçamento");
    setBudgetText("budgetFormMessage", "");
    populateBudgetCategories();
}

async function deleteBudget(id) {
    if (!currentUser || !id) return;
    if (!window.confirm("Excluir este orçamento? Os gastos registrados não serão apagados.")) return;

    const { error } = await window.supabaseClient.from("budgets")
        .delete().eq("id", id).eq("user_id", currentUser.id);

    if (error) {
        console.error("Erro ao excluir orçamento:", error);
        window.alert(`Não foi possível excluir o orçamento: ${error.message}`);
        return;
    }
    await loadBudgetsPage();
}

function budgetEscapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}