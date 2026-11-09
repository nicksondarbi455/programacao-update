import { supabase } from './supabase';

const BUCKET = 'mapa-rotas';

// Identificador único da rota, independente da ordem origem/destino
export function routeId(a, b) {
    return [a, b].sort().join('|');
}

// Nome de pasta seguro para o Storage: o Supabase não aceita caracteres como "|" ou espaços nas chaves
function safeFolderName(id) {
    return id
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w-]+/g, '_');
}

// Nome de arquivo seguro para o Storage (sem acentos nem espaços)
function safeFileName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.-]+/g, '_');
}

export const mapService = {
    async listDatacenters() {
        const { data, error } = await supabase
            .from('map_datacenters')
            .select('nome, lat, lng, tipo')
            .order('nome', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async listRoutes() {
        const { data, error } = await supabase
            .from('map_routes')
            .select('id, origem, destino, descricao, cabos, arquivo_path, nome_arquivo')
            .order('origem', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async downloadRouteFile(path) {
        const { data, error } = await supabase.storage.from(BUCKET).download(path);
        if (error) throw error;
        return data;
    },

    // Cadastra (ou substitui) a rota entre dois datacenters
    async saveRoute({ origem, destino, descricao, cabos, file }, userEmail) {
        const id = routeId(origem, destino);

        const { data: existing, error: readError } = await supabase
            .from('map_routes')
            .select('arquivo_path')
            .eq('id', id)
            .maybeSingle();
        if (readError) throw readError;

        const path = `${safeFolderName(id)}/${Date.now()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { contentType: file.type || undefined });
        if (uploadError) throw uploadError;

        const { error: saveError } = await supabase.from('map_routes').upsert({
            id,
            origem,
            destino,
            descricao,
            cabos,
            arquivo_path: path,
            nome_arquivo: file.name,
            criado_por: userEmail.toLowerCase(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (saveError) {
            await supabase.storage.from(BUCKET).remove([path]);
            throw saveError;
        }

        // Remove o arquivo anterior da mesma rota
        if (existing?.arquivo_path) {
            await supabase.storage.from(BUCKET).remove([existing.arquivo_path]);
        }
    },

    async deleteRoute(route) {
        const { error } = await supabase.from('map_routes').delete().eq('id', route.id);
        if (error) throw error;
        await supabase.storage.from(BUCKET).remove([route.arquivo_path]);
    },

    // Rota de carro pelo servidor (o token do Mapbox não sai do servidor)
    async calcularViabilidade(from, to) {
        const { data, error } = await supabase.functions.invoke('mapbox-directions', {
            body: { from, to }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
    }
};
