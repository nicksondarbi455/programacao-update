// Tela simples para seções que ainda não têm conteúdo
export function PlaceholderPage({ title, description }) {
    return (
        <div style={{ padding: '32px 28px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--th-text)' }}>{title}</h2>
            <p style={{ marginTop: '8px', color: 'var(--th-muted)', fontSize: '0.9rem' }}>{description}</p>
        </div>
    );
}
