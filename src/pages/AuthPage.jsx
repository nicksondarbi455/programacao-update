import { useState } from 'react';
import { supabase } from '../services/supabase';

// Cadastro de conta oculto por enquanto. Para reativar, troque para true.
const SHOW_REGISTER = false;

// Modelo de input: o nome do campo fica dentro do input e sobe ao focar ou preencher
const authStyles = `
.auth-page .input-container {
  position: relative;
  margin: 28px auto;
  width: 100%;
  max-width: 260px;
}

.auth-page .input-container input {
  font-size: 14px;
  width: 100%;
  border: none;
  border-bottom: 2px solid #ccc;
  padding: 5px 0;
  background-color: transparent;
  outline: none;
  box-sizing: border-box;
  color: #0f172a;
}

.auth-page .input-container .label {
  position: absolute;
  top: 0;
  left: 0;
  color: #ccc;
  transition: all 0.3s ease;
  pointer-events: none;
}

.auth-page .input-container input:focus ~ .label,
.auth-page .input-container input:not(:placeholder-shown) ~ .label {
  top: -20px;
  font-size: 12px;
  color: #333;
}

.auth-page .input-container .underline {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background-color: #333;
  transform: scaleX(0);
  transition: all 0.3s ease;
}

.auth-page .auth-submit {
  background-color: #ffffff00;
  color: #3654ff;
  min-width: 8.5em;
  height: 2.9em;
  border: #3654ff 0.2em solid;
  border-radius: 11px;
  transition: all 0.6s ease;
  cursor: pointer;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  padding: 0 1em;
  white-space: nowrap;
}

.auth-page .auth-submit:hover:not(:disabled) {
  background-color: #3654ff;
  color: #fff;
}

.auth-page .auth-submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.auth-page .auth-submit svg {
  width: 1.6em;
  flex-shrink: 0;
  transition: all 0.6s ease;
}

.auth-page .auth-submit:hover:not(:disabled) svg {
  transform: translateX(5px);
}

.auth-page .auth-submit .text {
  margin: 0;
}

.auth-page .input-container input:focus ~ .underline,
.auth-page .input-container input:not(:placeholder-shown) ~ .underline {
  transform: scaleX(1);
}
`;

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
        ...(!isLogin ? [{ key: 'name', label: 'Nome', type: 'text', autoComplete: 'name' }] : []),
        { key: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
        { key: 'password', label: 'Senha', type: 'password', autoComplete: isLogin ? 'current-password' : 'new-password', minLength: 6 },
        ...(!isLogin ? [{ key: 'confirmPassword', label: 'Confirmar senha', type: 'password', autoComplete: 'new-password', minLength: 6 }] : [])
    ];

    return (
        <div className="auth-page">
            <style>{authStyles}</style>
            <div className="auth-card">
                <div className="auth-logo">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Painel Abacaxi" />
                </div>

                <div className="auth-form-panel">
                    <div style={{ textAlign: 'center' }}>
                        {isLogin && <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '0.5px' }}>Painel NOC</h1>}
                        {isLogin && <h2 style={{ margin: '10px 0 0 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: '700' }}>Login</h2>}
                        {!isLogin && <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Crie a sua conta</p>}
                    </div>

                    <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {fields.map((field) => (
                            <div key={field.key} className="input-container">
                                <input
                                    id={field.key}
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={updateField(field.key)}
                                    placeholder=" "
                                    autoComplete={field.autoComplete}
                                    minLength={field.minLength}
                                    required
                                />
                                <label htmlFor={field.key} className="label">{field.label}</label>
                                <div className="underline"></div>
                            </div>
                        ))}

                        {message && (
                            <p role="alert" style={{ fontSize: '0.75rem', color: message.type === 'error' ? '#dc2626' : '#16a34a', margin: '2px 0 0 0', textAlign: 'center', fontWeight: '600' }}>
                                {message.text}
                            </p>
                        )}

                        <button type="submit" className="auth-submit" disabled={loading}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                            </svg>
                            <div className="text">
                                {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
                            </div>
                        </button>
                    </form>

                    {SHOW_REGISTER && (
                        <button
                            type="button"
                            onClick={switchMode}
                            style={{ background: 'none', border: 'none', color: '#2914c8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', marginTop: '16px' }}
                        >
                            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Iniciar sessão'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
