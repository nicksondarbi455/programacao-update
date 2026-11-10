import { Button } from '../atoms/Button';
import { ProgressBar } from '../molecules/ProgressBar';

// Cores principais para o texto da célula
const CORES = [
    { label: 'Preto', value: '#0f172a' },
    { label: 'Vermelho', value: '#dc2626' },
    { label: 'Verde', value: '#16a34a' },
    { label: 'Azul', value: '#2563eb' },
    { label: 'Laranja', value: '#ea580c' }
];

function FormatBtn({ active, disabled, title, onClick, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            style={{
                minWidth: '30px',
                height: '28px',
                padding: '0 8px',
                borderRadius: '4px',
                border: `1px solid ${active ? '#2563eb' : 'var(--th-border-strong)'}`,
                background: active ? '#dbeafe' : 'var(--th-surface)',
                color: disabled ? 'var(--th-muted-2)' : 'var(--th-text)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem'
            }}
        >
            {children}
        </button>
    );
}

export function TopBar({
    todayAlertText,
    percentage = 0,
    readOnly = false,
    onNewRow,
    onNewCol,
    onNewItem,
    hasTarget = false,
    activeFormat = {},
    onFormat,
    selectedCount = 0,
    onConfirmDelete
}) {
    return (
        <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'var(--th-surface)', borderBottom: '1px solid var(--th-border)', gap: '12px', flexWrap: 'wrap' }}>
            <div className="alert-box" style={{ fontSize: '0.85rem', color: 'var(--th-text-3)', fontWeight: '600' }}>
                <span>{todayAlertText}</span>
                <ProgressBar percentage={percentage} />
            </div>

            {!readOnly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <div className="action-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button variant="primary" size="sm" onClick={onNewRow}><i className="fa-regular fa-plus"></i> Linha</Button>
                        <Button variant="primary" size="sm" onClick={onNewCol}><i className="fa-regular fa-plus"></i> Coluna</Button>
                        <Button variant="primary" size="sm" onClick={onNewItem}><i className="fa-regular fa-plus"></i> Evento</Button>
                        <Button variant="danger" size="sm" onClick={onConfirmDelete} disabled={selectedCount === 0}>
                            <i className="fa-regular fa-trash-can"></i> Excluir selecionadas ({selectedCount})
                        </Button>
                    </div>

                    <div className="format-bar" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormatBtn active={!!activeFormat.b} disabled={!hasTarget} title="Negrito" onClick={() => onFormat({ b: 'toggle' })}>
                            <b>B</b>
                        </FormatBtn>

                        <FormatBtn active={activeFormat.a === 'left'} disabled={!hasTarget} title="Alinhar à esquerda" onClick={() => onFormat({ a: 'left' })}>
                            <i className="fa-solid fa-align-left"></i>
                        </FormatBtn>
                        <FormatBtn active={activeFormat.a === 'center'} disabled={!hasTarget} title="Centralizar" onClick={() => onFormat({ a: 'center' })}>
                            <i className="fa-solid fa-align-center"></i>
                        </FormatBtn>
                        <FormatBtn active={activeFormat.a === 'right'} disabled={!hasTarget} title="Alinhar à direita" onClick={() => onFormat({ a: 'right' })}>
                            <i className="fa-solid fa-align-right"></i>
                        </FormatBtn>

                        <span style={{ width: '1px', height: '20px', background: 'var(--th-border-strong)', margin: '0 4px' }} />

                        {CORES.map((cor) => (
                            <button
                                key={cor.value}
                                type="button"
                                title={`Texto ${cor.label.toLowerCase()}`}
                                aria-label={`Texto ${cor.label.toLowerCase()}`}
                                disabled={!hasTarget}
                                onClick={() => onFormat({ c: cor.value })}
                                style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: cor.value,
                                    border: activeFormat.c === cor.value ? '3px solid #fff' : '2px solid var(--th-border-strong)',
                                    boxShadow: activeFormat.c === cor.value ? '0 0 0 2px #2563eb' : 'none',
                                    cursor: hasTarget ? 'pointer' : 'not-allowed',
                                    opacity: hasTarget ? 1 : 0.5
                                }}
                            />
                        ))}

                        <FormatBtn disabled={!hasTarget} title="Limpar formatação" onClick={() => onFormat({ b: false, a: null, c: null })}>
                            <i className="fa-solid fa-eraser"></i>
                        </FormatBtn>

                        {!hasTarget && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--th-muted)', marginLeft: '6px' }}>
                                Selecione uma célula, linhas (número) ou colunas (cabeçalho) para formatar
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
