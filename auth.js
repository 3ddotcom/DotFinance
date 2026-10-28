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

// Cria ou atualiza o perfil associado ao usuário autenticado.
// A falha no perfil não deve impedir o acesso à conta; as permissões
// da tabela `profiles` continuam sendo controladas pelo Supabase/RLS.
async function createProfile(user) {
    if (!user || !user.id || !window.supabaseClient) {
        return false;
    }

    const email = user.email || "";
    const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        email.split("@")[0] ||
        "Usuário";

    const { error } = await window.supabaseClient
        .from("profiles")
        .upsert(
            {
                id: user.id,
                name,
                email,
                updated_at: new Date().toISOString()
            },
            { onConflict: "id" }
        );

    if (error) {
        console.warn(
            "Não foi possível criar/atualizar o perfil. Verifique a tabela profiles e suas políticas RLS:",
            error.message
        );
        return false;
    }

    return true;
}
