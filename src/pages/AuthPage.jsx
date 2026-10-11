import { useState } from 'react';
import { storageService } from '../services/storageService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';

export function AuthPage({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [isForgot, setIsForgot] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = (e) => {
        e.preventDefault();
        let users = storageService.getUsers();

        if (isForgot) {
            let user = users.find(u => u.email === email);
            if (user) {
                setMessage(`A sua palavra-passe é: ${user.password}`);
            } else {
                setMessage('E-mail não encontrado.');
            }
            return;
        }

        if (isRegister) {
            if (users.some(u => u.email === email)) {
                setMessage('Este e-mail já está registado.');
                return;
            }
            let newUser = { email, password };
            users.push(newUser);
            storageService.saveUsers(users);
            storageService.setCurrentUser(newUser);
            onLoginSuccess(newUser);
        } else {
            let user = users.find(u => u.email === email && u.password === password);
            if (user) {
                storageService.setCurrentUser(user);
                onLoginSuccess(user);
            } else {
                setMessage('E-mail ou palavra-passe incorretos.');
            }
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9' }}>
            <div style={{ background: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#0f172a' }}>
                    {isForgot ? 'Recuperar Palavra-passe' : isRegister ? 'Criar Conta' : 'Painel NOC - Login'}
                </h2>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>E-mail</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@email.com" required />

                    {!isForgot && (
                        <>
                            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Palavra-passe</label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required />
                        </>
                    )}

                    {message && <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: 0 }}>{message}</p>}

                    <Button variant="primary" style={{ width: '100%', marginTop: '5px' }}>
                        {isForgot ? 'Recuperar' : isRegister ? 'Registar' : 'Entrar'}
                    </Button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '10px' }}>
                    <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => { setIsForgot(!isForgot); setMessage(''); }}>
                        {isForgot ? 'Voltar ao Login' : 'Esqueceu a senha?'}
                    </span>
                    {!isForgot && (
                        <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => { setIsRegister(!isRegister); setMessage(''); }}>
                            {isRegister ? 'Já tenho conta' : 'Criar nova conta'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}