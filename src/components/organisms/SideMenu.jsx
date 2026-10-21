export function SideMenu({ activeTab, onSelectTab }) {
    // Função para manter o botão selecionado com destaque
    const getBtnStyle = (isActive) => ({
        padding: '12px 14px',
        borderRadius: '6px',
        border: 'none',
        background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
        color: '#fff',
        textAlign: 'left',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.9rem'
    });

    return (
        <div className="side-menu" style={{ width: '250px', height: '100vh', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <img 
                    src="./logo.png" 
                    alt="Logo" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ height: '36px', objectFit: 'contain' }} 
                />
                <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.5px' }}>Painel NOC</span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => onSelectTab('dashboard')} style={getBtnStyle(activeTab === 'dashboard')}>
                    📊 Dashboard
                </button>
                
                <button onClick={() => onSelectTab('users')} style={getBtnStyle(activeTab === 'users')}>
                    👥 Usuários
                </button>

                <button onClick={() => onSelectTab('folders')} style={getBtnStyle(activeTab === 'folders')}>
                    📁 Pastas
                </button>

                <button onClick={() => onSelectTab('settings')} style={getBtnStyle(activeTab === 'settings')}>
                    ⚙️ Configurações
                </button>

                <button onClick={() => onSelectTab('logs')} style={getBtnStyle(activeTab === 'logs')}>
                    📝 Logs
                </button>

                <button onClick={() => onSelectTab('about')} style={getBtnStyle(activeTab === 'about')}>
                    ℹ️ Sobre
                </button>
            </nav>
        </div>
    );
}