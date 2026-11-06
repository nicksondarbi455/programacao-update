import { Button } from '../atoms/Button';
import { ProgressBar } from '../molecules/ProgressBar';

export function TopBar({
    todayAlertText,
    isEditMode,
    onToggleEdit,
    onNewRow,
    onNewCol,
    onNewItem,
    onDeleteProject,
    percentage = 0
}) {
    return (
        <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'var(--th-surface)', borderBottom: '1px solid var(--th-border)' }}>
            <div className="alert-box" style={{ fontSize: '0.85rem', color: 'var(--th-text-3)', fontWeight: '600' }}>
                <span>{todayAlertText}</span>
                <ProgressBar percentage={percentage} />
            </div>

            <div className="action-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {onToggleEdit && (
                    <Button
                        variant={isEditMode ? 'success' : 'warning'}
                        size="sm"
                        onClick={onToggleEdit}
                    >
                        {isEditMode ? 'Concluir edição' : <><i className="fa-regular fa-pen-to-square"></i> Editar tabela</>}
                    </Button>
                )}

                {isEditMode && (
                    <>
                        <Button variant="primary" size="sm" onClick={onNewRow}><i className="fa-regular fa-plus"></i> Linha</Button>
                        <Button variant="primary" size="sm" onClick={onNewCol}><i className="fa-regular fa-plus"></i> Coluna</Button>
                        <Button variant="primary" size="sm" onClick={onNewItem}><i className="fa-regular fa-plus"></i> Evento</Button>
                    </>
                )}

                {isEditMode && onDeleteProject && (
                    <Button variant="danger" size="sm" onClick={onDeleteProject}>🗑️ Excluir projeto</Button>
                )}
            </div>
        </div>
    );
}
