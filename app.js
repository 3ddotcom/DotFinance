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

        updateSummary(
            expenses
        );

        updateMonthlyComparison(
            expenses,
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

    for (
        let i = 5;
        i >= 0;
        i--
    ) {
        const date =
            new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - i,
                1
            );

        const year =
            date.getFullYear();

        const month =
            date.getMonth();

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

        months.push({
            date,
            year,
            month,
            start,
            end,
            total: 0
        });
    }

    if (!months.length) {
        return {
            data: [],
            error: null
        };
    }

    const startDate =
        months[0].start;

    const endDate =
        months[
            months.length - 1
        ].end;

    const result =
        await window.supabaseClient
            .from("expenses")
            .select(
                "amount, date"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .gte(
                "date",
                startDate
            )
            .lt(
                "date",
                endDate
            );

    if (result.error) {
        console.error(
            "Erro ao carregar evolução dos gastos:",
            result.error
        );

        return {
            data: months,
            error:
                result.error
        };
    }

    (result.data || [])
        .forEach(
            expense => {
                const parts =
                    String(
                        expense.date || ""
                    ).split("-");

                if (
                    parts.length !== 3
                ) {
                    return;
                }

                const year =
                    Number(
                        parts[0]
                    );

                const month =
                    Number(
                        parts[1]
                    ) - 1;

                const target =
                    months.find(
                        item =>
                            item.year ===
                                year &&
                            item.month ===
                                month
                    );

                if (target) {
                    target.total +=
                        Number(
                            expense.amount ||
                                0
                        );
                }
            }
        );

    return {
        data: months,
        error: null
    };
}


function renderExpenseEvolution(
    months
) {
    const container =
        document.getElementById(
            "expenseEvolutionChart"
        );

    if (!container) {
        return;
    }

    if (
        !months ||
        !months.length
    ) {
        container.innerHTML = `
            <div class="evolution-empty">
                Nenhuma informação disponível.
            </div>
        `;

        return;
    }

    const maxValue =
        Math.max(
            ...months.map(
                month =>
                    month.total
            ),
            0
        );

    const width = 900;
    const height = 270;

    const paddingLeft = 60;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth =
        width -
        paddingLeft -
        paddingRight;

    const chartHeight =
        height -
        paddingTop -
        paddingBottom;

    const highestValue =
        maxValue > 0
            ? maxValue
            : 100;

    const points =
        months.map(
            (
                month,
                index
            ) => {
                const x =
                    paddingLeft +
                    (
                        chartWidth /
                        (
                            months.length -
                            1
                        )
                    ) *
                    index;

                const y =
                    paddingTop +
                    chartHeight -
                    (
                        month.total /
                        highestValue
                    ) *
                    chartHeight;

                return {
                    ...month,
                    x,
                    y
                };
            }
        );

    const linePath =
        points
            .map(
                (
                    point,
                    index
                ) =>
                    index === 0
                        ? `M ${point.x} ${point.y}`
                        : `L ${point.x} ${point.y}`
            )
            .join(" ");

    const areaPath = `
        M ${points[0].x}
        ${height - paddingBottom}

        ${points.map(
            point =>
                `L ${point.x} ${point.y}`
        ).join(" ")}

        L ${
            points[
                points.length - 1
            ].x
        }
        ${height - paddingBottom}

        Z
    `;

    const gridLines = 4;

    const grid =
        Array.from(
            {
                length:
                    gridLines + 1
            },
            (
                _,
                index
            ) => {
                const ratio =
                    index /
                    gridLines;

                const y =
                    paddingTop +
                    chartHeight *
                        ratio;

                const value =
                    highestValue *
                    (1 - ratio);

                return `
                    <line
                        class="evolution-grid-line"
                        x1="${paddingLeft}"
                        y1="${y}"
                        x2="${width - paddingRight}"
                        y2="${y}"
                    ></line>

                    <text
                        class="evolution-axis-label"
                        x="0"
                        y="${y + 4}"
                    >
                        ${formatCurrency(
                            value
                        )}
                    </text>
                `;
            }
        )
        .join("");

    const monthLabels =
        points
            .map(
                point => {
                    const label =
                        point.date
                            .toLocaleDateString(
                                "pt-BR",
                                {
                                    month:
                                        "short"
                                }
                            )
                            .replace(
                                ".",
                                ""
                            );

                    return `
                        <text
                            class="evolution-month"
                            x="${point.x}"
                            y="${height - 10}"
                            text-anchor="middle"
                        >
                            ${escapeHtml(
                                label
                            )}
                        </text>
                    `;
                }
            )
            .join("");

    const values =
        points
            .map(
                point => {
                    if (
                        point.total <=
                        0
                    ) {
                        return "";
                    }

                    return `
                        <text
                            class="evolution-value"
                            x="${point.x}"
                            y="${point.y - 12}"
                            text-anchor="middle"
                        >
                            ${formatCurrency(
                                point.total
                            )}
                        </text>
                    `;
                }
            )
            .join("");

    const circles =
        points
            .map(
                (
                    point,
                    index
                ) => `
                    <circle
                        class="evolution-point"
                        cx="${point.x}"
                        cy="${point.y}"
                        r="5"
                        data-index="${index}"
                    ></circle>
                `
            )
            .join("");

    container.innerHTML = `
        <svg
            class="evolution-svg"
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Evolução dos gastos dos últimos seis meses"
        >

            <defs>
                <linearGradient
                    id="evolutionGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#38bdf8"
                        stop-opacity="0.35"
                    ></stop>

                    <stop
                        offset="100%"
                        stop-color="#38bdf8"
                        stop-opacity="0"
                    ></stop>
                </linearGradient>
            </defs>

            ${grid}

            <path
                class="evolution-area"
                d="${areaPath}"
            ></path>

            <path
                class="evolution-line"
                d="${linePath}"
            ></path>

            ${values}

            ${circles}

            ${monthLabels}

        </svg>
    `;

    const pointElements =
        container.querySelectorAll(
            ".evolution-point"
        );

    pointElements.forEach(
        point => {
            const show =
                event => {
                    const index =
                        Number(
                            event
                                .currentTarget
                                .dataset
                                .index
                        );

                    const selected =
                        points[index];

                    if (selected) {
                        showEvolutionTooltip(
                            container,
                            selected
                        );
                    }
                };

            point.addEventListener(
                "mouseenter",
                show
            );

            point.addEventListener(
                "click",
                show
            );

            point.addEventListener(
                "mouseleave",
                () => {
                    hideEvolutionTooltip(
                        container
                    );
                }
            );
        }
    );
}


// ==============================
// TOOLTIP DA EVOLUÇÃO
// ==============================

function showEvolutionTooltip(
    container,
    point
) {
    hideEvolutionTooltip(
        container
    );

    const tooltip =
        document.createElement(
            "div"
        );

    tooltip.className =
        "evolution-tooltip active";

    const monthName =
        point.date.toLocaleDateString(
            "pt-BR",
            {
                month: "long",
                year: "numeric"
            }
        );

    tooltip.innerHTML = `
        <span class="evolution-tooltip-month">
            ${escapeHtml(
                monthName
            )}
        </span>

        <strong class="evolution-tooltip-value">
            ${formatCurrency(
                point.total
            )}
        </strong>
    `;

    container.appendChild(
        tooltip
    );

    const chartWidth =
        container.clientWidth;

    const svgWidth = 900;

    const position =
        (
            point.x /
            svgWidth
        ) *
        chartWidth;

    const tooltipWidth =
        tooltip.offsetWidth ||
        120;

    const halfWidth =
        tooltipWidth / 2;

    let left =
        position -
        halfWidth;

    const maxLeft =
        Math.max(
            chartWidth -
                tooltipWidth -
                5,
            5
        );

    left =
        Math.min(
            Math.max(
                left,
                5
            ),
            maxLeft
        );

    tooltip.style.left =
        `${left}px`;

    tooltip.style.top =
        `${Math.max(
            point.y - 70,
            5
        )}px`;
}


function hideEvolutionTooltip(
    container
) {
    const tooltip =
        container.querySelector(
            ".evolution-tooltip"
        );

    if (tooltip) {
        tooltip.remove();
    }
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


function renderIncomePieChart(incomes) {
    const container = document.getElementById("incomePieChart");
    const details = document.getElementById("incomePieDetails");

    if (!container || !details) return;

    if (!Array.isArray(incomes) || incomes.length === 0) {
        renderFinancialPieEmpty(
            container,
            "Nenhuma entrada no período"
        );
        details.innerHTML = "";
        return;
    }

    const grouped = {};

    incomes.forEach((income) => {
        const categoryName =
            income.category_name ||
            income.category?.name ||
            income.categories?.name ||
            "Sem categoria";

        const amount = Number(income.amount) || 0;

        if (amount > 0) {
            grouped[categoryName] =
                (grouped[categoryName] || 0) + amount;
        }
    });

    const data = Object.entries(grouped)
        .map(([name, amount]) => ({
            name,
            amount
        }))
        .sort((a, b) => b.amount - a.amount);

    if (data.length === 0) {
        renderFinancialPieEmpty(
            container,
            "Nenhuma entrada no período"
        );
        details.innerHTML = "";
        return;
    }

    const total = data.reduce(
        (sum, item) => sum + item.amount,
        0
    );

    const colors = [
        "#34d399",
        "#38bdf8",
        "#8b5cf6",
        "#22d3ee",
        "#f59e0b",
        "#ec4899",
        "#a78bfa",
        "#14b8a6",
        "#f97316",
        "#22c55e"
    ];

    renderFinancialPie(
        container,
        details,
        data,
        total,
        colors,
        "Entradas",
        "income"
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