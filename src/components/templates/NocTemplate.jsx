import { Button } from '../atoms/Button';
import { TopBar } from '../organisms/TopBar';
import { NocTable } from '../organisms/NocTable';
import { CalendarWidget } from '../organisms/CalendarWidget';
import { Modals } from '../organisms/Modals';
import { GroupEventModal } from '../organisms/GroupEventModal';
import { RowQuantityModal } from '../organisms/RowQuantityModal';

export function NocTemplate({
    todayAlertText,
    percentage,
    readOnly,
    onNewRow,
    onNewCol,
    onNewItem,
    rowModalOpen,
    onConfirmRows,
    onCloseRowModal,
    columnConfig,
    equipments,
    onUpdateField,
    onCommitField,
    onUpdateColName,
    onRowDragStart,
    onRowDrop,
    onToggleEventRow,
    onOpenRowComments,
    onOpenEventComments,
    commentCounts = {},
    onOpenSettings,
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
    scheduledLabels,
    groupModalOpen,
    onConfirmGroup,
    onCloseGroupModal,
    activeCell,
    onActivateCell,
    activeFormat,
    onFormat,
    selRows,
    selCols,
    onRowClick,
    onColClick,
    onSelectAll,
    onConfirmDelete,
    projectType,
    onOpenHistory
}) {
    const selectedCount = selRows.size + selCols.size;
    const hasTarget = !!activeCell || selectedCount > 0;

    return (
        /* Espaçamento inferior reforçado para garantir que o rodapé da tabela não fique escondido */
        <div style={{ paddingBottom: '160px', minHeight: '100vh', boxSizing: 'border-box' }}>
            <TopBar
                todayAlertText={todayAlertText}
                percentage={percentage}
                readOnly={readOnly}
                onNewRow={onNewRow}
                onNewCol={onNewCol}
                onNewItem={onNewItem}
                hasTarget={hasTarget}
                activeFormat={activeFormat}
                onFormat={onFormat}
                selectedCount={selectedCount}
                onConfirmDelete={onConfirmDelete}
            />

            <div style={{ padding: '0 20px', marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Pesquisar em qualquer coluna..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--th-border-strong)', width: '300px', fontSize: '0.85rem' }}
                    />
                    {projectType !== 'recorrente' && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--th-muted)', fontWeight: 'bold' }}>Filtrar:</span>
                        {[['all', 'Todos'], ['pending', 'Pendentes'], ['completed', 'Concluídos']].map(([value, label]) => (
                            <Button
                                key={value}
                                size="sm"
                                className={statusFilter === value ? '' : 'btn-inactive'}
                                onClick={() => setStatusFilter(value)}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    )}
                </div>

                <NocTable
                    columnConfig={columnConfig}
                    equipments={equipments}
                    readOnly={readOnly}
                    selRows={selRows}
                    selCols={selCols}
                    activeCell={activeCell}
                    onActivateCell={onActivateCell}
                    onRowClick={onRowClick}
                    onColClick={onColClick}
                    onSelectAll={onSelectAll}
                    onUpdateField={onUpdateField}
                    onCommitField={onCommitField}
                    onUpdateColName={onUpdateColName}
                    onRowDragStart={onRowDragStart}
                    onRowDrop={onRowDrop}
                    onToggleEventRow={onToggleEventRow}
                    onOpenRowComments={onOpenRowComments}
                    commentCounts={commentCounts}
                    onOpenSettings={onOpenSettings}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onInitResize={onInitResize}
                    schedules={schedules}
                    searchTerm={searchTerm}
                    statusFilter={statusFilter}
                    projectType={projectType}
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
                    projectType={projectType}
                    onOpenHistory={onOpenHistory}
                />
            )}

            {rowModalOpen && (
                <RowQuantityModal
                    onConfirm={onConfirmRows}
                    onCancel={onCloseRowModal}
                />
            )}

            {groupModalOpen && (
                <GroupEventModal
                    onConfirm={onConfirmGroup}
                    onCancel={onCloseGroupModal}
                />
            )}

            <Modals
                modalData={modalData}
                onCloseModal={onCloseModal}
                onSaveEvent={onSaveEvent}
                onOpenEventComments={onOpenEventComments}
                commentCounts={commentCounts}
                onDeleteSchedule={onDeleteSchedule}
                onToggleCompleteSchedule={onToggleCompleteSchedule}
                colModalOpen={colModalOpen}
                onSaveCol={onSaveCol}
                onCloseCol={onCloseCol}
                columnConfig={columnConfig}
                scheduledLabels={scheduledLabels}
                projectType={projectType}
            />
        </div>
    );
}
