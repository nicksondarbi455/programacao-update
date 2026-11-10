import { ModalShell } from '../molecules/ModalShell';
import { Button } from '../atoms/Button';

const pad = (n) => String(n).padStart(2, '0');

// Data de conclusão no formato AAAA-MM-DD, no fuso local.
// Agendamentos concluídos antes desta versão não têm a data de conclusão gravada,
// então usam a data do agendamento.
const completionKey = (item, dateStr) => {
    if (!item.completedAt) return dateStr;
    const d = new Date(item.completedAt);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// AAAA-MM-DD -> DD/MM/AAAA
const formatDate = (key) => key.split('-').reverse().join('/');

export function RecurrenceHistoryModal({ schedules = {}, onClose }) {
    // Agrupa as datas de conclusão por evento
    const byEvent = {};
    Object.entries(schedules).forEach(([dateStr, items]) => {
        (items || []).forEach((item) => {
            if (!item.completed) return;
            if (!byEvent[item.text]) byEvent[item.text] = [];
            byEvent[item.text].push(completionKey(item, dateStr));
        });
    });

    const events = Object.entries(byEvent)
        .map(([text, dates]) => ({ text, dates: [...dates].sort().reverse() }))
        .sort((a, b) => a.text.localeCompare(b.text, 'pt-BR'));

    return (
        <ModalShell title="Histórico de conclusões" width={460}>
            {events.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--th-muted-2)', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '10px', background: 'var(--th-surface-2)', borderRadius: '6px' }}>
                    Nenhuma conclusão registrada ainda.
                </p>
            ) : (
                events.map((ev) => (
                    <div
                        key={ev.text}
                        style={{ padding: '10px 12px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                    >
                        <strong style={{ fontSize: '0.85rem', color: 'var(--th-text)' }}>{ev.text}</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {ev.dates.map((key, i) => (
                                <span
                                    key={`${key}-${i}`}
                                    style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'var(--th-tint-green)', color: '#16a34a', fontWeight: 600 }}
                                >
                                    {formatDate(key)}
                                </span>
                            ))}
                        </div>
                    </div>
                ))
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Fechar</span></Button>
            </div>
        </ModalShell>
    );
}
