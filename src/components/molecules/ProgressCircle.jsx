// Círculo de progresso (estilo do modelo enviado), usado no card do projeto
export function ProgressCircle({ value = 0, size = 64 }) {
    const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
    const r = 65;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * pct) / 100;

    return (
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
            <svg viewBox="0 0 150 150" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="75" cy="75" r={r} fill="none" stroke="#f3f3f3" strokeWidth="10" />
                <circle
                    cx="75"
                    cy="75"
                    r={r}
                    fill="none"
                    stroke="#03a9f4"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', fontWeight: 700, fontSize: `${size * 0.22}px` }}>
                {pct}<span style={{ fontSize: `${size * 0.12}px` }}>%</span>
            </div>
        </div>
    );
}
