import { useState } from 'react';
import { Button } from '../atoms/Button';
import { ProgressBar } from '../molecules/ProgressBar';

// Paleta principal (mesma para texto e fundo)
const PALETA = [
    { label: 'Preto', value: '#000000' },
    { label: 'Cinza', value: '#6b7280' },
    { label: 'Vermelho', value: '#dc2626' },
    { label: 'Laranja', value: '#ea580c' },
    { label: 'Amarelo', value: '#facc15' },
    { label: 'Verde', value: '#16a34a' },
    { label: 'Azul', value: '#2563eb' },
    { label: 'Roxo', value: '#7c3aed' },
    { label: 'Rosa', value: '#db2777' },
    { label: 'Branco', value: '#ffffff' }
];

const btnStyle = {
    minWidth: '30px',
    height: '28px',
    padding: '0 8px',
    borderRadius: '4px',
    border: '1px solid var(--th-border-strong)',
    background: 'var(--th-surface)',
    color: 'var(--th-text)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
};

function FormatBtn({ active, disabled, title, onClick, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            style={{
                ...btnStyle,
                flexDirection: 'row',
                border: `1px solid ${active ? '#2563eb' : 'var(--th-border-strong)'}`,
                background: active ? '#dbeafe' : 'var(--th-surface)',
                color: disabled ? 'var(--th-muted-2)' : 'var(--th-text)',
                cursor: disabled ? 'not-allowed' : 'pointer'
            }}
        >
            {children}
        </button>
    );
}

// Botão com paleta: "A" para cor do texto e balde para cor de fundo (como no Google Sheets)
function ColorPicker({ kind, title, disabled, current, onPick, children }) {
    const [open, setOpen] = useState(false);
    const barra = current || (kind === 'text' ? '#000000' : 'transparent');

    return (
        <div style={{ position: 'relative' }}>
            <button
                type="button"
                title={title}
                aria-label={title}
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                style={{ ...btnStyle, width: '34px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
            >
                {children}
                <span style={{ display: 'block', width: '20px', height: '4px', marginTop: '2px', borderRadius: '1px', background: barra, border: kind === 'fill' && !current ? '1px solid #cbd5e1' : 'none' }} />
            </button>

            {open && !disabled && (
                <div
                    style={{
                        position: 'absolute', top: '34px', right: 0, zIndex: 60,
                        background: 'var(--th-surface)', border: '1px solid var(--th-border-strong)', borderRadius: '6px',
                        padding: '8px', boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                        display: 'grid', gridTemplateColumns: 'repeat(5, 22px)', gap: '6px'
                    }}
                >
                    {PALETA.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            title={c.label}
                            aria-label={c.label}
                            onClick={() => { onPick(c.value); setOpen(false); }}
                            style={{ width: '22px', height: '22px', borderRadius: '4px', background: c.value, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => { onPick(null); setOpen(false); }}
                        style={{ gridColumn: '1 / -1', fontSize: '0.72rem', background: 'none', border: '1px solid var(--th-border-strong)', borderRadius: '4px', padding: '3px', cursor: 'pointer', color: 'var(--th-text)' }}
                    >
                        {kind === 'text' ? 'Texto sem cor (padrão)' : 'Sem cor de fundo'}
                    </button>
                </div>
            )}
        </div>
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

                        <ColorPicker kind="text" title="Cor do texto" disabled={!hasTarget} current={activeFormat.c} onPick={(v) => onFormat({ c: v })}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1 }}>A</span>
                        </ColorPicker>

                        <ColorPicker kind="fill" title="Cor de fundo" disabled={!hasTarget} current={activeFormat.bg} onPick={(v) => onFormat({ bg: v })}>
                            <i className="fa-solid fa-fill-drip"></i>
                        </ColorPicker>

                        <FormatBtn disabled={!hasTarget} title="Limpar formatação" onClick={() => onFormat({ b: false, a: null, c: null, bg: null })}>
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
