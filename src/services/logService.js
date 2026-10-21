import { supabase } from './supabase';

// Nomes padronizados das ações. Use sempre estes valores para facilitar os filtros do futuro menu de logs.
export const LOG_ACTIONS = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    SCHEDULE_ADD: 'agendar',
    SCHEDULE_REMOVE: 'desagendar',
    SCHEDULE_COMPLETE: 'marcar_feito',
    SCHEDULE_UNCOMPLETE: 'desmarcar_feito',
    // Preparados para as próximas integrações
    ROW_CREATE: 'linha_criada',
    ROW_DELETE: 'linha_excluida',
    COLUMN_CREATE: 'coluna_criada',
    COLUMN_DELETE: 'coluna_excluida',
    DATA_CREATE: 'dados_criados',
    DATA_EDIT: 'dados_editados',
    DATA_DELETE: 'dados_removidos'
};

/**
 * Registra uma ação no histórico. Nunca lança erro: uma falha de log não pode travar o sistema.
 * O usuário (id e e-mail) é obtido da sessão atual.
 */
export async function logAction(action, { entityType = null, entityId = null, projectId = null, details = {} } = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('activity_logs').insert({
            user_email: user?.email ?? null,
            action,
            entity_type: entityType,
            entity_id: entityId != null ? String(entityId) : null,
            project_id: projectId != null ? String(projectId) : null,
            details
        });
        if (error) console.warn('Falha ao gravar log:', error.message);
    } catch (err) {
        console.warn('Falha ao gravar log:', err);
    }
}
