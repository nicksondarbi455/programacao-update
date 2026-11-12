import { useEffect, useState } from 'react';
import { DrawioEditor, XML_EM_BRANCO } from './DrawioEditor';
import { supabaseService } from '../../services/supabaseService';

// Diagrama de rack de um CPD (aba Hack do card no mapa). Cada CPD tem o seu.
export function CpdDiagrama({ cpdNome, podeEditar }) {
    const [xml, setXml] = useState(null);
    const [status, setStatus] = useState('Carregando…');
    const [erro, setErro] = useState('');

    useEffect(() => {
        let ativo = true;
        (async () => {
            try {
                const registro = await supabaseService.getCpdDiagram(cpdNome);
                if (!ativo) return;
                setXml(registro?.xml || XML_EM_BRANCO);
                setStatus(registro?.updated_at
                    ? `Última alteração: ${new Date(registro.updated_at).toLocaleString('pt-BR')}`
                    : 'Ainda sem diagrama salvo');
                setErro('');
            } catch (e) {
                if (ativo) setErro(e.message || 'Não foi possível abrir o diagrama.');
            }
        })();
        return () => {
            ativo = false;
        };
    }, [cpdNome]);

    const salvar = async (novoXml) => {
        try {
            await supabaseService.saveCpdDiagram(cpdNome, novoXml);
            setErro('');
            setStatus(`Salvo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        } catch (e) {
            setErro(e.message || 'Não foi possível salvar o diagrama.');
            throw e;
        }
    };

    return (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '4px 10px', fontSize: '0.72rem', color: erro ? '#b91c1c' : '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                <span>{erro || status}</span>
                {!podeEditar && <span>Somente leitura</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {xml === null
                    ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Carregando diagrama…</div>
                    : <DrawioEditor xml={xml} podeEditar={podeEditar} onSave={salvar} />}
            </div>
        </div>
    );
}
