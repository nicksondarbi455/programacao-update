// Menu lateral exibido após o login
const MENU_ITEMS = [
    { id: 'projetos', label: 'Projetos' },
    { id: 'usuario', label: 'Usuário' },
    { id: 'historico', label: 'Histórico' },
    { id: 'personalizacao', label: 'Personalização' },
    { id: 'sobre', label: 'Sobre' },
];

export function SideMenu({ active, onSelect, userEmail, onLogout }) {
    return (
        <aside style={{ width: '220px', flexShrink: 0, height: '100vh', boxSizing: 'border-box', background: '#1e293b', color: '#ffffff', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: '6px' }}>
            {MENU_ITEMS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: active === item.id ? '#2914c8' : 'transparent',
                        color: '#e2e8f0'
                    }}
                >
                    {item.label}
                </button>
            ))}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: '0 4px', fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all' }}>{userEmail}</p>
                <button
                    type="button"
                    onClick={onLogout}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: '#dc2626', color: '#ffffff' }}
                >
                    Terminar Sessão
                </button>
            </div>
        </aside>
    );
}
