import { useEffect, useState } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { plainBody } from '../../utils/mentions';

// Menções recentes ao usuário. Só aparece quando há alguma.
export function MentionsPanel({ email, onOpenProject }) {
    const [mentions, setMentions] = useState([]);

    useEffect(() => {
        if (!email) return;
        supabaseService.listMyMentions(email)
            .then(setMentions)
            .catch((err) => console.warn('Erro ao buscar menções:', err.message));
    }, [email]);

    if (mentions.length === 0) return null;

    return (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                <i className="fa-regular fa-at" style={{ color: '#2563eb', marginRight: '6px' }}></i>
                Menções para você
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {mentions.map((m) => {
                    const subject = m.target_type === 'evento'
                        ? `Evento: ${m.target_id.split('::')[1] || ''}`
                        : 'Linha';
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onOpenProject(m.project_id)}
                            style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                {m.projects?.name || 'Projeto'} · {m.author_email} · {new Date(m.created_at).toLocaleString('pt-BR')}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                                <strong>{subject}</strong> — {plainBody(m.body)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
