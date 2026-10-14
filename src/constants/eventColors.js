// Cores disponíveis para os eventos unificados (faixas cinzas da tabela)
export const EVENT_COLORS = [
    { value: 'cinza', label: 'Cinza', hex: '#94a3b8', text: '#0f172a' },
    { value: 'azul', label: 'Azul', hex: '#93c5fd', text: '#0f172a' },
    { value: 'verde', label: 'Verde', hex: '#86efac', text: '#0f172a' },
    { value: 'amarelo', label: 'Amarelo', hex: '#fde68a', text: '#0f172a' },
    { value: 'vermelho', label: 'Vermelho', hex: '#fca5a5', text: '#0f172a' },
    { value: 'preto', label: 'Preto', hex: '#1e293b', text: '#ffffff' },
];

export const getEventColor = (value) =>
    EVENT_COLORS.find((c) => c.value === value) || EVENT_COLORS[0];
