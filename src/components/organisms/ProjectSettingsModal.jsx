import { useState } from 'react';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';

const labelStyle = { fontSize: '0.75rem', color: '#475569', fontWeight: '700' };
const fieldStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '0.85rem',
    border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#0f172a',
    fontFamily: 'inherit', outline: 'none'
};

// Configurações do projeto: título, descrição, progresso, exibição no card e privacidade
export function ProjectSettingsModal({ project, onSave, onClose }) {
    const [name, setName] = useState(project.name || '');
    const [description, setDescription] = useState(project.description || '');
    const [showProgress, setShowProgress] = useState(!!project.showProgress);
    const [progressAuto, setProgressAuto] = useState(project.progressAuto !== false);
    const [progress, setProgress] = useState(project.progress ?? 0);
    const [isPrivate, setIsPrivate] = useState(!!project.isPrivate);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const fields = {
                name: name.trim(),
                description: description.trim(),
                showProgress,
                isPrivate,
                progressAuto
            };
            // Só grava o valor digitado quando o progresso está em modo manual
            if (!progressAuto) fields.progress = Math.max(0, Math.min(100, Number(progress) || 0));
            await onSave(fields);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '18px 20px', width: '360px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Configurações do projeto</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={labelStyle}>Título</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={labelStyle}>Descrição</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>Progresso (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        className="num-input"
                        value={progressAuto ? (project.progress ?? 0) : progress}
                        disabled={progressAuto}
                        onChange={(e) => setProgress(e.target.value)}
                        style={{ opacity: progressAuto ? 0.5 : 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        <Checkbox checked={progressAuto} onChange={(e) => setProgressAuto(e.target.checked)} />
                        Calcular automaticamente pelos agendamentos
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        <Checkbox checked={showProgress} onChange={(e) => setShowProgress(e.target.checked)} />
                        Mostrar progresso
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                        <Checkbox checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                        Projeto Privado 🔒
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Cancelar</span></Button>
                    <Button variant="primary" className="btn-modal" onClick={handleSave} disabled={saving || !name.trim()}><span>{saving ? 'Salvando...' : 'Salvar'}</span></Button>
                </div>
            </div>
        </div>
    );
}
