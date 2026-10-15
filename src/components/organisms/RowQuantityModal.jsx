import { useState } from 'react';
import { Button } from '../atoms/Button';

// Pergunta quantas linhas criar de uma vez
export function RowQuantityModal({ onConfirm, onCancel }) {
    const [qty, setQty] = useState(1);

    const handleSubmit = (e) => {
        e.preventDefault();
        const n = Math.min(50, Math.max(1, parseInt(qty, 10) || 1));
        onConfirm(n);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, backdropFilter: 'blur(2px)' }}>
            <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '340px', maxWidth: '92%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'DM Sans, sans-serif' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>➕ Nova(s) linha(s)</h3>

                <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                        Quantidade de linhas (máx. 50):
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="50"
                        autoFocus
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="primary">Adicionar</Button>
                </div>
            </form>
        </div>
    );
}
