// Janela modal padrão do dashboard (fundo escurecido + caixa branca)
export function ModalShell({ title, width = 440, children }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(2px)'
        }}>
            <div style={{
                background: 'var(--th-surface)', padding: '25px', borderRadius: '12px',
                width: `${width}px`, maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', gap: '10px',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: 'var(--th-text)' }}>{title}</h3>
                {children}
            </div>
        </div>
    );
}
