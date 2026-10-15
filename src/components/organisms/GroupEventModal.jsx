import { useState } from 'react';
import { Button } from '../atoms/Button';
import { EVENT_COLORS, getEventColor } from '../../constants/eventColors';

const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' };
const inputStyle = {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    background: '#f8fafc',
    boxSizing: 'border-box',
    width: '100%'
};

// Modal para unir linhas selecionadas em 1 evento, pedindo nome e cor
export function GroupEventModal({ rowsCount, onConfirm, onCancel }) {
    const [title, setTitle] = useState('');
    const [color, setColor] = useState('cinza');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Digite o nome do evento.');
            return;
        }
        onConfirm(title.trim(), color);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, backdropFilter: 'blur(2px)' }}>
            <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '380px', maxWidth: '92%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'DM Sans, sans-serif' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Unir linhas em 1 evento</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{rowsCount} linha(s) selecionada(s)</p>
                </div>

                <label style={labelStyle}>Nome do evento</label>
                <input
                    autoFocus
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setError(''); }}
                    placeholder="Ex: Manutenção programada"
                    style={inputStyle}
                />

                <label style={labelStyle}>Cor do evento</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {EVENT_COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            title={c.label}
                            aria-label={c.label}
                            aria-pressed={color === c.value}
                            onClick={() => setColor(c.value)}
                            style={{ width: '34px', height: '34px', borderRadius: '50%', background: c.hex, cursor: 'pointer', border: color === c.value ? '3px solid #0f172a' : '2px solid #cbd5e1' }}
                        />
                    ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Cor selecionada: <strong>{getEventColor(color).label}</strong>
                </span>

                {error && <p role="alert" style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>{error}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="primary">Criar evento</Button>
                </div>
            </form>
        </div>
    );
}
