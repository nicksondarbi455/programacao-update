import { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { DrawioEditor, XML_EM_BRANCO, CONFIG_COMPLETA } from '../components/organisms/DrawioEditor';
import { ProjectSettingsModal } from '../components/organisms/ProjectSettingsModal';
import { Button } from '../components/atoms/Button';

// Projeto do tipo "drawio": página com o editor completo do draw.io, salvo no próprio projeto.
// Não tem tabela, calendário nem progresso.
export function DrawioProjectPage({ project, onBackToDashboard, onProjectUpdated }) {
    const [xml, setXml] = useState(null);
    const [status, setStatus] = useState('Carregando…');
    const [erro, setErro] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        let ativo = true;
        (async () => {
            try {
                const registro = await supabaseService.getProjectDiagram(project.id);
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
    }, [project.id]);

    const salvar = async (novoXml) => {
        try {
            await supabaseService.saveProjectDiagram(project.id, novoXml);
            setErro('');
            setStatus(`Salvo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        } catch (e) {
            setErro(e.message || 'Não foi possível salvar o diagrama.');
            throw e;
        }
    };

    const handleSaveSettings = async (campos) => {
        await supabaseService.updateProject(project.id, campos);
        setSettingsOpen(false);
        if (onProjectUpdated) onProjectUpdated({ ...project, ...campos });
    };

    const handleDeleteProject = async () => {
        try {
            await supabaseService.deleteProject(project.id, project.name);
            onBackToDashboard();
        } catch (e) {
            setSettingsOpen(false);
            setErro(e.message || 'Não foi possível excluir o projeto.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
            {settingsOpen && (
                <ProjectSettingsModal
                    project={project}
                    onSave={handleSaveSettings}
                    onClose={() => setSettingsOpen(false)}
                    onDelete={project.canManage ? handleDeleteProject : undefined}
                />
            )}

            <div style={{ background: '#1e293b', padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Diagrama: {project.name} {project.isPrivate ? '🔒' : ''}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {project.canManage && (
                        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
                            <i className="fa-solid fa-gear"></i> Configurações
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={onBackToDashboard}>Voltar</Button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '4px 10px', fontSize: '0.72rem', color: erro ? '#b91c1c' : '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                <span>{erro || status}</span>
                {!project.canEdit && <span>Somente leitura</span>}
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {xml === null
                    ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Carregando diagrama…</div>
                    : <DrawioEditor xml={xml} podeEditar={project.canEdit} onSave={salvar} config={CONFIG_COMPLETA} />}
            </div>
        </div>
    );
}
