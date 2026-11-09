import { supabase, createIsolatedClient } from './supabase';
import { logAction, LOG_ACTIONS } from './logService';

// Lança um erro legível quando o Supabase devolve { error }
const check = (context, { error }) => {
    if (error) {
        console.error(`${context}:`, error);
        const message = error.code === '23505' ? 'Já existe um registro com este nome.' : error.message;
        throw new Error(`${context}: ${message}`);
    }
};

const normalizeEmail = (email) => email.trim().toLowerCase();

export const ACCESS_LEVELS = [
    { value: 'visualizar', label: 'Somente visualizar' },
    { value: 'editar', label: 'Visualizar e editar' },
];

export const accessLabel = (value) =>
    ACCESS_LEVELS.find((level) => level.value === value)?.label || value;

export const usersService = {
    // --- PERFIS E PAPÉIS ---
    // isMaster: pode gerir usuários e departamentos | isAdmin: vê e edita todos os projetos
    async getRole(email) {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_admin, is_master, tem_acesso_mapa')
            .eq('email', normalizeEmail(email))
            .maybeSingle();
        check('Erro ao verificar permissões', { error });
        return {
            isMaster: Boolean(data?.is_master),
            isAdmin: Boolean(data?.is_admin || data?.is_master),
            hasMapAccess: Boolean(data?.is_master || data?.tem_acesso_mapa)
        };
    },

    // Lista todos os usuários cadastrados (mais recentes primeiro)
    async listUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, is_admin, is_master, tem_acesso_mapa, created_at')
            .order('created_at', { ascending: false });
        check('Erro ao listar usuários', { error });
        return data || [];
    },

    // Devolve o perfil com este e-mail, ou null se não houver conta
    async findUser(email) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, is_admin, is_master, tem_acesso_mapa, created_at')
            .eq('email', normalizeEmail(email))
            .maybeSingle();
        check('Erro ao verificar usuário', { error });
        return data;
    },

    async createUser({ name, email, password }) {
        const client = createIsolatedClient();
        const { data, error } = await client.auth.signUp({
            email: normalizeEmail(email),
            password,
            options: { data: { full_name: name.trim() } }
        });

        if (error) {
            const isPassword = error.message.includes('Password');
            const text = error.message.includes('already registered')
                ? 'Este e-mail já está cadastrado.'
                : isPassword
                    ? 'A senha deve ter pelo menos 6 caracteres.'
                    : error.message;
            const friendly = new Error(text);
            friendly.isPasswordError = isPassword;
            throw friendly;
        }

        await logAction(LOG_ACTIONS.USER_CREATE, {
            entityType: 'usuario',
            entityId: normalizeEmail(email),
            details: { nome: name.trim() }
        });
        return data.user;
    },

    async deleteUser(email) {
        check('Erro ao excluir usuário', await supabase.rpc('admin_delete_user', { p_email: normalizeEmail(email) }));
    },

    async setAppAdmin(email, isAdmin) {
        check('Erro ao alterar administrador', await supabase.rpc('admin_set_app_admin', {
            p_email: normalizeEmail(email),
            p_is_admin: isAdmin
        }));
    },

    async setMapAccess(email, value) {
        check('Erro ao alterar acesso ao mapa', await supabase.rpc('admin_set_map_access', {
            p_email: normalizeEmail(email),
            p_value: value
        }));
    },

    async resetPassword(email, password) {
        check('Erro ao redefinir senha', await supabase.rpc('admin_reset_password', {
            p_email: normalizeEmail(email),
            p_password: password
        }));
    },

    // --- DEPARTAMENTOS ---
    async listDepartments() {
        const { data, error } = await supabase
            .from('departments')
            .select('id, name, department_members (user_email, access_level)')
            .order('name');
        check('Erro ao buscar departamentos', { error });
        return data.map((dep) => ({
            id: dep.id,
            name: dep.name,
            members: dep.department_members || []
        }));
    },

    async createDepartment(name) {
        const id = 'dep_' + Date.now();
        check('Erro ao criar departamento', await supabase
            .from('departments')
            .insert({ id, name: name.trim() }));
        await logAction(LOG_ACTIONS.DEPARTMENT_CREATE, {
            entityType: 'departamento',
            entityId: id,
            details: { nome: name.trim() }
        });
    },

    async renameDepartment(id, name) {
        check('Erro ao renomear departamento', await supabase
            .from('departments')
            .update({ name: name.trim() })
            .eq('id', id));
        await logAction(LOG_ACTIONS.DEPARTMENT_RENAME, {
            entityType: 'departamento',
            entityId: id,
            details: { nome: name.trim() }
        });
    },

    async deleteDepartment(id) {
        check('Erro ao excluir departamento', await supabase.from('departments').delete().eq('id', id));
        await logAction(LOG_ACTIONS.DEPARTMENT_DELETE, { entityType: 'departamento', entityId: id });
    },

    // Adiciona o utilizador ao departamento, ou atualiza o nível de acesso dele
    async setMember(departmentId, email, accessLevel) {
        check('Erro ao destinar departamento', await supabase.from('department_members').upsert({
            department_id: departmentId,
            user_email: normalizeEmail(email),
            access_level: accessLevel
        }));
        await logAction(LOG_ACTIONS.MEMBER_SET, {
            entityType: 'departamento',
            entityId: departmentId,
            details: { email: normalizeEmail(email), nivel: accessLevel }
        });
    },

    async removeMember(departmentId, email) {
        check('Erro ao remover do departamento', await supabase
            .from('department_members')
            .delete()
            .eq('department_id', departmentId)
            .eq('user_email', normalizeEmail(email)));
        await logAction(LOG_ACTIONS.MEMBER_REMOVE, {
            entityType: 'departamento',
            entityId: departmentId,
            details: { email: normalizeEmail(email) }
        });
    }
};
