import { useCallback, useEffect, useState } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { Button } from '../atoms/Button';
import { extractMentions, mentionToken, shortName } from '../../utils/mentions';

const ACTION_TEXT = {
    campo_alterado: (d) => `alterou "${d.campo}" de "${d.de || '—'}" para "${d.para || '—'}"`,
    evento_agendado: () => 'agendou o evento',
    evento_concluido: () => 'marcou o evento como feito',
    evento_reaberto: () => 'desmarcou o evento como feito',
    evento_removido: () => 'removeu o evento do agendamento'
};

// Texto com as menções destacadas
function renderBody(text) {
    return text.split(/(@\{[^}]+\})/g).map((part, i) => {
        const match = part.match(/^@\{([^}]+)\}$/);
        if (match) {
            return <strong key={i} style={{ color: '#2563eb' }}>@{shortName(match[1])}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
}

// Comentários e histórico de uma linha ou de um evento
export function CommentsModal({ target, projectId, people, currentEmail, isAdmin, onClose }) {
    const [tab, setTab] = useState('comentarios');
    const [comments, setComments] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [c, h] = await Promise.all([
                supabaseService.listComments(projectId, target.type, target.id),
                supabaseService.listHistory(projectId, target.type, target.id)
            ]);
            setComments(c);
            setHistory(h);
        } catch (err) {
            alert('Erro ao carregar: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId, target.type, target.id]);

    useEffect(() => {
        load();
    }, [load]);

    // Insere a menção no texto (ao final, separada por espaço)
    const mention = (email) => {
        if (!email) return;
        setBody((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${mentionToken(email)} `);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text) return;

        setSending(true);
        try {
            await supabaseService.addComment({
                projectId,
                targetType: target.type,
                targetId: target.id,
                targetDate: target.date,
                body: text,
                mentions: extractMentions(text)
            }, currentEmail);
            setBody('');
            await load();
        } catch (err) {
            alert('Erro ao enviar comentário: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (comment) => {
        if (!window.confirm('Excluir este comentário?')) return;
        try {
            await supabaseService.deleteComment(comment.id);
            await load();
        } catch (err) {
            alert('Erro ao excluir comentário: ' + err.message);
        }
    };

    const tabStyle = (active) => ({
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        padding: '6px 4px',
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        color: active ? '#0f172a' : '#64748b',
        fontSize: '0.8rem',
        fontFamily: 'inherit'
    });

    const title = target.type === 'linha'
        ? `Linha: ${target.label}`
        : `Evento: ${target.label}${target.date ? ` (${target.date.split('-').reverse().join('/')})` : ''}`;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100004, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--th-surface)', borderRadius: '10px', padding: '18px 20px', width: '460px', maxWidth: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ fontWeight: 700, color: 'var(--th-text)', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                </div>

                <div style={{ display: 'flex', gap: '14px', borderBottom: '1px solid var(--th-border)' }}>
                    <button type="button" onClick={() => setTab('comentarios')} style={tabStyle(tab === 'comentarios')}>
                        Comentários ({comments.length})
                    </button>
                    <button type="button" onClick={() => setTab('historico')} style={tabStyle(tab === 'historico')}>
                        Histórico
                    </button>
                </div>

                {tab === 'comentarios' && (
                    <>
                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '120px', maxHeight: '340px' }}>
                            {loading && comments.length === 0 && (
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted-2)' }}>Carregando...</p>
                            )}
                            {!loading && comments.length === 0 && (
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted-2)', fontStyle: 'italic' }}>Nenhum comentário ainda.</p>
                            )}
                            {comments.map((c) => {
                                const mentionsMe = (c.mentions || []).includes(currentEmail);
                                const canDelete = c.author_email === currentEmail || isAdmin;
                                return (
                                    <div key={c.id} style={{ background: mentionsMe ? '#fef3c7' : '#f8fafc', border: `1px solid ${mentionsMe ? '#fcd34d' : '#e2e8f0'}`, borderRadius: '8px', padding: '8px 10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.7rem', color: 'var(--th-muted)', marginBottom: '4px' }}>
                                            <span><strong style={{ color: 'var(--th-text-3)' }}>{c.author_email}</strong> · {new Date(c.created_at).toLocaleString('pt-BR')}</span>
                                            {canDelete && (
                                                <button type="button" onClick={() => handleDelete(c)} title="Excluir comentário" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem' }}>
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--th-text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {renderBody(c.body)}
                                        </div>
                                        {mentionsMe && (
                                            <div style={{ fontSize: '0.65rem', color: '#92400e', marginTop: '4px', fontWeight: 700 }}>
                                                <i className="fa-regular fa-at"></i> Você foi mencionado
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--th-border)', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <select
                                    value=""
                                    onChange={(e) => mention(e.target.value)}
                                    style={{ flex: 1, padding: '6px', fontSize: '0.75rem', border: '1px solid var(--th-border-strong)', borderRadius: '6px', background: 'var(--th-surface-2)' }}
                                >
                                    <option value="">Mencionar alguém...</option>
                                    {people.map((p) => (
                                        <option key={p.email} value={p.email}>{p.full_name ? `${p.full_name} (${p.email})` : p.email}</option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Escreva um comentário..."
                                rows={3}
                                maxLength={2000}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '0.85rem', border: '1px solid var(--th-border-strong)', borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Fechar</span></Button>
                                <Button type="submit" variant="primary" className="btn-modal" disabled={sending || !body.trim()}>
                                    <span>{sending ? 'Enviando...' : 'Comentar'}</span>
                                </Button>
                            </div>
                        </form>
                    </>
                )}

                {tab === 'historico' && (
                    <>
                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '120px', maxHeight: '400px' }}>
                            {loading && history.length === 0 && (
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted-2)' }}>Carregando...</p>
                            )}
                            {!loading && history.length === 0 && (
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted-2)', fontStyle: 'italic' }}>Nenhuma alteração registrada.</p>
                            )}
                            {history.map((h) => {
                                const text = ACTION_TEXT[h.action] ? ACTION_TEXT[h.action](h.details || {}) : h.action;
                                return (
                                    <div key={h.id} style={{ borderLeft: '3px solid var(--th-border-strong)', padding: '4px 10px', fontSize: '0.8rem', color: 'var(--th-text-3)' }}>
                                        <div><strong>{h.actor_email}</strong> {text}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--th-muted-2)' }}>{new Date(h.created_at).toLocaleString('pt-BR')}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Fechar</span></Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
