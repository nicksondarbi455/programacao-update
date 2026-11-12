import { supabase } from './supabase';
import { logAction, LOG_ACTIONS } from './logService';

// Lança um erro legível quando o Supabase devolve { error }
const check = (context, { error }) => {
    if (error) {
        console.error(`${context}:`, error);
        throw new Error(`${context}: ${error.message}`);
    }
};

// Converte a lista de departamentos em linhas da tabela project_departments
const departmentRows = (projId, ids) =>
    ids.map((departmentId) => ({ project_id: projId, department_id: departmentId }));

const folderDepartmentRows = (folderId, ids) =>
    ids.map((departmentId) => ({ folder_id: folderId, department_id: departmentId }));

export const supabaseService = {
    // --- PROJETOS ---
    // O servidor (RLS) já devolve só os projetos que o utilizador pode ver.
    // Aqui calculamos o que ele pode fazer em cada um, para esconder os botões.
    async getProjects(userEmail) {
        const email = userEmail.trim().toLowerCase();

        const [profileRes, membersRes] = await Promise.all([
            supabase.from('profiles').select('is_admin, is_master').eq('email', email).maybeSingle(),
            supabase.from('department_members').select('department_id, access_level').eq('user_email', email)
        ]);
        check('Erro ao verificar permissões', { error: profileRes.error || membersRes.error });

        const isAdmin = Boolean(profileRes.data?.is_admin || profileRes.data?.is_master);
        const editableDeptIds = new Set(
            (membersRes.data || []).filter((m) => m.access_level === 'editar').map((m) => m.department_id)
        );

        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                project_departments (department_id),
                column_configs (*),
                equipments (*),
                schedules (*)
            `)
            .order('created_at', { ascending: false });

        check('Erro ao buscar projetos', { error });

        return data.map(p => {
            const cols = (p.column_configs || [])
                .sort((a, b) => a.position - b.position)
                .map(c => ({ ...c, targetScope: c.target_scope || 'all' }));

            // Ordem estável: o Supabase não garante ordem ao devolver linhas atualizadas
            const equips = (p.equipments || [])
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map(eq => ({
                    id: eq.id,
                    color: eq.color,
                    ...(eq.data || {}),
                    position: eq.position
                }));

            const schedsObj = {};
            (p.schedules || []).forEach(s => {
                schedsObj[s.date_str] = s.items;
            });

            const departmentIds = (p.project_departments || []).map(d => d.department_id);
            const isOwner = (p.user_email || '').toLowerCase() === email;
            const canManage = isAdmin || isOwner;
            const canEdit = canManage || (!p.is_private && departmentIds.some(id => editableDeptIds.has(id)));

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                hasCalendar: p.has_calendar,
                isPrivate: p.is_private,
                showProgress: p.show_progress,
                progress: p.progress ?? 0,
                projectType: p.project_type,
                icon: p.icon || null,
                ownerEmail: p.user_email,
                folderId: p.folder_id || null,
                departmentIds,
                canManage,
                canEdit,
                columnConfig: cols,
                equipments: equips,
                schedules: schedsObj
            };
        });
    },

    async updateProject(projId, fields) {
        const payload = {};
        if (fields.name !== undefined) payload.name = fields.name;
        if (fields.description !== undefined) payload.description = fields.description;
        if (fields.isPrivate !== undefined) payload.is_private = fields.isPrivate;
        if (fields.showProgress !== undefined) payload.show_progress = fields.showProgress;
        if (fields.hasCalendar !== undefined) payload.has_calendar = fields.hasCalendar;
        if (fields.progress !== undefined) payload.progress = fields.progress;
        if (fields.folderId !== undefined) payload.folder_id = fields.folderId || null;
        if (fields.icon !== undefined) payload.icon = fields.icon || null;

        // Atualiza o projeto primeiro: se ficar privado, o servidor já remove os departamentos
        if (Object.keys(payload).length > 0) {
            check('Erro ao atualizar projeto', await supabase.from('projects').update(payload).eq('id', projId));
        }

        if (fields.folderId !== undefined) {
            await logAction(LOG_ACTIONS.PROJECT_MOVE, {
                entityType: 'projeto',
                entityId: projId,
                projectId: projId,
                details: { destino: fields.folderName || 'Raiz' }
            });
        }

        if (fields.departmentIds !== undefined) {
            const ids = fields.isPrivate ? [] : fields.departmentIds;
            check('Erro ao atualizar departamentos', await supabase
                .from('project_departments')
                .delete()
                .eq('project_id', projId));
            if (ids.length > 0) {
                check('Erro ao atualizar departamentos', await supabase
                    .from('project_departments')
                    .insert(departmentRows(projId, ids)));
            }
        }
    },

    async createProject(projectData, userEmail) {
        const projId = 'proj_' + Date.now();

        // 1. Inserir o Projeto
        check('Erro ao criar projeto', await supabase.from('projects').insert([{
            id: projId,
            user_email: userEmail,
            name: projectData.name,
            description: projectData.description,
            has_calendar: projectData.hasCalendar,
            is_private: projectData.isPrivate,
            project_type: projectData.projectType,
            icon: projectData.icon || null,
            show_progress: projectData.showProgress ?? false,
            folder_id: projectData.folderId || null
        }]));

        try {
            // 2. Departamentos que podem ver o projeto (projeto privado não tem departamentos)
            const deptIds = projectData.isPrivate ? [] : (projectData.departmentIds || []);
            if (deptIds.length > 0) {
                check('Erro ao destinar departamentos', await supabase
                    .from('project_departments')
                    .insert(departmentRows(projId, deptIds)));
            }

            // 3. Inserir as Colunas
            if (projectData.columnConfig && projectData.columnConfig.length > 0) {
                const colsPayload = projectData.columnConfig.map((col, idx) => ({
                    id: col.id || `col_${idx}_${Date.now()}`,
                    project_id: projId,
                    name: col.name,
                    type: col.type || 'text',
                    position: idx,
                    width: col.width || 150,
                    target_scope: col.targetScope || 'all'
                }));
                check('Erro ao criar colunas', await supabase.from('column_configs').insert(colsPayload));
            }

            // 4. Inserir as Linhas/Dados
            if (projectData.equipments && projectData.equipments.length > 0) {
                const equipsPayload = projectData.equipments.map((eq, idx) => {
                    const { id, color, position, ...restData } = eq;
                    return {
                        id: id || `eq_${idx}_${Date.now()}`,
                        project_id: projId,
                        color: color || 'padrao',
                        data: restData,
                        position: position ?? idx + 1
                    };
                });
                check('Erro ao criar linhas', await supabase.from('equipments').insert(equipsPayload));
            }
        } catch (err) {
            // Evita deixar um projeto "meio criado" se algum passo falhar
            await supabase.from('projects').delete().eq('id', projId);
            throw err;
        }

        return projId;
    },

    // Duplica um projeto (colunas, linhas, departamentos e pasta; agenda opcional).
    // Os IDs das colunas mudam, então os valores das linhas são reapontados para os novos IDs.
    async duplicateProject(source, userEmail, { name, copySchedules = false } = {}) {
        const stamp = Date.now();
        const colMap = {};

        const columnConfig = (source.columnConfig || []).map((col, idx) => {
            const newId = `col_${stamp}_${idx}`;
            colMap[col.id] = newId;
            return {
                id: newId,
                name: col.name,
                type: col.type,
                width: col.width,
                targetScope: col.targetScope,
                position: idx
            };
        });

        const equipments = (source.equipments || []).map((eq, idx) => {
            const { id, color, position, ...data } = eq;
            const remapped = {};
            Object.entries(data).forEach(([key, value]) => {
                if (key === '_fmt' && value) {
                    // A formatação guarda os IDs das colunas dentro dela: também precisa ser remapeada
                    remapped._fmt = Object.fromEntries(Object.entries(value).map(([c, f]) => [colMap[c] || c, f]));
                } else {
                    remapped[colMap[key] || key] = value;
                }
            });
            return {
                id: `eq_${stamp}_${idx}`,
                color,
                position: idx + 1,
                ...remapped
            };
        });

        const newId = await supabaseService.createProject({
            name: (name || `Cópia de ${source.name}`).trim(),
            description: source.description,
            hasCalendar: source.hasCalendar,
            isPrivate: source.isPrivate,
            showProgress: source.showProgress,
            projectType: source.projectType,
            icon: source.icon || null,
            folderId: source.folderId || null,
            departmentIds: source.departmentIds || [],
            columnConfig,
            equipments
        }, userEmail);

        if (copySchedules) {
            for (const [dateStr, items] of Object.entries(source.schedules || {})) {
                // Na cópia, os eventos voltam como pendentes
                const fresh = (items || []).map((item) => ({ ...item, completed: false, statusText: 'Agendado' }));
                if (fresh.length > 0) {
                    await supabaseService.saveSchedule(newId, dateStr, fresh);
                }
            }
        }

        await logAction(LOG_ACTIONS.PROJECT_DUPLICATE, {
            entityType: 'projeto',
            entityId: newId,
            projectId: newId,
            details: { origem: source.name, agenda: copySchedules ? 'copiada' : 'não copiada' }
        });

        return newId;
    },

    // Excluir projeto: vai para a lixeira (fica 30 dias e pode ser restaurado)
    async deleteProject(projId, projectName) {
        check('Erro ao enviar projeto para a lixeira', await supabase.rpc('move_to_trash', { p_kind: 'project', p_id: projId }));
        await logAction(LOG_ACTIONS.PROJECT_DELETE, {
            entityType: 'projeto',
            entityId: projId,
            projectId: projId,
            details: { nome: projectName || null }
        });
    },

    // --- PASTAS ---
    // O servidor (RLS) já devolve só as pastas que o utilizador pode ver (fora da lixeira).
    async getFolders(userEmail) {
        const email = userEmail.trim().toLowerCase();

        const [profileRes, foldersRes] = await Promise.all([
            supabase.from('profiles').select('is_admin, is_master').eq('email', email).maybeSingle(),
            supabase
                .from('folders')
                .select('*, folder_departments (department_id), projects (id)')
                .order('created_at', { ascending: true })
        ]);
        check('Erro ao verificar permissões', { error: profileRes.error });
        check('Erro ao buscar pastas', { error: foldersRes.error });

        const isAdmin = Boolean(profileRes.data?.is_admin || profileRes.data?.is_master);

        return foldersRes.data.map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description || '',
            parentId: f.parent_id || null,
            ownerEmail: f.user_email,
            departmentIds: (f.folder_departments || []).map((d) => d.department_id),
            projectCount: (f.projects || []).length,
            canManage: isAdmin || (f.user_email || '').toLowerCase() === email
        }));
    },

    async createFolder(folderData, userEmail) {
        const folderId = 'folder_' + Date.now();

        check('Erro ao criar pasta', await supabase.from('folders').insert([{
            id: folderId,
            user_email: userEmail,
            name: folderData.name,
            description: folderData.description || '',
            parent_id: folderData.parentId || null
        }]));

        try {
            const deptIds = folderData.departmentIds || [];
            if (deptIds.length > 0) {
                check('Erro ao destinar departamentos da pasta', await supabase
                    .from('folder_departments')
                    .insert(folderDepartmentRows(folderId, deptIds)));
            }
        } catch (err) {
            await supabase.from('folders').delete().eq('id', folderId);
            throw err;
        }

        await logAction(LOG_ACTIONS.FOLDER_CREATE, {
            entityType: 'pasta',
            entityId: folderId,
            details: { nome: folderData.name, dentro_de: folderData.parentName || 'Raiz' }
        });

        return folderId;
    },

    async updateFolder(folderId, fields) {
        const payload = {};
        if (fields.name !== undefined) payload.name = fields.name;
        if (fields.description !== undefined) payload.description = fields.description;

        if (Object.keys(payload).length > 0) {
            check('Erro ao atualizar pasta', await supabase.from('folders').update(payload).eq('id', folderId));
        }

        if (fields.departmentIds !== undefined) {
            check('Erro ao atualizar departamentos da pasta', await supabase
                .from('folder_departments')
                .delete()
                .eq('folder_id', folderId));
            if (fields.departmentIds.length > 0) {
                check('Erro ao atualizar departamentos da pasta', await supabase
                    .from('folder_departments')
                    .insert(folderDepartmentRows(folderId, fields.departmentIds)));
            }
        }

        await logAction(LOG_ACTIONS.FOLDER_EDIT, {
            entityType: 'pasta',
            entityId: folderId,
            details: {
                nome: fields.name,
                departamentos: fields.departmentIds ? fields.departmentIds.length : undefined
            }
        });
    },

    // Mover pasta para outra pasta (targetParentId null = raiz). O servidor impede ciclos.
    async moveFolder(folderId, targetParentId, folderName, targetLabel) {
        check('Erro ao mover pasta', await supabase.rpc('move_folder', {
            p_id: folderId,
            p_parent: targetParentId || null
        }));
        await logAction(LOG_ACTIONS.FOLDER_MOVE, {
            entityType: 'pasta',
            entityId: folderId,
            details: { nome: folderName || null, destino: targetLabel || 'Raiz' }
        });
    },

    // Excluir pasta: vai para a lixeira junto com as subpastas e os projetos dentro dela
    async deleteFolder(folderId, folderName) {
        check('Erro ao enviar pasta para a lixeira', await supabase.rpc('move_to_trash', { p_kind: 'folder', p_id: folderId }));
        await logAction(LOG_ACTIONS.FOLDER_DELETE, {
            entityType: 'pasta',
            entityId: folderId,
            details: { nome: folderName || null }
        });
    },

    // --- LIXEIRA ---
    // Lista o que o utilizador pode restaurar (dono ou admin). Limpa itens com mais de 30 dias.
    async listTrash() {
        const { data, error } = await supabase.rpc('list_trash');
        check('Erro ao carregar a lixeira', { error });
        return (data || []).map((r) => ({
            kind: r.item_kind,
            id: r.item_id,
            name: r.item_name,
            ownerEmail: r.item_owner,
            deletedAt: r.item_deleted_at,
            projectCount: r.item_project_count || 0,
            folderName: r.item_folder_name || null
        }));
    },

    async restoreItem(kind, id, name) {
        check('Erro ao restaurar item', await supabase.rpc('restore_item', { p_kind: kind, p_id: id }));
        const isFolder = kind === 'folder';
        await logAction(isFolder ? LOG_ACTIONS.FOLDER_RESTORE : LOG_ACTIONS.PROJECT_RESTORE, {
            entityType: isFolder ? 'pasta' : 'projeto',
            entityId: id,
            projectId: isFolder ? null : id,
            details: { nome: name || null }
        });
    },

    // Esvaziar a lixeira: somente o master (o servidor também confere)
    async emptyTrash() {
        check('Erro ao esvaziar a lixeira', await supabase.rpc('empty_trash'));
        await logAction(LOG_ACTIONS.TRASH_EMPTY, { entityType: 'lixeira', details: {} });
    },

    // --- PREFERÊNCIAS DO USUÁRIO (fixar e ordem) ---
    async getLayout(userEmail) {
        const { data, error } = await supabase
            .from('user_item_prefs')
            .select('item_kind, item_id, pinned, position')
            .eq('user_email', userEmail.toLowerCase());
        check('Erro ao carregar preferências', { error });
        return (data || []).map((r) => ({ kind: r.item_kind, id: r.item_id, pinned: r.pinned, position: r.position }));
    },

    async saveLayout(userEmail, rows) {
        if (!rows || rows.length === 0) return;
        const now = new Date().toISOString();
        check('Erro ao salvar a ordem', await supabase
            .from('user_item_prefs')
            .upsert(rows.map((r) => ({
                user_email: userEmail.toLowerCase(),
                item_kind: r.kind,
                item_id: r.id,
                pinned: r.pinned,
                position: r.position,
                updated_at: now
            })), { onConflict: 'user_email,item_kind,item_id' }));
    },

    // --- COMENTÁRIOS E HISTÓRICO ---
    async listComments(projectId, targetType, targetId) {
        const { data, error } = await supabase
            .from('item_comments')
            .select('*')
            .eq('project_id', projectId)
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .order('created_at', { ascending: true });
        check('Erro ao carregar comentários', { error });
        return data || [];
    },

    async addComment({ projectId, targetType, targetId, targetDate, body, mentions }, authorEmail) {
        const id = 'cmt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        check('Erro ao enviar comentário', await supabase.from('item_comments').insert([{
            id,
            project_id: projectId,
            target_type: targetType,
            target_id: targetId,
            target_date: targetDate || null,
            author_email: authorEmail.toLowerCase(),
            body,
            mentions: mentions || []
        }]));
        return id;
    },

    async deleteComment(commentId) {
        check('Erro ao excluir comentário', await supabase.from('item_comments').delete().eq('id', commentId));
    },

    // Quantidade de comentários por alvo: { "linha|ID": 2, "evento|2026-11-18::Ronda": 1 }
    async getCommentCounts(projectId) {
        const { data, error } = await supabase
            .from('item_comments')
            .select('target_type, target_id')
            .eq('project_id', projectId);
        check('Erro ao contar comentários', { error });
        const counts = {};
        (data || []).forEach((row) => {
            const key = `${row.target_type}|${row.target_id}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    },

    async listHistory(projectId, targetType, targetId) {
        const { data, error } = await supabase
            .from('item_history')
            .select('*')
            .eq('project_id', projectId)
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .order('created_at', { ascending: false })
            .limit(200);
        check('Erro ao carregar histórico', { error });
        return data || [];
    },

    // Histórico completo do projeto (agendamentos, conclusões, cancelamentos, alterações), mais recente primeiro
    async listProjectHistory(projectId, limit = 1000) {
        const { data, error } = await supabase
            .from('item_history')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(limit);
        check('Erro ao carregar histórico', { error });
        return data || [];
    },

    // Observações (comentários) do projeto, mais recente primeiro
    async listProjectComments(projectId, limit = 500) {
        const { data, error } = await supabase
            .from('item_comments')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(limit);
        check('Erro ao carregar observações', { error });
        return data || [];
    },

    // Diagrama (draw.io) de cada CPD, usado na aba Hack do card no mapa
    async getCpdDiagram(cpdNome) {
        const { data, error } = await supabase
            .from('cpd_diagrams')
            .select('xml, updated_at, updated_by')
            .eq('cpd_nome', cpdNome)
            .maybeSingle();
        check('Erro ao abrir diagrama', { error });
        return data;
    },

    async saveCpdDiagram(cpdNome, xml) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('cpd_diagrams')
            .upsert(
                { cpd_nome: cpdNome, xml, updated_by: user?.email || null, updated_at: new Date().toISOString() },
                { onConflict: 'cpd_nome' }
            );
        check('Erro ao salvar diagrama', { error });
    },

    // Histórico não pode travar a edição: se falhar, só avisa no console
    async addHistory(entries) {
        if (!entries || entries.length === 0) return;
        const { error } = await supabase.from('item_history').insert(entries);
        if (error) console.warn('Falha ao registrar histórico:', error.message);
    },

    // Pessoas que podem ser mencionadas (perfis são visíveis a todos os usuários)
    async listPeople() {
        const { data, error } = await supabase
            .from('profiles')
            .select('email, full_name')
            .order('email', { ascending: true });
        check('Erro ao listar pessoas', { error });
        return data || [];
    },

    // Últimas menções ao usuário, com o nome do projeto
    async listMyMentions(email) {
        const { data, error } = await supabase
            .from('item_comments')
            .select('id, project_id, target_type, target_id, target_date, body, author_email, created_at, projects (name)')
            .contains('mentions', [email.toLowerCase()])
            .order('created_at', { ascending: false })
            .limit(10);
        check('Erro ao buscar menções', { error });
        return data || [];
    },

    // --- MANIPULAÇÃO DE LINHAS ---
    // Atualização atómica no servidor (função SQL), sem ler-e-reescrever o JSON no cliente.
    async updateEquipmentField(eqId, projId, field, value) {
        if (field === 'color') {
            check('Erro ao atualizar cor', await supabase.from('equipments').update({ color: value }).eq('id', eqId));
            return;
        }
        check('Erro ao atualizar campo', await supabase.rpc('update_equipment_field', {
            p_eq_id: eqId,
            p_field: field,
            p_value: value
        }));
    },

    async updateEquipmentPosition(eqId, position) {
        check('Erro ao mover linha', await supabase.from('equipments').update({ position }).eq('id', eqId));
    },

    async addEquipment(projId, newEq) {
        const { id, color, position, ...restData } = newEq;
        check('Erro ao adicionar linha', await supabase.from('equipments').insert([{
            id,
            project_id: projId,
            color: color || 'padrao',
            data: restData,
            position: position ?? Date.now()
        }]));
    },

    async deleteEquipment(eqId) {
        check('Erro ao excluir linha', await supabase.from('equipments').delete().eq('id', eqId));
    },

    // --- MANIPULAÇÃO DE COLUNAS ---
    // Substituição transacional no servidor: ou tudo é aplicado, ou nada muda.
    async updateColumnConfig(projId, newColumns) {
        const colsPayload = newColumns.map((col, idx) => ({
            id: col.id,
            name: col.name,
            type: col.type || 'text',
            position: idx,
            width: parseInt(col.width) || 150,
            target_scope: col.targetScope || 'all'
        }));
        check('Erro ao atualizar colunas', await supabase.rpc('replace_column_configs', {
            p_project_id: projId,
            p_columns: colsPayload
        }));
    },

    // --- AGENDAMENTOS (CALENDÁRIO) ---
    async saveSchedule(projId, dateStr, items) {
        const schedId = `sched_${projId}_${dateStr}`;
        if (!items || items.length === 0) {
            check('Erro ao remover agendamento', await supabase.from('schedules').delete().eq('id', schedId));
        } else {
            check('Erro ao guardar agendamento', await supabase.from('schedules').upsert({
                id: schedId,
                project_id: projId,
                date_str: dateStr,
                items: items
            }));
        }
    }
};
