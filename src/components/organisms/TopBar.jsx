import { Button } from '../atoms/Button';

export function TopBar({ 
    todayAlertText, 
    isEditMode, 
    onToggleEdit, 
    onNewRow, 
    onNewCol, 
    onNewGroup,
    selectedRowsCount = 0,
    onGroupSelectedRows,
    onDeleteProject 
}) {
    return (
        <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
            <div className="alert-box" style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600' }}>
                <span>{todayAlertText}</span>
            </div>

            <div className="action-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button 
                    variant={isEditMode ? "success" : "primary"} 
                    size="sm" 
                    onClick={onToggleEdit}
                >
                    {isEditMode ? "✔ Concluir Edição" : "✏️ Editar Tabela"}
                </Button>

                {isEditMode && (
                    <>
                        <Button variant="primary" size="sm" onClick={onNewRow}>+ Linha</Button>
                        <Button variant="primary" size="sm" onClick={onNewCol}>+ Coluna</Button>
                        <Button variant="warning" size="sm" onClick={onNewGroup}>📌 + Faixa Evento</Button>

                        {/* Botão para unir linhas que surge assim que marcar 1 ou mais caixas */}
                        {selectedRowsCount > 0 && (
                            <Button 
                                size="sm" 
                                style={{ 
                                    background: '#7c3aed', 
                                    color: '#ffffff', 
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px'
                                }} 
                                onClick={onGroupSelectedRows}
                            >
                                🔗 Unir {selectedRowsCount} Linha{selectedRowsCount > 1 ? 's' : ''} em 1 Evento
                            </Button>
                        )}

                        <Button variant="danger" size="sm" onClick={onDeleteProject}>🗑️ Excluir Projeto</Button>
                    </>
                )}
            </div>
        </div>
    );
}