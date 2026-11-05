import { useState } from 'react';
import { Button } from '../atoms/Button';
import { ModalShell } from '../molecules/ModalShell';
import { supabaseService } from '../../services/supabaseService';

const selectStyle = { padding: '7px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' };
const labelStyle = { fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' };

// Move um projeto para uma pasta (ou para a raiz)
export function MoveProjectModal({ project, folders, onMoved, onCancel }) {
    const [targetId, setTargetId] = useState(project.folderId || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await supabaseService.updateProject(project.id, { folderId: targetId || null });
            onMoved();
        } catch (err) {
            alert('Erro ao mover projeto: ' + err.message);
            setSaving(false);
        }
    };

    return (
        <ModalShell title="Mover projeto" width={380}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                Projeto: <strong>{project.name}</strong>
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={labelStyle}>Pasta de destino</label>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={selectStyle}>
                    <option value="">Nenhuma (raiz)</option>
                    {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
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
