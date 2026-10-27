/* =========================================================
   DOT FINANCE
   IMPORTADOR DE EXTRATO
   ========================================================= */

let importedTransactions = [];
let importCategories = [];


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("extratoFileInput");

    if (!fileInput) return;

    fileInput.addEventListener("change", handleExtratoFile);
});


/* =========================================================
   LEITURA DO ARQUIVO
   ========================================================= */

async function handleExtratoFile(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
        showImportError("Selecione um arquivo CSV válido.");
        return;
    }

    showImportLoading("Lendo seu extrato...");

    try {
        const content = await readFileAsText(file);
        const rows = parseCSV(content);

        if (!rows.length) {
            throw new Error(
                "Não foi possível encontrar movimentações no arquivo."
            );
        }

        const transactions = processCSVRows(rows);

        if (!transactions.length) {
            throw new Error(
                "Nenhuma movimentação válida foi encontrada no extrato."
            );
        }

        importedTransactions = transactions;

        await loadImportCategories();

        classifyTransactions();

        renderImportSummary();

    } catch (error) {
        console.error("Erro ao importar extrato:", error);

        showImportError(
            error.message || "Não foi possível processar o extrato."
        );
    }
}


/* =========================================================
   LER ARQUIVO
   ========================================================= */

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(
                new Error("Não foi possível ler o arquivo.")
            );
        };

        reader.readAsText(file, "UTF-8");
    });
}


/* =========================================================
   PARSER CSV
   ========================================================= */

function parseCSV(text) {
    text = text.replace(/^\uFEFF/, "");

    const delimiter = detectCSVDelimiter(text);

    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (
            char === '"' &&
            insideQuotes &&
            nextChar === '"'
        ) {
            value += '"';
            i++;
            continue;
        }

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (
            char === delimiter &&
            !insideQuotes
        ) {
            row.push(value.trim());
            value = "";
            continue;
        }

        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {
            if (
                char === "\r" &&
                nextChar === "\n"
            ) {
                i++;
            }

            row.push(value.trim());
            value = "";

            if (
                row.some(
                    cell => cell !== ""
                )
            ) {
                rows.push(row);
            }

            row = [];

            continue;
        }

        value += char;
    }

    if (
        value !== "" ||
        row.length
    ) {
        row.push(value.trim());

        if (
            row.some(
                cell => cell !== ""
            )
        ) {
            rows.push(row);
        }
    }

    return rows;
}


function detectCSVDelimiter(text) {
    const firstLine =
        text.split(/\r?\n/)[0] || "";

    const commas =
        (firstLine.match(/,/g) || []).length;

    const semicolons =
        (firstLine.match(/;/g) || []).length;

    const tabs =
        (firstLine.match(/\t/g) || []).length;

    if (
        semicolons > commas &&
        semicolons >= tabs
    ) {
        return ";";
    }

    if (
        tabs > commas &&
        tabs > semicolons
    ) {
        return "\t";
    }

    return ",";
}


/* =========================================================
   PROCESSAR LINHAS
   ========================================================= */

function processCSVRows(rows) {
    if (rows.length < 2) {
        return [];
    }

    const headers =
        rows[0].map(normalizeText);

    const dateIndex =
        findColumnIndex(headers, [
            "data",
            "date"
        ]);

    const amountIndex =
        findColumnIndex(headers, [
            "valor",
            "value",
            "amount"
        ]);

    const descriptionIndex =
        findColumnIndex(headers, [
            "descricao",
            "descrição",
            "description",
            "historico",
            "histórico"
        ]);

    const identifierIndex =
        findColumnIndex(headers, [
            "identificador",
            "id",
            "identifier"
        ]);

    if (
        dateIndex === -1 ||
        amountIndex === -1
    ) {
        throw new Error(
            "Não consegui identificar as colunas de Data e Valor no CSV."
        );
    }

    const transactions = [];

    for (
        let i = 1;
        i < rows.length;
        i++
    ) {
        const row = rows[i];

        if (!row || !row.length) {
            continue;
        }

        const rawDate =
            row[dateIndex] || "";

        const rawAmount =
            row[amountIndex] || "";

        const date =
            parseBrazilianDate(rawDate);

        const amount =
            parseBrazilianAmount(rawAmount);

        if (
            !date ||
            amount === null ||
            amount === 0
        ) {
            continue;
        }

        const description =
            descriptionIndex !== -1
                ? (
                    row[descriptionIndex] || ""
                ).trim()
                : "";

        const identifier =
            identifierIndex !== -1
                ? (
                    row[identifierIndex] || ""
                ).trim()
                : "";

        transactions.push({
            id:
                `import-${Date.now()}-${i}`,

            date,

            description:
                cleanDescription(description) ||
                "Movimentação bancária",

            originalDescription:
                description,

            identifier,

            amount:
                Math.abs(amount),

            rawAmount:
                amount,

            direction:
                amount < 0
                    ? "saida"
                    : "entrada",

            classification:
                null,

            categoryId:
                null,

            categoryName:
                "",

            suggestedCategory:
                "",

            paymentMethod:
                "",

            selected:
                false
        });
    }

    return transactions;
}


/* =========================================================
   COLUNAS
   ========================================================= */

function findColumnIndex(
    headers,
    possibleNames
) {
    for (
        const name of possibleNames
    ) {
        const normalized =
            normalizeText(name);

        const index =
            headers.findIndex(
                header =>
                    header === normalized
            );

        if (index !== -1) {
            return index;
        }
    }

    return -1;
}


/* =========================================================
   CLASSIFICAÇÃO
   ========================================================= */

function classifyTransactions() {
    importedTransactions.forEach(
        transaction => {

            const description =
                normalizeText(
                    transaction.originalDescription
                );

            /* MOVIMENTAÇÕES INTERNAS */

            if (
                containsAny(
                    description,
                    [
                        "aplicacao rdb",
                        "aplicacao",
                        "investimento rdb",
                        "resgate rdb",
                        "resgate de rdb"
                    ]
                )
            ) {
                transaction.classification =
                    "interna";

                transaction.selected =
                    false;

                return;
            }


            /* REEMBOLSOS */

            if (
                containsAny(
                    description,
                    [
                        "reembolso",
                        "estorno",
                        "devolucao",
                        "devolução"
                    ]
                )
            ) {
                transaction.classification =
                    "reembolso";

                transaction.selected =
                    false;

                return;
            }


            /* ENTRADAS */

            if (
                transaction.direction ===
                "entrada"
            ) {
                transaction.classification =
                    "entrada";

                transaction.selected =
                    false;

                return;
            }


            /* SAÍDAS */

            transaction.classification =
                "saida";

            transaction.selected =
                true;

            transaction.suggestedCategory =
                suggestCategory(
                    transaction.originalDescription
                );

            transaction.categoryId =
                findCategoryForSuggestion(
                    transaction.suggestedCategory
                );

            transaction.categoryName =
                getCategoryName(
                    transaction.categoryId
                );

            transaction.paymentMethod =
                suggestPaymentMethod(
                    transaction.originalDescription
                );
        }
    );
}


/* =========================================================
   SUGESTÃO DE CATEGORIA
   ========================================================= */

function suggestCategory(description) {
    const text =
        normalizeText(description);


    /* IMPOSTOS */

    if (
        containsAny(
            text,
            [
                "receita federal",
                "darf",
                "gps",
                "das",
                "simples nacional",
                "imposto",
                "tributo",
                "sefaz"
            ]
        )
    ) {
        return "Impostos";
    }


    /* FRETE / LOGÍSTICA */

    if (
        containsAny(
            text,
            [
                "sonic brasil",
                "sonic",
                "lalamove",
                "loggi",
                "correios",
                "transportes",
                "transporte",
                "frete",
                "jadlog",
                "melhor envio"
            ]
        )
    ) {
        return "Frete / Logística";
    }


    /* MARKETPLACES */

    if (
        containsAny(
            text,
            [
                "shpp",
                "shopee",
                "mercado livre",
                "mercadolivre",
                "mercado pago",
                "amazon",
                "magalu",
                "marketplace"
            ]
        )
    ) {
        return "Marketplace";
    }


    /* SERVIÇOS FINANCEIROS */

    if (
    containsAny(
        text,
        [
            "pagar me",
            "pagarme",
            "stripe",
            "asaas",
            "pagseguro",
            "stone",
            "infinitepay",
            "maquininha",
            "taxa bancária",
            "tarifa bancária",
            "tarifa",
            "juros"
        ]
    )
) {
    return "Taxas / Financeiro";
}


    /* CONTABILIDADE */

    if (
        containsAny(
            text,
            [
                "contabil",
                "contábil",
                "contabilidade",
                "assessoria contabil",
                "assessoria contábil"
            ]
        )
    ) {
        return "Contabilidade";
    }


    /* TRANSPORTE */

    if (
        containsAny(
            text,
            [
                "uber",
                "99 tecnologia",
                "99pop",
                "99"
            ]
        )
    ) {
        return "Transporte";
    }


    /* MATERIAL / FORNECEDORES */

    if (
        containsAny(
            text,
            [
                "fornecedor",
                "materia prima",
                "matéria prima",
                "material",
                "filamento",
                "resina",
                "plástico",
                "plastico"
            ]
        )
    ) {
        return "Materiais";
    }


    /* SERVIÇOS */

    if (
        containsAny(
            text,
            [
                "lws",
                "lwsa",
                "software",
                "assinatura",
                "servico",
                "serviço",
                "hosting",
                "dominio",
                "domínio"
            ]
        )
    ) {
        return "Serviços";
    }

    return "";
}


/* =========================================================
   ENCONTRAR CATEGORIA REAL DO SUPABASE
   ========================================================= */

function findCategoryForSuggestion(
    suggestion
) {
    if (
        !suggestion ||
        !importCategories.length
    ) {
        return null;
    }

    const suggestionNormalized =
        normalizeText(suggestion);


    /* CORRESPONDÊNCIA EXATA */

    let category =
        importCategories.find(
            item =>
                normalizeText(item.name) ===
                suggestionNormalized
        );

    if (category) {
        return category.id;
    }


    /* ALIASES */

    const aliases = {
        "impostos": [
            "imposto",
            "tributo",
            "taxa",
            "das",
            "darf"
        ],

        "frete / logistica": [
            "frete",
            "logistica",
            "logística",
            "transporte"
        ],

        "marketplace": [
            "marketplace",
            "shopee",
            "mercado",
            "vendas"
        ],

        "taxas / financeiro": [
            "taxa",
            "financeiro",
            "banco",
            "tarifa"
        ],

        "contabilidade": [
            "contabil",
            "contábil",
            "contabilidade"
        ],

        "transporte": [
            "transporte",
            "uber",
            "99"
        ],

        "materiais": [
            "material",
            "materiais",
            "insumo",
            "insumos"
        ],

        "servicos": [
            "servico",
            "serviço",
            "servicos",
            "serviços"
        ]
    };

    const normalizedAliases =
        aliases[
            suggestionNormalized
        ] || [];

    category =
        importCategories.find(
            item => {
                const categoryName =
                    normalizeText(item.name);

                return normalizedAliases.some(
                    alias =>
                        categoryName.includes(
                            normalizeText(alias)
                        )
                );
            }
        );

    return category
        ? category.id
        : null;
}


/* =========================================================
   CARREGAR CATEGORIAS DO SUPABASE
   ========================================================= */

async function loadImportCategories() {
    try {
        const user =
            await getCurrentUser();

        if (!user) {
            throw new Error(
                "Usuário não autenticado."
            );
        }

        const {
            data,
            error
        } =
            await window.supabaseClient
                .from("categories")
                .select(
                    "id, name, icon, active, type"
                )
                .eq(
                    "user_id",
                    user.id
                )
                .eq(
                    "active",
                    true
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );

        if (error) {
            throw error;
        }

        importCategories =
            data || [];

    } catch (error) {
        console.error(
            "Erro ao carregar categorias:",
            error
        );

        importCategories = [];
    }
}


/* =========================================================
   FORMA DE PAGAMENTO
   ========================================================= */

function suggestPaymentMethod(
    description
) {
    const text =
        normalizeText(description);

    if (
        containsAny(
            text,
            [
                "pix",
                "transferencia",
                "transferência"
            ]
        )
    ) {
        return "Pix";
    }

    if (
        containsAny(
            text,
            [
                "cartao",
                "cartão",
                "credito",
                "crédito",
                "debito",
                "débito"
            ]
        )
    ) {
        return "Cartão";
    }

    if (
        containsAny(
            text,
            ["boleto"]
        )
    ) {
        return "Boleto";
    }

    return "Outro";
}


/* =========================================================
   RESUMO
   ========================================================= */

function renderImportSummary() {
    const container =
        document.querySelector(
            ".import-extrato-panel"
        );

    if (!container) return;

    const total =
        importedTransactions.length;

    const expenses =
        importedTransactions.filter(
            item =>
                item.classification ===
                "saida"
        );

    const entries =
        importedTransactions.filter(
            item =>
                item.classification ===
                "entrada"
        );

    const ignored =
        importedTransactions.filter(
            item =>
                item.classification ===
                    "interna" ||
                item.classification ===
                    "reembolso"
        );

    const totalExpenses =
        expenses.reduce(
            (sum, item) =>
                sum + item.amount,
            0
        );

    container.innerHTML = `
        <div class="import-extrato-content import-summary">

            <div class="import-extrato-icon">
                ✓
            </div>

            <h2>Extrato analisado</h2>

            <p>
                Encontramos as movimentações do seu extrato
                e separamos automaticamente o que parece ser
                gasto, entrada ou movimentação interna.
            </p>

            <div class="import-summary-grid">

                <div class="import-summary-card">
                    <strong>${total}</strong>
                    <span>Movimentações</span>
                </div>

                <div class="import-summary-card">
                    <strong>${expenses.length}</strong>
                    <span>Possíveis gastos</span>
                </div>

                <div class="import-summary-card">
                    <strong>${entries.length}</strong>
                    <span>Entradas</span>
                </div>

                <div class="import-summary-card">
                    <strong>${ignored.length}</strong>
                    <span>Ignoradas</span>
                </div>

            </div>

            <div class="import-total-preview">
                <span>Total identificado em gastos</span>

                <strong>
                    ${formatCurrency(totalExpenses)}
                </strong>
            </div>

            <div class="import-summary-actions">

                <button
                    type="button"
                    class="primary-button"
                    id="reviewImportButton"
                >
                    Revisar gastos
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    id="newImportButton"
                >
                    Escolher outro arquivo
                </button>

            </div>

        </div>
    `;

    document
        .getElementById(
            "reviewImportButton"
        )
        ?.addEventListener(
            "click",
            renderImportReview
        );

    document
        .getElementById(
            "newImportButton"
        )
        ?.addEventListener(
            "click",
            resetImport
        );
}


/* =========================================================
   TELA DE REVISÃO
   ========================================================= */

function renderImportReview() {
    const page =
        document.getElementById(
            "importExtratoPage"
        );

    if (!page) return;

    page.innerHTML = `
        <div class="page-header">

            <div>

                <h1>Revisar gastos</h1>

                <p>
                    Confira as movimentações antes de adicioná-las
                    ao seu controle financeiro.
                </p>

            </div>

        </div>

        <section class="panel import-review-panel">

            <div class="import-review-toolbar">

                <div>

                    <strong id="importSelectedCount">
                        0 gastos selecionados
                    </strong>

                    <span id="importSelectedTotal">
                        R$ 0,00
                    </span>

                </div>

                <div class="import-toolbar-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="selectAllImportButton"
                    >
                        Selecionar todos
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        id="deselectAllImportButton"
                    >
                        Desmarcar todos
                    </button>

                </div>

            </div>

            <div class="import-review-info">

                <span>
                    ✓ O sistema sugeriu as categorias automaticamente.
                </span>

                <span>
                    Você pode alterar qualquer categoria antes de importar.
                </span>

            </div>

            <div
                id="importTransactionsTable"
                class="import-transactions-table"
            ></div>

            <div class="import-review-footer">

                <button
                    type="button"
                    class="secondary-button"
                    id="backToImportSummaryButton"
                >
                    ← Voltar
                </button>

                <button
                    type="button"
                    class="primary-button"
                    id="importSelectedButton"
                >
                    Importar gastos selecionados
                </button>

            </div>

        </section>
    `;

    document
        .getElementById(
            "selectAllImportButton"
        )
        ?.addEventListener(
            "click",
            selectAllImportTransactions
        );

    document
        .getElementById(
            "deselectAllImportButton"
        )
        ?.addEventListener(
            "click",
            deselectAllImportTransactions
        );

    document
        .getElementById(
            "backToImportSummaryButton"
        )
        ?.addEventListener(
            "click",
            renderImportSummary
        );

    document
        .getElementById(
            "importSelectedButton"
        )
        ?.addEventListener(
            "click",
            importSelectedTransactions
        );

    renderImportTransactions();
}


/* =========================================================
   TABELA DE REVISÃO
   ========================================================= */

function renderImportTransactions() {
    const container =
        document.getElementById(
            "importTransactionsTable"
        );

    if (!container) return;

    const expenses =
        importedTransactions.filter(
            item =>
                item.classification ===
                "saida"
        );

    if (!expenses.length) {
        container.innerHTML = `
            <div class="import-empty-state">
                Nenhum gasto foi identificado neste extrato.
            </div>
        `;

        updateImportSelectionSummary();

        return;
    }

    container.innerHTML = `
        <div class="import-table-wrapper">

            <table class="import-table">

                <thead>

                    <tr>

                        <th class="import-check-column">
                            <span>✓</span>
                        </th>

                        <th>Data</th>

                        <th>Nome</th>

                        <th>Valor</th>

                        <th>Categoria</th>

                        <th>Pagamento</th>

                    </tr>

                </thead>

                <tbody>

                    ${expenses
                        .map(
                            transaction =>
                                renderImportTransactionRow(
                                    transaction
                                )
                        )
                        .join("")}

                </tbody>

            </table>

        </div>
    `;

    attachImportRowEvents();

    updateImportSelectionSummary();
}


/* =========================================================
   LINHA
   ========================================================= */

function renderImportTransactionRow(
    transaction
) {
    const categoryOptions = [
        `
        <option value="">
            Sem categoria
        </option>
        `,
        ...importCategories.map(
            category => {

                const selected =
                    category.id ===
                    transaction.categoryId
                        ? "selected"
                        : "";

                return `
                    <option
                        value="${escapeHTML(category.id)}"
                        ${selected}
                    >
                        ${escapeHTML(category.name)}
                    </option>
                `;
            }
        )
    ].join("");

    return `
        <tr
            data-import-id="${escapeHTML(transaction.id)}"
        >

            <td class="import-check-column">

                <input
                    type="checkbox"
                    class="import-transaction-check"
                    data-id="${escapeHTML(transaction.id)}"
                    ${transaction.selected ? "checked" : ""}
                >

            </td>

            <td class="import-date">
                ${formatImportDate(transaction.date)}
            </td>

            <td class="import-description">

                <div class="import-description-main">
                    ${escapeHTML(transaction.description)}
                </div>

                ${
                    transaction.suggestedCategory
                        ? `
                            <div class="import-suggestion">
                                Sugestão:
                                ${escapeHTML(
                                    transaction.suggestedCategory
                                )}
                            </div>
                        `
                        : ""
                }

            </td>

            <td class="import-value">
                ${formatCurrency(transaction.amount)}
            </td>

            <td class="import-category">

                <select
                    class="import-category-select"
                    data-id="${escapeHTML(transaction.id)}"
                >
                    ${categoryOptions}
                </select>

            </td>

            <td class="import-payment">

                <select
                    class="import-payment-select"
                    data-id="${escapeHTML(transaction.id)}"
                >
                    ${renderPaymentOptions(
                        transaction.paymentMethod
                    )}
                </select>

            </td>

        </tr>
    `;
}


/* =========================================================
   OPÇÕES DE PAGAMENTO
   ========================================================= */

function renderPaymentOptions(
    selectedValue
) {
    const options = [
        "Pix",
        "Cartão",
        "Boleto",
        "Transferência",
        "Dinheiro",
        "Outro"
    ];

    return options
        .map(option => {

            const selected =
                option === selectedValue
                    ? "selected"
                    : "";

            return `
                <option
                    value="${escapeHTML(option)}"
                    ${selected}
                >
                    ${escapeHTML(option)}
                </option>
            `;
        })
        .join("");
}


/* =========================================================
   EVENTOS DAS LINHAS
   ========================================================= */

function attachImportRowEvents() {

    document
        .querySelectorAll(
            ".import-transaction-check"
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                event => {

                    const id =
                        event.target.dataset.id;

                    const transaction =
                        importedTransactions.find(
                            item =>
                                item.id === id
                        );

                    if (!transaction) return;

                    transaction.selected =
                        event.target.checked;

                    updateImportSelectionSummary();
                }
            );
        });


    document
        .querySelectorAll(
            ".import-category-select"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                event => {

                    const id =
                        event.target.dataset.id;

                    const transaction =
                        importedTransactions.find(
                            item =>
                                item.id === id
                        );

                    if (!transaction) return;

                    transaction.categoryId =
                        event.target.value ||
                        null;

                    transaction.categoryName =
                        getCategoryName(
                            transaction.categoryId
                        );
                }
            );
        });


    document
        .querySelectorAll(
            ".import-payment-select"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                event => {

                    const id =
                        event.target.dataset.id;

                    const transaction =
                        importedTransactions.find(
                            item =>
                                item.id === id
                        );

                    if (!transaction) return;

                    transaction.paymentMethod =
                        event.target.value;
                }
            );
        });
}


/* =========================================================
   SELEÇÃO
   ========================================================= */

function selectAllImportTransactions() {

    importedTransactions.forEach(
        transaction => {

            if (
                transaction.classification ===
                "saida"
            ) {
                transaction.selected = true;
            }
        }
    );

    renderImportTransactions();
}


function deselectAllImportTransactions() {

    importedTransactions.forEach(
        transaction => {
            transaction.selected = false;
        }
    );

    renderImportTransactions();
}


/* =========================================================
   RESUMO DA SELEÇÃO
   ========================================================= */

function updateImportSelectionSummary() {

    const selected =
        importedTransactions.filter(
            item =>
                item.classification ===
                    "saida" &&
                item.selected
        );

    const total =
        selected.reduce(
            (sum, item) =>
                sum + item.amount,
            0
        );

    const countElement =
        document.getElementById(
            "importSelectedCount"
        );

    const totalElement =
        document.getElementById(
            "importSelectedTotal"
        );

    if (countElement) {

        countElement.textContent =
            `${selected.length} ${
                selected.length === 1
                    ? "gasto selecionado"
                    : "gastos selecionados"
            }`;
    }

    if (totalElement) {
        totalElement.textContent =
            formatCurrency(total);
    }
}


/* =========================================================
   IMPORTAR PARA SUPABASE
   ========================================================= */

async function importSelectedTransactions() {

    const selected =
        importedTransactions.filter(
            item =>
                item.classification ===
                    "saida" &&
                item.selected
        );

    if (!selected.length) {

        alert(
            "Selecione pelo menos um gasto para importar."
        );

        return;
    }

    const withoutCategory =
        selected.filter(
            item =>
                !item.categoryId
        );

    if (withoutCategory.length) {

        const confirmWithoutCategory =
            confirm(
                `${withoutCategory.length} gasto(s) estão sem categoria.\n\n` +
                `Deseja importar mesmo assim?`
            );

        if (!confirmWithoutCategory) {
            return;
        }
    }

    const button =
        document.getElementById(
            "importSelectedButton"
        );

    if (button) {

        button.disabled = true;

        button.textContent =
            "Importando...";
    }

    try {

        const user =
            await getCurrentUser();

        if (!user) {

            throw new Error(
                "Sua sessão expirou. Faça login novamente."
            );
        }

        const expensesToInsert =
            selected.map(
                transaction => ({

                    user_id:
                        user.id,

                    category_id:
                        transaction.categoryId ||
                        null,

                    description:
                        transaction.description,

                    amount:
                        Number(
                            transaction.amount.toFixed(2)
                        ),

                    date:
                        transaction.date,

                    payment_method:
                        transaction.paymentMethod ||
                        "Outro",

                    notes:
                        `Importado do extrato bancário${
                            transaction.identifier
                                ? ` | ID: ${transaction.identifier}`
                                : ""
                        }`,

                    is_recurring:
                        false,

                    recurring_id:
                        null,

                    installment_id:
                        null
                })
            );

        const { error } =
            await window.supabaseClient
                .from("expenses")
                .insert(
                    expensesToInsert
                );

        if (error) {
            throw error;
        }

        showImportSuccess(
            selected.length,
            selected.reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            )
        );

    } catch (error) {

        console.error(
            "Erro ao salvar gastos:",
            error
        );

        alert(
            "Não foi possível importar os gastos.\n\n" +
            (
                error.message ||
                "Erro desconhecido."
            )
        );

        if (button) {

            button.disabled = false;

            button.textContent =
                "Importar gastos selecionados";
        }
    }
}


/* =========================================================
   SUCESSO
   ========================================================= */

function showImportSuccess(
    count,
    total
) {

    const page =
        document.getElementById(
            "importExtratoPage"
        );

    if (!page) return;

    page.innerHTML = `
        <div class="page-header">

            <div>

                <h1>Importação concluída</h1>

                <p>
                    Os gastos foram adicionados ao seu controle financeiro.
                </p>

            </div>

        </div>

        <section class="panel import-success-panel">

            <div class="import-extrato-content">

                <div class="import-success-icon">
                    ✓
                </div>

                <h2>
                    Gastos importados com sucesso
                </h2>

                <p>

                    ${count}

                    ${
                        count === 1
                            ? "gasto foi"
                            : "gastos foram"
                    }

                    adicionados ao Dot Finance.

                </p>

                <div class="import-success-total">
                    ${formatCurrency(total)}
                </div>

                <div class="import-summary-actions">

                    <button
                        type="button"
                        class="primary-button"
                        id="goToDashboardAfterImport"
                    >
                        Ver dashboard
                    </button>

                    <button
                        type="button"
                        class="secondary-button"
                        id="newImportAfterSuccess"
                    >
                        Importar outro extrato
                    </button>

                </div>

            </div>

        </section>
    `;

    document
        .getElementById(
            "goToDashboardAfterImport"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    typeof changePage ===
                    "function"
                ) {
                    changePage(
                        "dashboard"
                    );
                }
            }
        );

    document
        .getElementById(
            "newImportAfterSuccess"
        )
        ?.addEventListener(
            "click",
            resetImport
        );
}


/* =========================================================
   RESET
   ========================================================= */

function resetImport() {

    importedTransactions = [];

    const page =
        document.getElementById(
            "importExtratoPage"
        );

    if (!page) return;

    page.innerHTML = `
        <div class="page-header">

            <div>

                <h1>Importar extrato</h1>

                <p>
                    Importe as movimentações do seu banco
                    para cadastrar seus gastos.
                </p>

            </div>

        </div>

        <section class="panel import-extrato-panel">

            <div class="import-extrato-content">

                <div class="import-extrato-icon">
                    ↑
                </div>

                <h2>
                    Importe seu extrato bancário
                </h2>

                <p>
                    Selecione um arquivo CSV exportado pelo seu banco.
                    Antes de salvar, você poderá revisar todas as movimentações.
                </p>

                <label
                    for="extratoFileInput"
                    class="primary-button import-file-button"
                >
                    Selecionar arquivo
                </label>

                <input
                    type="file"
                    id="extratoFileInput"
                    accept=".csv"
                    hidden
                >

                <small>
                    Formato aceito: CSV
                </small>

            </div>

        </section>
    `;

    document
        .getElementById(
            "extratoFileInput"
        )
        ?.addEventListener(
            "change",
            handleExtratoFile
        );
}


/* =========================================================
   LOADING
   ========================================================= */

function showImportLoading(
    message
) {

    const panel =
        document.querySelector(
            ".import-extrato-panel"
        );

    if (!panel) return;

    panel.innerHTML = `
        <div class="import-extrato-content">

            <div class="import-extrato-icon">
                ↻
            </div>

            <h2>
                ${escapeHTML(message)}
            </h2>

            <p>
                Aguarde enquanto o Dot Finance
                analisa suas movimentações.
            </p>

        </div>
    `;
}


/* =========================================================
   ERRO
   ========================================================= */

function showImportError(
    message
) {

    const panel =
        document.querySelector(
            ".import-extrato-panel"
        );

    if (!panel) return;

    panel.innerHTML = `
        <div class="import-extrato-content">

            <div class="import-extrato-icon">
                !
            </div>

            <h2>
                Não foi possível importar
            </h2>

            <p>
                ${escapeHTML(message)}
            </p>

            <button
                type="button"
                class="primary-button"
                id="tryImportAgainButton"
            >
                Tentar novamente
            </button>

        </div>
    `;

    document
        .getElementById(
            "tryImportAgainButton"
        )
        ?.addEventListener(
            "click",
            resetImport
        );
}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function normalizeText(value) {

    return String(value || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}


function containsAny(
    text,
    terms
) {

    return terms.some(
        term =>
            text.includes(
                normalizeText(term)
            )
    );
}


function parseBrazilianDate(value) {
    const text = String(value || "").trim();

    if (!text) return null;

    // DD/MM/YYYY
    const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (brazilian) {
        const day = String(brazilian[1]).padStart(2, "0");
        const month = String(brazilian[2]).padStart(2, "0");
        const year = brazilian[3];

        return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (iso) {
        return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
    }

    return null;
}

function parseBrazilianAmount(value) {
    let text = String(value || "")
        .trim()
        .replace(/\s/g, "");

    if (!text) return null;

    // Remove símbolos de moeda
    text = text.replace(/[R$]/gi, "");

    // Formato brasileiro: 1.234,56
    if (text.includes(",") && text.includes(".")) {
        text = text
            .replace(/\./g, "")
            .replace(",", ".");
    } else if (text.includes(",")) {
        text = text.replace(",", ".");
    }

    const number = Number(
        text.replace(/[^0-9.-]/g, "")
    );

    if (Number.isNaN(number)) {
        return null;
    }

    return number;
}

function cleanDescription(description) {
    let text = String(description || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!text) {
        return "";
    }

    // Remove prefixos comuns dos bancos
    text = text
        .replace(/^transferência enviada pelo pix\s*-\s*/i, "")
        .replace(/^transferencia enviada pelo pix\s*-\s*/i, "")
        .replace(/^transferência recebida pelo pix\s*-\s*/i, "")
        .replace(/^transferencia recebida pelo pix\s*-\s*/i, "")
        .replace(/^pix enviado\s*-\s*/i, "")
        .replace(/^pix recebido\s*-\s*/i, "");

    // Remove informações de agência e conta
    text = text.replace(
        /\s*Agência:\s*\d+\s*Conta:\s*[\d-]+.*$/i,
        ""
    );

    // Remove CPF/CNPJ mascarado ou completo
    text = text.replace(
        /\s*-\s*(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|[•*xX\d]{2,}\.?\d{3}\.?\d{3}-?[•*xX\d]{2,}).*$/i,
        ""
    );

    // Remove CPF/CNPJ que esteja depois do nome
    text = text.replace(
        /\s*-\s*\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
        ""
    );

    // Remove códigos bancários comuns no final
    text = text.replace(
        /\s*-\s*(?:NU PAGAMENTOS|BCO|BANCO|IP)\s*.*$/i,
        ""
    );

    // Remove excesso de separadores
    text = text
        .replace(/\s+-\s*$/, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    return text || "Movimentação bancária";
}


function getCategoryName(
    categoryId
) {

    if (!categoryId) return "";

    const category =
        importCategories.find(
            item =>
                item.id ===
                categoryId
        );

    return category
        ? category.name
        : "";
}


function formatImportDate(
    date
) {

    if (!date) return "-";

    const parts =
        date.split("-");

    if (
        parts.length !== 3
    ) {
        return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function formatCurrency(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}