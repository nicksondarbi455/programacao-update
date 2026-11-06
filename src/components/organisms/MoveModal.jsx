import { useState } from 'react';
import { Button } from '../atoms/Button';
import { ModalShell } from '../molecules/ModalShell';

const selectStyle = { padding: '7px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--th-text)' };
const labelStyle = { fontSize: '0.75rem', color: 'var(--th-muted)', fontWeight: 'bold' };

// Mover um projeto ou uma pasta para outra pasta (ou para a raiz)
export function MoveModal({ title, itemName, currentFolderId, options, onConfirm, onDone, onCancel }) {
    const [targetId, setTargetId] = useState(currentFolderId || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onConfirm(targetId || null);
            onDone();
        } catch (err) {
            alert('Erro ao mover: ' + err.message);
            setSaving(false);
        }
    };

    return (
        <ModalShell title={title} width={380}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-text-3)' }}>
                Item: <strong>{itemName}</strong>
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={labelStyle}>Pasta de destino</label>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={selectStyle}>
                    <option value="">Raiz (Meus Projetos)</option>
                    {options.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                </select>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <Button variant="secondary" className="btn-modal" onClick={onCancel}><span>Cancelar</span></Button>
                    <Button type="submit" variant="primary" className="btn-modal" disabled={saving}>
                        <span><i className="fa-solid fa-folder-open"></i> {saving ? 'Movendo...' : 'Mover'}</span>
                    </Button>
                </div>
            </form>
        </ModalShell>
    );
}
