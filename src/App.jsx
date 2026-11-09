import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabase';
import { AuthPage } from './pages/AuthPage';
import { NewPasswordPage } from './pages/NewPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { NocPage } from './pages/NocPage';
import { UsersPage } from './pages/UsersPage';
import { TrashPage } from './pages/TrashPage';
import { MapPage } from './pages/MapPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LogsPage } from './pages/LogsPage';
import { SideMenu } from './components/organisms/SideMenu';
import { CommandPalette } from './components/organisms/CommandPalette';
import { logAction, LOG_ACTIONS } from './services/logService';
import { usersService } from './services/usersService';

const NO_ROLE = { isMaster: false, isAdmin: false, hasMapAccess: false };

// Textos das seções que ainda não têm conteúdo
const PLACEHOLDERS = {
    configuracoes: { title: 'Configurações', description: 'Em breve.' },
    sobre: { title: 'Sobre', description: 'Painel NOC: acompanhamento de programação de rede.' }
};

// Minutos sem atividade do usuário até a sessão ser encerrada automaticamente
const INACTIVITY_MINUTES = 30;

// Abaixo desta largura o menu vira uma gaveta (celular)
const MOBILE_QUERY = '(max-width: 768px)';

export default function App() {
    // undefined = a verificar sessão | null = sem sessão | objeto = sessão ativa
    const [session, setSession] = useState(undefined);
    const [recovering, setRecovering] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const [focusFolderId, setFocusFolderId] = useState(null);
    const [section, setSection] = useState('pastas');
    const [role, setRole] = useState(NO_ROLE);
    // Menu lateral fixado (expandido) ou recolhido (somente ícones), lembrado entre acessos
    const [menuPinned, setMenuPinned] = useState(() => localStorage.getItem('menuFixado') !== 'false');
    // Estado do menu antes de abrir um projeto (para restaurar ao sair)
    const menuBeforeProjectRef = useRef(null);
    // Pasta em que o usuário estava no dashboard (para voltar a ela ao sair de um projeto)
    const dashboardPathRef = useRef([]);
    const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    // Tema claro ou escuro, lembrado entre acessos
    const [theme, setTheme] = useState(() => localStorage.getItem('tema') || 'light');

    useEffect(() => {
        localStorage.setItem('tema', theme);
    }, [theme]);

    // O tema escuro vale só dentro do sistema: a tela de login fica sempre com a aparência original
    useEffect(() => {
        const dark = Boolean(session) && theme === 'dark';
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }, [theme, session]);


    useEffect(() => {
        const mq = window.matchMedia(MOBILE_QUERY);
        const onChange = () => setIsMobile(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            // Link do e-mail de recuperação: mostra a tela de nova senha
            if (event === 'PASSWORD_RECOVERY') setRecovering(true);
            setSession(newSession);
            if (!newSession) {
                setCurrentProject(null);
                menuBeforeProjectRef.current = null;
                dashboardPathRef.current = [];
                setSection('pastas');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Ctrl+K (ou ⌘K) abre a busca global
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((open) => !open);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Papel do utilizador (master / administrador), recarregado a cada login
    const userEmail = session?.user?.email;
    useEffect(() => {
        if (!userEmail) {
            setRole(NO_ROLE);
            return;
        }
        usersService.getRole(userEmail).then(setRole).catch(() => setRole(NO_ROLE));
    }, [userEmail]);

    // Logout automático por inatividade: cada ação do usuário reinicia o contador
    useEffect(() => {
        if (!session) return;

        const limit = INACTIVITY_MINUTES * 60 * 1000;
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

    // Abrir um projeto recolhe o menu para dar mais espaço à tela
    const handleOpenProject = (proj) => {
        if (menuBeforeProjectRef.current === null) menuBeforeProjectRef.current = menuPinned;
        setCurrentProject(proj);
        setMenuPinned(false);
    };

    // Sair do projeto devolve o menu ao estado em que estava antes
    const closeProject = () => {
        setCurrentProject(null);
        if (menuBeforeProjectRef.current !== null) {
            setMenuPinned(menuBeforeProjectRef.current);
            menuBeforeProjectRef.current = null;
        }
    };

    // Trocar de seção fecha qualquer projeto aberto
    const handleSelectSection = (id) => {
        setSection(id);
        closeProject();
        setDrawerOpen(false);
    };

    // Resultados da busca global (Ctrl+K)
    const handlePaletteProject = (proj) => {
        setPaletteOpen(false);
        setDrawerOpen(false);
        setSection('pastas');
        handleOpenProject(proj);
    };

    const handlePaletteFolder = (folderId) => {
        setPaletteOpen(false);
        setDrawerOpen(false);
        setSection('pastas');
        closeProject();
        setFocusFolderId(folderId);
    };

    if (session === undefined) {
        return <p style={{ textAlign: 'center', marginTop: '40vh', color: 'var(--th-muted)', fontFamily: 'DM Sans, sans-serif' }}>A carregar...</p>;
    }

    if (recovering) {
        return <NewPasswordPage onDone={() => setRecovering(false)} />;
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
                onBackToDashboard={closeProject}
                onProjectUpdated={(p) => setCurrentProject(p)}
            />
        ) : (
            <DashboardPage
                user={user}
                onSelectProject={handleOpenProject}
                onLogout={handleLogout}
                focusFolderId={focusFolderId}
                onFocusHandled={() => setFocusFolderId(null)}
                initialFolderPath={dashboardPathRef.current}
                onFolderPathChange={(path) => { dashboardPathRef.current = path; }}
            />
        );
    } else if (section === 'mapa') {
        content = role.hasMapAccess
            ? <MapPage userEmail={user.email} />
            : <PlaceholderPage title="Mapa" description="Acesso restrito. Peça ao administrador para liberar o acesso ao mapa." />;
    } else if (section === 'usuarios') {
        content = role.isAdmin
            ? <UsersPage currentUserEmail={user.email} />
            : <PlaceholderPage title="Usuários" description="Acesso restrito a administradores." />;
    } else if (section === 'lixeira') {
        content = <TrashPage isMaster={role.isMaster} />;
    } else if (section === 'logs') {
        content = role.isAdmin
            ? <LogsPage />
            : <PlaceholderPage title="Logs" description="Acesso restrito a administradores." />;
    } else {
        content = <PlaceholderPage {...PLACEHOLDERS[section]} />;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {isMobile && (
                <div className="mobile-topbar">
                    <button type="button" className="mobile-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <span className="mobile-title">Ne<span style={{ color: '#3f6cff' }}>x</span>T</span>
                </div>
            )}

            {isMobile && drawerOpen && (
                <div className="mobile-backdrop" onClick={() => setDrawerOpen(false)} />
            )}

            <SideMenu
                active={section}
                showUsers={role.isAdmin}
                showLogs={role.isAdmin}
                showMap={role.hasMapAccess}
                onSelect={handleSelectSection}
                userEmail={user.email}
                onLogout={handleLogout}
                pinned={isMobile ? true : menuPinned}
                onTogglePin={() => {
                    setMenuPinned((p) => {
                        localStorage.setItem('menuFixado', String(!p));
                        return !p;
                    });
                }}
                mobileOpen={isMobile && drawerOpen}
                theme={theme}
                onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            />

            <main style={{ flex: 1, minWidth: 0, paddingTop: isMobile ? '52px' : 0 }}>
                {content}
            </main>

            {paletteOpen && (
                <CommandPalette
                    userEmail={user.email}
                    onClose={() => setPaletteOpen(false)}
                    onOpenProject={handlePaletteProject}
                    onOpenFolder={handlePaletteFolder}
                />
            )}
        </div>
    );
}
