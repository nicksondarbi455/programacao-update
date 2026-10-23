import { useState, useEffect } from 'react';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';
import { DepartmentPicker } from '../molecules/DepartmentPicker';
import { usersService } from '../../services/usersService';

const labelStyle = { fontSize: '0.75rem', color: '#475569', fontWeight: '700' };
const fieldStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '0.85rem',
    border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#0f172a',
    fontFamily: 'inherit', outline: 'none'
};

// Configurações do projeto: título, descrição, exibição do progresso, privacidade e departamentos
export function ProjectSettingsModal({ project, onSave, onClose }) {
    const [name, setName] = useState(project.name || '');
    const [description, setDescription] = useState(project.description || '');
    const [showProgress, setShowProgress] = useState(!!project.showProgress);
    const [isPrivate, setIsPrivate] = useState(!!project.isPrivate);
    const [hasCalendar, setHasCalendar] = useState(project.hasCalendar !== false);
    const [departmentIds, setDepartmentIds] = useState(project.departmentIds || []);
    const [departments, setDepartments] = useState([]);
    const [loadingDeps, setLoadingDeps] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        usersService.listDepartments()
            .then(setDepartments)
            .catch((err) => setError(err.message))
            .finally(() => setLoadingDeps(false));
    }, []);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setError('');
        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                showProgress,
                isPrivate,
                hasCalendar,
                departmentIds: isPrivate ? [] : departmentIds
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '18px 20px', width: '380px', maxWidth: '92%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Configurações do projeto</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={labelStyle}>Título</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={labelStyle}>Descrição</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        <Checkbox checked={hasCalendar} onChange={(e) => setHasCalendar(e.target.checked)} />
                        Usar calendário
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        <Checkbox checked={showProgress} onChange={(e) => setShowProgress(e.target.checked)} />
                        Mostrar progresso
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        <Checkbox checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                        Projeto Privado 🔒
                    </label>
                </div>

                {isPrivate ? (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                        Projeto privado: só você e os administradores podem ver e editar. Departamentos não se aplicam.
                    </span>
                ) : (
                    <DepartmentPicker
                        departments={departments}
                        selectedIds={departmentIds}
                        onChange={setDepartmentIds}
                        loading={loadingDeps}
                    />
                )}

                {error && <p role="alert" style={{ margin: 0, fontSize: '0.75rem', color: '#b91c1c' }}>⚠️ {error}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Cancelar</span></Button>
                    <Button variant="primary" className="btn-modal" onClick={handleSave} disabled={saving || !name.trim()}><span>{saving ? 'Salvando...' : 'Salvar'}</span></Button>
                </div>
            </div>
        </div>
    );
}
