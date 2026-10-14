import { supabase, createIsolatedClient } from './supabase';

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
    // --- PERFIS ---
    async getAdminStatus(email) {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('email', normalizeEmail(email))
            .maybeSingle();
        check('Erro ao verificar permissões', { error });
        return Boolean(data?.is_admin);
    },

    // Devolve o perfil com este e-mail, ou null se não houver conta
    async findUser(email) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, is_admin, created_at')
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
        return data.user;
    },

    async deleteUser(email) {
        check('Erro ao excluir usuário', await supabase.rpc('admin_delete_user', { p_email: normalizeEmail(email) }));
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
        check('Erro ao criar departamento', await supabase
            .from('departments')
            .insert({ id: 'dep_' + Date.now(), name: name.trim() }));
    },

    async renameDepartment(id, name) {
        check('Erro ao renomear departamento', await supabase
            .from('departments')
            .update({ name: name.trim() })
            .eq('id', id));
    },

    async deleteDepartment(id) {
        check('Erro ao excluir departamento', await supabase.from('departments').delete().eq('id', id));
    },

    // Adiciona o utilizador ao departamento, ou atualiza o nível de acesso dele
    async setMember(departmentId, email, accessLevel) {
        check('Erro ao destinar departamento', await supabase.from('department_members').upsert({
            department_id: departmentId,
            user_email: normalizeEmail(email),
            access_level: accessLevel
        }));
    },

    async removeMember(departmentId, email) {
        check('Erro ao remover do departamento', await supabase
            .from('department_members')
            .delete()
            .eq('department_id', departmentId)
            .eq('user_email', normalizeEmail(email)));
    }
};
