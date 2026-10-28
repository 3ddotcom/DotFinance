const loginForm =
    document.getElementById("loginForm");

const registerButton =
    document.getElementById("registerButton");

const loginButton =
    document.getElementById("loginButton");

const message =
    document.getElementById("message");


function showMessage(text, isError = true) {

    message.textContent = text;

    message.style.color =
        isError
            ? "#fca5a5"
            : "#86efac";
}


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;

        if (!email || !password) {
            showMessage(
                "Preencha e-mail e senha."
            );

            return;
        }

        loginButton.disabled = true;

        loginButton.textContent =
            "Entrando...";

        showMessage("", false);

        try {

            const data =
                await signIn(
                    email,
                    password
                );

            if (data.user) {
                // Tenta garantir que o perfil exista, sem bloquear o login
                // caso a política RLS da tabela profiles precise ser ajustada.
                await createProfile(data.user);

                window.location.href = "app.html";
            }

        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Não foi possível entrar."
            );

        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Entrar";
        }
    }
);


registerButton.addEventListener(
    "click",
    async function () {

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;

        if (!email) {

            showMessage(
                "Digite seu e-mail primeiro."
            );

            return;
        }

        if (password.length < 6) {

            showMessage(
                "A senha precisa ter pelo menos 6 caracteres."
            );

            return;
        }

        registerButton.disabled = true;

        registerButton.textContent =
            "Criando...";

        try {

            const data =
                await signUp(
                    email,
                    password
                );

            if (data.user) {

                if (data.session) {

                    await createProfile(
                        data.user
                    );

                    showMessage(
                        "Conta criada! Entrando...",
                        false
                    );

                    setTimeout(() => {

                        window.location.href =
                            "app.html";

                    }, 700);

                } else {

                    showMessage(
                        "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
                        false
                    );
                }
            }

        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Não foi possível criar a conta."
            );

        } finally {

            registerButton.disabled = false;

            registerButton.textContent =
                "Criar conta";
        }
    }
);