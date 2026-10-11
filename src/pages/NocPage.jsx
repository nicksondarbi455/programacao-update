import { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
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

    // Salva automaticamente no localStorage sempre que houver alteração
    const saveProjectData = (newEquips, newCols, newScheds) => {
        const allProjects = storageService.getProjects(userEmail);
        const updatedProjects = allProjects.map(p => {
            if (p.id === project.id) {
                return {
                    ...p,
                    equipments: newEquips,
                    columnConfig: newCols,
                    schedules: newScheds
                };
            }
            return p;
        });
        storageService.saveProjects(userEmail, updatedProjects);
    };

    // Cálculos de Progresso e Notificações
    const calculateProgress = () => {
        let total = 0, done = 0;
        equipments.forEach(eq => {
            total++;
            if (eq.status) done++;
            columnConfig.forEach(col => {
                if (col.type === 'checkbox' && col.id !== 'status') {
                    total++;
                    let val = eq[col.id] !== undefined ? eq[col.id] : (eq.custom ? eq.custom[col.id] : false);
                    if (val) done++;
                }
            });
        });
        return total > 0 ? Math.round((done / total) * 100) : 0;
    };

    const getTodayAlert = () => {
        let todayStr = new Date().toISOString().split('T')[0];
        let todaySched = schedules[todayStr] || [];
        return todaySched.length > 0 ? `Hoje (${todaySched.length} agendamentos)` : `Nenhum agendamento hoje.`;
    };

    const getBadgeCounts = () => {
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

    // Funções de Ação e Manipulação Local
    const handleUpdateField = (id, field, value) => {
        let updated = equipments.map(eq => {
            if (eq.id === id) {
                let copy = { ...eq };
                if (['cpd', 'switch_model', 'status', 'obs', 'color'].includes(field)) {
                    copy[field] = value;
                } else {
                    if (!copy.custom) copy.custom = {};
                    copy.custom[field] = value;
                }
                return copy;
            }
            return eq;
        });
        setEquipments(updated);
        saveProjectData(updated, columnConfig, schedules);
    };

    const handleUpdateColName = (colId, newName) => {
        if (!newName.trim()) return;
        let updated = columnConfig.map(col => col.id === colId ? { ...col, name: newName.trim() } : col);
        setColumnConfig(updated);
        saveProjectData(equipments, updated, schedules);
    };

    const handleAddNewRow = () => {
        let newId = 'eq_' + Date.now();
        // Cria um novo item vazio compatível com as colunas do projeto
        let newEq = { id: newId, color: 'padrao' };
        columnConfig.forEach(col => {
            newEq[col.id] = col.type === 'checkbox' ? false : '';
        });
        let updated = [...equipments, newEq];
        setEquipments(updated);
        saveProjectData(updated, columnConfig, schedules);
    };

    const handleDeleteRow = (id) => {
        let updated = equipments.filter(e => e.id !== id);
        setEquipments(updated);
        saveProjectData(updated, columnConfig, schedules);
    };

    const handleSaveNewCol = (name, type) => {
        if (!name) return alert('Digite o nome da coluna!');
        let colId = 'col_' + Date.now();
        let newCol = { id: colId, name, type, position: columnConfig.length, width: 120 };
        let updated = [...columnConfig, newCol];
        setColumnConfig(updated);
        setColModalOpen(false);
        saveProjectData(equipments, updated, schedules);
    };

    const handleDeleteCol = (colId) => {
        let updated = columnConfig.filter(c => c.id !== colId).map((col, idx) => ({ ...col, position: idx }));
        setColumnConfig(updated);
        saveProjectData(equipments, updated, schedules);
    };

    // Redimensionamento de colunas por arraste
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

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            saveProjectData(equipments, columnConfig, schedules);
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

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        let updated = [...columnConfig];
        let [movedCol] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, movedCol);
        updated.forEach((col, idx) => col.position = idx);
        setColumnConfig(updated);
        setDraggedIndex(null);
        saveProjectData(equipments, updated, schedules);
    };

    // Gestão de Agendamentos
    const handleOpenModal = (dateStr, friendlyDate) => {
        setModalData({
            isOpen: true,
            dateStr,
            friendlyDate,
            items: schedules[dateStr] || [],
            equipments
        });
    };

    const handleSaveEvent = (title) => {
        if (!title) return alert('Digite ou selecione um evento!');
        // Usa a primeira coluna como referência de nome do item cadastrado
        let firstColId = columnConfig[0]?.id;
        let exists = equipments.some(eq => (eq[firstColId] || eq.cpd || eq.id) === title);
        if (!exists) return alert('Erro: Só é permitido agendar eventos cadastrados na tabela principal!');

        let dateStr = modalData.dateStr;
        let daySched = schedules[dateStr] || [];
        if (daySched.some(i => i.text === title)) return alert('Este item já está agendado para este dia!');

        let newSchedItems = [...daySched, { text: title, completed: false }];
        let newSchedules = { ...schedules, [dateStr]: newSchedItems };
        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: newSchedItems }));
        saveProjectData(equipments, columnConfig, newSchedules);
    };

    const handleToggleCompleteSchedule = (dateStr, itemIdx) => {
        let daySched = (schedules[dateStr] || []).map((item, idx) => {
            if (idx === itemIdx) {
                return { ...item, completed: !item.completed };
            }
            return { ...item };
        });

        if (!daySched[itemIdx]) return;
        let item = daySched[itemIdx];

        let newSchedules = {
            ...schedules,
            [dateStr]: daySched
        };

        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: daySched }));
        saveProjectData(equipments, columnConfig, newSchedules);
    };

    const handleDeleteSchedule = (dateStr, idx) => {
        let daySched = [...(schedules[dateStr] || [])];
        daySched.splice(idx, 1);
        let newSchedules = { ...schedules };
        if (daySched.length === 0) delete newSchedules[dateStr];
        else newSchedules[dateStr] = daySched;

        setSchedules(newSchedules);
        setModalData(prev => ({ ...prev, items: daySched }));
        saveProjectData(equipments, columnConfig, newSchedules);
    };

    const { weekCount, tomorrowCount } = getBadgeCounts();

    return (
        <div>
            {/* Barra superior com botão para voltar ao dashboard */}
            <div style={{ background: '#1e293b', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Projeto: {project.name}</span>
                <Button size="sm" style={{ background: '#475569', color: '#fff' }} onClick={onBackToDashboard}>Voltar aos Projetos</Button>
            </div>

            <NocTemplate
                todayAlertText={getTodayAlert()}
                percentage={calculateProgress()}
                connectionStatus="online"
                connectionText="Armazenamento Local"
                isEditMode={isEditMode}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                onNewRow={handleAddNewRow}
                onNewCol={() => setColModalOpen(true)}
                onExport={() => {
                    let backup = { equipments, columnConfig, schedules };
                    let blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'json' });
                    let a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
                    a.click();
                }}
                onImport={(e) => {
                    let file = e.target.files[0];
                    if (!file) return;
                    let reader = new FileReader();
                    reader.onload = (event) => {
                        let backup = JSON.parse(event.target.result);
                        setEquipments(backup.equipments || []);
                        setColumnConfig(backup.columnConfig || []);
                        setSchedules(backup.schedules || {});
                        saveProjectData(backup.equipments, backup.columnConfig, backup.schedules);
                        alert('Projeto restaurado com sucesso!');
                    };
                    reader.readAsText(file);
                }}
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
                isOpen={isCalendarOpen}
                onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
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
            />
        </div>
    );
}