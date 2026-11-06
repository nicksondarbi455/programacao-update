// Datas no fuso LOCAL do navegador.
// Não use toISOString() para "hoje": ele converte para UTC e, à noite no Brasil, já mostra o dia seguinte.

// Data no formato AAAA-MM-DD (o mesmo usado nas chaves da agenda)
export function localDateStr(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Converte AAAA-MM-DD em Date local (meia-noite)
export function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}
