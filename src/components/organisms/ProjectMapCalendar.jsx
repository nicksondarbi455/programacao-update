import { useState } from 'react';

// Data no formato AAAA-MM-DD, pelo horário local (não pelo UTC)
export function dataLocal(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Calendário mensal: mostra um ponto nos dias com eventos e escolhe o dia selecionado
export function ProjectMapCalendar({ eventos, diaSelecionado, onSelecionarDia }) {
    const [mes, setMes] = useState(() => {
        const base = diaSelecionado ? new Date(`${diaSelecionado}T00:00:00`) : new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });

    const primeiroDia = mes.getDay();
    const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const contagem = {};
    eventos.forEach((e) => { contagem[e.data] = (contagem[e.data] || 0) + 1; });

    const celulas = [];
    for (let i = 0; i < primeiroDia; i++) celulas.push(null);
    for (let d = 1; d <= diasNoMes; d++) celulas.push(new Date(mes.getFullYear(), mes.getMonth(), d));

    const hoje = dataLocal(new Date());
    const navBotao = { background: 'none', border: '1px solid var(--th-border-strong)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', color: 'var(--th-text)' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--th-text)' }}>
                <button type="button" style={navBotao} onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button>
                <strong>{MESES[mes.getMonth()]} de {mes.getFullYear()}</strong>
                <button type="button" style={navBotao} onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Próximo mês">›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center' }}>
                {DIAS_SEMANA.map((d, i) => (
                    <span key={i} style={{ fontSize: '0.65rem', color: 'var(--th-muted)' }}>{d}</span>
                ))}
                {celulas.map((dia, i) => {
                    if (!dia) return <span key={`v${i}`} />;
                    const chave = dataLocal(dia);
                    const selecionado = chave === diaSelecionado;
                    const temEventos = contagem[chave] > 0;
                    return (
                        <button
                            key={chave}
                            type="button"
                            onClick={() => onSelecionarDia(chave)}
                            style={{
                                position: 'relative', padding: '5px 0', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                                border: chave === hoje ? '1px solid #2563eb' : '1px solid transparent',
                                background: selecionado ? '#2563eb' : 'var(--th-surface-2)',
                                color: selecionado ? '#ffffff' : 'var(--th-text)'
                            }}
                        >
                            {dia.getDate()}
                            {temEventos && (
                                <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: selecionado ? '#ffffff' : '#f59e0b' }} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
