import { useState } from 'react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';

export function AuthPage({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (isRegister) {
            if (!name.trim() || !username.trim() || !password.trim()) {
                setError('Preencha todos os campos para se cadastrar.');
                return;
            }
            // Regista novos utilizadores mantendo persistência
            const users = JSON.parse(localStorage.getItem('noc_registered_users') || '[]');
            if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
                setError('Este nome de usuário já está em uso.');
                return;
            }
            const newUser = {
                name: name.trim(),
                username: username.trim(),
                email: `${username.trim().toLowerCase()}@noc.com`,
                password: password,
                departmentId: 'dep_noc'
            };
            users.push(newUser);
            localStorage.setItem('noc_registered_users', JSON.stringify(users));
            setSuccessMsg('Conta criada com sucesso! Você já pode entrar.');
            setIsRegister(false);
            setPassword('');
        } else {
            // Login com conta admin padrão ou conta cadastrada
            const users = JSON.parse(localStorage.getItem('noc_registered_users') || '[]');
            const foundUser = users.find(
                u => (u.username.toLowerCase() === username.trim().toLowerCase() || u.email.toLowerCase() === username.trim().toLowerCase()) && u.password === password
            );

            if (foundUser) {
                onLoginSuccess(foundUser);
            } else if (username.trim() === 'admin' && password === 'noc@ultra') {
                onLoginSuccess({
                    email: 'admin@noc.com',
                    name: 'Administrador NOC',
                    departmentId: 'dep_noc'
                });
            } else {
                setError('Credenciais inválidas. Utilize admin / noc@ultra ou crie uma nova conta.');
            }
        }
    };

    return (
        <div className="login-bg">
            <div style={{
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(12px)',
                padding: '35px 30px',
                borderRadius: '16px',
                width: '420px',
                maxWidth: '90%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Logo com caminho relativo ./logo.png para funcionar no GitHub Pages */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                    <img 
                        src="./logo.png" 
                        alt="Logo" 
                        onError={(e) => {
                            if (!e.target.dataset.tried) {
                                e.target.dataset.tried = 'true';
                                e.target.src = 'logo.png';
                            }
                        }}
                        style={{ height: '48px', width: 'auto', objectFit: 'contain' }} 
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

                {successMsg && (
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#166534',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        width: '100%',
                        marginBottom: '15px',
                        textAlign: 'center'
                    }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {isRegister && (
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                Nome Completo
                            </label>
                            <Input 
                                type="text"
                                placeholder="Digite seu nome..." 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                required 
                                style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Usuário
                        </label>
                        <Input 
                            type="text"
                            placeholder="Digite seu usuário..." 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                            style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                            Senha
                        </label>
                        <Input 
                            type="password"
                            placeholder="••••••••" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                        <Button variant="primary" style={{ width: '200px', height: '38px' }}>
                            {isRegister ? 'Criar Minha Conta' : 'Entrar no Sistema'}
                        </Button>
                    </div>
                </form>

                {/* Botão de Alternância entre Entrar e Criar Conta */}
                <div style={{ marginTop: '18px', textAlign: 'center' }}>
                    <button 
                        type="button" 
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError('');
                            setSuccessMsg('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        {isRegister ? 'Já tem uma conta? Fazer Login' : 'Não tem conta? Criar nova conta'}
                    </button>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', width: '100%', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Sistema de Sincronização em Tempo Real (Supabase)</span>
                </div>
            </div>
        </div>
    );
}