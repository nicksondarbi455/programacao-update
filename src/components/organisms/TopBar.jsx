import { Button } from '../atoms/Button';
import { ProgressBar } from '../molecules/ProgressBar';

export function TopBar({
    todayAlertText,
    isEditMode,
    onToggleEdit,
    onNewRow,
    onNewCol,
    selectedRowsCount = 0,
    onGroupSelectedRows,
    onNewItem,
    onDeleteProject,
    percentage = 0
}) {
    return (
        <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
            <div className="alert-box" style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600' }}>
                <span>{todayAlertText}</span>
                <ProgressBar percentage={percentage} />
            </div>

            <div className="action-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                    variant={isEditMode ? 'success' : 'warning'}
                    size="sm"
                    onClick={onToggleEdit}
                >
                    {isEditMode ? 'Concluir edição' : <><i className="fa-regular fa-pen-to-square"></i> Editar tabela</>}
                </Button>

                {isEditMode && (
                    <>
                        <Button variant="primary" size="sm" onClick={onNewRow}><i className="fa-regular fa-plus"></i> Linha</Button>
                        <Button variant="primary" size="sm" onClick={onNewCol}><i className="fa-regular fa-plus"></i> Coluna</Button>
                        <Button variant="primary" size="sm" onClick={onNewItem}><i className="fa-regular fa-plus"></i> Item</Button>

                        {/* Botão para unir linhas que surge assim que marcar 1 ou mais caixas */}
                        {selectedRowsCount > 0 && (
                            <Button variant="info" size="sm" onClick={onGroupSelectedRows}>
                                🔗 Unir {selectedRowsCount} linha{selectedRowsCount > 1 ? 's' : ''} em 1 evento
                            </Button>
                        )}

                        <Button variant="danger" size="sm" onClick={onDeleteProject}>🗑️ Excluir projeto</Button>
                    </>
                )}
            </div>
        </div>
    );
}
