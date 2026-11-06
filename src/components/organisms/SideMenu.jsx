// Menu lateral (estilo SB Admin) exibido após o login
const MENU_ITEMS = [
    { id: 'pastas', label: 'Pastas', icon: 'fa-regular fa-paste' },
    { id: 'lixeira', label: 'Lixeira', icon: 'fa-regular fa-trash-can' },
    { id: 'usuarios', label: 'Usuários', icon: 'fa-solid fa-users' },
    { id: 'configuracoes', label: 'Configurações', icon: 'fa-solid fa-gear' },
    { id: 'sobre', label: 'Sobre', icon: 'fa-solid fa-circle-info' },
    { id: 'logs', label: 'Logs', icon: 'fa-regular fa-rectangle-list' },
];

export function SideMenu({
    active,
    onSelect,
    userEmail,
    onLogout,
    showUsers = false,
    showLogs = false,
    pinned = true,
    onTogglePin,
    mobileOpen = false,
    theme = 'light',
    onToggleTheme
}) {
    // Menu não fixado mostra somente os ícones
    const collapsed = !pinned;

    // "Usuários" só para o master; "Logs" para administradores e master
    const visibleItems = MENU_ITEMS.filter((item) => {
        if (item.id === 'usuarios') return showUsers;
        if (item.id === 'logs') return showLogs;
        return true;
    });

    return (
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
            <div className="sidebar-brand">
                <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="NexT"
                    className="sidebar-logo"
                />
                <span className="sidebar-brand-name">Ne<span style={{ color: '#3f6cff' }}>x</span>T</span>
                <button
                    type="button"
                    className="sidebar-pin"
                    onClick={onTogglePin}
                    title={pinned ? 'Desafixar menu' : 'Fixar menu'}
                    aria-label={pinned ? 'Desafixar menu' : 'Fixar menu'}
                >
                    <i
                        className="fa-solid fa-thumbtack"
                        style={{ transform: pinned ? 'none' : 'rotate(45deg)' }}
                    ></i>
                </button>
            </div>

            <nav className="sidebar-nav">
                {visibleItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => onSelect(item.id)}
                        className={`sidebar-item${active === item.id ? ' active' : ''}`}
                    >
                        <i className={item.icon}></i>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <p className="sidebar-email">{userEmail}</p>
                <button
                    type="button"
                    className="sidebar-logout"
                    onClick={onToggleTheme}
                    title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
                >
                    <i className={theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
                    <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
                </button>
                <button
                    type="button"
                    className="sidebar-logout"
                    onClick={onLogout}
                    title="Terminar sessão"
                >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    <span>Terminar sessão</span>
                </button>
            </div>
        </aside>
    );
}
