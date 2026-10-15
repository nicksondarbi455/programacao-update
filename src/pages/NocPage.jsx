import { useState, useEffect, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabase';
import { NocTemplate } from '../components/templates/NocTemplate';
import { Button } from '../components/atoms/Button';

export function NocPage({ project, userEmail, onBackToDashboard }) {
    const [equipments, setEquipments] = useState(project.equipments || []);
    const [columnConfig, setColumnConfig] = useState(project.columnConfig || []);
    const [schedules, setSchedules] = useState(project.schedules || {});
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [colModalOpen, setColModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ isOpen: false, dateStr: '', friendlyDate: '', items: [], equipments: [] });
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [errorMsg, setErrorMsg] = useState('');

    // Estado para guardar os IDs das linhas selecionadas para unificação
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    // Modal com nome e cor ao unir linhas em 1 evento
    const [groupModalOpen, setGroupModalOpen] = useState(false);

    // Nº de gravações em curso; enquanto > 0 o realtime não substitui o estado local
    const pendingWritesRef = useRef(0);

    const columnConfigRef = useRef(columnConfig);
    useEffect(() => {
        columnConfigRef.current = columnConfig;
    }, [columnConfig]);

    const refreshData = async () => {
        try {
            const allProjs = await supabaseService.getProjects(userEmail);
            const current = allProjs.find(p => p.id === project.id);
            if (current) {
                setEquipments(current.equipments);
                setColumnConfig(current.columnConfig);
                setSchedules(current.schedules);
            }
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    // Executa uma gravação; se falhar, avisa o utilizador e recarrega o estado real do servidor
    const persist = async (action) => {
        pendingWritesRef.current += 1;
        try {
            await action();
            setErrorMsg('');
            return true;
        } catch (err) {
            setErrorMsg(err.message || 'Não foi possível guardar as alterações.');
            await refreshData();
            return false;
        } finally {
            pendingWritesRef.current -= 1;
        }
    };

    // Atualização vinda do servidor; ignorada enquanto existe gravação local pendente
    const refreshIfIdle = () => {
        if (pendingWritesRef.current === 0) refreshData();
    };

    useEffect(() => {
        const channel = supabase
            .channel(`realtime-project-${project.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'equipments', filter: `project_id=eq.${project.id}` }, refreshIfIdle)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'column_configs', filter: `project_id=eq.${project.id}` }, refreshIfIdle)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `project_id=eq.${project.id}` }, refreshIfIdle)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [project.id]);

    const handleToggleSelectRow = (rowId) => {
        setSelectedRowIds(prev => 
            prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
        );
    };

    // UNIFICA AS LINHAS SELECIONADAS EM 1 EVENTO ÚNICO
    const handleOpenGroupModal = () => {
        if (selectedRowIds.length === 0) return;
        setGroupModalOpen(true);
    };

    // Recebe o nome e a cor escolhidos no modal
    const handleConfirmGroup = async (eventTitle, eventColor) => {
        if (selectedRowIds.length === 0) return;
        setGroupModalOpen(false);

        const groupId = 'grp_' + Date.now();
        const headerId = 'eq_grp_' + Date.now();

        // 1. Cria a linha de Evento Pai
        const groupHeaderRow = {
            id: headerId,
            isGroupHeader: true,
            groupName: eventTitle.toUpperCase(),
            color: eventColor
        };

        // 2. Associa o groupId às linhas selecionadas
        const updatedEquipments = equipments.map(eq => {
            if (selectedRowIds.includes(eq.id)) {
                return { ...eq, groupId: groupId };
            }
            return eq;
        });

        // Insere o cabeçalho do evento acima das linhas
        const newEquipmentsList = [groupHeaderRow, ...updatedEquipments];
        setEquipments(newEquipmentsList);
        setSelectedRowIds([]);

        // Salva no Supabase
        await persist(async () => {
            await supabaseService.addEquipment(project.id, groupHeaderRow);
            for (const rowId of selectedRowIds) {
                await supabaseService.updateEquipmentField(rowId, project.id, 'groupId', groupId);
            }
        });
    };

    const handleDeleteProject = async () => {
        if (confirm('Tem certeza de que deseja apagar este projeto? Esta ação não pode ser desfeita.')) {
            const ok = await persist(() => supabaseService.deleteProject(project.id));
            if (ok) onBackToDashboard();
        }
    };

    const calculateProgress = () => {
        let total = 0, done = 0;
        equipments.forEach(eq => {
            if (eq.isGroupHeader) return;
            total++;
            if (eq.status) done++;
            columnConfig.forEach(col => {
                if (col.type === 'checkbox' && col.id !== 'status') {
                    total++;
                    let val = eq[col.id] !== undefined ? eq[col.id] : false;
                    if (val) done++;
                }
            });
        });
        return total > 0 ? Math.round((done / total) * 100) : 0;
    };

    const getTodayAlert = () => {
        if (!project.hasCalendar) return `Projeto Ativo: ${project.name}`;
        let todayStr = new Date().toISOString().split('T')[0];
        let todaySched = schedules[todayStr] || [];
        return todaySched.length > 0 ? `Hoje (${todaySched.length} agendamentos)` : `Nenhum agendamento hoje.`;
    };

    const getBadgeCounts = () => {
        if (!project.hasCalendar) return { weekCount: 0, tomorrowCount: 0 };
        let today = new Date();
        let tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        let tomorrowStr = tomorrow.toISOString().split('T')[0];

        let currOfWeek = new Date(today);
        let dayOfWeek = currOfWeek.getDay();
        let startOfWeek = new Date(currOfWeek);
        startOfWeek.setDate(currOfWeek.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        let endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        let weekCount = 0, tomorrowCount = 0;
        for (let dateStr in schedules) {
            let parts = dateStr.split('-');
            let dDate = new Date(parts[0], parts[1] - 1, parts[2]);
            if (dDate >= startOfWeek && dDate <= endOfWeek) {
                weekCount += (schedules[dateStr] || []).filter(i => !i.completed).length;
            }
            if (dateStr === tomorrowStr) {
                tomorrowCount += (schedules[dateStr] || []).filter(i => !i.completed).length;
            }
        }
        return { weekCount, tomorrowCount };
    };

    const handleUpdateField = async (id, field, value) => {
        let updated = equipments.map(eq => eq.id === id ? { ...eq, [field]: value } : eq);
        setEquipments(updated);
        await persist(() => supabaseService.updateEquipmentField(id, project.id, field, value));
    };

    const handleUpdateColName = async (colId, newName) => {
        if (!newName.trim()) return;
        let updated = columnConfig.map(col => col.id === colId ? { ...col, name: newName.trim() } : col);
        setColumnConfig(updated);
        await persist(() => supabaseService.updateColumnConfig(project.id, updated));
    };

    const handleAddNewRow = async () => {
        let newId = 'eq_' + Date.now();
        let newEq = { id: newId, color: 'padrao' };
        columnConfig.forEach(col => {
            newEq[col.id] = col.type === 'checkbox' ? false : '';
        });
        setEquipments(prev => [...prev, newEq]);
        await persist(() => supabaseService.addEquipment(project.id, newEq));
    };

    const handleDeleteRow = async (id) => {
        setEquipments(prev => prev.filter(e => e.id !== id));
        await persist(() => supabaseService.deleteEquipment(id));
    };

    const handleSaveNewCol = async (name, type, targetScope = 'all') => {
        if (!name) return alert('Digite o nome da coluna!');
        let colId = 'col_' + Date.now();
        let newCol = { 
            id: colId, 
            name, 
            type, 
            targetScope, // 'all' ou 'events'
            position: columnConfig.length, 
            width: 150 
        };
        let updated = [...columnConfig, newCol];
        setColumnConfig(updated);
        setColModalOpen(false);
        await persist(() => supabaseService.updateColumnConfig(project.id, updated));
    };

    const handleDeleteCol = async (colId) => {
        let updated = columnConfig.filter(c => c.id !== colId).map((col, idx) => ({ ...col, position: idx }));
        setColumnConfig(updated);
        await persist(() => supabaseService.updateColumnConfig(project.id, updated));
    };

    const handleInitResize = (e, index) => {
        e.stopPropagation();
        e.preventDefault();
        let startX = e.clientX;
        let currentWidth = parseInt(columnConfig[index].width) || 150;

        const onMouseMove = (moveEvent) => {
            let delta = moveEvent.clientX - startX;
            let newWidth = Math.max(60, currentWidth + delta);
            setColumnConfig(prev => prev.map((col, idx) => idx === index ? { ...col, width: newWidth } : col));
        };

        const onMouseUp = async () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            await persist(() => supabaseService.updateColumnConfig(project.id, columnConfigRef.current));
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleDragStart = (e, index) => {
        if (e.target.tagName === 'BUTTON' || e.target.classList.contains('resizer')) {
            e.preventDefault();
            return;
        }
        setDraggedIndex(index);
    };

    const handleDrop = async (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        let updated = [...columnConfig];
        let [movedCol] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, movedCol);
        updated.forEach((col, idx) => col.position = idx);
        setColumnConfig(updated);
        setDraggedIndex(null);
        await persist(() => supabaseService.updateColumnConfig(project.id, updated));
    };

    const handleOpenModal = (dateStr, friendlyDate) => {
        if (!project.hasCalendar) return;
        setModalData({
            isOpen: true,
            dateStr,
            friendlyDate,
            items: schedules[dateStr] || [],
            equipments
        });
    };

    const handleSaveEvent = async (title) => {
        if (!title) return alert('Digite ou selecione um evento!');

        let dateStr = modalData.dateStr;
        let daySched = schedules[dateStr] || [];
        if (daySched.some(i => i.text === title)) return alert('Este item já está agendado para este dia!');

        let newSchedItems = [...daySched, { text: title, completed: false, statusText: 'Agendado' }];
        let newSchedules = { ...schedules, [dateStr]: newSchedItems };
        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: newSchedItems }));
        await persist(() => supabaseService.saveSchedule(project.id, dateStr, newSchedItems));
    };

    const handleToggleCompleteSchedule = async (dateStr, itemIdx) => {
        let daySched = (schedules[dateStr] || []).map((item, idx) => {
            if (idx === itemIdx) {
                const nextCompleted = !item.completed;
                return { 
                    ...item, 
                    completed: nextCompleted, 
                    statusText: nextCompleted ? '✔ Realizado com Sucesso' : '⏳ Pendente / Agendado' 
                };
            }
            return { ...item };
        });

        let newSchedules = { ...schedules, [dateStr]: daySched };
        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: daySched }));
        await persist(() => supabaseService.saveSchedule(project.id, dateStr, daySched));
    };

    const handleDeleteSchedule = async (dateStr, idx) => {
        let daySched = [...(schedules[dateStr] || [])];
        daySched.splice(idx, 1);
        let newSchedules = { ...schedules };
        if (daySched.length === 0) delete newSchedules[dateStr];
        else newSchedules[dateStr] = daySched;

        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: daySched }));
        await persist(() => supabaseService.saveSchedule(project.id, dateStr, daySched));
    };

    const { weekCount, tomorrowCount } = getBadgeCounts();

    return (
        <div>
            <div style={{ background: '#1e293b', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Projeto: {project.name} {project.isPrivate ? '🔒' : ''}</span>
                    <span style={{ fontSize: '0.7rem', color: '#22c55e', marginLeft: '10px' }}>🟢 Conectado ao Supabase (Realtime)</span>
                </div>
                <Button size="sm" onClick={onBackToDashboard}>Voltar aos Projetos</Button>
            </div>

            {errorMsg && (
                <div role="alert" style={{ background: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecaca', padding: '8px 15px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 'bold' }}>✕</button>
                </div>
            )}

            <NocTemplate
                todayAlertText={getTodayAlert()}
                percentage={calculateProgress()}
                connectionStatus="online"
                connectionText="Supabase Cloud"
                isEditMode={isEditMode}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                onNewRow={handleAddNewRow}
                onNewCol={() => setColModalOpen(true)}
                selectedRowIds={selectedRowIds}
                onToggleSelectRow={handleToggleSelectRow}
                onGroupSelectedRows={handleOpenGroupModal}
                groupModalOpen={groupModalOpen}
                onConfirmGroup={handleConfirmGroup}
                onCloseGroupModal={() => setGroupModalOpen(false)}
                onDeleteProject={handleDeleteProject}
                columnConfig={columnConfig}
                equipments={equipments}
                onUpdateField={handleUpdateField}
                onUpdateColName={handleUpdateColName}
                onDeleteCol={handleDeleteCol}
                onDeleteRow={handleDeleteRow}
                onDragStart={handleDragStart}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onInitResize={handleInitResize}
                isOpen={project.hasCalendar ? isCalendarOpen : false}
                onToggle={() => project.hasCalendar && setIsCalendarOpen(!isCalendarOpen)}
                schedules={schedules}
                onOpenModal={handleOpenModal}
                onToggleComplete={handleToggleCompleteSchedule}
                weekCount={weekCount}
                tomorrowCount={tomorrowCount}
                modalData={modalData}
                onSaveEvent={handleSaveEvent}
                onCloseModal={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                onDeleteSchedule={handleDeleteSchedule}
                onToggleCompleteSchedule={handleToggleCompleteSchedule}
                colModalOpen={colModalOpen}
                onSaveCol={handleSaveNewCol}
                onCloseCol={() => setColModalOpen(false)}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                hasCalendar={project.hasCalendar}
            />
        </div>
    );
}
