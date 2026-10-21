// Menu lateral (estilo SB Admin) exibido após o login
const MENU_ITEMS = [
    { id: 'pastas', label: 'Pastas', icon: 'fa-solid fa-folder' },
    { id: 'usuarios', label: 'Usuários', icon: 'fa-solid fa-users' },
    { id: 'configuracoes', label: 'Configurações', icon: 'fa-solid fa-gear' },
    { id: 'sobre', label: 'Sobre', icon: 'fa-solid fa-circle-info' },
    { id: 'logs', label: 'Logs', icon: 'fa-solid fa-clipboard-list' },
];

export function SideMenu({ active, onSelect, userEmail, onLogout }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <i className="fa-solid fa-network-wired"></i>
                <span>Painel NOC</span>
            </div>

            <div className="sidebar-heading">Menu</div>

            <nav className="sidebar-nav">
                {MENU_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
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
                <button type="button" className="sidebar-logout" onClick={onLogout}>
                    <i className="fa-solid fa-right-from-bracket"></i>
                    <span>Terminar sessão</span>
                </button>
            </div>
        </aside>
    );
}
