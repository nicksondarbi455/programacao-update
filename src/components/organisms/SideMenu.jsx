export function SideMenu({ activeTab, onSelectTab }) {
    return (
        <div className="side-menu" style={{ width: '220px', height: '100vh', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ height: '36px', objectFit: 'contain' }} 
                />
                <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.5px' }}>Painel NOC</span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                    onClick={() => onSelectTab('dashboard')} 
                    style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTab === 'dashboard' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                        color: '#fff',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                >
                    📊 Projetos
                </button>
                <button 
                    onClick={() => onSelectTab('users')} 
                    style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activeTab === 'users' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                        color: '#fff',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                >
                    👥 Usuários & Departamentos
                </button>
            </nav>
        </div>
    );
}