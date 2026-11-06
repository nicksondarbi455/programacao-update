import { useEffect, useRef, useState } from 'react';
import { localDateStr, addDays, parseLocalDate } from '../../utils/dates';

const WINDOW_DAYS = 7;       // mostra eventos de hoje até 7 dias à frente
const REMIND_BEFORE_MIN = 15; // avisa 15 minutos antes do horário
const KEEP_AFTER_MIN = 60;    // o aviso continua visível até 1 hora depois

// Eventos pendentes de todos os projetos com calendário, do dia de hoje até WINDOW_DAYS
function collectEvents(projects, now) {
    const todayStr = localDateStr(now);
    const limitStr = localDateStr(addDays(now, WINDOW_DAYS));
    const events = [];

    projects.forEach((p) => {
        if (!p.hasCalendar) return;
        Object.entries(p.schedules || {}).forEach(([dateStr, items]) => {
            if (dateStr < todayStr || dateStr > limitStr) return;
            (items || []).forEach((item) => {
                if (item.completed) return;
                events.push({
                    key: `${p.id}|${dateStr}|${item.text}`,
                    projectId: p.id,
                    projectName: p.name,
                    dateStr,
                    text: item.text,
                    hora: item.hora || null
                });
            });
        });
    });

    events.sort((a, b) =>
        a.dateStr.localeCompare(b.dateStr) ||
        (a.hora || '99:99').localeCompare(b.hora || '99:99') ||
        a.projectName.localeCompare(b.projectName, 'pt-BR')
    );
    return events;
}

// Eventos de hoje com horário que estão na janela de aviso
function dueReminders(events, now) {
    const todayStr = localDateStr(now);
    return events.filter((e) => {
        if (e.dateStr !== todayStr || !e.hora) return false;
        const [h, m] = e.hora.split(':').map(Number);
        const at = new Date(now);
        at.setHours(h, m, 0, 0);
        const minutesUntil = (at - now) / 60000;
        return minutesUntil <= REMIND_BEFORE_MIN && minutesUntil >= -KEEP_AFTER_MIN;
    });
}

function dayLabel(dateStr, now) {
    const todayStr = localDateStr(now);
    const tomorrowStr = localDateStr(addDays(now, 1));
    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === tomorrowStr) return 'Amanhã';
    return parseLocalDate(dateStr).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

export function UpcomingPanel({ projects, onOpenProject }) {
    const [now, setNow] = useState(() => new Date());
    const [dismissed, setDismissed] = useState(() => new Set());
    const [permission, setPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
    );
    const notifiedRef = useRef(new Set());

    // Atualiza a hora a cada 30 segundos para os avisos aparecerem na hora certa
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const events = collectEvents(projects, now);
    const reminders = dueReminders(events, now).filter((e) => !dismissed.has(e.key));

    // Notificação do sistema: uma vez por evento
    useEffect(() => {
        if (permission !== 'granted') return;
        reminders.forEach((e) => {
            if (notifiedRef.current.has(e.key)) return;
            notifiedRef.current.add(e.key);
            new Notification(`Evento às ${e.hora}`, { body: `${e.text} · ${e.projectName}` });
        });
    });

    const requestPermission = async () => {
        if (typeof Notification === 'undefined') return;
        setPermission(await Notification.requestPermission());
    };

    const dismiss = (key) => setDismissed((prev) => new Set(prev).add(key));

    // Agrupa por dia
    const groups = [];
    events.forEach((e) => {
        const last = groups[groups.length - 1];
        if (last && last.dateStr === e.dateStr) last.items.push(e);
        else groups.push({ dateStr: e.dateStr, items: [e] });
    });

    return (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reminders.map((r) => (
                <div key={r.key} role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: 'var(--th-tint-amber)', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', color: '#78350f' }}>
                    <span>
                        <i className="fa-regular fa-bell"></i> <strong>{r.hora}</strong> · {r.text} <span style={{ color: '#a16207' }}>({r.projectName})</span>
                    </span>
                    <button type="button" onClick={() => dismiss(r.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78350f', fontWeight: 'bold' }}>
                        Ok
                    </button>
                </div>
            ))}

            <div style={{ background: 'var(--th-surface)', border: '1px solid var(--th-border)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--th-text)', fontSize: '0.95rem' }}>
                        <i className="fa-regular fa-calendar-days" style={{ color: '#4e73df', marginRight: '6px' }}></i>
                        Hoje e próximos {WINDOW_DAYS} dias
                    </strong>
                    {permission === 'default' && (
                        <button type="button" onClick={requestPermission} style={{ background: 'none', border: '1px solid var(--th-border-strong)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', color: 'var(--th-text-3)' }}>
                            <i className="fa-regular fa-bell"></i> Ativar avisos no navegador
                        </button>
                    )}
                </div>

                {groups.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--th-muted-2)' }}>Nenhum evento pendente nesse período.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {groups.map((g) => (
                            <div key={g.dateStr}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: g.dateStr === localDateStr(now) ? '#dc2626' : '#475569', textTransform: 'capitalize', marginBottom: '4px' }}>
                                    {dayLabel(g.dateStr, now)}
                                </div>
                                {g.items.map((e) => (
                                    <button
                                        key={e.key}
                                        type="button"
                                        onClick={() => onOpenProject(e.projectId)}
                                        style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border)', borderRadius: '6px', padding: '6px 10px', marginBottom: '4px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--th-text-2)' }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</span>
                                        <span style={{ display: 'flex', gap: '8px', flexShrink: 0, fontSize: '0.7rem', color: 'var(--th-muted)' }}>
                                            <span>{e.projectName}</span>
                                            <strong style={{ color: '#2563eb' }}>{e.hora || 'dia todo'}</strong>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
