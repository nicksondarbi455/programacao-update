import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Button } from '../components/atoms/Button';

const labelStyle = { fontSize: '0.75rem', color: '#475569', fontWeight: '700' };
const inputStyle = {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#f8fafc'
};

const translateError = (err) => {
    const msg = err?.message || '';
    if (msg.includes('Invalid login credentials')) return 'E-mail ou palavra-passe incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme o seu e-mail antes de iniciar sessão.';
    if (msg.includes('already registered')) return 'Este e-mail já está registado.';
    if (msg.includes('Password should be')) return 'A palavra-passe deve ter pelo menos 6 caracteres.';
    return msg || 'Ocorreu um erro. Tente novamente.';
};

export function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw error;
                // O App deteta a sessão via onAuthStateChange e troca de ecrã.
            } else {
                const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
                if (error) throw error;
                if (!data.session) {
                    setMessage({ type: 'info', text: 'Conta criada! Confirme o seu e-mail e depois inicie sessão.' });
                    setMode('login');
                }
            }
        } catch (err) {
            setMessage({ type: 'error', text: translateError(err) });
        } finally {
            setLoading(false);
        }
    };

    const isLogin = mode === 'login';

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{
                background: '#ffffff',
                padding: '35px 30px',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                width: '360px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '18px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: '800' }}>Painel NOC</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        {isLogin ? 'Aceda à gestão de programação de rede' : 'Crie a sua conta'}
                    </p>
                </div>

                <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={labelStyle}>E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="voce@empresa.com"
                            autoComplete="email"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={labelStyle}>Palavra-passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            minLength={6}
                            required
                            style={inputStyle}
                        />
                    </div>

                    {message && (
                        <p role="alert" style={{ fontSize: '0.75rem', color: message.type === 'error' ? '#dc2626' : '#16a34a', margin: '2px 0 0 0', textAlign: 'center', fontWeight: '600' }}>
                            {message.text}
                        </p>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={loading}
                        style={{
                            width: '180px',
                            height: '38px',
                            marginTop: '8px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            boxShadow: '0 4px 12px rgba(41, 20, 200, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
                    </Button>
                </form>

                <button
                    type="button"
                    onClick={() => { setMode(isLogin ? 'signup' : 'login'); setMessage(null); }}
                    style={{ background: 'none', border: 'none', color: '#2914c8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                >
                    {isLogin ? 'Não tem conta? Registe-se' : 'Já tem conta? Iniciar sessão'}
                </button>
            </div>
        </div>
    );
}
