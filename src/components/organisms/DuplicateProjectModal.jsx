import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { ModalShell } from '../molecules/ModalShell';
import { supabaseService } from '../../services/supabaseService';

// Duplicar projeto: escolhe o nome e se a agenda também é copiada
export function DuplicateProjectModal({ project, userEmail, onDone, onCancel }) {
    const [name, setName] = useState(`Cópia de ${project.name}`);
    const [copySchedules, setCopySchedules] = useState(false);
    const [saving, setSaving] = useState(false);

    const hasAgenda = project.hasCalendar && Object.keys(project.schedules || {}).length > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            await supabaseService.duplicateProject(project, userEmail, { name: name.trim(), copySchedules });
            onDone();
        } catch (err) {
            alert('Erro ao duplicar projeto: ' + err.message);
            setSaving(false);
        }
    };

    return (
        <ModalShell title="Duplicar projeto" width={400}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--th-muted)', fontWeight: 'bold' }}>Nome do novo projeto</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />

                {hasAgenda && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--th-text-3)', cursor: 'pointer' }}>
                        <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                            <Checkbox checked={copySchedules} onChange={(e) => setCopySchedules(e.target.checked)} />
                        </span>
                        Copiar também os agendamentos (voltam como pendentes)
                    </label>
                )}

                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--th-muted-2)' }}>
                    São copiados as colunas, as linhas, os departamentos e a pasta. O progresso começa do zero.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <Button variant="secondary" className="btn-modal" onClick={onCancel} disabled={saving}><span>Cancelar</span></Button>
                    <Button type="submit" variant="primary" className="btn-modal" disabled={saving}>
                        <span><i className="fa-regular fa-copy"></i> {saving ? 'Duplicando...' : 'Duplicar'}</span>
                    </Button>
                </div>
            </form>
        </ModalShell>
    );
}
