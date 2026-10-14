import { TopBar } from '../organisms/TopBar';
import { NocTable } from '../organisms/NocTable';
import { CalendarWidget } from '../organisms/CalendarWidget';
import { Modals } from '../organisms/Modals';
import { GroupEventModal } from '../organisms/GroupEventModal';

export function NocTemplate({
    todayAlertText,
    percentage,
    connectionStatus,
    connectionText,
    isEditMode,
    onToggleEdit,
    onNewRow,
    onNewCol,
    selectedRowIds = [],
    onToggleSelectRow,
    onGroupSelectedRows,
    onDeleteProject,
    columnConfig,
    equipments,
    onUpdateField,
    onUpdateColName,
    onDeleteCol,
    onDeleteRow,
    onDragStart,
    onDragOver,
    onDrop,
    onInitResize,
    isOpen,
    onToggle,
    schedules,
    onOpenModal,
    onToggleComplete,
    weekCount,
    tomorrowCount,
    modalData,
    onSaveEvent,
    onCloseModal,
    onDeleteSchedule,
    onToggleCompleteSchedule,
    colModalOpen,
    onSaveCol,
    onCloseCol,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    hasCalendar,
    groupModalOpen,
    onConfirmGroup,
    onCloseGroupModal
}) {
    return (
        /* Espaçamento inferior reforçado para garantir que o rodapé da tabela não fique escondido */
        <div style={{ paddingBottom: '160px', minHeight: '100vh', boxSizing: 'border-box' }}>
            <TopBar
                todayAlertText={todayAlertText}
                isEditMode={isEditMode}
                onToggleEdit={onToggleEdit}
                onNewRow={onNewRow}
                onNewCol={onNewCol}
                selectedRowsCount={selectedRowIds.length}
                onGroupSelectedRows={onGroupSelectedRows}
                onDeleteProject={onDeleteProject}
            />

            <div style={{ padding: '0 20px', marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Pesquisar em qualquer coluna..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px', fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: '#64748b', fontWeight: 'bold' }}>Filtrar:</span>
                        <button 
                            onClick={() => setStatusFilter('all')} 
                            style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: statusFilter === 'all' ? '#1e293b' : '#e2e8f0', color: statusFilter === 'all' ? '#fff' : '#1e293b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setStatusFilter('pending')} 
                            style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: statusFilter === 'pending' ? '#1e293b' : '#e2e8f0', color: statusFilter === 'pending' ? '#fff' : '#1e293b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                            Pendentes
                        </button>
                        <button 
                            onClick={() => setStatusFilter('completed')} 
                            style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: statusFilter === 'completed' ? '#1e293b' : '#e2e8f0', color: statusFilter === 'completed' ? '#fff' : '#1e293b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                            Concluídos
                        </button>
                    </div>
                </div>

                <NocTable
                    columnConfig={columnConfig}
                    equipments={equipments}
                    isEditMode={isEditMode}
                    selectedRowIds={selectedRowIds}
                    onToggleSelectRow={onToggleSelectRow}
                    onUpdateField={onUpdateField}
                    onUpdateColName={onUpdateColName}
                    onDeleteCol={onDeleteCol}
                    onDeleteRow={onDeleteRow}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onInitResize={onInitResize}
                    schedules={schedules}
                    searchTerm={searchTerm}
                    statusFilter={statusFilter}
                />
            </div>

            {hasCalendar && (
                <CalendarWidget
                    isOpen={isOpen}
                    onToggle={onToggle}
                    schedules={schedules}
                    equipments={equipments}
                    onOpenModal={onOpenModal}
                    onToggleComplete={onToggleComplete}
                    weekCount={weekCount}
                    tomorrowCount={tomorrowCount}
                />
            )}

            {groupModalOpen && (
                <GroupEventModal
                    rowsCount={selectedRowIds.length}
                    onConfirm={onConfirmGroup}
                    onCancel={onCloseGroupModal}
                />
            )}

            <Modals
                modalData={modalData}
                onCloseModal={onCloseModal}
                onSaveEvent={onSaveEvent}
                onDeleteSchedule={onDeleteSchedule}
                onToggleCompleteSchedule={onToggleCompleteSchedule}
                colModalOpen={colModalOpen}
                onSaveCol={onSaveCol}
                onCloseCol={onCloseCol}
                columnConfig={columnConfig}
            />
        </div>
    );
}