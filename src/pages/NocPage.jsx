import { useState, useEffect, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabase';
import { NocTemplate } from '../components/templates/NocTemplate';
import { Button } from '../components/atoms/Button';
import * as XLSX from 'xlsx';
import { localDateStr } from '../utils/dates';
import { isRowCompleted } from '../components/organisms/NocTable';
import { logAction, LOG_ACTIONS } from '../services/logService';
import { CommentsModal } from '../components/organisms/CommentsModal';
import { ProjectSettingsModal } from '../components/organisms/ProjectSettingsModal';

export function NocPage({ project, userEmail, onBackToDashboard, onProjectUpdated }) {
    const [equipments, setEquipments] = useState(project.equipments || []);
    const [columnConfig, setColumnConfig] = useState(project.columnConfig || []);
    const [schedules, setSchedules] = useState(project.schedules || {});
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [colModalOpen, setColModalOpen] = useState(false);
    const [rowModalOpen, setRowModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ isOpen: false, dateStr: '', friendlyDate: '', items: [], equipments: [] });
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [errorMsg, setErrorMsg] = useState('');
    // Guarda o id da linha que está sendo arrastada
    const dragRowRef = useRef(null);
    // Evento cuja nota está aberta
    const [commentTarget, setCommentTarget] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});
    const [people, setPeople] = useState([]);
    const [realtimeStatus, setRealtimeStatus] = useState('conectando');
    // Estado das linhas no início da edição em lote (para registrar o que mudou)
    const editSnapshotRef = useRef([]);

    const refreshCommentCounts = async () => {
        try {
            setCommentCounts(await supabaseService.getCommentCounts(project.id));
        } catch (err) {
            console.warn('Erro ao contar comentários:', err.message);
        }
    };

    useEffect(() => {
        refreshCommentCounts();
        supabaseService.listPeople().then(setPeople).catch(() => {});
    }, [project.id]);

    // Rótulo legível de uma linha ou evento (usado no histórico e nos comentários)
    const rowLabel = (eq) => eq.isGroupHeader
        ? (eq.groupName || 'Evento sem nome')
        : String(eq[columnConfig[0]?.id] || 'Linha sem nome');

    const rowLabelOf = (id) => {
        const eq = equipments.find((e) => e.id === id);
        return eq ? rowLabel(eq) : id;
    };

    const fieldEntry = (rowId, field, before, after) => ({
        target_type: 'linha',
        target_id: rowId,
        target_label: rowLabelOf(rowId),
        action: 'campo_alterado',
        details: {
            campo: columnConfig.find((c) => c.id === field)?.name || field,
            de: before ?? '',
            para: after ?? ''
        }
    });

    // Grava o histórico sem esperar (não atrasa a tela)
    const recordHistory = (entries) => {
        if (entries.length === 0) return;
        supabaseService.addHistory(entries.map((e) => ({
            project_id: project.id,
            actor_email: (userEmail || '').toLowerCase(),
            ...e
        })));
    };
    // Modal de configurações do projeto
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Modal para criar um evento (botão + Evento)
    const [groupModalOpen, setGroupModalOpen] = useState(false);

    // Nº de gravações em curso; enquanto > 0 o realtime não substitui o estado local
    const pendingWritesRef = useRef(0);
    // Alterações feitas em modo de edição, ainda não enviadas: { [rowId]: { [campo]: valor } }
    const pendingCellsRef = useRef({});
    // Espelho do estado isEditMode para ser lido dentro de callbacks (realtime, handlers)
    const isEditModeRef = useRef(false);

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
    // Não substitui a tela enquanto há gravações pendentes ou enquanto a tabela está em edição
    const refreshIfIdle = () => {
        if (pendingWritesRef.current === 0 && !isEditModeRef.current) refreshData();
    };

    useEffect(() => {
        const channel = supabase
            .channel(`realtime-project-${project.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'equipments', filter: `project_id=eq.${project.id}` }, refreshIfIdle)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'column_configs', filter: `project_id=eq.${project.id}` }, refreshIfIdle)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `project_id=eq.${project.id}` }, refreshIfIdle)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'item_comments', filter: `project_id=eq.${project.id}` }, () => refreshCommentCounts())
            .subscribe((status) => setRealtimeStatus(status === 'SUBSCRIBED' ? 'online' : 'offline'));

        return () => {
            supabase.removeChannel(channel);
        };
    }, [project.id]);

    // Cria um evento (faixa) com o nome e a cor escolhidos no modal
    const handleConfirmGroup = async (eventTitle, eventColor) => {
        setGroupModalOpen(false);

        const groupHeaderRow = {
            id: 'eq_grp_' + Date.now(),
            isGroupHeader: true,
            groupName: eventTitle.toUpperCase(),
            color: eventColor,
            position: Math.max(0, ...equipments.map((eq, i) => eq.position ?? i + 1)) + 1
        };

        // Adiciona o evento no fim da tabela e salva no Supabase
        setEquipments([...equipments, groupHeaderRow]);
        await persist(() => supabaseService.addEquipment(project.id, groupHeaderRow));
    };

    // Exporta a planilha (aba Planilha) e a agenda (aba Agenda) do projeto aberto
    const handleExportExcel = () => {
        const aoa = [columnConfig.map((c) => c.name)];
        equipments.forEach((eq) => {
            if (eq.isGroupHeader) {
                aoa.push([`[${eq.groupName || 'Grupo'}]`]);
                return;
            }
            aoa.push(columnConfig.map((c) => eq[c.id] ?? ''));
        });

        const agenda = [['Data', 'Horário', 'Evento', 'Status']];
        Object.keys(schedules).sort().forEach((dateStr) => {
            (schedules[dateStr] || []).forEach((item) => {
                agenda.push([dateStr, item.hora || '', item.text, item.completed ? 'Feito' : 'Pendente']);
            });
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), 'Planilha');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(agenda), 'Agenda');
        const safeName = project.name.replace(/[\\/:*?"<>|]/g, '').trim() || 'projeto';
        XLSX.writeFile(workbook, `${safeName}.xlsx`);
    };

    const handleDeleteProject = async () => {
        if (confirm('Tem certeza de que deseja excluir este projeto? Ele vai para a lixeira e pode ser restaurado em até 30 dias.')) {
            const ok = await persist(() => supabaseService.deleteProject(project.id, project.name));
            if (ok) onBackToDashboard();
        }
    };

    // Itens que o calendário agenda: eventos (faixas cinzas) se existirem, senão as linhas sem grupo
    const getTrackableItems = () => {
        const hasHeaders = equipments.some(eq => eq.isGroupHeader);
        return equipments.filter(eq => hasHeaders ? eq.isGroupHeader : !eq.groupId);
    };

    // Percentual = itens marcados como feito no calendário / total de itens
    const calculateProgress = () => {
        const items = getTrackableItems();
        if (items.length === 0) return 0;
        const done = items.filter(eq => isRowCompleted(eq, schedules, columnConfig)).length;
        return Math.round((done / items.length) * 100);
    };

    // Guarda o progresso no projeto (mostrado no card do dashboard)
    useEffect(() => {
        const pct = calculateProgress();
        if (pct !== project.progress) {
            supabaseService.updateProject(project.id, { progress: pct }).catch(() => {});
            if (onProjectUpdated) onProjectUpdated({ ...project, progress: pct });
        }
    }, [schedules, equipments]); // eslint-disable-line react-hooks/exhaustive-deps

    // Salva título, descrição, progresso e privacidade do projeto
    const handleSaveSettings = async (fields) => {
        await persist(() => supabaseService.updateProject(project.id, fields));
        setSettingsOpen(false);
        if (onProjectUpdated) onProjectUpdated({ ...project, ...fields });
    };

    const getTodayAlert = () => {
        if (!project.hasCalendar) return `Projeto Ativo: ${project.name}`;
        let todayStr = localDateStr(new Date());
        let todaySched = schedules[todayStr] || [];
        return todaySched.length > 0 ? `Hoje (${todaySched.length} agendamentos)` : `Nenhum agendamento hoje.`;
    };

    const getBadgeCounts = () => {
        if (!project.hasCalendar) return { weekCount: 0, tomorrowCount: 0 };
        let today = new Date();
        let tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        let tomorrowStr = localDateStr(tomorrow);

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
        const before = equipments.find((eq) => eq.id === id)?.[field];
        setEquipments(prev => prev.map(eq => eq.id === id ? { ...eq, [field]: value } : eq));

        // Em modo de edição guarda só localmente; o Supabase é atualizado ao concluir a edição
        if (isEditModeRef.current) {
            pendingCellsRef.current[id] = { ...(pendingCellsRef.current[id] || {}), [field]: value };
            return;
        }
        if (field !== 'color' && String(before ?? '') !== String(value ?? '')) {
            recordHistory([fieldEntry(id, field, before, value)]);
        }
        await persist(() => supabaseService.updateEquipmentField(id, project.id, field, value));
    };

    // Inicia a edição ou, ao concluir, envia todas as alterações de uma vez
    const handleToggleEdit = async () => {
        if (!isEditModeRef.current) {
            isEditModeRef.current = true;
            editSnapshotRef.current = equipments;
            setIsEditMode(true);
            return;
        }

        const pending = pendingCellsRef.current;
        pendingCellsRef.current = {};

        // Histórico: compara cada campo alterado com o valor do início da edição
        const entries = [];
        Object.entries(pending).forEach(([rowId, fields]) => {
            Object.entries(fields).forEach(([field, value]) => {
                if (field === 'color') return;
                const before = editSnapshotRef.current.find((eq) => eq.id === rowId)?.[field];
                if (String(before ?? '') !== String(value ?? '')) {
                    entries.push(fieldEntry(rowId, field, before, value));
                }
            });
        });
        recordHistory(entries);
        isEditModeRef.current = false;
        setIsEditMode(false);

        await persist(async () => {
            await Promise.all(
                Object.entries(pending).flatMap(([rowId, fields]) =>
                    Object.entries(fields).map(([field, value]) =>
                        supabaseService.updateEquipmentField(rowId, project.id, field, value)
                    )
                )
            );
        });
        await refreshData();
    };

    // Troca a posição da linha com a vizinha (direction: -1 sobe, 1 desce)
    // SALVAR NOTA DO EVENTO

    // ARRASTAR LINHAS: guarda a linha que está sendo arrastada
    const handleRowDragStart = (id) => {
        dragRowRef.current = id;
    };

    // Solta a linha arrastada antes ou depois da linha alvo.
    // Se a linha for um evento, o bloco inteiro (evento + linhas abaixo dele) é movido.
    const handleRowDrop = async (targetId) => {
        const srcId = dragRowRef.current;
        dragRowRef.current = null;
        if (!srcId || srcId === targetId) return;

        const srcIdx = equipments.findIndex(eq => eq.id === srcId);
        const targetIdx = equipments.findIndex(eq => eq.id === targetId);
        if (srcIdx < 0 || targetIdx < 0) return;

        let endIdx = srcIdx + 1;
        if (equipments[srcIdx].isGroupHeader) {
            while (endIdx < equipments.length && !equipments[endIdx].isGroupHeader) endIdx++;
        }
        // Não solta o bloco dentro dele mesmo
        if (targetIdx >= srcIdx && targetIdx < endIdx) return;

        const block = equipments.slice(srcIdx, endIdx);
        const rest = [...equipments.slice(0, srcIdx), ...equipments.slice(endIdx)];
        let insertAt = rest.findIndex(eq => eq.id === targetId);
        if (srcIdx < targetIdx) insertAt += 1; // arrastando para baixo: solta depois da alvo
        const next = [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)];

        // Recalcula posições só da faixa que mudou, reaproveitando as posições já existentes
        const lo = next.findIndex((eq, i) => eq.id !== equipments[i].id);
        if (lo < 0) return;
        let hi = next.length - 1;
        while (hi > lo && next[hi].id === equipments[hi].id) hi--;

        const updated = next.map((eq, i) =>
            i >= lo && i <= hi ? { ...eq, position: equipments[i].position ?? i + 1 } : eq
        );
        setEquipments(updated);

        await persist(async () => {
            for (let i = lo; i <= hi; i++) {
                await supabaseService.updateEquipmentPosition(updated[i].id, updated[i].position);
            }
        });
    };

    // MARCAR / DESMARCAR LINHA COMO EVENTO (o nome do evento vem da primeira coluna)
    const handleToggleEventRow = async (eq) => {
        const firstColId = columnConfig[0]?.id;
        const changes = eq.isGroupHeader
            ? { isGroupHeader: false, color: 'padrao', ...(firstColId ? { [firstColId]: eq.groupName || '' } : {}) }
            : { isGroupHeader: true, groupName: String(eq[firstColId] || '').trim() || 'EVENTO', color: 'cinza' };

        setEquipments(prev => prev.map(e => e.id === eq.id ? { ...e, ...changes } : e));
        await persist(async () => {
            for (const [field, value] of Object.entries(changes)) {
                await supabaseService.updateEquipmentField(eq.id, project.id, field, value);
            }
        });
    };

    const handleUpdateColName = async (colId, newName) => {
        if (!newName.trim()) return;
        let updated = columnConfig.map(col => col.id === colId ? { ...col, name: newName.trim() } : col);
        setColumnConfig(updated);
        await persist(() => supabaseService.updateColumnConfig(project.id, updated));
    };

    // Cria uma ou mais linhas de uma vez (quantidade escolhida no modal)
    const handleAddNewRows = async (qty = 1) => {
        setRowModalOpen(false);
        const base = Date.now();
        const newRows = Array.from({ length: qty }, (_, i) => {
            const row = { id: 'eq_' + base + '_' + i, color: 'padrao', position: base + i };
            columnConfig.forEach(col => {
                row[col.id] = col.type === 'checkbox' ? false : '';
            });
            return row;
        });
        setEquipments(prev => [...prev, ...newRows]);
        await persist(async () => {
            for (const row of newRows) {
                await supabaseService.addEquipment(project.id, row);
            }
        });
    };

    const handleDeleteRow = async (id) => {
        setEquipments(prev => prev.filter(e => e.id !== id));
        await persist(() => supabaseService.deleteEquipment(id));
    };

    // Cria uma ou mais colunas; com quantidade > 1 os nomes ganham número (Nome 1, Nome 2...)
    const handleSaveNewCol = async (name, type, targetScope = 'all', qty = 1) => {
        if (!name) return alert('Digite o nome da coluna!');
        const base = Date.now();
        const newCols = Array.from({ length: qty }, (_, i) => ({
            id: 'col_' + base + '_' + i,
            name: qty > 1 ? `${name} ${i + 1}` : name,
            type,
            targetScope, // 'all' ou 'events'
            position: columnConfig.length + i,
            width: 150
        }));
        let updated = [...columnConfig, ...newCols];
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

    const handleSaveEvent = async (title, hora = '') => {
        if (!title) return alert('Digite ou selecione um evento!');

        let dateStr = modalData.dateStr;
        let daySched = schedules[dateStr] || [];
        if (daySched.some(i => i.text === title)) return alert('Este item já está agendado para este dia!');

        let newSchedItems = [...daySched, { text: title, completed: false, statusText: 'Agendado', ...(hora ? { hora } : {}) }];
        recordHistory([{
            target_type: 'evento',
            target_id: `${dateStr}::${title}`,
            target_label: title,
            action: 'evento_agendado',
            details: { data: dateStr, horario: hora || null }
        }]);
        logAction(LOG_ACTIONS.SCHEDULE_ADD, { entityType: 'agendamento', entityId: dateStr, projectId: project.id, details: { data: dateStr, evento: title } });
        let newSchedules = { ...schedules, [dateStr]: newSchedItems };
        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: newSchedItems }));
        await persist(() => supabaseService.saveSchedule(project.id, dateStr, newSchedItems));
    };

    const handleToggleCompleteSchedule = async (dateStr, itemIdx) => {
        const target = (schedules[dateStr] || [])[itemIdx];
        if (target) {
            recordHistory([{
                target_type: 'evento',
                target_id: `${dateStr}::${target.text}`,
                target_label: target.text,
                action: target.completed ? 'evento_reaberto' : 'evento_concluido',
                details: { data: dateStr }
            }]);
        }
        if (target) {
            logAction(target.completed ? LOG_ACTIONS.SCHEDULE_UNCOMPLETE : LOG_ACTIONS.SCHEDULE_COMPLETE, { entityType: 'agendamento', entityId: dateStr, projectId: project.id, details: { data: dateStr, evento: target.text } });
        }
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
        const removed = (schedules[dateStr] || [])[idx];
        if (removed) {
            recordHistory([{
                target_type: 'evento',
                target_id: `${dateStr}::${removed.text}`,
                target_label: removed.text,
                action: 'evento_removido',
                details: { data: dateStr }
            }]);
        }
        const removed = (schedules[dateStr] || [])[idx];
        if (removed) {
            logAction(LOG_ACTIONS.SCHEDULE_REMOVE, { entityType: 'agendamento', entityId: dateStr, projectId: project.id, details: { data: dateStr, evento: removed.text } });
        }
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
            {settingsOpen && (
                <ProjectSettingsModal project={project} onSave={handleSaveSettings} onClose={() => setSettingsOpen(false)} />
            )}
            {commentTarget && (
                <CommentsModal
                    target={commentTarget}
                    projectId={project.id}
                    people={people}
                    currentEmail={(userEmail || '').toLowerCase()}
                    isAdmin={project.canManage}
                    onClose={() => { setCommentTarget(null); refreshCommentCounts(); }}
                />
            )}
            <div style={{ background: '#1e293b', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Projeto: {project.name} {project.isPrivate ? '🔒' : ''}</span>
                    <span style={{ fontSize: '0.7rem', color: '#22c55e', marginLeft: '10px' }}>{realtimeStatus === 'online' ? '🟢 Conectado (tempo real)' : '🟠 Reconectando...'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" size="sm" onClick={handleExportExcel}><i className="fa-regular fa-file-excel"></i> Exportar Excel</Button>
                    <Button variant="secondary" size="sm" onClick={onBackToDashboard}>Voltar</Button>
                </div>
            </div>

            {errorMsg && (
                <div role="alert" style={{ background: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecaca', padding: '8px 15px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 'bold' }}><i className="fa-regular fa-circle-xmark" style={{ color: '#6b7280' }}></i></button>
                </div>
            )}

            <NocTemplate
                todayAlertText={getTodayAlert()}
                percentage={calculateProgress()}
                connectionStatus="online"
                connectionText="Supabase Cloud"
                isEditMode={isEditMode}
                onToggleEdit={project.canEdit ? handleToggleEdit : undefined}
                onNewRow={() => setRowModalOpen(true)}
                rowModalOpen={rowModalOpen}
                onConfirmRows={handleAddNewRows}
                onCloseRowModal={() => setRowModalOpen(false)}
                onNewCol={() => setColModalOpen(true)}
                onNewItem={() => setGroupModalOpen(true)}
                groupModalOpen={groupModalOpen}
                onConfirmGroup={handleConfirmGroup}
                onCloseGroupModal={() => setGroupModalOpen(false)}
                onDeleteProject={project.canManage ? handleDeleteProject : undefined}
                columnConfig={columnConfig}
                equipments={equipments}
                onUpdateField={handleUpdateField}
                onUpdateColName={handleUpdateColName}
                onDeleteCol={handleDeleteCol}
                onDeleteRow={handleDeleteRow}
                onRowDragStart={handleRowDragStart}
                onRowDrop={handleRowDrop}
                onToggleEventRow={handleToggleEventRow}
                onOpenSettings={project.canManage ? () => setSettingsOpen(true) : undefined}
                onOpenRowComments={(eq) => setCommentTarget({ type: 'linha', id: eq.id, date: '', label: rowLabel(eq) })}
                onOpenEventComments={(dateStr, item) => setCommentTarget({ type: 'evento', id: `${dateStr}::${item.text}`, date: dateStr, label: item.text })}
                commentCounts={commentCounts}
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
                scheduledLabels={new Set(Object.values(schedules).flat().map(i => i.text))}
            />
        </div>
    );
}
