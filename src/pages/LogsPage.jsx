import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabase';
import { Button } from '../components/atoms/Button';

// Registros por página (os mais recentes primeiro)
const PAGE_SIZE = 50;

// Rótulos amigáveis para os nomes padronizados em logService.js (LOG_ACTIONS)
const ACTION_LABELS = {
    login: 'Login',
    logout: 'Logout',
    agendar: 'Agendou evento',
    desagendar: 'Removeu evento',
    marcar_feito: 'Marcou como feito',
    desmarcar_feito: 'Desmarcou como feito',
    linha_criada: 'Linha criada',
    linha_excluida: 'Linha excluída',
    coluna_criada: 'Coluna criada',
    coluna_excluida: 'Coluna excluída',
    dados_criados: 'Dados criados',
    dados_editados: 'Dados editados',
    dados_removidos: 'Dados removidos',
    projeto_movido: 'Projeto movido',
    projeto_excluido: 'Projeto para a lixeira',
    projeto_restaurado: 'Projeto restaurado',
    pasta_criada: 'Pasta criada',
    pasta_editada: 'Pasta editada',
    pasta_excluida: 'Pasta para a lixeira',
    pasta_restaurada: 'Pasta restaurada',
    lixeira_esvaziada: 'Lixeira esvaziada',
    usuario_criado: 'Usuário criado',
    usuario_excluido: 'Usuário excluído',
    admin_concedido: 'Administrador concedido',
    admin_removido: 'Administrador removido',
    senha_redefinida: 'Senha redefinida',
    login_falhou: 'Login falhou',
    departamento_criado: 'Departamento criado',
    departamento_renomeado: 'Departamento renomeado',
    departamento_excluido: 'Departamento excluído',
    acesso_departamento_definido: 'Acesso a departamento definido',
    acesso_departamento_removido: 'Acesso a departamento removido',
    projeto_duplicado: 'Projeto duplicado',
    pasta_movida: 'Pasta movida',
    acesso_mapa_alterado: 'Acesso ao mapa alterado'
};

const thStyle = {
    height: 'auto',
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--th-text-4)',
    background: 'var(--th-surface-3)',
    borderBottom: '1px solid var(--th-border)',
    whiteSpace: 'nowrap'
};

const tdStyle = {
    height: 'auto', // a regra global de th/td fixa 32px e cortaria os detalhes
    padding: '10px 12px',
    fontSize: '0.8rem',
    color: 'var(--th-text-3)',
    borderBottom: '1px solid var(--th-surface-3)',
    verticalAlign: 'top',
    whiteSpace: 'normal',
    overflow: 'visible',
    textOverflow: 'clip'
};

const tagStyle = {
    display: 'inline-block',
    marginRight: '6px',
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'var(--th-tint-blue)',
    color: 'var(--th-tag-fg)',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase'
};

// Nomes em português para as chaves gravadas em "details"
const DETAIL_LABELS = {
    navegador: 'Navegador',
    sistema: 'Sistema',
    dispositivo: 'Dispositivo',
    ip: 'IP',
    idioma: 'Idioma',
    fuso_horario: 'Fuso horário',
    tela: 'Tela',
    data: 'Data',
    evento: 'Evento',
    motivo: 'Motivo',
    nome: 'Nome',
    destino: 'Destino',
    dentro_de: 'Dentro de',
    departamentos: 'Departamentos',
    email: 'E-mail',
    nivel: 'Nível de acesso',
    departamento: 'Departamento',
    id: 'ID'
};

// Mostra cada detalhe em sua própria linha: "Navegador: Chrome 130"
function DetailsList({ details }) {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
        return '-';
    }

    return Object.entries(details).map(([key, value]) => (
        <div key={key}>
            <span style={{ fontWeight: 600, color: 'var(--th-text-4)' }}>{DETAIL_LABELS[key] || key}:</span>{' '}
            {value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </div>
    ));
}

// Página restrita a administradores e master (o App só a mostra para eles)

const PERIODS = [
    { value: 'todos', label: 'Todo o período' },
    { value: 'hoje', label: 'Hoje' },
    { value: '7dias', label: 'Últimos 7 dias' },
    { value: '30dias', label: 'Últimos 30 dias' },
    { value: 'personalizado', label: 'Personalizado' }
];

const EMPTY_FILTERS = { user: '', action: '', period: 'todos', from: '', to: '' };

const fieldInput = { padding: '7px 9px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--th-text)', fontFamily: 'inherit' };
const fieldLabel = { fontSize: '0.7rem', color: 'var(--th-muted)', fontWeight: 'bold', marginBottom: '3px', display: 'block' };

// Escapa % e _ para a busca por texto não tratar esses caracteres como curingas
const escapeLike = (s) => s.replace(/[%_\\]/g, (c) => '\\' + c);

// Intervalo de datas conforme o período escolhido (fuso do navegador)
function periodRange(period, from, to) {
    const now = new Date();
    if (period === 'hoje') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
    }
    if (period === '7dias') return { start: new Date(now.getTime() - 7 * 86400000), end: now };
    if (period === '30dias') return { start: new Date(now.getTime() - 30 * 86400000), end: now };
    if (period === 'personalizado') {
        return {
            start: from ? new Date(`${from}T00:00:00`) : null,
            end: to ? new Date(`${to}T23:59:59.999`) : null
        };
    }
    return { start: null, end: null };
}

// Monta a consulta com os filtros atuais (usada pela tabela e pela exportação)
function buildQuery(filters) {
    let query = supabase
        .from('activity_logs')
        .select('id, created_at, user_email, action, entity_type, project_id, details', { count: 'exact' });

    if (filters.user.trim()) {
        query = query.ilike('user_email', `%${escapeLike(filters.user.trim())}%`);
    }
    if (filters.action) {
        query = query.eq('action', filters.action);
    }
    const { start, end } = periodRange(filters.period, filters.from, filters.to);
    if (start && !isNaN(start)) query = query.gte('created_at', start.toISOString());
    if (end && !isNaN(end)) query = query.lte('created_at', end.toISOString());

    return query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
}

// Detalhes em texto único (usado na exportação): "Navegador: Chrome 130; IP: 1.2.3.4"
function detailsToText(details) {
    if (!details || typeof details !== 'object') return '';
    return Object.entries(details)
        .map(([key, value]) => `${DETAIL_LABELS[key] || key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join('; ');
}

export function LogsPage() {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [userDraft, setUserDraft] = useState('');
    const [page, setPage] = useState(0);
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const load = useCallback(async () => {
        setLoading(true);
        const from = page * PAGE_SIZE;
        const { data, error: queryError, count } = await buildQuery(filters).range(from, from + PAGE_SIZE - 1);

        if (queryError) {
            console.error('Erro ao buscar logs:', queryError);
            setError(queryError.message);
            setLogs([]);
            setTotal(0);
        } else {
            setError('');
            setLogs(data || []);
            setTotal(count || 0);
        }
        setLoading(false);
    }, [filters, page]);

    useEffect(() => {
        load();
    }, [load]);

    // Qualquer mudança de filtro volta para a primeira página
    const updateFilter = (patch) => {
        setFilters((prev) => ({ ...prev, ...patch }));
        setPage(0);
    };

    const applyUserFilter = () => updateFilter({ user: userDraft });

    const clearFilters = () => {
        setUserDraft('');
        setFilters(EMPTY_FILTERS);
        setPage(0);
    };

    const handleExport = async () => {
        const MAX_ROWS = 10000;
        const CHUNK = 1000;
        setExporting(true);
        try {
            const rows = [];
            for (let from = 0; from < MAX_ROWS; from += CHUNK) {
                const { data, error: queryError } = await buildQuery(filters).range(from, from + CHUNK - 1);
                if (queryError) throw queryError;
                rows.push(...(data || []));
                if (!data || data.length < CHUNK) break;
            }

            if (rows.length === 0) {
                alert('Nenhum registro para exportar com estes filtros.');
                return;
            }

            const sheet = rows.map((r) => ({
                'Data/Hora': new Date(r.created_at).toLocaleString('pt-BR'),
                'Usuário': r.user_email || 'Sistema',
                'Ação': ACTION_LABELS[r.action] || r.action,
                'Entidade': r.entity_type || '',
                'Projeto': r.project_id || '',
                'Detalhes': detailsToText(r.details)
            }));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet), 'Logs');
            XLSX.writeFile(workbook, `logs_${new Date().toISOString().slice(0, 10)}.xlsx`);

            if (rows.length >= MAX_ROWS) {
                alert(`A exportação foi limitada a ${MAX_ROWS} registros. Refine os filtros para exportar o restante.`);
            }
        } catch (err) {
            alert('Erro ao exportar: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    const actionOptions = Object.entries(ACTION_LABELS).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));

    return (
        <div className="main-content" style={{ height: 'calc(100vh - 20px)', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Logs de Atividade</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--th-muted)' }}>
                            {loading ? 'Carregando...' : `${total} ${total === 1 ? 'registro encontrado' : 'registros encontrados'}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="secondary" onClick={handleExport} disabled={exporting || loading}>
                            <i className="fa-regular fa-file-excel"></i> {exporting ? 'Exportando...' : 'Exportar Excel'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>Atualizar</Button>
                    </div>
                </div>

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--th-surface)', border: '1px solid var(--th-border)', borderRadius: '10px', padding: '12px' }}>
                    <div>
                        <label style={fieldLabel}>Usuário</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                value={userDraft}
                                onChange={(e) => setUserDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') applyUserFilter(); }}
                                placeholder="E-mail..."
                                style={{ ...fieldInput, width: '200px' }}
                            />
                            <Button size="sm" variant="secondary" onClick={applyUserFilter}>Filtrar</Button>
                        </div>
                    </div>

                    <div>
                        <label style={fieldLabel}>Ação</label>
                        <select value={filters.action} onChange={(e) => updateFilter({ action: e.target.value })} style={fieldInput}>
                            <option value="">Todas as ações</option>
                            {actionOptions.map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={fieldLabel}>Período</label>
                        <select value={filters.period} onChange={(e) => updateFilter({ period: e.target.value })} style={fieldInput}>
                            {PERIODS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {filters.period === 'personalizado' && (
                        <>
                            <div>
                                <label style={fieldLabel}>De</label>
                                <input type="date" value={filters.from} onChange={(e) => updateFilter({ from: e.target.value })} style={fieldInput} />
                            </div>
                            <div>
                                <label style={fieldLabel}>Até</label>
                                <input type="date" value={filters.to} onChange={(e) => updateFilter({ to: e.target.value })} style={fieldInput} />
                            </div>
                        </>
                    )}

                    <Button size="sm" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
                </div>

                {error && (
                    <p role="alert" style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', background: 'var(--th-tint-red)', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px' }}>
                        ⚠️ Erro ao carregar logs: {error}
                    </p>
                )}

                <div style={{ background: 'var(--th-surface)', border: '1px solid var(--th-border)', borderRadius: '10px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, width: '150px' }}>Data/Hora</th>
                                <th style={{ ...thStyle, width: '200px' }}>Usuário</th>
                                <th style={{ ...thStyle, width: '170px' }}>Ação</th>
                                <th style={{ ...thStyle, width: '190px' }}>Entidade / Projeto</th>
                                <th style={thStyle}>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '24px', color: 'var(--th-muted)' }}>
                                        Carregando registros...
                                    </td>
                                </tr>
                            )}

                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '24px', color: 'var(--th-muted)' }}>
                                        Nenhum registro encontrado com estes filtros.
                                    </td>
                                </tr>
                            )}

                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                                        {log.user_email || 'Sistema'}
                                    </td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>
                                        {ACTION_LABELS[log.action] || log.action}
                                    </td>
                                    <td style={tdStyle}>
                                        {log.entity_type && <span style={tagStyle}>{log.entity_type}</span>}
                                        {log.project_id || '-'}
                                    </td>
                                    <td style={{ ...tdStyle, overflowWrap: 'anywhere' }}>
                                        <DetailsList details={log.details} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--th-text-4)' }}>
                    <span>Página {page + 1} de {totalPages}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <Button size="sm" variant="secondary" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
                            Anterior
                        </Button>
                        <Button size="sm" variant="secondary" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                            Próxima
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
