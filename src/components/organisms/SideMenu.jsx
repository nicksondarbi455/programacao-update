import { Button } from '../atoms/Button';

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
        <aside className="side-menu" style={{ width: '220px', flexShrink: 0, height: '100vh', boxSizing: 'border-box', color: '#ffffff', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: '6px' }}>
            {MENU_ITEMS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={active === item.id ? 'btn' : 'nav-item'}
                    style={active === item.id ? { textAlign: 'left', width: '100%' } : undefined}
                >
                    {item.label}
                </button>
            ))}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: '0 4px', fontSize: '0.7rem', color: '#cbd5e1', wordBreak: 'break-all' }}>{userEmail}</p>
                <Button variant="danger" size="md" onClick={onLogout} style={{ width: '100%', padding: '8px 12px' }}>
                    Terminar Sessão
                </Button>
            </div>
        </aside>
    );
}
