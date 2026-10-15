import { supabase } from './supabase';

// Lança um erro legível quando o Supabase devolve { error }
const check = (context, { error }) => {
    if (error) {
        console.error(`${context}:`, error);
        throw new Error(`${context}: ${error.message}`);
    }
};

export const supabaseService = {
    // --- PROJETOS ---
    async getProjects(userEmail) {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                column_configs (*),
                equipments (*),
                schedules (*)
            `)
            .eq('user_email', userEmail)
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

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                hasCalendar: p.has_calendar,
                isPrivate: p.is_private,
                projectType: p.project_type,
                columnConfig: cols,
                equipments: equips,
                schedules: schedsObj
            };
        });
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
            project_type: projectData.projectType
        }]));

        try {
            // 2. Inserir as Colunas
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

            // 3. Inserir as Linhas/Dados
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

    async deleteProject(projId) {
        check('Erro ao excluir projeto', await supabase.from('projects').delete().eq('id', projId));
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
