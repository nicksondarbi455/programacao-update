import { useEffect, useRef } from 'react';

// Editor draw.io embutido (embed.diagrams.net).
// Para dados sensíveis, troque por uma instância própria do draw.io alterando EDITOR_ORIGIN.
const EDITOR_ORIGIN = 'https://embed.diagrams.net';

// Biblioteca de rack, usada no diagrama de cada CPD (aba Hack do mapa)
export const CONFIG_RACK = {
    defaultLibraries: 'rack',
    enabledLibraries: ['rack']
};

// Sem restrição de bibliotecas: todas as formas e ferramentas do draw.io (projetos do tipo drawio)
export const CONFIG_COMPLETA = {};

// Diagrama em branco para quando ainda não existe conteúdo salvo
export const XML_EM_BRANCO = '<mxfile host="embed.diagrams.net"><diagram name="Página 1" id="pagina1"><mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';

// Editor com o protocolo do embed: configure -> init -> load; save vem do editor
export function DrawioEditor({ xml, podeEditar, onSave, config = CONFIG_RACK }) {
    const iframeRef = useRef(null);
    const xmlRef = useRef(xml || XML_EM_BRANCO);
    const podeRef = useRef(podeEditar);
    const onSaveRef = useRef(onSave);
    const configRef = useRef(config);
    podeRef.current = podeEditar;
    onSaveRef.current = onSave;
    configRef.current = config;

    const enviar = (mensagem) => {
        const janela = iframeRef.current?.contentWindow;
        if (janela) janela.postMessage(JSON.stringify(mensagem), EDITOR_ORIGIN);
    };

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
                enviar({ action: 'configure', config: configRef.current });
            } else if (msg.event === 'init') {
                enviar({ action: 'load', xml: xmlRef.current });
            } else if (msg.event === 'save') {
                if (!podeRef.current) return;
                try {
                    await onSaveRef.current(msg.xml);
                    xmlRef.current = msg.xml;
                    // Limpa o indicador de alterações não salvas dentro do editor
                    enviar({ action: 'status', messageKey: 'allChangesSaved', modified: false });
                } catch {
                    // O componente pai mostra o erro
                }
            }
        };

        window.addEventListener('message', aoReceber);
        return () => window.removeEventListener('message', aoReceber);
    }, []);

    const url = `${EDITOR_ORIGIN}/?embed=1&proto=json&spin=1&configure=1&libraries=1&saveAndExit=0&noExitBtn=1&noSaveBtn=${podeEditar ? 0 : 1}`;

    return (
        <iframe
            ref={iframeRef}
            src={url}
            title="Editor de diagramas"
            style={{ flex: 1, width: '100%', height: '100%', border: 'none', minHeight: 0 }}
        />
    );
}
