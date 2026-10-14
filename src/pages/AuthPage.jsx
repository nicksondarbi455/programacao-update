import { useState } from 'react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';

export function AuthPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validação com as credenciais padrão do sistema
        if (username.trim() === 'admin' && password === 'noc@ultra') {
            onLoginSuccess({
                email: 'admin@noc.com',
                name: 'Administrador NOC',
                departmentId: 'dep_noc'
            });
        } else {
            setError('Credenciais inválidas. Utilize admin / noc@ultra');
        }
    };

    return (
        <div className="login-bg">
            <div style={{
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(12px)',
                padding: '40px 35px',
                borderRadius: '16px',
                width: '420px',
                maxWidth: '90%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Logo e Cabeçalho */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '25px' }}>
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                        style={{ height: '48px', objectFit: 'contain' }} 
                    />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>Painel NOC</h2>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Gestão Integrada e Agendamentos</span>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        color: '#991b1b',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        width: '100%',
                        marginBottom: '15px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                            Usuário
                        </label>
                        <Input 
                            type="text"
                            placeholder="Digite seu usuário..." 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                            Senha
                        </label>
                        <Input 
                            type="password"
                            placeholder="••••••••" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                        <Button variant="primary" style={{ width: '180px' }}>
                            Entrar no Sistema
                        </Button>
                    </div>
                </form>

                <div style={{ marginTop: '25px', borderTop: '1px solid #e2e8f0', paddingTop: '15px', width: '100%', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Sistema de Sincronização em Tempo Real (Supabase)</span>
                </div>
            </div>
        </div>
    );
}