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

async function createProfile(user) {
    if (!user || !user.id) {
        console.error("Usuário inválido para criar perfil.");
        return false;
    }

    const profile = {
        id: user.id,
        email: user.email,
        name:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
        updated_at: new Date().toISOString()
    };

    const { error } = await window.supabaseClient
        .from("profiles")
        .upsert(profile, {
            onConflict: "id"
        });

    if (error) {
        console.error("Erro ao criar perfil:", error);
        return false;
    }

    return true;
}