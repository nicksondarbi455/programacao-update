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

// Uma linha por conclusão: o mesmo evento aparece em cards separados para cada data.
// Ordem: conclusões mais recentes primeiro.
export function RecurrenceHistoryModal({ schedules = {}, onClose }) {
    const entries = [];
    Object.entries(schedules).forEach(([dateStr, items]) => {
        (items || []).forEach((item) => {
            if (!item.completed) return;
            entries.push({ text: item.text, key: completionKey(item, dateStr) });
        });
    });

    entries.sort((a, b) => b.key.localeCompare(a.key) || a.text.localeCompare(b.text, 'pt-BR'));

    return (
        <ModalShell title="Histórico de conclusões" width={460}>
            {entries.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--th-muted-2)', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '10px', background: 'var(--th-surface-2)', borderRadius: '6px' }}>
                    Nenhuma conclusão registrada ainda.
                </p>
            ) : (
                entries.map((entry, i) => (
                    <div
                        key={`${entry.key}-${entry.text}-${i}`}
                        style={{ padding: '10px 12px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
                    >
                        <strong style={{ fontSize: '0.85rem', color: 'var(--th-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.text}
                        </strong>
                        <span style={{ flexShrink: 0, fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'var(--th-tint-green)', color: '#16a34a', fontWeight: 600 }}>
                            {formatDate(entry.key)}
                        </span>
                    </div>
                ))
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Fechar</span></Button>
            </div>
        </ModalShell>
    );
}
