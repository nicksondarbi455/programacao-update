import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { NocPage } from './pages/NocPage';
import { UsersPage } from './pages/UsersPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SideMenu } from './components/organisms/SideMenu';
import { logAction, LOG_ACTIONS } from './services/logService';

// Textos das seções que ainda não têm conteúdo
const PLACEHOLDERS = {
    configuracoes: { title: 'Configurações', description: 'Em breve.' },
    sobre: { title: 'Sobre', description: 'Painel NOC: acompanhamento de programação de rede.' },
    logs: { title: 'Logs', description: 'Histórico de ações em preparação. O local de exibição ainda será definido.' }
};

// Minutos sem atividade do usuário até a sessão ser encerrada automaticamente
const INACTIVITY_MINUTES = 30;

export default function App() {
    // undefined = a verificar sessão | null = sem sessão | objeto = sessão ativa
    const [session, setSession] = useState(undefined);
    const [currentProject, setCurrentProject] = useState(null);
    const [section, setSection] = useState('pastas');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (_event === 'SIGNED_IN') logAction(LOG_ACTIONS.LOGIN);
            setSession(newSession);
            if (!newSession) {
                setCurrentProject(null);
                setSection('pastas');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Logout automático por inatividade: cada ação do usuário reinicia o contador
    useEffect(() => {
        if (!session) return;

        const limit = INACTIVITY_MINUTES * 120 * 1000;
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        let timer;

        const expire = async () => {
            await logAction(LOG_ACTIONS.LOGOUT, { details: { motivo: 'inatividade' } });
            await supabase.auth.signOut();
        };

        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(expire, limit);
        };

        events.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
        reset();

        return () => {
            clearTimeout(timer);
            events.forEach((evt) => window.removeEventListener(evt, reset));
        };
    }, [session]);

    const handleLogout = async () => {
        await logAction(LOG_ACTIONS.LOGOUT);
        await supabase.auth.signOut();
    };

    // Trocar de seção fecha qualquer projeto aberto
    const handleSelectSection = (id) => {
        setSection(id);
        setCurrentProject(null);
    };

    if (session === undefined) {
        return <p style={{ textAlign: 'center', marginTop: '40vh', color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>A carregar...</p>;
    }

    if (!session) {
        return <AuthPage />;
    }

    const user = { email: session.user.email };

    let content;
    if (section === 'pastas') {
        content = currentProject ? (
            <NocPage
                project={currentProject}
                userEmail={user.email}
                onBackToDashboard={() => setCurrentProject(null)}
            onProjectUpdated={(p) => setCurrentProject(p)}
            />
        ) : (
            <DashboardPage
                user={user}
                onSelectProject={(proj) => setCurrentProject(proj)}
                onLogout={handleLogout}
            />
        );
    } else if (section === 'usuarios') {
        content = <UsersPage currentUserEmail={user.email} />;
    } else {
        content = <PlaceholderPage {...PLACEHOLDERS[section]} />;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <SideMenu
                active={section}
                onSelect={handleSelectSection}
                userEmail={user.email}
                onLogout={handleLogout}
            />
            <main style={{ flex: 1, minWidth: 0 }}>
                {content}
            </main>
        </div>
    );
}
