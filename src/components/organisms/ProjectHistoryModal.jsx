import { useEffect, useMemo, useState } from 'react';
import { ModalShell } from '../molecules/ModalShell';
import { Button } from '../atoms/Button';
import { supabaseService } from '../../services/supabaseService';

// Quantos registros aparecem por vez (o botão "Mostrar mais" libera o restante)
const PAGINA = 100;

const TIPOS = [
    { id: 'todos', label: 'Todos os registros' },
    { id: 'agendamento', label: 'Agendamentos' },
    { id: 'conclusao', label: 'Conclusões' },
    { id: 'reabertura', label: 'Reaberturas' },
    { id: 'cancelamento', label: 'Cancelamentos' },
    { id: 'edicao', label: 'Alterações de dados' },
    { id: 'observacao', label: 'Observações' }
];

const INFO_TIPO = {
    agendamento: { label: 'Agendado', cor: '#1d4ed8', fundo: '#dbeafe' },
    conclusao: { label: 'Concluído', cor: '#15803d', fundo: '#dcfce7' },
    reabertura: { label: 'Reaberto', cor: '#b45309', fundo: '#fef3c7' },
    cancelamento: { label: 'Cancelado', cor: '#b91c1c', fundo: '#fee2e2' },
    edicao: { label: 'Alteração', cor: '#6d28d9', fundo: '#ede9fe' },
    observacao: { label: 'Observação', cor: '#0e7490', fundo: '#cffafe' }
};

// Ação gravada em item_history -> tipo mostrado na tela
const TIPO_DA_ACAO = {
    evento_agendado: 'agendamento',
    evento_concluido: 'conclusao',
    evento_reaberto: 'reabertura',
    evento_removido: 'cancelamento',
    campo_alterado: 'edicao'
};

const FILTROS_VAZIOS = { busca: '', tipo: 'todos', responsavel: '', periodoPor: 'registro', de: '', ate: '' };

const pad = (n) => String(n).padStart(2, '0');

// Dia local (AAAA-MM-DD) de um timestamp
const chaveDoDia = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// AAAA-MM-DD -> DD/MM/AAAA
const dataBR = (chave) => (chave ? chave.split('-').reverse().join('/') : '—');

// Timestamp -> DD/MM/AAAA HH:MM (horário local)
const dataHoraBR = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Junta as ações (item_history) e as observações (item_comments) em uma lista única, mais recente primeiro
function montarRegistros(historico, comentarios, nomeDaLinha) {
    const registros = [];

    historico.forEach((h) => {
        const tipo = TIPO_DA_ACAO[h.action];
        if (!tipo) return;
        const d = h.details || {};
        registros.push({
            id: `h-${h.id}`,
            quando: h.created_at,
            tipo,
            item: h.target_label || h.target_id,
            responsavel: h.actor_email,
            agendadoPara: d.data || null,
            horario: d.horario || null,
            detalhe: h.action === 'campo_alterado'
                ? `${d.campo || 'Campo'}: "${d.de ?? ''}" → "${d.para ?? ''}"`
                : ''
        });
    });

    comentarios.forEach((c) => {
        const item = c.target_type === 'linha'
            ? nomeDaLinha(c.target_id)
            : (String(c.target_id).split('::')[1] || c.target_id);
        registros.push({
            id: `c-${c.id}`,
            quando: c.created_at,
            tipo: 'observacao',
            item,
            responsavel: c.author_email,
            agendadoPara: c.target_date || null,
            horario: null,
            detalhe: c.body
        });
    });

    return registros.sort((a, b) => new Date(b.quando) - new Date(a.quando));
}

// Exporta a lista atual (já filtrada) em CSV, com ; como separador (abre direto no Excel do Brasil)
function exportarCsv(lista) {
    const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const cabecalho = ['Registro', 'Tipo', 'Item', 'Responsável', 'Data agendada', 'Horário', 'Detalhes'];
    const linhas = lista.map((r) => [
        dataHoraBR(r.quando),
        INFO_TIPO[r.tipo].label,
        r.item,
        r.responsavel,
        r.agendadoPara ? dataBR(r.agendadoPara) : '',
        r.horario,
        r.detalhe
    ].map(campo).join(';'));
    const conteudo = '\ufeff' + [cabecalho.map(campo).join(';'), ...linhas].join('\r\n');
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

const estiloCampo = {
    padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px',
    border: '1px solid var(--th-border)', background: 'var(--th-surface-2)', color: 'var(--th-text)'
};
const estiloRotulo = { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: 'var(--th-muted)' };
const estiloCelula = { padding: '8px 10px', verticalAlign: 'top', color: 'var(--th-text)' };
const estiloCabecalho = {
    padding: '8px 10px', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase',
    letterSpacing: '0.03em', color: 'var(--th-muted)', background: 'var(--th-surface-2)', whiteSpace: 'nowrap'
};

export function ProjectHistoryModal({ projectId, nomeDaLinha, onClose }) {
    const [registros, setRegistros] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
    const [limite, setLimite] = useState(PAGINA);

    const carregar = async () => {
        setCarregando(true);
        setErro('');
        try {
            const [historico, comentarios] = await Promise.all([
                supabaseService.listProjectHistory(projectId),
                supabaseService.listProjectComments(projectId)
            ]);
            setRegistros(montarRegistros(historico, comentarios, nomeDaLinha));
        } catch (e) {
            setErro(e.message || 'Não foi possível carregar o histórico.');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregar();
    }, [projectId]);

    const alterarFiltro = (campo, valor) => {
        setFiltros((f) => ({ ...f, [campo]: valor }));
        setLimite(PAGINA);
    };

    const filtrados = useMemo(() => {
        const busca = filtros.busca.trim().toLowerCase();
        const responsavel = filtros.responsavel.trim().toLowerCase();
        return registros.filter((r) => {
            if (filtros.tipo !== 'todos' && r.tipo !== filtros.tipo) return false;
            if (responsavel && !(r.responsavel || '').toLowerCase().includes(responsavel)) return false;

            const dataRef = filtros.periodoPor === 'agendada' ? r.agendadoPara : chaveDoDia(r.quando);
            if (filtros.de && (!dataRef || dataRef < filtros.de)) return false;
            if (filtros.ate && (!dataRef || dataRef > filtros.ate)) return false;

            if (busca) {
                // Pesquisa em tudo que aparece na linha, inclusive datas e horários formatados
                const texto = [
                    r.item, r.responsavel, r.detalhe, INFO_TIPO[r.tipo].label,
                    dataBR(r.agendadoPara), r.horario, dataHoraBR(r.quando)
                ].join(' ').toLowerCase();
                if (!texto.includes(busca)) return false;
            }
            return true;
        });
    }, [registros, filtros]);

    const contagem = useMemo(() => {
        const c = { agendamento: 0, conclusao: 0, cancelamento: 0, observacao: 0 };
        filtrados.forEach((r) => {
            if (c[r.tipo] !== undefined) c[r.tipo] += 1;
        });
        return c;
    }, [filtrados]);

    const visiveis = filtrados.slice(0, limite);

    const resumo = [
        { label: 'Agendamentos', valor: contagem.agendamento, tipo: 'agendamento' },
        { label: 'Concluídos', valor: contagem.conclusao, tipo: 'conclusao' },
        { label: 'Cancelados', valor: contagem.cancelamento, tipo: 'cancelamento' },
        { label: 'Observações', valor: contagem.observacao, tipo: 'observacao' }
    ];

    return (
        <ModalShell title="Histórico do projeto" width={1040}>
            {/* Resumo do que está filtrado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {resumo.map((item) => (
                    <div
                        key={item.tipo}
                        style={{ padding: '8px 10px', borderRadius: '8px', background: INFO_TIPO[item.tipo].fundo, borderLeft: `4px solid ${INFO_TIPO[item.tipo].cor}` }}
                    >
                        <div style={{ fontSize: '0.7rem', color: INFO_TIPO[item.tipo].cor, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{item.valor}</div>
                    </div>
                ))}
            </div>

            {/* Filtros e pesquisa */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' }}>
                <label style={{ ...estiloRotulo, flex: '1 1 240px' }}>
                    Pesquisar
                    <input
                        type="text"
                        value={filtros.busca}
                        onChange={(e) => alterarFiltro('busca', e.target.value)}
                        placeholder="Item, pessoa, data, horário ou detalhe..."
                        style={estiloCampo}
                    />
                </label>
                <label style={estiloRotulo}>
                    Tipo
                    <select value={filtros.tipo} onChange={(e) => alterarFiltro('tipo', e.target.value)} style={estiloCampo}>
                        {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </label>
                <label style={{ ...estiloRotulo, flex: '0 1 180px' }}>
                    Responsável
                    <input
                        type="text"
                        value={filtros.responsavel}
                        onChange={(e) => alterarFiltro('responsavel', e.target.value)}
                        placeholder="E-mail ou parte dele"
                        style={estiloCampo}
                    />
                </label>
                <label style={estiloRotulo}>
                    Período por
                    <select value={filtros.periodoPor} onChange={(e) => alterarFiltro('periodoPor', e.target.value)} style={estiloCampo}>
                        <option value="registro">Data do registro</option>
                        <option value="agendada">Data agendada</option>
                    </select>
                </label>
                <label style={estiloRotulo}>
                    De
                    <input type="date" value={filtros.de} onChange={(e) => alterarFiltro('de', e.target.value)} style={estiloCampo} />
                </label>
                <label style={estiloRotulo}>
                    Até
                    <input type="date" value={filtros.ate} onChange={(e) => alterarFiltro('ate', e.target.value)} style={estiloCampo} />
                </label>
                <Button variant="secondary" size="sm" onClick={() => { setFiltros(FILTROS_VAZIOS); setLimite(PAGINA); }}>
                    Limpar filtros
                </Button>
            </div>

            {/* Barra de ações */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--th-muted)' }}>
                    {carregando ? 'Carregando…' : `${filtrados.length} de ${registros.length} registros`}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" size="sm" onClick={carregar} disabled={carregando}>
                        <i className="fa-solid fa-rotate"></i> Atualizar
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => exportarCsv(filtrados)} disabled={carregando || filtrados.length === 0}>
                        <i className="fa-solid fa-file-csv"></i> Exportar CSV
                    </Button>
                </div>
            </div>

            {erro && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', fontSize: '0.8rem' }}>{erro}</div>
            )}

            {/* Tabela */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--th-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th style={estiloCabecalho}>Registro</th>
                            <th style={estiloCabecalho}>Tipo</th>
                            <th style={estiloCabecalho}>Item</th>
                            <th style={estiloCabecalho}>Agendado para</th>
                            <th style={estiloCabecalho}>Responsável</th>
                            <th style={estiloCabecalho}>Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visiveis.map((r) => {
                            const info = INFO_TIPO[r.tipo];
                            return (
                                <tr key={r.id} style={{ borderTop: '1px solid var(--th-border)' }}>
                                    <td style={{ ...estiloCelula, whiteSpace: 'nowrap' }}>{dataHoraBR(r.quando)}</td>
                                    <td style={estiloCelula}>
                                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', color: info.cor, background: info.fundo }}>
                                            {info.label}
                                        </span>
                                    </td>
                                    <td style={{ ...estiloCelula, fontWeight: 600 }}>{r.item}</td>
                                    <td style={{ ...estiloCelula, whiteSpace: 'nowrap' }}>
                                        {r.agendadoPara ? `${dataBR(r.agendadoPara)}${r.horario ? ` · ${r.horario}` : ''}` : '—'}
                                    </td>
                                    <td style={{ ...estiloCelula, wordBreak: 'break-all' }}>{r.responsavel || '—'}</td>
                                    <td style={{ ...estiloCelula, whiteSpace: 'pre-wrap', minWidth: '180px' }}>{r.detalhe || '—'}</td>
                                </tr>
                            );
                        })}
                        {!carregando && visiveis.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ ...estiloCelula, textAlign: 'center', color: 'var(--th-muted)', padding: '20px' }}>
                                    Nenhum registro encontrado com estes filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {filtrados.length > limite && (
                <div style={{ textAlign: 'center' }}>
                    <Button variant="secondary" size="sm" onClick={() => setLimite((l) => l + PAGINA)}>
                        Mostrar mais ({filtrados.length - limite} restantes)
                    </Button>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="secondary" className="btn-modal" onClick={onClose}><span>Fechar</span></Button>
            </div>
        </ModalShell>
    );
}
