import { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';

// Janela para escrever (ou apenas ler) a nota de um evento
export function NoteModal({ target, readOnly, onSave, onClose }) {
    const [text, setText] = useState('');

    useEffect(() => {
        setText(target?.note || '');
    }, [target]);

    if (!target) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100003, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '10px', padding: '18px 20px', width: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Nota do evento</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>{target.groupName || 'Evento sem nome'}</div>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    readOnly={readOnly}
                    placeholder="Escreva a nota..."
                    rows={6}
                    style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '0.85rem',
                        border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit',
                        color: '#0f172a', background: readOnly ? '#f8fafc' : '#fff', outline: 'none'
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <Button variant="secondary" className="btn-modal" onClick={onClose}><span>{readOnly ? 'Fechar' : 'Cancelar'}</span></Button>
                    {!readOnly && (
                        <Button variant="primary" className="btn-modal" onClick={() => onSave(target.id, text.trim())}><span>Salvar</span></Button>
                    )}
                </div>
            </div>
        </div>
    );
}
