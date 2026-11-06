import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Button } from '../components/atoms/Button';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid var(--th-border-strong)', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'inherit' };
const labelStyle = { fontSize: '0.75rem', color: 'var(--th-muted)', fontWeight: 'bold' };

// Aberta pelo link do e-mail de recuperação: define a nova senha
export function NewPasswordPage({ onDone }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }
        if (password !== confirm) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setLoading(true);
        setMessage(null);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setMessage({ type: 'error', text: error.message });
            return;
        }
        setDone(true);
    };

    const finish = async () => {
        await supabase.auth.signOut();
        onDone();
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--th-surface-3)', padding: '20px', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ background: 'var(--th-surface)', borderRadius: '12px', padding: '28px', width: '360px', maxWidth: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontFamily: "'Architects Daughter', cursive", fontSize: '2rem', color: 'var(--th-text)', lineHeight: 1 }}>
                    Ne<span style={{ color: '#3f6cff' }}>x</span>T
                </div>

                {done ? (
                    <>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#16a34a', fontWeight: 600 }}>Senha alterada com sucesso.</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted)' }}>Entre no sistema com a nova senha.</p>
                        <Button variant="primary" onClick={finish}>Ir para o login</Button>
                    </>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--th-text)' }}>Definir nova senha</h2>

                        <label style={labelStyle}>Nova senha</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" required style={inputStyle} />

                        <label style={labelStyle}>Confirmar nova senha</label>
                        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} autoComplete="new-password" required style={inputStyle} />

                        {message && (
                            <p role="alert" style={{ margin: 0, fontSize: '0.78rem', color: message.type === 'error' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{message.text}</p>
                        )}

                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar nova senha'}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
