console.log("CONFIG.JS FOI CARREGADO");

const SUPABASE_URL = "https://nagmcqmqpnyosarpvfkk.supabase.co";
const SUPABASE_KEY = "sb_publishable_GusqjAjTFR8oMkyXT-nzYw_8jVQ5lZH";

console.log("URL:", SUPABASE_URL);
console.log("SUPABASE:", window.supabase);

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("CLIENTE CRIADO:", window.supabaseClient);