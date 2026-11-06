import { useState } from 'react';
import { Checkbox } from '../atoms/Checkbox';

// Mesmo visual do campo "Origem dos Dados da Tabela": uma caixa que abre a lista
const triggerStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '7px',
    background: 'var(--th-surface-2)',
    border: '1px solid var(--th-border-strong)',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    color: 'var(--th-text-2)',
    textAlign: 'left',
    cursor: 'pointer'
};

const labelStyle = { fontSize: '0.75rem', color: 'var(--th-muted)', fontWeight: 'bold' };

// Seleção múltipla de departamentos em forma de lista (abre e fecha ao clicar)
export function DepartmentPicker({ label, departments, selectedIds, onChange, loading, helpText }) {
    const [open, setOpen] = useState(false);

    const toggle = (id) => {
        onChange(selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id]);
    };

    const selectedNames = departments.filter((d) => selectedIds.includes(d.id)).map((d) => d.name);

    let summary;
    if (loading) summary = 'Carregando departamentos...';
    else if (departments.length === 0) summary = 'Nenhum departamento cadastrado';
    else if (selectedNames.length === 0) summary = 'Selecione os departamentos';
    else summary = selectedNames.join(', ');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>{label}</label>

            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                disabled={loading || departments.length === 0}
                style={triggerStyle}
            >
                <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: selectedNames.length > 0 ? '#1e293b' : '#94a3b8'
                }}>
                    {summary}
                </span>
                <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', color: 'var(--th-muted)', flexShrink: 0 }}></i>
            </button>

            {open && !loading && departments.length > 0 && (
                <div style={{ border: '1px solid var(--th-border-strong)', borderRadius: '4px', background: 'var(--th-surface)', maxHeight: '180px', overflowY: 'auto' }}>
                    {departments.map((dep) => {
                        const checked = selectedIds.includes(dep.id);
                        return (
                            <div
                                key={dep.id}
                                role="option"
                                aria-selected={checked}
                                onClick={() => toggle(dep.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '7px 10px',
                                    fontSize: '0.8rem',
                                    color: 'var(--th-text-3)',
                                    cursor: 'pointer',
                                    background: checked ? '#f0fdf4' : '#fff',
                                    borderBottom: '1px solid var(--th-surface-3)'
                                }}
                            >
                                {/* O clique propaga para a linha, que faz a seleção */}
                                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                                    <Checkbox checked={checked} onChange={() => {}} />
                                </span>
                                <span>{dep.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && helpText && (
                <span style={{ fontSize: '0.7rem', color: 'var(--th-muted-2)' }}>{helpText}</span>
            )}
        </div>
    );
}
