async function getCurrentUser() {
    const {
        data,
        error
    } = await window.supabaseClient.auth.getUser();

    if (error) {
        console.error("Erro ao obter usuário:", error);
        return null;
    }

    return data.user;
}




async function signUp(email, password) {
    const {
        data,
        error
    } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        throw error;
    }

    return data;
}


async function signIn(email, password) {
    const {
        data,
        error
    } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        throw error;
    }

    return data;
}


async function signOut() {
    const {
        error
    } = await window.supabaseClient.auth.signOut();

    if (error) {
        console.error(
            "Erro ao sair:",
            error
        );
    }

    window.location.href = "index.html";
}