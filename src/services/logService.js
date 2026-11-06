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
    DATA_DELETE: 'dados_removidos',
    // Projetos, pastas e lixeira
    PROJECT_MOVE: 'projeto_movido',
    PROJECT_DELETE: 'projeto_excluido',
    PROJECT_RESTORE: 'projeto_restaurado',
    FOLDER_CREATE: 'pasta_criada',
    FOLDER_EDIT: 'pasta_editada',
    FOLDER_DELETE: 'pasta_excluida',
    FOLDER_RESTORE: 'pasta_restaurada',
    TRASH_EMPTY: 'lixeira_esvaziada',
    // Usuários e departamentos (exclusão, admin e senha são gravados pelo próprio banco)
    USER_CREATE: 'usuario_criado',
    DEPARTMENT_CREATE: 'departamento_criado',
    DEPARTMENT_RENAME: 'departamento_renomeado',
    DEPARTMENT_DELETE: 'departamento_excluido',
    MEMBER_SET: 'acesso_departamento_definido',
    MEMBER_REMOVE: 'acesso_departamento_removido',
    PROJECT_DUPLICATE: 'projeto_duplicado'
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

// Identifica o navegador a partir do user agent (ex.: "Chrome 130")
function parseBrowser(ua) {
    const rules = [
        [/Edg\/([\d.]+)/, 'Edge'],
        [/OPR\/([\d.]+)/, 'Opera'],
        [/Firefox\/([\d.]+)/, 'Firefox'],
        [/Chrome\/([\d.]+)/, 'Chrome'],
        [/Version\/([\d.]+).*Safari/, 'Safari'],
    ];
    for (const [regex, name] of rules) {
        const match = ua.match(regex);
        if (match) return `${name} ${match[1].split('.')[0]}`;
    }
    return 'Desconhecido';
}

// Identifica o sistema operacional a partir do user agent
function parseOS(ua) {
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad/.test(ua)) return 'iOS';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Desconhecido';
}

/**
 * Dados do dispositivo de quem está acessando, gravados junto com o login.
 * O IP não é obtido aqui: ele é preenchido pelo banco (ver logs.sql).
 */
export function getClientInfo() {
    if (typeof navigator === 'undefined') return {};
    const ua = navigator.userAgent || '';
    return {
        navegador: parseBrowser(ua),
        sistema: parseOS(ua),
        dispositivo: /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Celular/Tablet' : 'Computador',
        idioma: navigator.language || null,
        fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        tela: window.screen ? `${window.screen.width}x${window.screen.height}` : null
    };
}
