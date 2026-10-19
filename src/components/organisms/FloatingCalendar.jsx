import { useState } from 'react';
import { Button } from '../atoms/Button';

const colorHexMap = {
    'vermelho': '#dc2626', 'azul': '#2914c8', 'verde': '#16a34a',
    'amarelo': '#d97706', 'preto': '#475569', 'padrao': '#2914c8'
};

export function FloatingCalendar({ isOpen, onToggle, schedules, equipments, onOpenModal, onToggleComplete, weekCount, tomorrowCount }) {

    // Dia sob o cursor: guarda apenas a referência e a posição; os itens são lidos
    // de "schedules" na renderização, para o balão refletir sempre o estado atual.
    const [hoverInfo, setHoverInfo] = useState(null);

    const showHover = (e, dateStr, label) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverInfo({
            dateStr,
            label,
            x: rect.left + rect.width / 2,
            top: rect.top,
            bottom: rect.bottom,
            above: rect.top > 220 // mostra acima do dia se houver espaço, senão abaixo
        });
    };
    const hideHover = () => setHoverInfo(null);

    const hoverItems = hoverInfo ? (schedules[hoverInfo.dateStr] || []) : [];

    // Gera os cards dos próximos 6 meses
    const renderMonths = () => {
        let months = [];
        let currentDate = new Date();
        for (let i = 0; i < 6; i++) {
            let monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            let year = monthDate.getFullYear();
            let month = monthDate.getMonth();
            let daysInMonth = new Date(year, month + 1, 0).getDate();
            let firstDayIndex = monthDate.getDay();
            let monthName = monthDate.toLocaleString('pt-BR', { month: 'long' });

            let days = [];
            for (let j = 0; j < firstDayIndex; j++) {
                days.push(<div key={`empty-${j}`} className="day-cell empty" />);
            }

            for (let d = 1; d <= daysInMonth; d++) {
                let dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                let daySched = schedules[dateStr] || [];
                let label = `${d} de ${monthName}`;

                days.push(
                    <div
                        key={dateStr}
                        className="day-cell"
                        onClick={() => onOpenModal(dateStr, label)}
                        onMouseEnter={(e) => showHover(e, dateStr, label)}
                        onMouseLeave={hideHover}
                    >
                        <div className="day-number">{d}</div>
                        {daySched.map((item, idx) => {
                            let eqMatch = equipments.find(eq => (eq.cpd || eq.id) === item.text);
                            let itemColor = eqMatch && eqMatch.color ? (colorHexMap[eqMatch.color] || '#2914c8') : '#2914c8';
                            return (
                                <div
                                    key={idx}
                                    className={`schedule-item ${item.completed ? 'completed' : ''}`}
                                    style={{ backgroundColor: itemColor }}
                                >
                                    {item.text}
                                </div>
                            );
                        })}
                    </div>
                );
            }

            months.push(
                <div key={i} className="month-card">
                    <div className="month-header">{monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</div>
                    <div className="days-grid">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((wd, index) => <div key={index} className="day-name">{wd}</div>)}
                        {days}
                    </div>
                </div>
            );
        }
        return months;
    };

    return (
        <div id="floating-calendar-container">
            <div className="floating-calendar-box" style={{ display: isOpen ? 'flex' : 'none' }}>
                <div className="floating-calendar-header">
                    <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#fff' }}>Calendário de Serviços</h3>
                    <button type="button" onClick={onToggle} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}><i className="fa-regular fa-circle-xmark" style={{ color: '#9ca3af' }}></i></button>
                </div>
                <div className="calendar-scroll-area" onScroll={hideHover}>
                    <div className="months-grid">{renderMonths()}</div>
                </div>
            </div>

            {/* Balão com os agendamentos do dia sob o cursor */}
            {isOpen && hoverInfo && (
                <div
                    style={{
                        position: 'fixed',
                        left: hoverInfo.x,
                        top: hoverInfo.above ? hoverInfo.top - 6 : hoverInfo.bottom + 6,
                        transform: hoverInfo.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                        zIndex: 100001,
                        pointerEvents: 'none',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        padding: '8px 10px',
                        minWidth: '170px',
                        maxWidth: '260px',
                        fontSize: '0.72rem',
                        color: '#1e293b',
                        fontFamily: 'DM Sans, sans-serif'
                    }}
                >
                    <div style={{ fontWeight: 'bold', color: '#2914c8', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                        {hoverInfo.label}
                    </div>
                    {hoverItems.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhum agendamento</div>
                    ) : (
                        hoverItems.map((item, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex', gap: '6px', alignItems: 'flex-start', padding: '2px 0',
                                    opacity: item.completed ? 0.6 : 1,
                                    textDecoration: item.completed ? 'line-through' : 'none'
                                }}
                            >
                                <span>{item.completed ? '✔' : '⏳'}</span>
                                <span style={{ wordBreak: 'break-word' }}>{item.text}</span>
                            </div>
                        ))
                    )}
                </div>
            )}

            <div className="calendar-btn-wrapper">
                {tomorrowCount > 0 && <div className="notif-badge badge-tomorrow">{tomorrowCount}</div>}
                {weekCount > 0 && <div className="notif-badge badge-week">{weekCount}</div>}
                <Button variant="primary" className="calendar-toggle-btn" onClick={onToggle}>Calendário</Button>
            </div>
        </div>
    );
}
