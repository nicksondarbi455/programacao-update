import { supabase } from './supabase';
import { mapService } from './mapService';

// Dados do projeto do tipo "mapa". Tudo fica nas tabelas project_map_* e no bucket projeto-mapa,
// separado do mapa oficial (map_datacenters, map_routes e mapa-rotas).
const BUCKET = 'projeto-mapa';

const check = (contexto, { error }) => {
    if (error) throw new Error(`${contexto}: ${error.message}`);
};

const novoId = (prefixo) => `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Nome de arquivo seguro para o Storage (sem acentos nem espaços)
const nomeSeguro = (nome) => nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_');

export const projectMapService = {
    async carregar(projectId) {
        const [objetos, anotacoes, rotas, eventos] = await Promise.all([
            supabase.from('project_map_objects').select('*').eq('project_id', projectId).order('nome'),
            supabase.from('project_map_notes').select('*').eq('project_id', projectId),
            supabase.from('project_map_routes').select('*').eq('project_id', projectId).order('nome'),
            supabase.from('project_map_events').select('*').eq('project_id', projectId).order('data')
        ]);
        check('Erro ao carregar objetos', objetos);
        check('Erro ao carregar anotações', anotacoes);
        check('Erro ao carregar rotas', rotas);
        check('Erro ao carregar eventos', eventos);
        return {
            objetos: objetos.data || [],
            anotacoes: anotacoes.data || [],
            rotas: rotas.data || [],
            eventos: eventos.data || []
        };
    },

    // --- Objetos ---
    async salvarObjeto(projectId, dados, userEmail) {
        const campos = {
            nome: dados.nome,
            tipo: dados.tipo,
            lat: dados.lat,
            lng: dados.lng,
            icone: dados.icone || null,
            descricao: dados.descricao || '',
            updated_at: new Date().toISOString()
        };
        if (dados.id) {
            check('Erro ao salvar objeto', await supabase.from('project_map_objects').update(campos).eq('id', dados.id));
            return dados.id;
        }
        const id = novoId('obj');
        check('Erro ao criar objeto', await supabase.from('project_map_objects').insert({
            id, project_id: projectId, ...campos, criado_por: userEmail.toLowerCase()
        }));
        return id;
    },

    async excluirObjeto(id) {
        check('Erro ao excluir objeto', await supabase.from('project_map_objects').delete().eq('id', id));
    },

    // --- Anotações ---
    async salvarAnotacao(projectId, dados, userEmail) {
        const campos = { texto: dados.texto, cor: dados.cor, lat: dados.lat, lng: dados.lng, updated_at: new Date().toISOString() };
        if (dados.id) {
            check('Erro ao salvar anotação', await supabase.from('project_map_notes').update(campos).eq('id', dados.id));
            return dados.id;
        }
        const id = novoId('nota');
        check('Erro ao criar anotação', await supabase.from('project_map_notes').insert({
            id, project_id: projectId, ...campos, criado_por: userEmail.toLowerCase()
        }));
        return id;
    },

    async excluirAnotacao(id) {
        check('Erro ao excluir anotação', await supabase.from('project_map_notes').delete().eq('id', id));
    },

    // --- Eventos (calendário) ---
    async salvarEvento(projectId, dados, userEmail) {
        const campos = { titulo: dados.titulo, descricao: dados.descricao || '', data: dados.data };
        if (dados.id) {
            check('Erro ao salvar evento', await supabase.from('project_map_events').update(campos).eq('id', dados.id));
            return dados.id;
        }
        const id = novoId('evt');
        check('Erro ao criar evento', await supabase.from('project_map_events').insert({
            id, project_id: projectId, ...campos, concluido: false, criado_por: userEmail.toLowerCase()
        }));
        return id;
    },

    async marcarEvento(id, concluido) {
        check('Erro ao atualizar evento', await supabase.from('project_map_events').update({ concluido }).eq('id', id));
    },

    async excluirEvento(id) {
        check('Erro ao excluir evento', await supabase.from('project_map_events').delete().eq('id', id));
    },

    // --- Rotas (KMZ/KML) ---
    async salvarRota(projectId, { nome, descricao, origemId, destinoId, file }, userEmail) {
        const id = novoId('rota');
        const path = `${projectId}/${id}-${nomeSeguro(file.name)}`;
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { contentType: file.type || undefined });
        if (uploadError) throw new Error(`Erro ao enviar arquivo: ${uploadError.message}`);

        const { error } = await supabase.from('project_map_routes').insert({
            id,
            project_id: projectId,
            nome,
            origem_id: origemId || null,
            destino_id: destinoId || null,
            descricao: descricao || '',
            cabos: [],
            arquivo_path: path,
            nome_arquivo: file.name,
            criado_por: userEmail.toLowerCase()
        });
        if (error) {
            await supabase.storage.from(BUCKET).remove([path]);
            throw new Error(`Erro ao salvar rota: ${error.message}`);
        }
    },

    async excluirRota(rota) {
        check('Erro ao excluir rota', await supabase.from('project_map_routes').delete().eq('id', rota.id));
        await supabase.storage.from(BUCKET).remove([rota.arquivo_path]);
    },

    async baixarArquivoRota(path) {
        const { data, error } = await supabase.storage.from(BUCKET).download(path);
        if (error) throw error;
        return data;
    },

    // Copia objetos, anotações, eventos e rotas (com os arquivos) para outro projeto do mesmo tipo
    async copiarProjeto(origemId, destinoId, userEmail) {
        const dados = await projectMapService.carregar(origemId);
        const email = userEmail.toLowerCase();

        const idObjetos = {};
        const objetos = dados.objetos.map((o) => {
            const id = novoId('obj');
            idObjetos[o.id] = id;
            return {
                id, project_id: destinoId, nome: o.nome, tipo: o.tipo, lat: o.lat, lng: o.lng,
                icone: o.icone, descricao: o.descricao, criado_por: email
            };
        });
        if (objetos.length) check('Erro ao copiar objetos', await supabase.from('project_map_objects').insert(objetos));

        const anotacoes = dados.anotacoes.map((n) => ({
            id: novoId('nota'), project_id: destinoId, lat: n.lat, lng: n.lng, texto: n.texto, cor: n.cor, criado_por: email
        }));
        if (anotacoes.length) check('Erro ao copiar anotações', await supabase.from('project_map_notes').insert(anotacoes));

        // Eventos voltam como pendentes na cópia
        const eventos = dados.eventos.map((e) => ({
            id: novoId('evt'), project_id: destinoId, titulo: e.titulo, descricao: e.descricao, data: e.data,
            concluido: false, criado_por: email
        }));
        if (eventos.length) check('Erro ao copiar eventos', await supabase.from('project_map_events').insert(eventos));

        for (const rota of dados.rotas) {
            const arquivo = await projectMapService.baixarArquivoRota(rota.arquivo_path);
            await projectMapService.salvarRota(destinoId, {
                nome: rota.nome,
                descricao: rota.descricao,
                origemId: idObjetos[rota.origem_id] || null,
                destinoId: idObjetos[rota.destino_id] || null,
                file: arquivo instanceof File ? arquivo : new File([arquivo], rota.nome_arquivo)
            }, userEmail);
        }
    },

    // Rota de carro entre dois pontos [lng, lat], pelo servidor (mesma função do mapa oficial)
    calcularViabilidade(de, para) {
        return mapService.calcularViabilidade(de, para);
    }
};
