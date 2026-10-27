
let investmentUser = null;
let investments = [];
let investmentMovements = [];
let selectedInvestmentId = null;
let editingInvestmentId = null;


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    await initializeInvestments();
});


async function initializeInvestments() {

    try {

        const {
            data: { user },
            error
        } = await window.supabaseClient.auth.getUser();

        if (error) throw error;

        if (!user) {
            window.location.href = "index.html";
            return;
        }

        investmentUser = user;

        updateUserInterface(user);

        await loadInvestments();
        await loadInvestmentMovements();

        setupInvestmentModal();
        setupMovementModal();

    } catch (error) {

        console.error(
            "Erro ao inicializar investimentos:",
            error
        );

    }

}


/* =========================================================
   INTERFACE DO USUÁRIO
========================================================= */

function updateUserInterface(user) {

    const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        "Usuário";

    const email = user.email || "";

    const nameElement =
        document.getElementById("userName");

    const emailElement =
        document.getElementById("userEmail");

    const avatarElement =
        document.getElementById("userAvatar");


    if (nameElement) {
        nameElement.textContent = name;
    }

    if (emailElement) {
        emailElement.textContent = email;
    }

    if (avatarElement) {

        avatarElement.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================================
   CARREGAR INVESTIMENTOS
========================================================= */

async function loadInvestments() {

    if (!investmentUser) return;


    const {
        data,
        error
    } = await window.supabaseClient
        .from("investments")
        .select("*")
        .eq("user_id", investmentUser.id)
        .order("date", {
            ascending: false
        });


    if (error) {

        console.error(
            "Erro ao carregar investimentos:",
            error
        );

        return;

    }


    investments = data || [];

    console.log(
        "Investimentos carregados:",
        investments
    );


    renderInvestments();

}


/* =========================================================
   CARREGAR MOVIMENTAÇÕES
========================================================= */

async function loadInvestmentMovements() {

    if (!investmentUser) return;


    const {
        data,
        error
    } = await window.supabaseClient
        .from("investment_movements")
        .select("*")
        .eq("user_id", investmentUser.id)
        .order("date", {
            ascending: false
        });


    if (error) {

        console.error(
            "Erro ao carregar movimentações:",
            error
        );

        return;

    }


    investmentMovements = data || [];


    console.log(
        "Movimentações carregadas:",
        investmentMovements
    );


    renderInvestmentMovements();

    updateInvestmentSummary();

    renderInvestments();

}


/* =========================================================
   RENDERIZAR INVESTIMENTOS
========================================================= */

function renderInvestments() {

    const portfolio =
        document.getElementById(
            "investmentPortfolio"
        );


    if (!portfolio) return;


    if (!investments.length) {

        portfolio.innerHTML = `
            <div class="investment-empty">
                Você ainda não possui investimentos cadastrados.
            </div>
        `;

        updateInvestmentSummary();

        return;

    }


    portfolio.innerHTML =
        investments.map(investment => {

            const currentValue =
                calculateInvestmentCurrentValue(
                    investment.id,
                    investment.amount
                );


            return `
                <div class="investment-item">

                    <div class="investment-item-info">

                        <strong>
                            ${escapeInvestmentHTML(
                                investment.description
                            )}
                        </strong>

                        <span>
                            ${escapeInvestmentHTML(
                                investment.type
                            )}

                            ${
                                investment.institution
                                    ? " • " +
                                      escapeInvestmentHTML(
                                          investment.institution
                                      )
                                    : ""
                            }
                        </span>

                    </div>


                    <div class="investment-item-actions">

                        <div class="investment-item-value">

                            ${formatInvestmentCurrency(
                                currentValue
                            )}

                        </div>


                        <button
                            type="button"
                            class="investment-movement-button"
                            data-investment-id="${investment.id}"
                        >
                            + Movimentação
                        </button>


                        <button
                            type="button"
                            class="investment-edit-button"
                            data-investment-id="${investment.id}"
                        >
                            Alterar
                        </button>


                        <button
                            type="button"
                            class="investment-delete-button"
                            data-investment-id="${investment.id}"
                        >
                            Excluir
                        </button>

                    </div>

                </div>
            `;

        }).join("");


    updateInvestmentSummary();


    /* BOTÃO MOVIMENTAÇÃO */

    document
        .querySelectorAll(
            ".investment-movement-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const investmentId =
                        button.dataset.investmentId;

                    openMovementModal(
                        investmentId
                    );

                }
            );

        });


    /* BOTÃO ALTERAR */

    document
        .querySelectorAll(
            ".investment-edit-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const investmentId =
                        button.dataset.investmentId;

                    openEditInvestmentModal(
                        investmentId
                    );

                }
            );

        });


    /* BOTÃO EXCLUIR */

    document
        .querySelectorAll(
            ".investment-delete-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const investmentId =
                        button.dataset.investmentId;

                    deleteInvestment(
                        investmentId
                    );

                }
            );

        });

}


/* =========================================================
   VALOR ATUAL DO INVESTIMENTO
========================================================= */

function calculateInvestmentCurrentValue(
    investmentId,
    initialAmount
) {

    let currentValue =
        Number(initialAmount) || 0;


    const movements =
        investmentMovements.filter(
            movement =>
                movement.investment_id ===
                investmentId
        );


    movements.forEach(movement => {

        const amount =
            Number(movement.amount) || 0;


        switch (movement.type) {

            case "aporte":

                currentValue += amount;

                break;


            case "resgate":

                currentValue -= amount;

                break;


            case "rendimento":

                currentValue += amount;

                break;


            case "taxa":

                currentValue -= amount;

                break;


            case "outros":

                currentValue += amount;

                break;

        }

    });


    return Math.max(
        currentValue,
        0
    );

}


/* =========================================================
   VALOR INVESTIDO
========================================================= */

function calculateInvestmentInvestedValue(
    investmentId,
    initialAmount
) {

    let investedValue =
        Number(initialAmount) || 0;


    const movements =
        investmentMovements.filter(
            movement =>
                movement.investment_id ===
                investmentId
        );


    movements.forEach(movement => {

        const amount =
            Number(movement.amount) || 0;


        switch (movement.type) {

            case "aporte":

                investedValue += amount;

                break;


            case "resgate":

                investedValue -= amount;

                break;

        }

    });


    return Math.max(
        investedValue,
        0
    );

}


/* =========================================================
   RESUMO
========================================================= */

function updateInvestmentSummary() {

    let currentTotal = 0;
    let investedTotal = 0;


    investments.forEach(investment => {

        currentTotal +=
            calculateInvestmentCurrentValue(
                investment.id,
                investment.amount
            );


        investedTotal +=
            calculateInvestmentInvestedValue(
                investment.id,
                investment.amount
            );

    });


    const profitTotal =
        currentTotal -
        investedTotal;


    const profitPercent =
        investedTotal > 0
            ? (
                profitTotal /
                investedTotal
            ) * 100
            : 0;


    const currentElement =
        document.getElementById(
            "investmentCurrentTotal"
        );


    const investedElement =
        document.getElementById(
            "investmentInvestedTotal"
        );


    const profitElement =
        document.getElementById(
            "investmentProfitTotal"
        );


    const percentElement =
        document.getElementById(
            "investmentProfitPercent"
        );


    if (currentElement) {

        currentElement.textContent =
            formatInvestmentCurrency(
                currentTotal
            );

    }


    if (investedElement) {

        investedElement.textContent =
            formatInvestmentCurrency(
                investedTotal
            );

    }


    if (profitElement) {

        profitElement.textContent =
            formatInvestmentCurrency(
                profitTotal
            );

    }


    if (percentElement) {

        percentElement.textContent =
            profitPercent.toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ) + "%";

    }

}


/* =========================================================
   MODAL DE INVESTIMENTO
========================================================= */

const investmentModal =
    document.getElementById(
        "investmentModal"
    );


const investmentForm =
    document.getElementById(
        "investmentForm"
    );


function setupInvestmentModal() {

    const openButton =
        document.getElementById(
            "newInvestmentButton"
        );


    if (openButton) {

        openButton.addEventListener(
            "click",
            () => {

                openNewInvestmentModal();

            }
        );

    }


    const closeButton =
        document.getElementById(
            "closeInvestmentModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeInvestmentModalWindow
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelInvestmentButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeInvestmentModalWindow
        );

    }


    const overlay =
        investmentModal?.querySelector(
            ".investment-modal-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeInvestmentModalWindow
        );

    }


    if (investmentForm) {

        investmentForm.addEventListener(
            "submit",
            saveInvestment
        );

    }

}




/* =========================================================
   ABRIR NOVO INVESTIMENTO
========================================================= */

function openNewInvestmentModal() {

    editingInvestmentId = null;


    const title =
        investmentModal?.querySelector(
            ".investment-modal-header h2"
        );


    const description =
        investmentModal?.querySelector(
            ".investment-modal-header p"
        );


    const submitButton =
        investmentForm?.querySelector(
            'button[type="submit"]'
        );


    if (title) {

        title.textContent =
            "Novo investimento";

    }


    if (description) {

        description.textContent =
            "Cadastre um novo investimento na sua carteira.";

    }


    if (submitButton) {

        submitButton.textContent =
            "Salvar investimento";

    }


    if (investmentForm) {

        investmentForm.reset();

    }


    const dateInput =
        document.getElementById(
            "investmentDate"
        );


    if (dateInput) {

        dateInput.value =
            new Date()
                .toISOString()
                .split("T")[0];

    }


    clearInvestmentMessage();


    if (investmentModal) {

        investmentModal.classList.add(
            "active"
        );

    }

}


/* =========================================================
   ABRIR ALTERAÇÃO
========================================================= */

function openEditInvestmentModal(
    investmentId
) {

    const investment =
        investments.find(
            item =>
                item.id === investmentId
        );


    if (!investment) {

        console.error(
            "Investimento não encontrado:",
            investmentId
        );

        return;

    }


    editingInvestmentId =
        investmentId;


    const title =
        investmentModal?.querySelector(
            ".investment-modal-header h2"
        );


    const description =
        investmentModal?.querySelector(
            ".investment-modal-header p"
        );


    const submitButton =
        investmentForm?.querySelector(
            'button[type="submit"]'
        );


    if (title) {

        title.textContent =
            "Alterar investimento";

    }


    if (description) {

        description.textContent =
            "Edite as informações deste investimento.";

    }


    if (submitButton) {

        submitButton.textContent =
            "Salvar alterações";

    }


    document.getElementById(
        "investmentType"
    ).value =
        investment.type || "";


    document.getElementById(
        "investmentDescription"
    ).value =
        investment.description || "";


    document.getElementById(
        "investmentAmount"
    ).value =
        investment.amount ?? "";


    document.getElementById(
        "investmentDate"
    ).value =
        investment.date || "";


    document.getElementById(
        "investmentInstitution"
    ).value =
        investment.institution || "";


    document.getElementById(
        "investmentNotes"
    ).value =
        investment.notes || "";


    clearInvestmentMessage();


    if (investmentModal) {

        investmentModal.classList.add(
            "active"
        );

    }

}


/* =========================================================
   SALVAR / ALTERAR INVESTIMENTO
========================================================= */

async function saveInvestment(event) {

    event.preventDefault();

    clearInvestmentMessage();


    if (!investmentUser) {

        showInvestmentMessage(
            "Usuário não autenticado."
        );

        return;

    }


    const type =
        document.getElementById(
            "investmentType"
        ).value;


    const description =
        document.getElementById(
            "investmentDescription"
        ).value.trim();


    const amount =
        Number(
            document.getElementById(
                "investmentAmount"
            ).value
        );


    const date =
        document.getElementById(
            "investmentDate"
        ).value;


    const institution =
        document.getElementById(
            "investmentInstitution"
        ).value.trim();


    const notes =
        document.getElementById(
            "investmentNotes"
        ).value.trim();


    if (
        !type ||
        !description ||
        !amount ||
        !date
    ) {

        showInvestmentMessage(
            "Preencha todos os campos obrigatórios."
        );

        return;

    }


    /* =====================================================
       ALTERAR
    ===================================================== */

    if (editingInvestmentId) {

        const {
            error
        } = await window.supabaseClient
            .from("investments")
            .update({

                type: type,

                description: description,

                amount: amount,

                date: date,

                institution:
                    institution || null,

                notes:
                    notes || null,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                editingInvestmentId
            )
            .eq(
                "user_id",
                investmentUser.id
            );


        if (error) {

            console.error(
                "Erro ao alterar investimento:",
                error
            );


            showInvestmentMessage(
                error.message ||
                "Não foi possível alterar o investimento."
            );


            return;

        }


        console.log(
            "Investimento alterado com sucesso."
        );


        closeInvestmentModalWindow();


        editingInvestmentId = null;


        await loadInvestments();

        await loadInvestmentMovements();


        return;

    }


    /* =====================================================
       NOVO INVESTIMENTO
    ===================================================== */

    const {
        error
    } = await window.supabaseClient
        .from("investments")
        .insert({

            user_id:
                investmentUser.id,

            type: type,

            description: description,

            amount: amount,

            date: date,

            institution:
                institution || null,

            notes:
                notes || null

        });


    if (error) {

        console.error(
            "Erro ao salvar investimento:",
            error
        );


        showInvestmentMessage(
            error.message ||
            "Não foi possível salvar o investimento."
        );


        return;

    }


    console.log(
        "Investimento salvo com sucesso."
    );


    closeInvestmentModalWindow();


    await loadInvestments();

    await loadInvestmentMovements();

}


/* =========================================================
   EXCLUIR INVESTIMENTO
========================================================= */

async function deleteInvestment(
    investmentId
) {

    if (!investmentUser) {

        alert(
            "Usuário não autenticado."
        );

        return;

    }


    const investment =
        investments.find(
            item =>
                item.id === investmentId
        );


    if (!investment) {

        console.error(
            "Investimento não encontrado:",
            investmentId
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Tem certeza que deseja excluir o investimento "${investment.description}"?\n\nAs movimentações vinculadas a este investimento também serão excluídas.`
        );


    if (!confirmed) {

        return;

    }


    /* =====================================================
       EXCLUIR MOVIMENTAÇÕES PRIMEIRO
       Isso funciona mesmo sem CASCADE configurado.
    ===================================================== */

    const {
        error: movementsError
    } = await window.supabaseClient
        .from("investment_movements")
        .delete()
        .eq(
            "investment_id",
            investmentId
        )
        .eq(
            "user_id",
            investmentUser.id
        );


    if (movementsError) {

        console.error(
            "Erro ao excluir movimentações do investimento:",
            movementsError
        );


        alert(
            "Não foi possível excluir as movimentações vinculadas ao investimento.\n\n" +
            movementsError.message
        );


        return;

    }


    /* =====================================================
       EXCLUIR INVESTIMENTO
    ===================================================== */

    const {
        error
    } = await window.supabaseClient
        .from("investments")
        .delete()
        .eq(
            "id",
            investmentId
        )
        .eq(
            "user_id",
            investmentUser.id
        );


    if (error) {

        console.error(
            "Erro ao excluir investimento:",
            error
        );


        alert(
            "Não foi possível excluir o investimento.\n\n" +
            error.message
        );


        return;

    }


    console.log(
        "Investimento excluído com sucesso."
    );


    await loadInvestments();

    await loadInvestmentMovements();

}


/* =========================================================
   FECHAR MODAL INVESTIMENTO
========================================================= */

function closeInvestmentModalWindow() {

    if (investmentModal) {

        investmentModal.classList.remove(
            "active"
        );

    }


    editingInvestmentId = null;

    clearInvestmentMessage();

}


/* =========================================================
   MENSAGENS DO FORMULÁRIO
========================================================= */

function showInvestmentMessage(
    message
) {

    const element =
        document.getElementById(
            "investmentFormMessage"
        );


    if (!element) return;


    element.textContent =
        message;


    element.classList.add(
        "active"
    );

}


function clearInvestmentMessage() {

    const element =
        document.getElementById(
            "investmentFormMessage"
        );


    if (!element) return;


    element.textContent =
        "";


    element.classList.remove(
        "active"
    );

}


/* =========================================================
   MODAL DE MOVIMENTAÇÃO
========================================================= */

const movementModal =
    document.getElementById(
        "movementModal"
    );


const movementForm =
    document.getElementById(
        "movementForm"
    );


function setupMovementModal() {

    const closeButton =
        document.getElementById(
            "closeMovementModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeMovementModalWindow
        );

    }


    const cancelButton =
        document.getElementById(
            "cancelMovementButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeMovementModalWindow
        );

    }


    const overlay =
        movementModal?.querySelector(
            ".investment-modal-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMovementModalWindow
        );

    }


    if (movementForm) {

        movementForm.addEventListener(
            "submit",
            saveMovement
        );

    }

}


/* =========================================================
   ABRIR MODAL DE MOVIMENTAÇÃO
========================================================= */

function openMovementModal(
    investmentId
) {

    const investment =
        investments.find(
            item =>
                item.id ===
                investmentId
        );


    if (!investment) {

        console.error(
            "Investimento não encontrado:",
            investmentId
        );

        return;

    }


    selectedInvestmentId =
        investmentId;


    const investmentName =
        document.getElementById(
            "movementInvestmentName"
        );


    if (investmentName) {

        investmentName.textContent =
            investment.description;

    }


    const movementDate =
        document.getElementById(
            "movementDate"
        );


    if (movementDate) {

        movementDate.value =
            new Date()
                .toISOString()
                .split("T")[0];

    }


    const movementType =
        document.getElementById(
            "movementType"
        );


    const movementAmount =
        document.getElementById(
            "movementAmount"
        );


    const movementNotes =
        document.getElementById(
            "movementNotes"
        );


    if (movementType) {

        movementType.value =
            "";

    }


    if (movementAmount) {

        movementAmount.value =
            "";

    }


    if (movementNotes) {

        movementNotes.value =
            "";

    }


    clearMovementMessage();


    if (movementModal) {

        movementModal.classList.add(
            "active"
        );

    }

}


/* =========================================================
   SALVAR MOVIMENTAÇÃO
========================================================= */

async function saveMovement(
    event
) {

    console.log(
        "SUBMIT DA MOVIMENTAÇÃO DISPAROU"
    );


    event.preventDefault();

    clearMovementMessage();


    if (!investmentUser) {

        showMovementMessage(
            "Usuário não autenticado."
        );

        return;

    }


    if (!selectedInvestmentId) {

        showMovementMessage(
            "Investimento não selecionado."
        );

        return;

    }


    const investmentExists =
        investments.some(
            investment =>
                investment.id ===
                selectedInvestmentId
        );


    if (!investmentExists) {

        showMovementMessage(
            "O investimento selecionado não existe mais."
        );

        return;

    }


    const type =
        document.getElementById(
            "movementType"
        ).value;


    const amount =
        Number(
            document.getElementById(
                "movementAmount"
            ).value
        );


    const date =
        document.getElementById(
            "movementDate"
        ).value;


    const notes =
        document.getElementById(
            "movementNotes"
        ).value.trim();


    if (
        !type ||
        !amount ||
        !date
    ) {

        showMovementMessage(
            "Preencha todos os campos obrigatórios."
        );

        return;

    }


    const {
        error
    } = await window.supabaseClient
        .from("investment_movements")
        .insert({

            user_id:
                investmentUser.id,

            investment_id:
                selectedInvestmentId,

            type:
                type,

            amount:
                amount,

            date:
                date,

            notes:
                notes || null

        });


    if (error) {

        console.error(
            "ERRO COMPLETO AO SALVAR MOVIMENTAÇÃO:",
            error
        );


        alert(
            "Erro ao salvar:\n\n" +
            (
                error.message ||
                JSON.stringify(error)
            )
        );


        showMovementMessage(
            error.message ||
            "Não foi possível salvar a movimentação."
        );


        return;

    }


    console.log(
        "Movimentação salva com sucesso."
    );


    closeMovementModalWindow();


    await loadInvestments();

    await loadInvestmentMovements();

}


/* =========================================================
   RENDERIZAR MOVIMENTAÇÕES
========================================================= */

function renderInvestmentMovements() {

    const container =
        document.getElementById(
            "investmentMovements"
        );


    if (!container) return;


    if (!investmentMovements.length) {

        container.innerHTML = `
            <div class="investment-empty">
                Nenhuma movimentação registrada.
            </div>
        `;

        return;

    }


    container.innerHTML =
        investmentMovements.map(
            movement => {

                const investment =
                    investments.find(
                        item =>
                            item.id ===
                            movement.investment_id
                    );


                const investmentName =
                    investment
                        ? investment.description
                        : "Investimento";


                const isPositive =
                    movement.type === "aporte" ||
                    movement.type === "rendimento" ||
                    movement.type === "outros";


                const signal =
                    isPositive
                        ? "+"
                        : "-";


                return `
                    <div class="investment-movement-item">

                        <div class="investment-movement-info">

                            <strong>
                                ${escapeInvestmentHTML(
                                    investmentName
                                )}
                            </strong>

                            <span>
                                ${escapeInvestmentHTML(
                                    getMovementTypeLabel(
                                        movement.type
                                    )
                                )}
                                •
                                ${formatInvestmentDate(
                                    movement.date
                                )}
                            </span>

                        </div>


                        <div
                            class="investment-movement-value ${
                                isPositive
                                    ? "positive"
                                    : "negative"
                            }"
                        >
                            ${signal}
                            ${formatInvestmentCurrency(
                                movement.amount
                            )}
                        </div>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   FECHAR MODAL MOVIMENTAÇÃO
========================================================= */

function closeMovementModalWindow() {

    if (movementModal) {

        movementModal.classList.remove(
            "active"
        );

    }


    selectedInvestmentId =
        null;


    clearMovementMessage();

}


/* =========================================================
   MENSAGENS MOVIMENTAÇÃO
========================================================= */

function showMovementMessage(
    message
) {

    const element =
        document.getElementById(
            "movementFormMessage"
        );


    if (!element) return;


    element.textContent =
        message;


    element.classList.add(
        "active"
    );

}


function clearMovementMessage() {

    const element =
        document.getElementById(
            "movementFormMessage"
        );


    if (!element) return;


    element.textContent =
        "";


    element.classList.remove(
        "active"
    );

}


/* =========================================================
   LABEL DOS TIPOS DE MOVIMENTAÇÃO
========================================================= */

function getMovementTypeLabel(
    type
) {

    switch (type) {

        case "aporte":

            return "Aporte";


        case "resgate":

            return "Resgate";


        case "rendimento":

            return "Rendimento";


        case "taxa":

            return "Taxa";


        case "outros":

            return "Outros";


        default:

            return "Movimentação";

    }

}


/* =========================================================
   FORMATAR DATA
========================================================= */

function formatInvestmentDate(
    date
) {

    if (!date) return "";


    const parts =
        String(date).split("-");


    if (parts.length !== 3) {

        return date;

    }


    return `
        ${parts[2]}/${parts[1]}/${parts[0]}
    `;

}


/* =========================================================
   FORMATAR MOEDA
========================================================= */

function formatInvestmentCurrency(
    value
) {

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    ).format(
        Number(value) || 0
    );

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeInvestmentHTML(
    value
) {

    return String(value || "")
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

