import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em falta. ' +
        'Copie o ficheiro .env.example para .env.local e preencha os valores.'
    );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cliente sem persistência de sessão. Usado para criar contas de outros
// utilizadores sem substituir a sessão do administrador que está logado.
export const createIsolatedClient = () =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'sb-isolated-signup'
        }
    });
