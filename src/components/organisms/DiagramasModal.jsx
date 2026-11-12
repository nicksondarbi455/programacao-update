import { useEffect, useRef, useState } from 'react';
import { supabaseService } from '../../services/supabaseService';

// Editor draw.io embutido (embed.diagrams.net).
// Para uso com dados sensíveis, troque por uma instância própria do draw.io (ver EDITOR_ORIGIN).
const EDITOR_ORIGIN = 'https://embed.diagrams.net';

// Bibliotecas de rack exibidas no editor (as mesmas da barra de formas).
// As chaves abaixo são o ponto a confirmar no teste: se alguma biblioteca não aparecer
// ou aparecer outra, ajuste esta lista.
const BIBLIOTECAS_RACK = [
    'rack/general', 'rack/apc', 'rack/cisco', 'rack/dell', 'rack/f5', 'rack/hp',
    'rack/hpe-aruba-gateways', 'rack/hpe-aruba-security', 'rack/hpe-aruba-switches',
    'rack/ibm', 'rack/oracle'
];

const CONFIG_EDITOR = {
    defaultLibraries: BIBLIOTECAS_RACK.join(';'),
    enabledLibraries: BIBLIOTECAS_RACK
};

// Diagrama em branco para quando o registro ainda não tem conteúdo
const XML_EM_BRANCO = '<mxfile host="embed.diagrams.net"><diagram name="Página 1" id="pagina1"><mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';

const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function DiagramasModal({ projectId, podeEditar, onClose }) {
    const [diagramas, setDiagramas] = useState([]);
    const [atualId, setAtualId] = useState(null);
    const [status, setStatus] = useState('Carregando…');
    const [erro, setErro] = useState('');

    const iframeRef = useRef(null);
    // Valores lidos pelo listener de mensagens (que não se atualiza sozinho)
    const estadoRef = useRef({ id: null, xml: null, pronto: false, podeEditar });
    estadoRef.current.podeEditar = podeEditar;

    const enviar = (mensagem) => {
        const janela = iframeRef.current?.contentWindow;
        if (janela) janela.postMessage(JSON.stringify(mensagem), EDITOR_ORIGIN);
    };

    const carregarNoEditor = (xml) => {
        enviar({ action: 'load', xml: xml || XML_EM_BRANCO });
    };

    // Protocolo do embed: configure -> init -> load; save/exit vêm do editor
    useEffect(() => {
        const aoReceber = async (ev) => {
            if (ev.origin !== EDITOR_ORIGIN || ev.source !== iframeRef.current?.contentWindow) return;
            let msg;
            try {
                msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
            } catch {
                return;
            }
            if (!msg) return;

            if (msg.event === 'configure') {
                enviar({ action: 'configure', config: CONFIG_EDITOR });
            } else if (msg.event === 'init') {
                estadoRef.current.pronto = true;
                carregarNoEditor(estadoRef.current.xml);
            } else if (msg.event === 'save') {
                const { id, podeEditar: pode } = estadoRef.current;
                if (!pode) {
                    setErro('Você não tem permissão para salvar neste projeto.');
                    return;
                }
                if (!id) return;
                try {
                    await supabaseService.saveDiagram(id, msg.xml);
                    estadoRef.current.xml = msg.xml;
                    setErro('');
                    setStatus(`Salvo às ${hora()}`);
                    // Limpa o indicador de alterações não salvas no editor
                    enviar({ action: 'status', messageKey: 'allChangesSaved', modified: false });
                } catch (e) {
                    setErro(e.message || 'Não foi possível salvar o diagrama.');
                }
            } else if (msg.event === 'exit') {
                onClose();
            }
        };

        window.addEventListener('message', aoReceber);
        return () => window.removeEventListener('message', aoReceber);
    }, []);

    // Carrega a lista de diagramas do projeto e abre o primeiro
    useEffect(() => {
        (async () => {
            try {
                const lista = await supabaseService.listDiagrams(projectId);
                setDiagramas(lista);
                if (lista.length > 0) await abrirDiagrama(lista[0].id);
                else setStatus('Nenhum diagrama ainda');
            } catch (e) {
                setErro(e.message || 'Não foi possível carregar os diagramas.');
            }
        })();
    }, [projectId]);

    const abrirDiagrama = async (id) => {
        try {
            const registro = await supabaseService.getDiagram(id);
            estadoRef.current.id = registro.id;
            estadoRef.current.xml = registro.xml;
            setAtualId(registro.id);
            setStatus(registro.updated_at ? `Atualizado em ${new Date(registro.updated_at).toLocaleString('pt-BR')}` : '');
            setErro('');
            if (estadoRef.current.pronto) carregarNoEditor(registro.xml);
        } catch (e) {
            setErro(e.message || 'Não foi possível abrir o diagrama.');
        }
    };

    const novoDiagrama = async () => {
        if (!podeEditar) return;
        const nome = window.prompt('Nome do diagrama (ex.: CPD GUAIUBA - rack 1)');
        if (!nome || !nome.trim()) return;
        try {
            const criado = await supabaseService.createDiagram(projectId, nome.trim(), XML_EM_BRANCO);
            setDiagramas((lista) => [...lista, { id: criado.id, name: criado.name, updated_at: criado.updated_at }]);
            await abrirDiagrama(criado.id);
        } catch (e) {
            setErro(e.message || 'Não foi possível criar o diagrama.');
        }
    };

    const urlEditor = `${EDITOR_ORIGIN}/?embed=1&proto=json&spin=1&configure=1&libraries=1&saveAndExit=0&noExitBtn=1&noSaveBtn=${podeEditar ? 0 : 1}`;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', height: '100%', maxWidth: '1400px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#1f2937', fontSize: '0.95rem' }}>Diagramas do projeto</strong>
                    <select
                        value={atualId || ''}
                        onChange={(e) => abrirDiagrama(e.target.value)}
                        disabled={diagramas.length === 0}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', minWidth: '220px' }}
                    >
                        {diagramas.length === 0 && <option value="">Sem diagramas</option>}
                        {diagramas.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {podeEditar && (
                        <button type="button" onClick={novoDiagrama} className="header-icon-btn" style={{ width: 'auto', padding: '0 10px', fontSize: '0.8rem', gap: '6px' }}>
                            <i className="fa-solid fa-plus"></i> Novo diagrama
                        </button>
                    )}
                    <span style={{ fontSize: '0.75rem', color: erro ? '#b91c1c' : '#6b7280', flex: 1, textAlign: 'right' }}>
                        {erro || status}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        title="Fechar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1rem', padding: '4px 8px' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <iframe
                    ref={iframeRef}
                    src={urlEditor}
                    title="Editor de diagramas"
                    style={{ flex: 1, width: '100%', border: 'none' }}
                />
            </div>
        </div>
    );
}
