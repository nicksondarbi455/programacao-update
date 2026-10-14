import { supabase } from './supabase';

export const supabaseService = {
    // --- DEPARTAMENTOS ---
    async getDepartments() {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Erro ao buscar departamentos:', error);
            return [
                { id: 'dep_noc', name: 'NOC / Redes' },
                { id: 'dep_ti', name: 'Tecnologia da Informação' },
                { id: 'dep_infra', name: 'Infraestrutura' }
            ];
        }
        return data;
    },

    // --- PROJETOS POR DEPARTAMENTO / USUÁRIO ---
    async getProjects(userEmail, userDeptId) {
        let query = supabase
            .from('projects')
            .select(`
                *,
                column_configs (*),
                equipments (*),
                schedules (*)
            `)
            .order('created_at', { ascending: false });

        if (userDeptId) {
            query = query.or(`user_email.eq.${userEmail},department_id.eq.${userDeptId},department_id.is.null`);
        } else {
            query = query.eq('user_email', userEmail);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar projetos:', error);
            return [];
        }

        return data.map(p => {
            const cols = (p.column_configs || []).sort((a, b) => a.position - b.position);
            
            const equips = (p.equipments || []).map(eq => ({
                id: eq.id,
                color: eq.color,
                isGroupHeader: eq.data?.isGroupHeader || false,
                groupName: eq.data?.groupName || '',
                groupId: eq.data?.groupId || null,
                ...(eq.data || {})
            }));

            const schedsObj = {};
            (p.schedules || []).forEach(s => {
                schedsObj[s.date_str] = s.items;
            });

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                departmentId: p.department_id,
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

        // 1. Inserir o Projeto com Departamento
        const { error: projErr } = await supabase.from('projects').insert([{
            id: projId,
            user_email: userEmail,
            name: projectData.name,
            description: projectData.description,
            department_id: projectData.departmentId || null,
            has_calendar: projectData.hasCalendar,
            is_private: projectData.isPrivate,
            project_type: projectData.projectType
        }]);

        if (projErr) throw projErr;

        // 2. Inserir as Colunas
        if (projectData.columnConfig && projectData.columnConfig.length > 0) {
            const colsPayload = projectData.columnConfig.map((col, idx) => ({
                id: col.id || `col_${idx}_${Date.now()}`,
                project_id: projId,
                name: col.name,
                type: col.type || 'text',
                position: idx,
                width: col.width || 150
            }));
            const { error: colErr } = await supabase.from('column_configs').insert(colsPayload);
            if (colErr) throw colErr;
        }

        // 3. Inserir as Linhas/Equipamentos
        if (projectData.equipments && projectData.equipments.length > 0) {
            const equipsPayload = projectData.equipments.map((eq, idx) => {
                const { id, color, ...restData } = eq;
                return {
                    id: id || `eq_${idx}_${Date.now()}`,
                    project_id: projId,
                    color: color || 'padrao',
                    data: restData
                };
            });
            const { error: eqErr } = await supabase.from('equipments').insert(equipsPayload);
            if (eqErr) throw eqErr;
        }

        return projId;
    },

    async deleteProject(projId) {
        const { error } = await supabase.from('projects').delete().eq('id', projId);
        if (error) console.error('Erro ao excluir projeto:', error);
    },

    // --- MANIPULAÇÃO DE LINHAS ---
    async updateEquipmentField(eqId, projId, field, value) {
        const { data: current } = await supabase.from('equipments').select('*').eq('id', eqId).single();
        if (!current) return;

        let updatePayload = {};
        if (field === 'color') {
            updatePayload = { color: value };
        } else {
            const currentData = current.data || {};
            updatePayload = { data: { ...currentData, [field]: value } };
        }

        await supabase.from('equipments').update(updatePayload).eq('id', eqId);
    },

    async addEquipment(projId, newEq) {
        const { id, color, ...restData } = newEq;
        await supabase.from('equipments').insert([{
            id,
            project_id: projId,
            color: color || 'padrao',
            data: restData
        }]);
    },

    async deleteEquipment(eqId) {
        await supabase.from('equipments').delete().eq('id', eqId);
    },

    // --- MANIPULAÇÃO DE COLUNAS ---
    async updateColumnConfig(projId, newColumns) {
        await supabase.from('column_configs').delete().eq('project_id', projId);
        const colsPayload = newColumns.map((col, idx) => ({
            id: col.id,
            project_id: projId,
            name: col.name,
            type: col.type || 'text',
            position: idx,
            width: col.width || 150
        }));
        await supabase.from('column_configs').insert(colsPayload);
    },

    // --- AGENDAMENTOS ---
    async saveSchedule(projId, dateStr, items) {
        const schedId = `sched_${projId}_${dateStr}`;
        if (!items || items.length === 0) {
            await supabase.from('schedules').delete().eq('id', schedId);
        } else {
            await supabase.from('schedules').upsert({
                id: schedId,
                project_id: projId,
                date_str: dateStr,
                items: items
            });
        }
    }
};