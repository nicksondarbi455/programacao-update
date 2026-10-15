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

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' };

const translateError = (err) => {
    const msg = err?.message || '';
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme o seu e-mail antes de iniciar sessão.';
    if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.';
    if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.';
    return msg || 'Ocorreu um erro. Tente novamente.';
};

// Em erros de senha os campos são limpos
const isPasswordError = (err) => {
    const msg = err?.message || '';
    return msg.includes('Invalid login credentials') || msg.includes('Password should be');
};

export function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [form, setForm] = useState(EMPTY_FORM);
    const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }
    const [loading, setLoading] = useState(false);

    const isLogin = mode === 'login';

    const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
    const clearForm = () => setForm(EMPTY_FORM);

    const switchMode = () => {
        setMode(isLogin ? 'signup' : 'login');
        setMessage(null);
        clearForm();
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const email = form.email.trim().toLowerCase();

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
                if (error) throw error;
                // O App deteta a sessão via onAuthStateChange e troca de ecrã.
                return;
            }

            if (form.password !== form.confirmPassword) {
                setMessage({ type: 'error', text: 'As senhas não coincidem.' });
                clearForm();
                return;
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password: form.password,
                options: { data: { full_name: form.name.trim() } }
            });
            if (error) throw error;

            clearForm();
            if (!data.session) {
                setMode('login');
                setMessage({ type: 'info', text: 'Conta criada! Confirme o seu e-mail, se solicitado, e depois inicie sessão.' });
            }
            // Com sessão ativa, o App troca de ecrã automaticamente.
        } catch (err) {
            setMessage({ type: 'error', text: translateError(err) });
            if (isPasswordError(err)) clearForm();
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        ...(!isLogin ? [{ key: 'name', label: 'Nome', type: 'text', autoComplete: 'name', placeholder: 'Seu nome completo' }] : []),
        { key: 'email', label: 'E-mail', type: 'email', autoComplete: 'email', placeholder: 'voce@empresa.com' },
        { key: 'password', label: 'Senha', type: 'password', autoComplete: isLogin ? 'current-password' : 'new-password', placeholder: '********', minLength: 6 },
        ...(!isLogin ? [{ key: 'confirmPassword', label: 'Confirmar senha', type: 'password', autoComplete: 'new-password', placeholder: '********', minLength: 6 }] : [])
    ];

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Painel Abacaxi" />
                </div>

                <div className="auth-form-panel">
                    <div style={{ textAlign: 'center' }}>
                        {isLogin && <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: '800' }}>Login</h2>}
                        <p style={{ margin: isLogin ? '4px 0 0 0' : 0, fontSize: '0.8rem', color: '#64748b' }}>
                            {isLogin ? 'Acesse a gestão de programação de rede' : 'Crie a sua conta'}
                        </p>
                    </div>

                <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                    {fields.map((field) => (
                        <div key={field.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={labelStyle}>{field.label}</label>
                            <input
                                type={field.type}
                                value={form[field.key]}
                                onChange={updateField(field.key)}
                                placeholder={field.placeholder}
                                autoComplete={field.autoComplete}
                                minLength={field.minLength}
                                required
                                style={inputStyle}
                            />
                        </div>
                    ))}

                    {message && (
                        <p role="alert" style={{ fontSize: '0.75rem', color: message.type === 'error' ? '#dc2626' : '#16a34a', margin: '2px 0 0 0', textAlign: 'center', fontWeight: '600' }}>
                            {message.text}
                        </p>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '8px' }}
                    >
                        {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
                    </Button>
                </form>

                <button
                    type="button"
                    onClick={switchMode}
                    style={{ background: 'none', border: 'none', color: '#2914c8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                >
                    {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Iniciar sessão'}
                </button>
                </div>
            </div>
        </div>
    );
}
