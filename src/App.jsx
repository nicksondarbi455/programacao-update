import { useState } from 'react';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { NocPage } from './pages/NocPage';
import { SideMenu } from './components/organisms/SideMenu';

// IMPORTANTE: Importe o seu componente de Logs aqui (exemplo abaixo)
// import { LogsPage } from './pages/LogsPage'; 

export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('noc_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentProject, setCurrentProject] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    const handleLogin = (loggedInUser) => {
        localStorage.setItem('noc_user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        localStorage.removeItem('noc_user');
        setUser(null);
        setCurrentProject(null);
    };

    // 1. Tela de Login continua a ser a primeira coisa apresentada
    if (!user) {
        return <AuthPage onLoginSuccess={handleLogin} />;
    }

    // 2. Layout Principal Pós-Login
    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
            
            {/* Menu Lateral Fixo na Esquerda */}
            <SideMenu activeTab={activeTab} onSelectTab={setActiveTab} />
            
            {/* Conteúdo Central Dinâmico */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                
                {/* 📊 CONTEÚDO ATUAL: Painel e Tabela (mantido intacto) */}
                {activeTab === 'dashboard' && !currentProject && (
                    <DashboardPage 
                        user={user} 
                        onSelectProject={(proj) => setCurrentProject(proj)} 
                        onLogout={handleLogout} 
                    />
                )}

                {activeTab === 'dashboard' && currentProject && (
                    <NocPage 
                        project={currentProject} 
                        userEmail={user.email} 
                        onBackToDashboard={() => setCurrentProject(null)} 
                    />
                )}

                {/* 📝 ABA LOGS: Vinculando sua implementação existente */}
                {activeTab === 'logs' && (
                    <div style={{ padding: '30px' }}>
                        {/* Se o seu arquivo for LogsPage, descomente a linha abaixo */}
                        {/* <LogsPage /> */}
                        
                        <h2>📝 Logs do Sistema</h2>
                        <p>Aqui carrega o seu componente de Logs já implementado.</p>
                    </div>
                )}

                {/* 🚧 ABAS EM CONSTRUÇÃO (Apenas visuais, sem função por enquanto) */}
                {activeTab === 'users' && (
                    <div style={{ padding: '30px' }}>
                        <h2>👥 Usuários</h2>
                        <p>Funcionalidade em desenvolvimento...</p>
                    </div>
                )}

                {activeTab === 'folders' && (
                    <div style={{ padding: '30px' }}>
                        <h2>📁 Pastas</h2>
                        <p>Funcionalidade em desenvolvimento...</p>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={{ padding: '30px' }}>
                        <h2>⚙️ Configurações</h2>
                        <p>Funcionalidade em desenvolvimento...</p>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div style={{ padding: '30px' }}>
                        <h2>ℹ️ Sobre</h2>
                        <p>Painel NOC - Versão 1.0. Sistema de gestão integrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}