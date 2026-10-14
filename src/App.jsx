import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { NocPage } from './pages/NocPage';

export default function App() {
    // undefined = a verificar sessão | null = sem sessão | objeto = sessão ativa
    const [session, setSession] = useState(undefined);
    const [currentProject, setCurrentProject] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            if (!newSession) setCurrentProject(null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (session === undefined) {
        return <p style={{ textAlign: 'center', marginTop: '40vh', color: '#64748b', fontFamily: 'DM Sans, sans-serif' }}>A carregar...</p>;
    }

    if (!session) {
        return <AuthPage />;
    }

    const user = { email: session.user.email };

    if (!currentProject) {
        return (
            <DashboardPage
                user={user}
                onSelectProject={(proj) => setCurrentProject(proj)}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <NocPage
            project={currentProject}
            userEmail={user.email}
            onBackToDashboard={() => setCurrentProject(null)}
        />
    );
}
