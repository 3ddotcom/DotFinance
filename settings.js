console.log("SETTINGS.JS FOI CARREGADO");


let settingsUser = null;


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function initSettings() {

    try {

        const {
            data: { user },
            error
        } = await window.supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!user) {
            return;
        }

        settingsUser = user;

        await loadSettingsProfile();

    } catch (error) {

        console.error(
            "Erro ao carregar configurações:",
            error
        );

    }

}


/* =========================================================
   PERFIL
   ========================================================= */

async function loadSettingsProfile() {

    if (!settingsUser) {
        return;
    }

    const nameInput =
        document.getElementById("settingsName");

    const emailInput =
        document.getElementById("settingsEmail");

    const profileName =
        document.getElementById("settingsProfileName");

    const profileEmail =
        document.getElementById("settingsProfileEmail");

    const avatar =
        document.getElementById("settingsAvatar");


    emailInput.value =
        settingsUser.email || "";


    let name = "";

    const {
        data: profile,
        error
    } = await window.supabaseClient
        .from("profiles")
        .select("name, email")
        .eq("id", settingsUser.id)
        .maybeSingle();


    if (error) {

        console.error(
            "Erro ao buscar perfil:",
            error
        );

    }


    if (profile && profile.name) {
        name = profile.name;
    }


    if (!name) {
        name = "Usuário";
    }


    nameInput.value =
        name === "Usuário" ? "" : name;

    profileName.textContent =
        name;

    profileEmail.textContent =
        settingsUser.email || "Sem e-mail";


    avatar.textContent =
        getInitial(name);

}


/* =========================================================
   SALVAR PERFIL
   ========================================================= */

async function saveSettingsProfile() {

    if (!settingsUser) {
        return;
    }


    const nameInput =
        document.getElementById("settingsName");

    const message =
        document.getElementById("settingsProfileMessage");


    const name =
        nameInput.value.trim();


    if (!name) {

        showSettingsMessage(
            message,
            "Digite seu nome.",
            "error"
        );

        return;
    }


    const {
        error
    } = await window.supabaseClient
        .from("profiles")
        .upsert(
            {
                id: settingsUser.id,
                name: name,
                email: settingsUser.email,
                updated_at: new Date().toISOString()
            },
            {
                onConflict: "id"
            }
        );


    if (error) {

        console.error(
            "Erro ao salvar perfil:",
            error
        );

        showSettingsMessage(
            message,
            "Não foi possível salvar as alterações.",
            "error"
        );

        return;
    }


    document.getElementById(
        "settingsProfileName"
    ).textContent = name;


    document.getElementById(
        "settingsAvatar"
    ).textContent = getInitial(name);


    document.getElementById(
        "userName"
    ).textContent = name;


    showSettingsMessage(
        message,
        "Alterações salvas com sucesso.",
        "success"
    );

}


/* =========================================================
   PREFERÊNCIAS
   ========================================================= */

function saveSettingsPreferences() {

    const message =
        document.getElementById(
            "settingsPreferencesMessage"
        );


    localStorage.setItem(
        "dotFinanceCurrency",
        document.getElementById(
            "settingsCurrency"
        ).value
    );


    localStorage.setItem(
        "dotFinanceDateFormat",
        document.getElementById(
            "settingsDateFormat"
        ).value
    );


    showSettingsMessage(
        message,
        "Preferências salvas com sucesso.",
        "success"
    );

}


/* =========================================================
   CARREGAR PREFERÊNCIAS
   ========================================================= */

function loadSettingsPreferences() {

    const currency =
        localStorage.getItem(
            "dotFinanceCurrency"
        );

    const dateFormat =
        localStorage.getItem(
            "dotFinanceDateFormat"
        );


    if (currency) {

        const field =
            document.getElementById(
                "settingsCurrency"
            );

        if (field) {
            field.value = currency;
        }

    }


    if (dateFormat) {

        const field =
            document.getElementById(
                "settingsDateFormat"
            );

        if (field) {
            field.value = dateFormat;
        }

    }

}


/* =========================================================
   ALTERAR SENHA
   ========================================================= */

async function changeSettingsPassword() {

    if (!settingsUser || !settingsUser.email) {
        return;
    }


    const {
        error
    } = await window.supabaseClient.auth
        .resetPasswordForEmail(
            settingsUser.email,
            {
                redirectTo:
                    window.location.origin +
                    window.location.pathname
            }
        );


    if (error) {

        alert(
            "Não foi possível enviar o e-mail para alteração da senha."
        );

        console.error(error);

        return;
    }


    alert(
        "Enviamos um e-mail para você redefinir sua senha."
    );

}


/* =========================================================
   SAIR
   ========================================================= */

async function settingsLogout() {

    const confirmed =
        confirm(
            "Deseja realmente sair da sua conta?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } = await window.supabaseClient.auth.signOut();


    if (error) {

        console.error(
            "Erro ao sair:",
            error
        );

        return;
    }


    window.location.href = "index.html";

}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function getInitial(name) {

    if (!name) {
        return "U";
    }

    return name
        .trim()
        .charAt(0)
        .toUpperCase();

}


function showSettingsMessage(
    element,
    text,
    type
) {

    if (!element) {
        return;
    }


    element.textContent = text;

    element.className =
        "settings-message " + type;


    clearTimeout(
        element._messageTimeout
    );


    element._messageTimeout =
        setTimeout(() => {

            element.textContent = "";
            element.className =
                "settings-message";

        }, 3500);

}


/* =========================================================
   EVENTOS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initSettings();

        loadSettingsPreferences();


        const saveProfileButton =
            document.getElementById(
                "saveProfileButton"
            );

        if (saveProfileButton) {

            saveProfileButton.addEventListener(
                "click",
                saveSettingsProfile
            );

        }


        const savePreferencesButton =
            document.getElementById(
                "savePreferencesButton"
            );

        if (savePreferencesButton) {

            savePreferencesButton.addEventListener(
                "click",
                saveSettingsPreferences
            );

        }


        const changePasswordButton =
            document.getElementById(
                "changePasswordButton"
            );

        if (changePasswordButton) {

            changePasswordButton.addEventListener(
                "click",
                changeSettingsPassword
            );

        }


        const logoutButton =
            document.getElementById(
                "settingsLogoutButton"
            );

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                settingsLogout
            );

        }

    }
);