import { useState } from 'react';
import { PROJECT_ICONS, DEFAULT_PROJECT_ICON } from '../../constants/projectIcons';

// Escolha do ícone do projeto: botão com o ícone atual e, ao clicar, a grade só com os desenhos.
// value = classe do ícone escolhido (ou null para o padrão); onChange recebe a nova classe ou null.
export function ProjectIconPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);

    const choose = (icon) => {
        onChange(icon);
        setOpen(false);
    };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-label="Escolher ícone"
                    style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px solid var(--th-border-strong)', background: 'var(--th-surface-2)', color: 'var(--th-text)', fontSize: '1.15rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <i className={value || DEFAULT_PROJECT_ICON}></i>
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--th-muted)' }}>
                    {open ? 'Clique num ícone para escolher' : (value ? 'Trocar ícone' : 'Escolher ícone')}
                </span>
                {value && (
                    <button
                        type="button"
                        onClick={() => choose(null)}
                        style={{ marginLeft: 'auto', fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--th-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Usar padrão
                    </button>
                )}
            </div>
            {open && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px', padding: '8px', border: '1px solid var(--th-border-strong)', borderRadius: '8px', background: 'var(--th-surface-2)' }}>
                    {PROJECT_ICONS.map((opt) => {
                        const selected = value === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                aria-label={opt.label}
                                onClick={() => choose(opt.value)}
                                style={{ height: '36px', borderRadius: '6px', cursor: 'pointer', color: 'var(--th-text)', background: selected ? 'var(--th-surface-3)' : 'var(--th-surface)', border: selected ? '2px solid var(--th-text)' : '1px solid var(--th-border)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <i className={opt.value}></i>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}
