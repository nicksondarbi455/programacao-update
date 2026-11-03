import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Button } from '../components/atoms/Button';

// Quantidade de registros exibidos (os mais recentes primeiro)
const LIMIT = 100;

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
    dados_removidos: 'Dados removidos'
};

const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#475569',
    background: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '10px 12px',
    fontSize: '0.8rem',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
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
    background: '#eef2ff',
    color: '#3730a3',
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
    motivo: 'Motivo'
};

// Mostra cada detalhe em sua própria linha: "Navegador: Chrome 130"
function DetailsList({ details }) {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
        return '-';
    }

    return Object.entries(details).map(([key, value]) => (
        <div key={key}>
            <span style={{ fontWeight: 600, color: '#475569' }}>{DETAIL_LABELS[key] || key}:</span>{' '}
            {value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </div>
    ));
}

// Página restrita a administradores e master (o App só a mostra para eles)
export function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error: queryError } = await supabase
            .from('activity_logs')
            .select('id, created_at, user_email, action, entity_type, project_id, details')
            .order('created_at', { ascending: false })
            .limit(LIMIT);

        if (queryError) {
            console.error('Erro ao buscar logs:', queryError);
            setError(queryError.message);
            setLogs([]);
        } else {
            setError('');
            setLogs(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem' }}>Logs de Atividade</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        Últimos {LIMIT} registros do sistema, do mais recente para o mais antigo.
                    </p>
                </div>
                <Button size="sm" onClick={load} disabled={loading}>
                    {loading ? 'Carregando...' : 'Atualizar'}
                </Button>
            </div>

            {error && (
                <p role="alert" style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px' }}>
                    ⚠️ Erro ao carregar logs: {error}
                </p>
            )}

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Data/Hora</th>
                            <th style={thStyle}>Usuário</th>
                            <th style={thStyle}>Ação</th>
                            <th style={thStyle}>Entidade / Projeto</th>
                            <th style={thStyle}>Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && logs.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                    Carregando registros...
                                </td>
                            </tr>
                        )}

                        {!loading && logs.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                    Nenhum registro encontrado.
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
                                <td style={{ ...tdStyle, minWidth: '260px' }}>
                                    <DetailsList details={log.details} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
