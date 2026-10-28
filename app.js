let currentUser = null;
let currentDate = new Date();
let categories = [];


// ==============================
// INICIALIZAÇÃO
// ==============================


async function initApp() {
    try {
        const {
            data: { user },
            error
        } = await window.supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!user) {
            window.location.href = "index.html";
            return;
        }

        currentUser = user;

        setupUser();
        updateGreeting();
        setupNavigation();
        setupModal();
        setupMonthNavigation();
        setupExpensesPage();
        setupIncomeModal();
        setupFinancialIntelligence();
        setupLogout();

        console.time("loadCategories");
        await loadCategories();
        console.timeEnd("loadCategories");

        setupBudgets();

        console.time("loadIncomeCategories");
        await loadIncomeCategories();
        console.timeEnd("loadIncomeCategories");

        console.time("loadExpensesCategoryFilter");
        await loadExpensesCategoryFilter();
        console.timeEnd("loadExpensesCategoryFilter");

        // Escolhe a página antes de carregar os dados dela.
        const params = new URLSearchParams(window.location.search);
        const requestedPage = params.get("page");

        const allowedPages = [
            "dashboard",
            "expenses",
            "budgets",
            "reports",
            "intelligence",
            "settings"
        ];

        const initialPage = allowedPages.includes(requestedPage)
            ? requestedPage
            : "dashboard";

        console.log("Página inicial escolhida:", initialPage);

        // changePage carrega os dados da página selecionada.
        await changePage(initialPage);

    } catch (error) {
        console.error(
            "Erro ao inicializar o aplicativo:",
            error
        );
    }
}

// ==============================
// USUÁRIO
// ==============================

function setupUser() {
    const email = currentUser?.email || "";
    const userName =
        email.split("@")[0] || "Usuário";

    const avatar =
        email.charAt(0).toUpperCase() || "U";

    const userEmailElement =
        document.getElementById("userEmail");

    const userNameElement =
        document.getElementById("userName");

    const avatarElement =
        document.querySelector(".avatar");

    if (userEmailElement) {
        userEmailElement.textContent = email;
    }

    if (userNameElement) {
        userNameElement.textContent = userName;
    }

    if (avatarElement) {
        avatarElement.textContent = avatar;
    }
}


// ==============================
// NAVEGAÇÃO
// ==============================

function setupNavigation() {
    const buttons =
        document.querySelectorAll(
            ".nav-item[data-page]"
        );

    buttons.forEach(button => {
        button.addEventListener(
            "click",
            async () => {
                const page =
                    button.dataset.page;

                if (page) {
                    await changePage(page);
                }
            }
        );
    });
}


async function changePage(page) {
    document
        .querySelectorAll(".page")
        .forEach(element => {
            element.classList.remove(
                "active-page"
            );
        });

    const target =
        document.getElementById(
            `${page}Page`
        );

    if (target) {
        target.classList.add(
            "active-page"
        );
    }

    document
        .querySelectorAll(
            ".nav-item[data-page]"
        )
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

    const titles = {
        dashboard: [
            "Dashboard",
            "Visão geral das suas finanças"
        ],

        expenses: [
            "Gastos",
            "Controle das despesas empresariais"
        ],

        budgets: [
    "Orçamentos",
    "Defina limites mensais e acompanhe seus gastos"
],

        investments: [
            "Investimentos",
            "Acompanhe seu patrimônio"
        ],

        reports: [
            "Relatórios",
            "Análise financeira"
        ],

        intelligence: [
            "Inteligência Financeira",
            "Diagnóstico, projeções e recomendações"
        ],

        settings: [
            "Configurações",
            "Configurações da conta"
        ]
    };

    if (titles[page]) {
        const titleElement =
            document.getElementById(
                "pageTitle"
            );

        const subtitleElement =
            document.getElementById(
                "pageSubtitle"
            );

        if (titleElement) {
            titleElement.textContent =
                titles[page][0];
        }

        if (subtitleElement) {
            subtitleElement.textContent =
                titles[page][1];
        }
    }

    if (page === "dashboard") {
        await loadDashboard();
    }

    if (page === "expenses") {
        await loadExpensesPage();
    }

    if (page === "budgets") {
        await loadBudgetsPage();
    }

    if (page === "intelligence") {
        await loadFinancialIntelligence();
    }
}


// ==============================
// CATEGORIAS DE GASTOS
// ==============================

async function loadCategories() {
    if (!currentUser) {
        return;
    }

    const {
        data,
        error
    } = await window.supabaseClient
        .from("categories")
        .select(
            "id, name, icon, active"
        )
        .eq(
            "user_id",
            currentUser.id
        )
        .eq(
            "type",
            "expense"
        )
        .eq(
            "active",
            true
        )
        .order(
            "name"
        );

    if (error) {
        console.error(
            "Erro ao carregar categorias:",
            error
        );
        return;
    }

    categories =
        data || [];

    const select =
        document.getElementById(
            "expenseCategory"
        );

    if (!select) {
        return;
    }

    populateCategorySelect(
        select,
        categories,
        "Selecione"
    );
}


// ==============================
// CATEGORIAS DE ENTRADAS
// ==============================

async function loadIncomeCategories() {
    const select =
        document.getElementById(
            "incomeCategory"
        );

    if (!select || !currentUser) {
        return;
    }

    try {
        const {
            data,
            error
        } = await window.supabaseClient
            .from("categories")
            .select(
                "id, name, icon, active, type"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .eq(
                "type",
                "income"
            )
            .eq(
                "active",
                true
            )
            .order(
                "name"
            );

        if (error) {
            throw error;
        }

        let incomeCategories =
            data || [];

            console.log(
    "CATEGORIAS DE ENTRADA:",
    incomeCategories
);

        /*
         * Cria categorias padrão caso
         * o usuário ainda não possua
         * nenhuma categoria de entrada.
         */

        if (!incomeCategories.length) {
            const defaultCategories = [
                {
                    user_id:
                        currentUser.id,

                    name:
                        "Vendas",

                    type:
                        "income",

                    icon:
                        "💰",

                    active:
                        true
                },

                {
                    user_id:
                        currentUser.id,

                    name:
                        "Serviços",

                    type:
                        "income",

                    icon:
                        "🛠️",

                    active:
                        true
                },

                {
                    user_id:
                        currentUser.id,

                    name:
                        "Outros",

                    type:
                        "income",

                    icon:
                        "📦",

                    active:
                        true
                }
            ];

            const {
                data:
                    createdCategories,
                error:
                    insertError
            } =
                await window.supabaseClient
                    .from("categories")
                    .insert(
                        defaultCategories
                    )
                    .select(
                        "id, name, icon, active, type"
                    );

            if (insertError) {
                throw insertError;
            }

            incomeCategories =
                createdCategories || [];
        }

        populateCategorySelect(
            select,
            incomeCategories,
            "Selecione"
        );

    } catch (error) {
        console.error(
            "Erro ao carregar categorias de entrada:",
            error
        );

        select.innerHTML = `
            <option value="">
                Não foi possível carregar
            </option>
        `;
    }
}


// ==============================
// MAPA DE CATEGORIAS DE ENTRADAS
// ==============================

async function loadIncomeCategoriesMap() {
    if (!currentUser) {
        return {};
    }

    try {
        const {
            data,
            error
        } = await window.supabaseClient
            .from("categories")
            .select(
                "id, name, icon"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .eq(
                "type",
                "income"
            );

        if (error) {
            throw error;
        }

        const map = {};

        (data || []).forEach(
            category => {
                map[category.id] =
                    category;
            }
        );

        return map;

    } catch (error) {
        console.error(
            "Erro ao carregar mapa de categorias de entrada:",
            error
        );

        return {};
    }
}


// ==============================
// POPULAR SELECT DE CATEGORIAS
// ==============================

function populateCategorySelect(
    select,
    data,
    placeholder
) {
    if (!select) {
        return;
    }

    select.innerHTML = "";

    const firstOption =
        document.createElement(
            "option"
        );

    firstOption.value = "";
    firstOption.textContent =
        placeholder;

    select.appendChild(
        firstOption
    );

    (data || []).forEach(
        category => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category.id;

            option.textContent =
                `${category.icon || ""} ${category.name}`.trim();

            select.appendChild(
                option
            );
        }
    );
}


// ==============================
// FILTRO DE CATEGORIAS
// ==============================

async function loadExpensesCategoryFilter() {
    const select =
        document.getElementById(
            "expenseCategoryFilter"
        );

    if (!select || !currentUser) {
        return;
    }

    const {
        data,
        error
    } = await window.supabaseClient
        .from("categories")
        .select(
            "id, name, icon"
        )
        .eq(
            "user_id",
            currentUser.id
        )
        .eq(
            "active",
            true
        )
        .eq(
            "type",
            "expense"
        )
        .order(
            "name"
        );

    if (error) {
        console.error(
            "Erro ao carregar categorias do filtro:",
            error
        );

        return;
    }

    select.innerHTML = `
        <option value="">
            Todas as categorias
        </option>
    `;

    (data || []).forEach(
        category => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category.id;

            option.textContent =
                `${category.icon || ""} ${category.name}`.trim();

            select.appendChild(
                option
            );
        }
    );
}


// ==============================
// DASHBOARD
// ==============================

async function loadDashboard() {
    if (!currentUser) {
        return;
    }

    updateMonthLabel();

    const {
        start,
        end
    } = getMonthRange();

    const {
        previousStart
    } = getPreviousMonthRange();

    try {
        const [
            expensesResult,
            incomesResult,
            previousExpensesResult,
            previousIncomesResult,
            evolutionResult,
            incomeCategoriesMap
        ] = await Promise.all([
            loadCurrentExpenses(
                start,
                end
            ),

            loadCurrentIncomes(
                start,
                end
            ),

            loadPreviousExpenses(
                previousStart,
                start
            ),

            loadPreviousIncomes(
                previousStart,
                start
            ),

            loadExpensesEvolutionData(),

            loadIncomeCategoriesMap()
        ]);

        const expenses =
            expensesResult.data || [];

        const incomes =
            (incomesResult.data || [])
                .map(
                    income => ({
                        ...income,

                        categories:
                            incomeCategoriesMap[
                                income.category_id
                            ] || null
                    })
                );

        const previousExpenses =
            previousExpensesResult.data || [];

        const previousIncomes =
            previousIncomesResult.data || [];

        const evolutionMonths =
            evolutionResult.data || [];

        if (expensesResult.error) {
            console.error(
                "Erro ao carregar gastos:",
                expensesResult.error
            );

            return;
        }

        if (incomesResult.error) {
            console.error(
                "Erro ao carregar entradas:",
                incomesResult.error
            );
        }

        if (previousExpensesResult.error) {
            console.error(
                "Erro ao carregar mês anterior:",
                previousExpensesResult.error
            );
        }

        updateDashboardSummary(
            incomes,
            expenses,
            previousIncomes,
            previousExpenses
        );

        renderCategoryChart(
            expenses
        );

        renderIncomePieChart(
            incomes
        );

        renderMonthlySummaryPie(
            incomes,
            expenses
        );

        renderExpenseEvolution(
            evolutionMonths
        );

        renderRecentExpenses(
            expenses.slice(
                0,
                10
            )
        );

        renderRecentIncomes(
            incomes.slice(
                0,
                10
            )
        );

    } catch (error) {
        console.error(
            "Erro ao carregar dashboard:",
            error
        );
    }
}


// ==============================
// CONSULTA DE GASTOS DO MÊS
// ==============================

async function loadCurrentExpenses(
    start,
    end
) {
    return await window.supabaseClient
        .from("expenses")
        .select(`
            *,
            categories (
                name,
                icon
            )
        `)
        .eq(
            "user_id",
            currentUser.id
        )
        .gte(
            "date",
            start
        )
        .lt(
            "date",
            end
        )
        .order(
            "date",
            {
                ascending: false
            }
        );
}


// ==============================
// CONSULTA DE ENTRADAS DO MÊS
// ==============================

async function loadCurrentIncomes(
    start,
    end
) {
    if (!currentUser) {
        return {
            data: [],
            error: null
        };
    }

    try {
        const {
            data,
            error
        } = await window.supabaseClient
            .from("incomes")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .gte(
                "date",
                start
            )
            .lt(
                "date",
                end
            )
            .order(
                "date",
                {
                    ascending: false
                }
            );

        if (error) {
            console.error(
                "Erro ao carregar entradas:",
                error
            );

            return {
                data: [],
                error
            };
        }

        return {
            data:
                data || [],
            error:
                null
        };

    } catch (error) {
        console.error(
            "Erro ao carregar entradas:",
            error
        );

        return {
            data: [],
            error
        };
    }
}


// ==============================
// CONSULTA DO MÊS ANTERIOR
// ==============================

async function loadPreviousExpenses(
    start,
    end
) {
    return await window.supabaseClient
        .from("expenses")
        .select("amount")
        .eq(
            "user_id",
            currentUser.id
        )
        .gte(
            "date",
            start
        )
        .lt(
            "date",
            end
        );
}


// ==============================
// CONSULTA DE ENTRADAS DO MÊS ANTERIOR
// ==============================

async function loadPreviousIncomes(start, end) {
    return await window.supabaseClient
        .from("incomes")
        .select("amount")
        .eq("user_id", currentUser.id)
        .gte("date", start)
        .lt("date", end);
}


// ==============================
// GRÁFICO DE ENTRADAS
// ==============================


function renderIncomePieChart(incomes) {
    const container = document.getElementById("incomePieChart");
    const details = document.getElementById("incomePieDetails");

    if (!container || !details) {
        console.warn("Gráfico de entradas: elementos HTML não encontrados.");
        return;
    }

    if (!Array.isArray(incomes)) {
        console.error("renderIncomePieChart esperava um array de entradas:", incomes);
        renderFinancialPieEmpty(
            container,
            details,
            "R$ 0,00",
            "Entradas no mês",
            "Não foi possível carregar as entradas."
        );
        return;
    }

    const categoryTotals = {};

    incomes.forEach(income => {
        const categoryId = income.category_id || "uncategorized";
        const category = income.categories;
        const name = category?.name || "Sem categoria";
        const icon = category?.icon || "•";
        const amount = Number(income.amount) || 0;

        if (!categoryTotals[categoryId]) {
            categoryTotals[categoryId] = {
                name,
                icon,
                amount: 0
            };
        }

        categoryTotals[categoryId].amount += amount;
    });

    const categoryData = Object.values(categoryTotals)
        .sort((a, b) => b.amount - a.amount);

    const total = categoryData.reduce(
        (sum, category) => sum + category.amount,
        0
    );

    if (!categoryData.length || total <= 0) {
        renderFinancialPieEmpty(
            container,
            details,
            "R$ 0,00",
            "Entradas no mês",
            "Nenhuma entrada registrada neste mês."
        );
        return;
    }

    const colors = [
        "#54ff9f",
        "#38bdf8",
        "#a78bfa",
        "#22d3ee",
        "#ffd166",
        "#ec4899",
        "#c084fc",
        "#14b8a6",
        "#f97316",
        "#22c55e"
    ];

    console.log("Diagnóstico do gráfico de entradas:", {
        containerIsElement: container instanceof Element,
        detailsIsElement: details instanceof Element,
        dataIsArray: Array.isArray(categoryData),
        total,
        categories: categoryData.length
    });

    renderFinancialPie(
        container,
        details,
        categoryData,
        total,
        colors,
        "Entradas no mês",
        "income"
    );
}


// ==============================
// GRÁFICO DE RESUMO MENSAL
// ==============================

function renderMonthlySummaryPie(
    incomes,
    expenses
) {
    const container =
        document.getElementById(
            "monthlyPieChart"
        );

    const details =
        document.getElementById(
            "monthlyPieDetails"
        );

    if (!container || !details) {
        return;
    }

    const incomeTotal =
        incomes.reduce(
            (sum, income) =>
                sum +
                Number(
                    income.amount || 0
                ),
            0
        );

    const expenseTotal =
        expenses.reduce(
            (sum, expense) =>
                sum +
                Number(
                    expense.amount || 0
                ),
            0
        );

    const balance =
        incomeTotal -
        expenseTotal;

    if (
        incomeTotal <= 0 &&
        expenseTotal <= 0
    ) {
        renderFinancialPieEmpty(
            container,
            details,
            "R$ 0,00",
            "Sem movimentações",
            "Nenhuma entrada ou gasto registrado neste mês."
        );

        return;
    }

    const data = [
        {
            name: "Entradas",
            icon: "↑",
            amount: incomeTotal
        },

        {
            name: "Gastos",
            icon: "↓",
            amount: expenseTotal
        }
    ].filter(
        item =>
            item.amount > 0
    );

    const colors = [
        "#34d399",
        "#fb7185"
    ];

    renderFinancialPie(
        container,
        details,
        data,
        incomeTotal +
            expenseTotal,
        colors,
        "Resumo do mês",
        "monthly",
        balance
    );
}


// ==============================
// RENDERIZADOR GENÉRICO DE PIZZA
// ==============================


function renderFinancialPie(
    container,
    details,
    data,
    total,
    colors,
    centerLabel,
    chartType,
    balance = null
) {
    // Proteção: garante que data seja uma lista
    if (!Array.isArray(data)) {
        console.error(
            "renderFinancialPie: data deveria ser um array.",
            {
                recebido: data,
                chartType: chartType
            }
        );

        data = [];
    }

    // Proteção: garante que existam cores
    if (!Array.isArray(colors) || colors.length === 0) {
        colors = [
            "#54ff9f",
            "#38bdf8",
            "#a78bfa",
            "#ffd166"
        ];
    }

    // Normaliza valores numéricos
    total = Number(total) || 0;

    const size = 280;
    const center = size / 2;
    const radius = 105;
    const strokeWidth = 42;

    const circumference = 2 * Math.PI * radius;

    let accumulated = 0;

    const validData = data
        .filter(item => item && typeof item === "object")
        .map(item => ({
            ...item,
            name: item.name ?? "Sem categoria",
            amount: Number(item.amount) || 0
        }))
        .filter(item => item.amount > 0);

    const calculatedTotal = validData.reduce(
        (sum, item) => sum + item.amount,
        0
    );

    const denominator = total > 0 ? total : calculatedTotal;

    const segments = validData.map((item, index) => {
        const percentage =
            denominator > 0
                ? item.amount / denominator
                : 0;

        const length = percentage * circumference;

        const segment = {
            ...item,
            percentage,
            color: colors[index % colors.length],
            dasharray: `${length} ${circumference - length}`,
            dashoffset: accumulated
        };

        accumulated += length;

        return segment;
    });

    container.innerHTML = `
        <div class="pie-chart-wrapper">
            <svg
                class="pie-svg"
                viewBox="0 0 ${size} ${size}"
                role="img"
                aria-label="${escapeHtml(String(centerLabel ?? ""))}"
            >
                <circle
                    class="pie-background"
                    cx="${center}"
                    cy="${center}"
                    r="${radius}"
                ></circle>

                ${segments.map((segment, index) => `
                    <circle
                        class="pie-segment financial-pie-segment"
                        data-index="${index}"
                        cx="${center}"
                        cy="${center}"
                        r="${radius}"
                        fill="none"
                        stroke="${segment.color}"
                        color="${segment.color}"
                        stroke-width="${strokeWidth}"
                        stroke-linecap="butt"
                        stroke-dasharray="${segment.dasharray}"
                        stroke-dashoffset="${-segment.dashoffset}"
                        pathLength="${circumference}"
                        transform="rotate(-90 ${center} ${center})"
                    ></circle>
                `).join("")}
            </svg>

            <div class="pie-center">
                ${getFinancialPieCenter(
                    denominator,
                    centerLabel,
                    chartType,
                    balance
                )}
            </div>
        </div>
    `;

    details.innerHTML = segments.map((segment, index) => `
        <div
            class="chart-detail-row financial-detail-row"
            data-chart-index="${index}"
        >
            <div class="chart-detail-name">
                <span
                    class="chart-detail-dot"
                    style="background:${segment.color};color:${segment.color};"
                ></span>

                <span class="chart-detail-label">
                    ${segment.icon || ""}
                    ${escapeHtml(String(segment.name))}
                </span>
            </div>

            <div class="chart-detail-value">
                ${formatCurrency(segment.amount)}

                <span class="chart-detail-percentage">
                    ${(segment.percentage * 100).toFixed(1)}%
                </span>
            </div>
        </div>
    `).join("");

    setupFinancialPieInteraction(
        container,
        details,
        segments,
        denominator,
        centerLabel,
        chartType,
        balance
    );
}


// ==============================
// CENTRO DO GRÁFICO
// ==============================

function getFinancialPieCenter(
    total,
    centerLabel,
    chartType,
    balance
) {
    if (
        chartType === "monthly" &&
        balance !== null
    ) {
        const numericBalance = Number(balance) || 0;

        const balanceClass =
            numericBalance >= 0
                ? "financial-positive"
                : "financial-negative";

        return `
            <strong class="${balanceClass}">
                ${formatCurrency(numericBalance)}
            </strong>

            <span>Saldo do mês</span>

            <small>
                ${formatCurrency(Number(total) || 0)} movimentado
            </small>
        `;
    }

    return `
        <strong>
            ${formatCurrency(Number(total) || 0)}
        </strong>

        <span>
            ${escapeHtml(String(centerLabel ?? ""))}
        </span>
    `;
}



// ==============================
// INTERAÇÃO DOS GRÁFICOS
// ==============================

function setupFinancialPieInteraction(
    container,
    details,
    segments,
    total,
    centerLabel,
    chartType,
    balance
) {
    const svgSegments =
        container.querySelectorAll(
            ".financial-pie-segment"
        );

    const detailRows =
        details.querySelectorAll(
            ".financial-detail-row"
        );

    function activate(index) {
        const selected =
            segments[index];

        if (!selected) {
            return;
        }

        svgSegments.forEach(
            (
                element,
                elementIndex
            ) => {
                element.classList.toggle(
                    "active",
                    elementIndex ===
                        index
                );

                element.classList.toggle(
                    "inactive",
                    elementIndex !==
                        index
                );
            }
        );

        detailRows.forEach(
            (
                row,
                rowIndex
            ) => {
                row.classList.toggle(
                    "active",
                    rowIndex ===
                        index
                );
            }
        );

        const center =
            container.querySelector(
                ".pie-center"
            );

        if (!center) {
            return;
        }

        center.innerHTML = `
            <strong>
                ${formatCurrency(
                    selected.amount
                )}
            </strong>

            <span>
                ${escapeHtml(
                    selected.name
                )}
            </span>

            <small>
                ${(
                    selected.percentage *
                    100
                ).toFixed(1)}%
            </small>
        `;
    }

    function reset() {
        svgSegments.forEach(
            element => {
                element.classList.remove(
                    "active",
                    "inactive"
                );
            }
        );

        detailRows.forEach(
            row => {
                row.classList.remove(
                    "active"
                );
            }
        );

        const center =
            container.querySelector(
                ".pie-center"
            );

        if (!center) {
            return;
        }

        center.innerHTML =
            getFinancialPieCenter(
                total,
                centerLabel,
                chartType,
                balance
            );
    }

    svgSegments.forEach(
        (
            segment,
            index
        ) => {
            segment.addEventListener(
                "mouseenter",
                () =>
                    activate(index)
            );

            segment.addEventListener(
                "mouseleave",
                reset
            );

            segment.addEventListener(
                "click",
                event => {
                    event.stopPropagation();

                    const isActive =
                        segment.classList.contains(
                            "active"
                        );

                    if (isActive) {
                        reset();
                    } else {
                        activate(
                            index
                        );
                    }
                }
            );
        }
    );

    detailRows.forEach(
        (
            row,
            index
        ) => {
            row.addEventListener(
                "mouseenter",
                () =>
                    activate(index)
            );

            row.addEventListener(
                "mouseleave",
                reset
            );

            row.addEventListener(
                "click",
                () => {
                    const isActive =
                        row.classList.contains(
                            "active"
                        );

                    if (isActive) {
                        reset();
                    } else {
                        activate(
                            index
                        );
                    }
                }
            );
        }
    );
}


// ==============================
// ESTADO VAZIO DOS GRÁFICOS
// ==============================

function renderFinancialPieEmpty(
    container,
    details,
    value,
    label,
    detail
) {
    container.innerHTML = `
        <div class="pie-chart-wrapper">

            <svg
                class="pie-svg"
                viewBox="0 0 280 280"
                role="img"
                aria-label="${escapeHtml(
                    label
                )}"
            >

                <circle
                    class="pie-background"
                    cx="140"
                    cy="140"
                    r="105"
                ></circle>

            </svg>

            <div class="pie-center">

                <strong>
                    ${escapeHtml(
                        value
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        label
                    )}
                </span>

            </div>

        </div>
    `;

    details.innerHTML = `
        <div class="chart-empty-details">
            ${escapeHtml(
                detail
            )}
        </div>
    `;
}


// ==============================
// EVOLUÇÃO DOS GASTOS
// ==============================

async function loadExpensesEvolutionData() {
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const year = date.getFullYear(), month = date.getMonth();
        const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const nextMonth = new Date(year, month + 1, 1);
        const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
        months.push({ date, year, month, start, end, income: 0, expenses: 0, result: 0, total: 0 });
    }
    if (!months.length) return { data: [], error: null };
    const [expensesResult, incomesResult] = await Promise.all([
        window.supabaseClient.from("expenses").select("amount, date")
            .eq("user_id", currentUser.id).gte("date", months[0].start).lt("date", months[months.length - 1].end),
        window.supabaseClient.from("incomes").select("amount, date")
            .eq("user_id", currentUser.id).gte("date", months[0].start).lt("date", months[months.length - 1].end)
    ]);
    if (expensesResult.error || incomesResult.error) {
        const error = expensesResult.error || incomesResult.error;
        console.error("Erro ao carregar evolução financeira:", error);
        return { data: months, error };
    }
    const addToMonth = (item, field) => {
        const parts = String(item.date || "").split("-");
        if (parts.length !== 3) return;
        const target = months.find(entry => entry.year === Number(parts[0]) && entry.month === Number(parts[1]) - 1);
        if (target) target[field] += Number(item.amount) || 0;
    };
    (expensesResult.data || []).forEach(item => addToMonth(item, "expenses"));
    (incomesResult.data || []).forEach(item => addToMonth(item, "income"));
    months.forEach(month => { month.result = month.income - month.expenses; month.total = month.expenses; });
    return { data: months, error: null };
}


function renderExpenseEvolution(months) {
    const container = document.getElementById("expenseEvolutionChart");
    if (!container) return;
    if (!Array.isArray(months) || !months.length) {
        container.innerHTML = '<div class="evolution-empty">Nenhuma informação disponível.</div>';
        return;
    }
    const width = 900, height = 300;
    const padding = { left: 74, right: 22, top: 24, bottom: 48 };
    const chartWidth = width - padding.left - padding.right, chartHeight = height - padding.top - padding.bottom;
    const values = months.flatMap(month => [month.income, month.expenses, month.result]);
    const maxValue = Math.max(...values, 1), minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);
    const y = value => padding.top + ((maxValue - value) / range) * chartHeight;
    const x = index => padding.left + (months.length === 1 ? chartWidth / 2 : chartWidth / (months.length - 1) * index);
    const grid = Array.from({ length: 5 }, (_, index) => {
        const value = maxValue - range * index / 4, lineY = y(value);
        return `<line class="evolution-grid-line" x1="${padding.left}" y1="${lineY}" x2="${width - padding.right}" y2="${lineY}"></line><text class="evolution-axis-label" x="0" y="${lineY + 4}">${formatCurrency(value)}</text>`;
    }).join("");
    const makeSeries = (key, color, label) => {
        const points = months.map((month, index) => ({ x: x(index), y: y(month[key]), month, value: month[key] }));
        const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
        const dots = points.map(point => `<circle class="financial-evolution-point" cx="${point.x}" cy="${point.y}" r="4" fill="${color}"><title>${escapeHtml(point.month.date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }))} · ${escapeHtml(label)}: ${escapeHtml(formatCurrency(point.value))}</title></circle>`).join("");
        return `<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>${dots}`;
    };
    const labels = months.map((month, index) => `<text class="evolution-axis-label evolution-month-label" x="${x(index)}" y="${height - 14}" text-anchor="middle">${escapeHtml(month.date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))}</text>`).join("");
    container.innerHTML = `
        <div class="financial-chart-legend">
            <span><i class="legend-income"></i>Receitas</span>
            <span><i class="legend-expenses"></i>Despesas</span>
            <span><i class="legend-result"></i>Resultado</span>
        </div>
        <svg class="evolution-svg financial-evolution-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Comparação mensal entre receitas, despesas e resultado">
            ${grid}
            <line class="financial-zero-line" x1="${padding.left}" y1="${y(0)}" x2="${width - padding.right}" y2="${y(0)}"></line>
            ${makeSeries("income", "#34d399", "Receitas")}
            ${makeSeries("expenses", "#38bdf8", "Despesas")}
            ${makeSeries("result", "#a78bfa", "Resultado")}
            ${labels}
        </svg>`;
}


// ==============================
// COMPARAÇÃO COM MÊS ANTERIOR
// ==============================

function updateMonthlyComparison(
    currentExpenses,
    previousExpenses = []
) {
    let element =
        document.getElementById(
            "monthlyExpensesComparison"
        );

    if (!element) {
        const monthlyExpenses =
            document.getElementById(
                "monthlyExpenses"
            );

        if (!monthlyExpenses) {
            return;
        }

        element =
            document.createElement(
                "small"
            );

        element.id =
            "monthlyExpensesComparison";

        element.className =
            "monthly-comparison";

        monthlyExpenses
            .parentElement
            .appendChild(
                element
            );
    }

    const currentTotal =
        sumAmounts(
            currentExpenses
        );

    const previousTotal =
        sumAmounts(
            previousExpenses
        );

    const previousDate =
        new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );

    const previousMonthName =
        previousDate.toLocaleDateString(
            "pt-BR",
            {
                month: "long"
            }
        );

    if (
        previousTotal === 0
    ) {
        if (
            currentTotal === 0
        ) {
            element.textContent =
                "Sem gastos nos dois meses";
        } else {
            element.textContent =
                `Sem gastos em ${previousMonthName}`;
        }

        element.title =
            `Mês atual: ${formatCurrency(
                currentTotal
            )} | ${previousMonthName}: ${formatCurrency(
                previousTotal
            )}`;

        return;
    }

    const variation =
        (
            (
                currentTotal -
                previousTotal
            ) /
            previousTotal
        ) *
        100;

    const percentage =
        Math.abs(
            variation
        ).toFixed(1);

    if (
        variation > 0
    ) {
        element.textContent =
            `↑ ${percentage}% vs. ${formatCurrency(
                previousTotal
            )} em ${previousMonthName}`;

    } else if (
        variation < 0
    ) {
        element.textContent =
            `↓ ${percentage}% vs. ${formatCurrency(
                previousTotal
            )} em ${previousMonthName}`;

    } else {
        element.textContent =
            `= Mesmo valor de ${previousMonthName}`;
    }

    element.title =
        `Mês atual: ${formatCurrency(
            currentTotal
        )} | ${previousMonthName}: ${formatCurrency(
            previousTotal
        )}`;
}


// ==============================
// RESUMO FINANCEIRO PRINCIPAL
// ==============================

function updateDashboardSummary(incomes, expenses, previousIncomes, previousExpenses) {
    const incomeTotal = sumAmounts(incomes);
    const expenseTotal = sumAmounts(expenses);
    const result = incomeTotal - expenseTotal;
    const margin = incomeTotal > 0 ? (result / incomeTotal) * 100 : 0;
    const previousIncomeTotal = sumAmounts(previousIncomes);
    const previousExpenseTotal = sumAmounts(previousExpenses);
    const previousResult = previousIncomeTotal - previousExpenseTotal;
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    setText("monthlyIncome", formatCurrency(incomeTotal));
    setText("monthlyExpenses", formatCurrency(expenseTotal));
    setText("monthlyResult", formatCurrency(result));
    setText("monthlyMargin", incomeTotal > 0 ? `${margin.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : "—");
    setText("monthlyIncomeComparison", compareMonthlyValue(incomeTotal, previousIncomeTotal));
    setText("monthlyExpensesComparison", compareMonthlyValue(expenseTotal, previousExpenseTotal));
    setText("monthlyResultComparison", compareMonthlyValue(result, previousResult));

    const resultCard = document.getElementById("monthlyResultCard");
    if (resultCard) {
        resultCard.classList.toggle("is-positive", result >= 0);
        resultCard.classList.toggle("is-negative", result < 0);
    }
    const marginCard = document.getElementById("monthlyMarginCard");
    if (marginCard) {
        marginCard.classList.toggle("is-positive", margin >= 0);
        marginCard.classList.toggle("is-negative", margin < 0);
    }
}

function compareMonthlyValue(current, previous) {
    if (previous === 0 && current === 0) return "Sem movimentação";
    if (previous === 0) return "Sem base de comparação no mês anterior";
    const difference = current - previous;
    const percentage = Math.abs((difference / Math.abs(previous)) * 100);
    const direction = difference > 0 ? "↑" : difference < 0 ? "↓" : "→";
    return `${direction} ${formatCurrency(Math.abs(difference))} (${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%) vs. mês anterior`;
}


// ==============================
// RESUMO DO DASHBOARD
// ==============================

function updateSummary(
    expenses
) {
    const total =
        sumAmounts(
            expenses
        );

    const count =
        expenses.length;

    const average =
        count > 0
            ? total / count
            : 0;

    const largest =
        getLargestItem(
            expenses
        );

    const monthlyExpenses =
        document.getElementById(
            "monthlyExpenses"
        );

    const expenseCount =
        document.getElementById(
            "expenseCount"
        );

    const averageExpense =
        document.getElementById(
            "averageExpense"
        );

    const largestExpense =
        document.getElementById(
            "largestExpense"
        );

    const largestExpenseName =
        document.getElementById(
            "largestExpenseName"
        );

    if (monthlyExpenses) {
        monthlyExpenses.textContent =
            formatCurrency(
                total
            );
    }

    if (expenseCount) {
        expenseCount.textContent =
            count;
    }

    if (averageExpense) {
        averageExpense.textContent =
            formatCurrency(
                average
            );
    }

    if (largestExpense) {
        largestExpense.textContent =
            largest
                ? formatCurrency(
                    largest.amount
                )
                : "R$ 0,00";
    }

    if (largestExpenseName) {
        largestExpenseName.textContent =
            largest
                ? largest.description
                : "Nenhum lançamento";
    }
}


// ==============================
// GRÁFICO DE GASTOS POR CATEGORIA
// ==============================

function renderCategoryChart(
    expenses
) {
    const container =
        document.getElementById(
            "categoryPieChart"
        );

    const details =
        document.getElementById(
            "categoryChartDetails"
        );

    if (!container || !details) {
        return;
    }

    const categoryTotals = {};

    expenses.forEach(
        expense => {
            const categoryId =
                expense.category_id ||
                "uncategorized";

            const category =
                expense.categories;

            const name =
                category?.name ||
                "Sem categoria";

            const icon =
                category?.icon ||
                "•";

            const amount =
                Number(
                    expense.amount ||
                        0
                );

            if (
                !categoryTotals[
                    categoryId
                ]
            ) {
                categoryTotals[
                    categoryId
                ] = {
                    name,
                    icon,
                    amount: 0
                };
            }

            categoryTotals[
                categoryId
            ].amount +=
                amount;
        }
    );

    const categoryData =
        Object.values(
            categoryTotals
        ).sort(
            (a, b) =>
                b.amount -
                a.amount
        );

    const total =
        categoryData.reduce(
            (
                sum,
                category
            ) =>
                sum +
                category.amount,
            0
        );

    if (
        !categoryData.length ||
        total <= 0
    ) {
        container.innerHTML = `
            <div class="pie-empty">
                <span>
                    R$ 0,00
                </span>

                <small>
                    Sem gastos
                </small>
            </div>
        `;

        details.innerHTML = `
            <div class="chart-empty-details">
                Nenhum gasto registrado neste mês.
            </div>
        `;

        return;
    }

    const colors = [
        "#38bdf8",
        "#8b5cf6",
        "#22d3ee",
        "#22c55e",
        "#f59e0b",
        "#ef4444",
        "#ec4899",
        "#a78bfa",
        "#14b8a6",
        "#f97316"
    ];

    renderFinancialPie(
        container,
        details,
        categoryData,
        total,
        colors,
        "Gastos no mês",
        "expenses"
    );
}


// ==============================
// GASTOS RECENTES
// ==============================

function renderRecentExpenses(
    expenses
) {
    const container =
        document.getElementById(
            "recentExpenses"
        );

    if (!container) {
        return;
    }

    if (!expenses.length) {
        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ↓
                </div>

                <strong>
                    Nenhum gasto registrado
                </strong>

                <span>
                    Adicione seu primeiro gasto para começar.
                </span>

            </div>
        `;

        return;
    }

    container.innerHTML =
        expenses
            .map(
                renderExpenseRow
            )
            .join("");
}


// ==============================
// ENTRADAS RECENTES
// ==============================

function renderRecentIncomes(incomes) {
    const container =
        document.getElementById("recentIncomes");

    if (!container) {
        return;
    }

    if (!incomes.length) {
        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ↑
                </div>

                <strong>
                    Nenhuma entrada registrada
                </strong>

                <span>
                    Adicione sua primeira entrada para começar.
                </span>

            </div>
        `;

        return;
    }

    container.innerHTML =
        incomes
            .map(income => {
                const category =
                    income.categories;

                return `
                    <div
                        class="expense-row"
                        data-income-id="${escapeHtml(income.id)}"
                    >

                        <div class="expense-main">

                            <div class="expense-description">
                                ${escapeHtml(
                                    income.description
                                )}
                            </div>

                            <div class="expense-meta">

                                ↑

                                ${escapeHtml(
                                    category?.name ||
                                    "Entrada"
                                )}

                                ·

                                ${formatDate(
                                    income.date
                                )}

                            </div>

                        </div>

                        <div class="expense-value income-value">

                            +

                            ${formatCurrency(
                                income.amount
                            )}

                        </div>

                        <div class="expense-actions">

                            <button
                                class="expense-action edit"
                                type="button"
                                onclick="editIncome('${escapeJsAttribute(income.id)}')"
                                title="Editar entrada"
                            >
                                ✏️
                            </button>

                            <button
                                class="expense-action delete"
                                type="button"
                                onclick="deleteIncome('${escapeJsAttribute(income.id)}')"
                                title="Excluir entrada"
                            >
                                🗑️
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");
}

// ==============================
// TODOS OS GASTOS
// ==============================

function renderAllExpenses(
    expenses
) {
    const container =
        document.getElementById(
            "allExpenses"
        );

    if (!container) {
        return;
    }

    if (!expenses.length) {
        container.innerHTML = `
            <div class="empty-state">

                <strong>
                    Nenhum gasto registrado
                </strong>

            </div>
        `;

        return;
    }

    container.innerHTML =
        expenses
            .map(
                renderExpenseRow
            )
            .join("");
}


// ==============================
// LINHA DE GASTO
// ==============================

function renderExpenseRow(
    expense
) {
    const category =
        expense.categories;

    const categoryName =
        category?.name ||
        "Sem categoria";

    const date =
        formatDate(
            expense.date
        );

    return `
        <div
            class="expense-row"
            data-expense-id="${escapeHtml(
                expense.id
            )}"
        >

            <div class="expense-main">

                <div class="expense-description">
                    ${escapeHtml(
                        expense.description
                    )}
                </div>

                <div class="expense-meta">

                    ${category?.icon || ""}

                    ${escapeHtml(
                        categoryName
                    )}

                    · ${date}

                </div>

            </div>

            <div class="expense-value">

                ${formatCurrency(
                    expense.amount
                )}

            </div>

            <div class="expense-actions">

                <button
                    class="expense-action edit"
                    type="button"
                    onclick="editExpense('${escapeJsAttribute(
                        expense.id
                    )}')"
                    title="Editar gasto"
                >
                    ✏️
                </button>

                <button
                    class="expense-action delete"
                    type="button"
                    onclick="deleteExpense('${escapeJsAttribute(
                        expense.id
                    )}')"
                    title="Excluir gasto"
                >
                    🗑️
                </button>

            </div>

        </div>
    `;
}


// ==============================
// MODAL DE GASTO
// ==============================

function setupModal() {
    const modal =
        document.getElementById(
            "expenseModal"
        );

    const newExpenseButton =
        document.getElementById(
            "newExpenseButton"
        );

    const newExpenseButton2 =
        document.getElementById(
            "newExpenseButton2"
        );

    const closeButton =
        document.getElementById(
            "closeExpenseModal"
        );

    const cancelButton =
        document.getElementById(
            "cancelExpense"
        );

    const form =
        document.getElementById(
            "expenseForm"
        );

    if (newExpenseButton) {
        newExpenseButton.addEventListener(
            "click",
            openExpenseModal
        );
    }

    if (newExpenseButton2) {
        newExpenseButton2.addEventListener(
            "click",
            openExpenseModal
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeExpenseModal
        );
    }

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            closeExpenseModal
        );
    }

    if (modal) {
        const overlay =
            modal.querySelector(
                ".modal-overlay"
            );

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeExpenseModal
            );
        }
    }

    if (form) {
        form.addEventListener(
            "submit",
            saveExpense
        );
    }

    const expenseDate =
        document.getElementById(
            "expenseDate"
        );

    if (
        expenseDate &&
        !expenseDate.value
    ) {
        expenseDate.value =
            getToday();
    }
}


// ==============================
// MODAL DE NOVA ENTRADA
// ==============================

function setupIncomeModal() {
    const newIncomeButton =
        document.getElementById(
            "newIncomeButton"
        );

    const closeIncomeButton =
        document.getElementById(
            "closeIncomeModal"
        );

    const cancelIncomeButton =
        document.getElementById(
            "cancelIncome"
        );

    const incomeForm =
        document.getElementById(
            "incomeForm"
        );

    const incomeModal =
        document.getElementById(
            "incomeModal"
        );

    if (
        !newIncomeButton ||
        !incomeModal ||
        !incomeForm
    ) {
        return;
    }

    newIncomeButton.addEventListener(
        "click",
        openIncomeModal
    );

    if (closeIncomeButton) {
        closeIncomeButton.addEventListener(
            "click",
            closeIncomeModal
        );
    }

    if (cancelIncomeButton) {
        cancelIncomeButton.addEventListener(
            "click",
            closeIncomeModal
        );
    }

    const overlay =
        incomeModal.querySelector(
            ".modal-overlay"
        );

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeIncomeModal
        );
    }

    incomeForm.addEventListener(
        "submit",
        saveIncome
    );

    const date =
        document.getElementById(
            "incomeDate"
        );

    if (
        date &&
        !date.value
    ) {
        date.value =
            getToday();
    }
}


function openIncomeModal() {
    const form =
        document.getElementById(
            "incomeForm"
        );

    if (!form) {
        return;
    }

    form.reset();

    form.removeAttribute(
        "data-editing-id"
    );

    const date =
        document.getElementById(
            "incomeDate"
        );

    if (date) {
        date.value =
            getToday();
    }

    const button =
        document.getElementById(
            "saveIncome"
        );

    if (button) {
        button.textContent =
            "Salvar entrada";
    }

    loadIncomeCategories();

    const modal =
        document.getElementById(
            "incomeModal"
        );

    if (modal) {
        modal.classList.add(
            "open"
        );
    }
}

function closeIncomeModal() {
    const modal =
        document.getElementById(
            "incomeModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "open"
    );
}


// ==============================
// SALVAR ENTRADA
// ==============================

async function saveIncome(event) {
    event.preventDefault();

    if (!currentUser) {
        return;
    }

    const button =
        document.getElementById("saveIncome");

    const form =
        document.getElementById("incomeForm");

    if (!form) {
        return;
    }

    const editingId =
        form.dataset.editingId || null;

    const descriptionInput =
        document.getElementById("incomeDescription");

    const amountInput =
        document.getElementById("incomeAmount");

    const dateInput =
        document.getElementById("incomeDate");

    const categoryInput =
        document.getElementById("incomeCategory");

    const paymentInput =
        document.getElementById("incomePayment");

    const recurringInput =
        document.getElementById("incomeRecurring");

    const notesInput =
        document.getElementById("incomeNotes");

    if (
        !descriptionInput ||
        !amountInput ||
        !dateInput ||
        !categoryInput
    ) {
        return;
    }

    const description =
        descriptionInput.value.trim();

    const amount =
        Number(amountInput.value);

    const date =
        dateInput.value;

    const category =
        categoryInput.value;

    const paymentMethod =
        paymentInput?.value || "";

    const recurring =
        recurringInput?.value === "true";

    const notes =
        notesInput?.value.trim() || "";

    if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date ||
        !category
    ) {
        alert(
            "Preencha corretamente os campos obrigatórios."
        );

        return;
    }

    setButtonLoading(
        button,
        true,
        editingId
            ? "Atualizando..."
            : "Salvando...",
        editingId
            ? "Atualizar entrada"
            : "Salvar entrada"
    );

    try {
        let result;

        if (editingId) {

            result =
                await window.supabaseClient
                    .from("incomes")
                    .update({
                        category_id:
                            category,

                        description:
                            description,

                        amount:
                            amount,

                        date:
                            date,

                        payment_method:
                            paymentMethod ||
                            null,

                        notes:
                            notes ||
                            null,

                        is_recurring:
                            recurring,

                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        "id",
                        editingId
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

        } else {

            result =
                await window.supabaseClient
                    .from("incomes")
                    .insert({
                        user_id:
                            currentUser.id,

                        category_id:
                            category,

                        description:
                            description,

                        amount:
                            amount,

                        date:
                            date,

                        payment_method:
                            paymentMethod ||
                            null,

                        notes:
                            notes ||
                            null,

                        is_recurring:
                            recurring
                    });
        }

        if (result.error) {
            throw result.error;
        }

        form.reset();

        form.removeAttribute(
            "data-editing-id"
        );

        if (dateInput) {
            dateInput.value =
                getToday();
        }

        if (button) {
            button.textContent =
                "Salvar entrada";
        }

        closeIncomeModal();

        await loadDashboard();

    } catch (error) {

        console.error(
            "Erro ao salvar entrada:",
            error
        );

        alert(
            "Erro ao salvar a entrada: " +
            error.message
        );

    } finally {

        setButtonLoading(
            button,
            false,
            editingId
                ? "Atualizando..."
                : "Salvando...",
            "Salvar entrada"
        );
    }
}

// ==============================
// EDITAR ENTRADA
// ==============================

async function editIncome(incomeId) {
    if (
        !currentUser ||
        !incomeId
    ) {
        return;
    }

    try {
        const {
            data,
            error
        } =
            await window.supabaseClient
                .from("incomes")
                .select("*")
                .eq(
                    "id",
                    incomeId
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .single();

        if (error) {
            throw error;
        }

        const form =
            document.getElementById(
                "incomeForm"
            );

        if (!form) {
            return;
        }

        await loadIncomeCategories();

        const description =
            document.getElementById(
                "incomeDescription"
            );

        const amount =
            document.getElementById(
                "incomeAmount"
            );

        const date =
            document.getElementById(
                "incomeDate"
            );

        const category =
            document.getElementById(
                "incomeCategory"
            );

        const payment =
            document.getElementById(
                "incomePayment"
            );

        const recurring =
            document.getElementById(
                "incomeRecurring"
            );

        const notes =
            document.getElementById(
                "incomeNotes"
            );

        if (description) {
            description.value =
                data.description || "";
        }

        if (amount) {
            amount.value =
                data.amount || "";
        }

        if (date) {
            date.value =
                data.date || "";
        }

        if (category) {
            category.value =
                data.category_id || "";
        }

        if (payment) {
            payment.value =
                data.payment_method || "";
        }

        if (recurring) {
            recurring.value =
                data.is_recurring
                    ? "true"
                    : "false";
        }

        if (notes) {
            notes.value =
                data.notes || "";
        }

        form.dataset.editingId =
            incomeId;

        const saveButton =
            document.getElementById(
                "saveIncome"
            );

        if (saveButton) {
            saveButton.textContent =
                "Atualizar entrada";
        }

        const modal =
            document.getElementById(
                "incomeModal"
            );

        if (modal) {
            modal.classList.add(
                "open"
            );
        }

    } catch (error) {

        console.error(
            "Erro ao carregar entrada:",
            error
        );

        alert(
            "Erro ao carregar a entrada: " +
            error.message
        );
    }
}


// ==============================
// EXCLUIR ENTRADA
// ==============================

async function deleteIncome(incomeId) {
    if (
        !currentUser ||
        !incomeId
    ) {
        return;
    }

    const confirmed =
        confirm(
            "Tem certeza que deseja excluir esta entrada?\n\nEssa ação não pode ser desfeita."
        );

    if (!confirmed) {
        return;
    }

    try {
        const {
            error
        } =
            await window.supabaseClient
                .from("incomes")
                .delete()
                .eq(
                    "id",
                    incomeId
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (error) {
            throw error;
        }

        await loadDashboard();

    } catch (error) {

        console.error(
            "Erro ao excluir entrada:",
            error
        );

        alert(
            "Erro ao excluir a entrada: " +
            error.message
        );
    }
}

// ==============================
// MODAL DE NOVO GASTO
// ==============================

function openExpenseModal() {
    const form =
        document.getElementById(
            "expenseForm"
        );

    const button =
        document.getElementById(
            "saveExpense"
        );

    if (!form) {
        return;
    }

    form.reset();

    form.removeAttribute(
        "data-editing-id"
    );

    const date =
        document.getElementById(
            "expenseDate"
        );

    if (date) {
        date.value =
            getToday();
    }

    if (button) {
        button.textContent =
            "Salvar gasto";
    }

    const modal =
        document.getElementById(
            "expenseModal"
        );

    if (modal) {
        modal.classList.add(
            "open"
        );
    }
}


function closeExpenseModal() {
    const modal =
        document.getElementById(
            "expenseModal"
        );

    if (modal) {
        modal.classList.remove(
            "open"
        );
    }
}


// ==============================
// SALVAR GASTO
// ==============================

async function saveExpense(
    event
) {
    event.preventDefault();

    if (!currentUser) {
        return;
    }

    const button =
        document.getElementById(
            "saveExpense"
        );

    const form =
        document.getElementById(
            "expenseForm"
        );

    if (!form) {
        return;
    }

    const editingId =
        form.dataset.editingId ||
        null;

    const descriptionInput =
        document.getElementById(
            "expenseDescription"
        );

    const amountInput =
        document.getElementById(
            "expenseAmount"
        );

    const dateInput =
        document.getElementById(
            "expenseDate"
        );

    const categoryInput =
        document.getElementById(
            "expenseCategory"
        );

    const paymentInput =
        document.getElementById(
            "expensePayment"
        );

    const notesInput =
        document.getElementById(
            "expenseNotes"
        );

    if (
        !descriptionInput ||
        !amountInput ||
        !dateInput ||
        !categoryInput
    ) {
        return;
    }

    const description =
        descriptionInput.value.trim();

    const amount =
        Number(
            amountInput.value
        );

    const date =
        dateInput.value;

    const categoryId =
        categoryInput.value;

    const paymentMethod =
        paymentInput?.value ||
        "";

    const notes =
        notesInput?.value.trim() ||
        "";

    if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date ||
        !categoryId
    ) {
        alert(
            "Preencha corretamente os campos obrigatórios."
        );

        return;
    }

    setButtonLoading(
        button,
        true,
        editingId
            ? "Atualizando..."
            : "Salvando...",
        editingId
            ? "Atualizar gasto"
            : "Salvar gasto"
    );

    try {
        let result;

        if (editingId) {
            result =
                await window.supabaseClient
                    .from("expenses")
                    .update({
                        category_id:
                            categoryId,

                        description:
                            description,

                        amount:
                            amount,

                        date:
                            date,

                        payment_method:
                            paymentMethod ||
                            null,

                        notes:
                            notes ||
                            null,

                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        "id",
                        editingId
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

        } else {
            result =
                await window.supabaseClient
                    .from("expenses")
                    .insert({
                        user_id:
                            currentUser.id,

                        category_id:
                            categoryId,

                        description:
                            description,

                        amount:
                            amount,

                        date:
                            date,

                        payment_method:
                            paymentMethod ||
                            null,

                        notes:
                            notes ||
                            null
                    });
        }

        if (result.error) {
            throw result.error;
        }

        form.reset();

        form.removeAttribute(
            "data-editing-id"
        );

        if (dateInput) {
            dateInput.value =
                getToday();
        }

        closeExpenseModal();

        await loadDashboard();

        if (
            document.getElementById(
                "expensesList"
            )
        ) {
            await loadExpensesPage();
        }

    } catch (error) {
        console.error(
            "Erro ao salvar gasto:",
            error
        );

        alert(
            "Erro ao salvar o gasto: " +
            error.message
        );

    } finally {
        setButtonLoading(
            button,
            false,
            editingId
                ? "Atualizando..."
                : "Salvando...",
            editingId
                ? "Atualizar gasto"
                : "Salvar gasto"
        );
    }
}


// ==============================
// EDITAR GASTO
// ==============================

async function editExpense(
    expenseId
) {
    if (
        !currentUser ||
        !expenseId
    ) {
        return;
    }

    try {
        const {
            data,
            error
        } =
            await window.supabaseClient
                .from("expenses")
                .select("*")
                .eq(
                    "id",
                    expenseId
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .single();

        if (error) {
            throw error;
        }

        const form =
            document.getElementById(
                "expenseForm"
            );

        if (!form) {
            return;
        }

        const description =
            document.getElementById(
                "expenseDescription"
            );

        const amount =
            document.getElementById(
                "expenseAmount"
            );

        const date =
            document.getElementById(
                "expenseDate"
            );

        const category =
            document.getElementById(
                "expenseCategory"
            );

        const payment =
            document.getElementById(
                "expensePayment"
            );

        const notes =
            document.getElementById(
                "expenseNotes"
            );

        if (description) {
            description.value =
                data.description ||
                "";
        }

        if (amount) {
            amount.value =
                data.amount ||
                "";
        }

        if (date) {
            date.value =
                data.date ||
                "";
        }

        if (category) {
            category.value =
                data.category_id ||
                "";
        }

        if (payment) {
            payment.value =
                data.payment_method ||
                "";
        }

        if (notes) {
            notes.value =
                data.notes ||
                "";
        }

        form.dataset.editingId =
            expenseId;

        const saveButton =
            document.getElementById(
                "saveExpense"
            );

        if (saveButton) {
            saveButton.textContent =
                "Atualizar gasto";
        }

        const modal =
            document.getElementById(
                "expenseModal"
            );

        if (modal) {
            modal.classList.add(
                "open"
            );
        }

    } catch (error) {
        console.error(
            "Erro ao carregar gasto:",
            error
        );

        alert(
            "Erro ao carregar o gasto: " +
            error.message
        );
    }
}


// ==============================
// EXCLUIR GASTO
// ==============================

async function deleteExpense(
    expenseId
) {
    if (
        !currentUser ||
        !expenseId
    ) {
        return;
    }

    const confirmed =
        confirm(
            "Tem certeza que deseja excluir este gasto?\n\nEssa ação não pode ser desfeita."
        );

    if (!confirmed) {
        return;
    }

    try {
        const {
            error
        } =
            await window.supabaseClient
                .from("expenses")
                .delete()
                .eq(
                    "id",
                    expenseId
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

        if (error) {
            throw error;
        }

        await loadDashboard();

        if (
            document.getElementById(
                "expensesList"
            )
        ) {
            await loadExpensesPage();
        }

    } catch (error) {
        console.error(
            "Erro ao excluir gasto:",
            error
        );

        alert(
            "Erro ao excluir o gasto: " +
            error.message
        );
    }
}


// ==============================
// NAVEGAÇÃO DE MÊS
// ==============================

function setupMonthNavigation() {
    const previousMonth =
        document.getElementById(
            "previousMonth"
        );

    const nextMonth =
        document.getElementById(
            "nextMonth"
        );

    if (previousMonth) {
        previousMonth.addEventListener(
            "click",
            async () => {
                currentDate =
                    new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() - 1,
                        1
                    );

                await loadDashboard();
            }
        );
    }

    if (nextMonth) {
        nextMonth.addEventListener(
            "click",
            async () => {
                currentDate =
                    new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() + 1,
                        1
                    );

                await loadDashboard();
            }
        );
    }
}


function updateMonthLabel() {
    const month =
        currentDate.toLocaleDateString(
            "pt-BR",
            {
                month: "long",
                year: "numeric"
            }
        );

    const element =
        document.getElementById(
            "currentMonth"
        );

    if (!element) {
        return;
    }

    element.textContent =
        month.charAt(0).toUpperCase() +
        month.slice(1);
}


function getMonthRange() {
    const year =
        currentDate.getFullYear();

    const month =
        currentDate.getMonth();

    const start =
        `${year}-${String(
            month + 1
        ).padStart(
            2,
            "0"
        )}-01`;

    const nextMonth =
        new Date(
            year,
            month + 1,
            1
        );

    const end =
        `${nextMonth.getFullYear()}-${String(
            nextMonth.getMonth() + 1
        ).padStart(
            2,
            "0"
        )}-01`;

    return {
        start,
        end
    };
}


function getPreviousMonthRange() {
    const previousDate =
        new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );

    const previousStart =
        `${previousDate.getFullYear()}-${String(
            previousDate.getMonth() + 1
        ).padStart(
            2,
            "0"
        )}-01`;

    const currentStart =
        `${currentDate.getFullYear()}-${String(
            currentDate.getMonth() + 1
        ).padStart(
            2,
            "0"
        )}-01`;

    return {
        previousStart,
        currentStart
    };
}


// ==============================
// TELA DE GASTOS
// ==============================

async function loadExpensesPage() {
    const container =
        document.getElementById(
            "expensesList"
        );

    if (
        !container ||
        !currentUser
    ) {
        return;
    }

    const searchInput =
        document.getElementById(
            "expenseSearch"
        );

    const categoryFilter =
        document.getElementById(
            "expenseCategoryFilter"
        );

    const monthFilter =
        document.getElementById(
            "expenseMonthFilter"
        );

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const categoryId =
        categoryFilter
            ? categoryFilter.value
            : "";

    const month =
        monthFilter
            ? monthFilter.value
            : "";

    let query =
        window.supabaseClient
            .from("expenses")
            .select(`
                *,
                categories (
                    name,
                    icon
                )
            `)
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "date",
                {
                    ascending:
                        false
                }
            );

    if (categoryId) {
        query =
            query.eq(
                "category_id",
                categoryId
            );
    }

    if (month) {
        const [
            year,
            monthNumber
        ] =
            month.split("-");

        const start =
            `${year}-${monthNumber}-01`;

        const nextMonth =
            new Date(
                Number(year),
                Number(monthNumber),
                1
            );

        const end =
            `${nextMonth.getFullYear()}-${String(
                nextMonth.getMonth() + 1
            ).padStart(
                2,
                "0"
            )}-01`;

        query =
            query
                .gte(
                    "date",
                    start
                )
                .lt(
                    "date",
                    end
                );
    }

    const {
        data,
        error
    } = await query;

    if (error) {
        console.error(
            "Erro ao carregar gastos:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">

                <strong>
                    Erro ao carregar gastos
                </strong>

                <span>
                    ${escapeHtml(
                        error.message
                    )}
                </span>

            </div>
        `;

        return;
    }

    let expenses =
        data || [];

    if (search) {
        expenses =
            expenses.filter(
                expense =>
                    String(
                        expense.description ||
                            ""
                    )
                        .toLowerCase()
                        .includes(
                            search
                        )
            );
    }

    renderExpensesTable(
        expenses
    );
}


// ==============================
// TABELA DE GASTOS
// ==============================

function renderExpensesTable(
    expenses
) {
    const container =
        document.getElementById(
            "expensesList"
        );

    const countElement =
        document.getElementById(
            "expensesResultCount"
        );

    const totalElement =
        document.getElementById(
            "expensesPageTotal"
        );

    const pageCountElement =
        document.getElementById(
            "expensesPageCount"
        );

    const averageElement =
        document.getElementById(
            "expensesPageAverage"
        );

    const largestElement =
        document.getElementById(
            "expensesPageLargest"
        );

    const largestNameElement =
        document.getElementById(
            "expensesPageLargestName"
        );

    if (!container) {
        return;
    }

    const total =
        sumAmounts(
            expenses
        );

    const average =
        expenses.length > 0
            ? total /
              expenses.length
            : 0;

    const largest =
        getLargestItem(
            expenses
        );

    if (totalElement) {
        totalElement.textContent =
            formatCurrency(
                total
            );
    }

    if (pageCountElement) {
        pageCountElement.textContent =
            expenses.length;
    }

    if (averageElement) {
        averageElement.textContent =
            formatCurrency(
                average
            );
    }

    if (largestElement) {
        largestElement.textContent =
            largest
                ? formatCurrency(
                    largest.amount
                )
                : "R$ 0,00";
    }

    if (largestNameElement) {
        largestNameElement.textContent =
            largest
                ? largest.description
                : "Nenhum lançamento";
    }

    if (countElement) {
        countElement.textContent =
            expenses.length === 1
                ? "1 lançamento"
                : `${expenses.length} lançamentos`;
    }

    if (!expenses.length) {
        container.innerHTML = `
            <div class="empty-state">

                <strong>
                    Nenhum gasto encontrado
                </strong>

                <span>
                    Tente alterar os filtros ou adicionar um novo gasto.
                </span>

            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="expenses-table">

            <div class="expenses-table-header">

                <div>
                    Data
                </div>

                <div>
                    Descrição
                </div>

                <div>
                    Categoria
                </div>

                <div>
                    Pagamento
                </div>

                <div>
                    Valor
                </div>

                <div>
                    Ações
                </div>

            </div>

            ${expenses.map(
                expense => {
                    const category =
                        expense.categories;

                    return `
                        <div
                            class="expenses-table-row"
                        >

                            <div>
                                ${formatDate(
                                    expense.date
                                )}
                            </div>

                            <div
                                class="expense-table-description"
                            >
                                ${escapeHtml(
                                    expense.description
                                )}
                            </div>

                            <div>

                                ${category?.icon || ""}

                                ${escapeHtml(
                                    category?.name ||
                                    "Sem categoria"
                                )}

                            </div>

                            <div>
                                ${escapeHtml(
                                    expense.payment_method ||
                                    "—"
                                )}
                            </div>

                            <div
                                class="expense-table-value"
                            >
                                ${formatCurrency(
                                    expense.amount
                                )}
                            </div>

                            <div
                                class="expense-table-actions"
                            >

                                <button
                                    type="button"
                                    onclick="editExpense('${escapeJsAttribute(
                                        expense.id
                                    )}')"
                                    title="Editar gasto"
                                >
                                    ✏️
                                </button>

                                <button
                                    type="button"
                                    onclick="deleteExpense('${escapeJsAttribute(
                                        expense.id
                                    )}')"
                                    title="Excluir gasto"
                                >
                                    🗑️
                                </button>

                            </div>

                        </div>
                    `;
                }
            ).join("")}

        </div>
    `;
}


// ==============================
// CONFIGURAÇÃO DA TELA DE GASTOS
// ==============================

function setupExpensesPage() {
    const search =
        document.getElementById(
            "expenseSearch"
        );

    const category =
        document.getElementById(
            "expenseCategoryFilter"
        );

    const month =
        document.getElementById(
            "expenseMonthFilter"
        );

    if (
        month &&
        !month.value
    ) {
        const today =
            new Date();

        const year =
            today.getFullYear();

        const monthNumber =
            String(
                today.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        month.value =
            `${year}-${monthNumber}`;
    }

    if (search) {
        search.addEventListener(
            "input",
            loadExpensesPage
        );
    }

    if (category) {
        category.addEventListener(
            "change",
            loadExpensesPage
        );
    }

    if (month) {
        month.addEventListener(
            "change",
            loadExpensesPage
        );
    }
}


// ==============================
// INTELIGÊNCIA FINANCEIRA
// ==============================

function setupFinancialIntelligence() {
    const refreshButton = document.getElementById("refreshIntelligence");
    if (refreshButton && !refreshButton.dataset.bound) {
        refreshButton.dataset.bound = "true";
        refreshButton.addEventListener("click", loadFinancialIntelligence);
    }
}

function escapeIntelligenceHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function intelligenceMonthStart(offset = 0) {
    const date = new Date();
    date.setDate(1);
    date.setHours(12, 0, 0, 0);
    date.setMonth(date.getMonth() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function intelligenceMonthLabel(dateString) {
    const [year, month] = dateString.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: "short", year: "2-digit"
    }).replace(".", "");
}

function intelligenceSum(items) {
    return (items || []).reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

function intelligenceSetText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

async function loadFinancialIntelligence() {
    const status = document.getElementById("intelligenceStatus");
    const content = document.getElementById("intelligenceContent");
    if (!status || !content || !currentUser) return;

    status.hidden = false;
    status.textContent = "Analisando seus lançamentos...";
    content.hidden = true;

    const currentStart = intelligenceMonthStart(0);
    const nextMonthStart = intelligenceMonthStart(1);
    const historyStart = intelligenceMonthStart(-6);

    try {
        const [expensesResult, incomesResult, budgetsResult] = await Promise.all([
            window.supabaseClient.from("expenses")
                .select("amount, date, category_id, categories(name)")
                .eq("user_id", currentUser.id).gte("date", historyStart).lt("date", nextMonthStart),
            window.supabaseClient.from("incomes")
                .select("amount, date")
                .eq("user_id", currentUser.id).gte("date", historyStart).lt("date", nextMonthStart),
            window.supabaseClient.from("budgets")
                .select("category_id, limit_amount, month_start")
                .eq("user_id", currentUser.id).eq("month_start", currentStart)
        ]);

        if (expensesResult.error) throw expensesResult.error;
        if (incomesResult.error) throw incomesResult.error;

        const expenses = expensesResult.data || [];
        const incomes = incomesResult.data || [];
        const budgets = budgetsResult.error ? [] : (budgetsResult.data || []);

        const completedMonths = [];
        for (let offset = -6; offset <= -1; offset++) {
            const start = intelligenceMonthStart(offset);
            const end = intelligenceMonthStart(offset + 1);
            completedMonths.push({
                start,
                label: intelligenceMonthLabel(start),
                income: intelligenceSum(incomes.filter(item => item.date >= start && item.date < end)),
                expenses: intelligenceSum(expenses.filter(item => item.date >= start && item.date < end))
            });
        }

        const currentIncome = intelligenceSum(incomes.filter(item => item.date >= currentStart && item.date < nextMonthStart));
        const currentExpenses = intelligenceSum(expenses.filter(item => item.date >= currentStart && item.date < nextMonthStart));
        const currentResult = currentIncome - currentExpenses;
        const averageIncome = completedMonths.reduce((sum, month) => sum + month.income, 0) / completedMonths.length;
        const averageExpenses = completedMonths.reduce((sum, month) => sum + month.expenses, 0) / completedMonths.length;
        const averageSurplus = averageIncome - averageExpenses;
        const projection90 = averageSurplus * 3;

        intelligenceSetText("intelCurrentIncome", formatCurrency(currentIncome));
        intelligenceSetText("intelCurrentExpenses", formatCurrency(currentExpenses));
        intelligenceSetText("intelCurrentResult", formatCurrency(currentResult));
        intelligenceSetText("intelProjection90", formatCurrency(projection90));
        intelligenceSetText("intelProjectionCaption", "Resultado estimado de 90 dias, sem saldo inicial");

        const resultElement = document.getElementById("intelCurrentResult");
        if (resultElement) resultElement.classList.toggle("is-negative", currentResult < 0);

        renderIntelligenceProjection(completedMonths);
        renderIntelligenceAllocation(averageSurplus);
        renderIntelligenceRecommendations({ expenses, budgets, averageSurplus });
        renderIntelligenceCategories(expenses);

        status.hidden = true;
        content.hidden = false;
    } catch (error) {
        console.error("Erro na Inteligência Financeira:", error);
        status.textContent = "Não foi possível analisar seus dados. Verifique sua conexão e tente atualizar novamente.";
        status.hidden = false;
        content.hidden = true;
    }
}

function renderIntelligenceProjection(months) {
    const container = document.getElementById("intelProjectionBars");
    if (!container) return;
    const maxValue = Math.max(1, ...months.flatMap(month => [month.income, month.expenses]));

    container.innerHTML = months.map(month => {
        const incomeWidth = Math.max(0, month.income / maxValue * 100);
        const expenseWidth = Math.max(0, month.expenses / maxValue * 100);
        return `<div class="intelligence-month-row">
            <span class="intelligence-month-label">${escapeIntelligenceHtml(month.label)}</span>
            <div class="intelligence-bar-set">
                <div class="intelligence-bar-track"><span class="intelligence-bar income" style="width:${incomeWidth}%"></span></div>
                <div class="intelligence-bar-track"><span class="intelligence-bar expense" style="width:${expenseWidth}%"></span></div>
            </div>
            <span class="intelligence-month-result ${month.income - month.expenses < 0 ? "is-negative" : ""}">${formatCurrency(month.income - month.expenses)}</span>
        </div>`;
    }).join("") + `<div class="intelligence-chart-legend"><span><i class="income"></i> Entradas</span><span><i class="expense"></i> Gastos</span></div>`;
}

function renderIntelligenceAllocation(monthlySurplus) {
    const container = document.getElementById("intelAllocation");
    const note = document.getElementById("intelAllocationNote");
    if (!container || !note) return;

    if (monthlySurplus <= 0) {
        container.innerHTML = "";
        note.innerHTML = '<strong>Prioridade: recuperar o equilíbrio.</strong><p>Como a média de gastos está igual ou acima das entradas, não é prudente sugerir novos investimentos. Primeiro, revise despesas variáveis e compromissos próximos.</p>';
        return;
    }

    const allocation = [
        { label: "Reserva financeira", percent: 50, className: "reserve" },
        { label: "Investimentos", percent: 30, className: "invest" },
        { label: "Objetivos e flexibilidade", percent: 20, className: "goals" }
    ];

    container.innerHTML = allocation.map(item => `<div class="intelligence-allocation-row">
        <div class="intelligence-allocation-label"><span><i class="${item.className}"></i>${item.label}</span><strong>${formatCurrency(monthlySurplus * item.percent / 100)}</strong></div>
        <div class="intelligence-allocation-track"><span class="${item.className}" style="width:${item.percent}%"></span></div>
        <small>${item.percent}% do excedente médio estimado</small>
    </div>`).join("");

    note.innerHTML = '<strong>Proposta inicial, não regra fixa.</strong><p>Use esta divisão apenas sobre o excedente depois de pagar compromissos. Ajuste a reserva conforme sua segurança financeira, dívidas, prazos e tolerância a risco.</p>';
}

function renderIntelligenceRecommendations({ expenses, budgets, averageSurplus }) {
    const container = document.getElementById("intelRecommendations");
    if (!container) return;

    const currentStart = intelligenceMonthStart(0);
    const lastCompletedStart = intelligenceMonthStart(-1);
    const threeMonthStart = intelligenceMonthStart(-4);
    const currentMonthExpenses = expenses.filter(item => item.date >= currentStart);
    const lastMonthExpenses = expenses.filter(item => item.date >= lastCompletedStart && item.date < currentStart);
    const priorThreeMonths = expenses.filter(item => item.date >= threeMonthStart && item.date < lastCompletedStart);
    const currentByCategory = new Map();
    const lastByCategory = new Map();
    const priorByCategory = new Map();
    const categoryNames = new Map();

    currentMonthExpenses.forEach(item => currentByCategory.set(String(item.category_id || "uncategorized"), (currentByCategory.get(String(item.category_id || "uncategorized")) || 0) + Number(item.amount || 0)));
    lastMonthExpenses.forEach(item => {
        const key = String(item.category_id || "uncategorized");
        lastByCategory.set(key, (lastByCategory.get(key) || 0) + Number(item.amount || 0));
        categoryNames.set(key, item.categories?.name || "Sem categoria");
    });
    priorThreeMonths.forEach(item => {
        const key = String(item.category_id || "uncategorized");
        priorByCategory.set(key, (priorByCategory.get(key) || 0) + Number(item.amount || 0));
        categoryNames.set(key, item.categories?.name || "Sem categoria");
    });
    currentMonthExpenses.forEach(item => categoryNames.set(String(item.category_id || "uncategorized"), item.categories?.name || "Sem categoria"));

    const recommendations = [];
    if (averageSurplus < 0) {
        recommendations.push({ level: "urgent", title: "Os gastos médios superam as entradas", text: `A diferença média é de ${formatCurrency(Math.abs(averageSurplus))} por mês. Antes de investir, revise despesas não essenciais e planeje os vencimentos próximos.` });
    } else if (averageSurplus === 0) {
        recommendations.push({ level: "attention", title: "Sua margem média está zerada", text: "Qualquer despesa inesperada pode gerar déficit. Procure liberar margem antes de assumir novos compromissos." });
    } else {
        recommendations.push({ level: "positive", title: "Existe excedente médio estimado", text: `A média histórica indica cerca de ${formatCurrency(averageSurplus)} por mês antes de considerar despesas futuras não registradas. Confirme os compromissos antes de distribuir esse valor.` });
    }

    const budgetSpent = new Map();
    currentMonthExpenses.forEach(item => {
        const key = String(item.category_id || "");
        budgetSpent.set(key, (budgetSpent.get(key) || 0) + Number(item.amount || 0));
    });
    budgets.forEach(budget => {
        const limit = Number(budget.limit_amount) || 0;
        const spent = budgetSpent.get(String(budget.category_id)) || 0;
        if (limit > 0 && spent >= limit) {
            recommendations.push({ level: "urgent", title: "Orçamento de categoria ultrapassado", text: `Uma categoria já atingiu ${Math.round(spent / limit * 100)}% do limite mensal. Revise os lançamentos e avalie despesas não essenciais previstas.` });
        } else if (limit > 0 && spent >= limit * 0.8) {
            recommendations.push({ level: "attention", title: "Orçamento próximo do limite", text: `Uma categoria já consumiu ${Math.round(spent / limit * 100)}% do limite definido para o mês.` });
        }
    });

    const movements = [...priorByCategory.entries()].map(([key, priorTotal]) => {
        const priorMonthlyAverage = priorTotal / 3;
        const lastTotal = lastByCategory.get(key) || 0;
        return { key, priorMonthlyAverage, lastTotal, delta: lastTotal - priorMonthlyAverage };
    }).filter(item => item.priorMonthlyAverage > 0 && item.lastTotal > item.priorMonthlyAverage * 1.2)
      .sort((a, b) => b.delta - a.delta).slice(0, 2);

    movements.forEach(item => recommendations.push({
        level: "attention",
        title: `Revise gastos em ${categoryNames.get(item.key) || "uma categoria"}`,
        text: `No último mês completo, os gastos foram ${formatCurrency(item.lastTotal)}, acima da média anterior de ${formatCurrency(item.priorMonthlyAverage)}. Confirme se o aumento foi pontual ou recorrente.`
    }));

    if (recommendations.length === 1 && recommendations[0].level === "positive") {
        recommendations.push({ level: "positive", title: "Continue registrando todas as movimentações", text: "Dados completos ajudam a identificar padrões e tornam as projeções mais úteis." });
    }

    const categoryTotals = new Map();
    priorThreeMonths.forEach(item => {
        const key = String(item.category_id || "uncategorized");
        categoryTotals.set(key, (categoryTotals.get(key) || 0) + Number(item.amount || 0));
    });
    const potentialSavings = [...categoryTotals.values()].reduce((sum, value) => sum + value, 0) / 3 * 0.1;
    recommendations.push({
        level: "suggestion",
        title: "Simule uma redução de 10% nos gastos revisáveis",
        text: `Reduzir 10% de uma seleção de despesas que você considere não essenciais poderia liberar até ${formatCurrency(potentialSavings)} por mês, usando os últimos três meses como referência. Isto é uma simulação; nem todas as categorias são cortáveis.`
    });

    container.innerHTML = recommendations.slice(0, 6).map(item => `<article class="intelligence-recommendation ${item.level}">
        <span class="intelligence-recommendation-icon">${item.level === "urgent" ? "!" : item.level === "positive" ? "✓" : item.level === "suggestion" ? "↗" : "•"}</span>
        <div><h4>${escapeIntelligenceHtml(item.title)}</h4><p>${escapeIntelligenceHtml(item.text)}</p></div>
    </article>`).join("");
}

function renderIntelligenceCategories(expenses) {
    const container = document.getElementById("intelCategories");
    if (!container) return;

    const start = intelligenceMonthStart(-3);
    const end = intelligenceMonthStart(0);
    const totals = new Map();
    const names = new Map();

    expenses.filter(item => item.date >= start && item.date < end).forEach(item => {
        const key = String(item.category_id || "uncategorized");
        totals.set(key, (totals.get(key) || 0) + Number(item.amount || 0));
        names.set(key, item.categories?.name || "Sem categoria");
    });

    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!sorted.length) {
        container.innerHTML = '<p class="intelligence-empty">Ainda não há gastos nos três meses completos anteriores para comparar categorias.</p>';
        return;
    }

    const maxValue = Math.max(1, ...sorted.map(item => item[1]));
    container.innerHTML = sorted.map(([key, amount]) => `<div class="intelligence-category-row">
        <div class="intelligence-category-label"><span>${escapeIntelligenceHtml(names.get(key) || "Sem categoria")}</span><strong>${formatCurrency(amount)}</strong></div>
        <div class="intelligence-category-track"><span style="width:${amount / maxValue * 100}%"></span></div>
    </div>`).join("");
}

// ==============================
// LOGOUT
// ==============================

function setupLogout() {
    const logoutButton =
        document.getElementById(
            "logoutButton"
        );

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        signOut
    );
}


// ==============================
// UTILITÁRIOS
// ==============================

function sumAmounts(
    items
) {
    return (items || [])
        .reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(
                    item?.amount ||
                        0
                ),
            0
        );
}


function getLargestItem(
    items
) {
    return (items || [])
        .reduce(
            (
                largest,
                item
            ) => {
                if (!largest) {
                    return item;
                }

                return Number(
                    item?.amount ||
                        0
                ) >
                Number(
                    largest?.amount ||
                        0
                )
                    ? item
                    : largest;
            },
            null
        );
}


function formatCurrency(
    value
) {
    const number =
        Number(value);

    return (
        Number.isFinite(
            number
        )
            ? number
            : 0
    ).toLocaleString(
        "pt-BR",
        {
            style:
                "currency",

            currency:
                "BRL"
        }
    );
}


function formatDate(
    date
) {
    if (!date) {
        return "";
    }

    const parts =
        String(
            date
        ).split("-");

    if (
        parts.length !== 3
    ) {
        return "";
    }

    const year =
        Number(
            parts[0]
        );

    const month =
        Number(
            parts[1]
        );

    const day =
        Number(
            parts[2]
        );

    if (
        !year ||
        !month ||
        !day
    ) {
        return "";
    }

    return new Date(
        year,
        month - 1,
        day
    ).toLocaleDateString(
        "pt-BR"
    );
}


function getToday() {
    const date =
        new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(
        2,
        "0"
    )}-${String(
        date.getDate()
    ).padStart(
        2,
        "0"
    )}`;
}


function escapeHtml(
    value
) {
    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function escapeJsAttribute(
    value
) {
    return String(
        value ?? ""
    )
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        )
        .replaceAll(
            "\n",
            "\\n"
        )
        .replaceAll(
            "\r",
            "\\r"
        );
}


function setButtonLoading(
    button,
    loading,
    loadingText,
    normalText
) {
    if (!button) {
        return;
    }

    button.disabled =
        loading;

    button.textContent =
        loading
            ? loadingText
            : normalText;
}

function updateGreeting() {
    const hour = new Date().getHours();

    const greeting = hour >= 5 && hour < 12
        ? "Bom dia"
        : hour >= 12 && hour < 18
            ? "Boa tarde"
            : "Boa noite";

    const userName =
        document.getElementById("userName")?.textContent.trim()
        || currentUser?.email?.split("@")[0]
        || "Usuário";

    const title = document.getElementById("greetingTitle");
    const date = document.getElementById("greetingDate");

    if (title) {
        title.replaceChildren();

        title.append(
            document.createTextNode(`${greeting}, ${userName}`)
        );

        const dot = document.createElement("span");
        dot.className = "greeting-dot";
        dot.textContent = ".";

        title.append(dot);
    }

    if (date) {
        date.textContent = new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "short"
        }).format(new Date()).replace(".", "");
    }
}


// ==============================
// INICIAR APP
// ==============================

initApp();