import { useState } from 'react';
import { storageService } from '../services/storageService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';

export function DashboardPage({ user, onSelectProject, onLogout }) {
    const [projects, setProjects] = useState(storageService.getProjects(user.email));
    const [newProjectName, setNewProjectName] = useState('');

    const handleCreateProject = (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        // Cria o projeto com 4 colunas totalmente em branco e editáveis
        const newProject = {
            id: 'proj_' + Date.now(),
            name: newProjectName.trim(),
            columnConfig: [
                { id: 'col1', name: 'Coluna 1', type: 'text', position: 0, width: 150 },
                { id: 'col2', name: 'Coluna 2', type: 'text', position: 1, width: 150 },
                { id: 'col3', name: 'Coluna 3', type: 'text', position: 2, width: 150 },
                { id: 'col4', name: 'Coluna 4', type: 'checkbox', position: 3, width: 100 }
            ],
            equipments: [],
            schedules: {}
        };

        const updated = [...projects, newProject];
        storageService.saveProjects(user.email, updated);
        setProjects(updated);
        setNewProjectName('');
    };

    const handleDeleteProject = (projId, e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja apagar este projeto?')) {
            const updated = projects.filter(p => p.id !== projId);
            storageService.saveProjects(user.email, updated);
            setProjects(updated);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#0f172a' }}>Meus Projetos de Agendamento</h2>
                <Button style={{ background: '#dc2626', color: '#fff' }} onClick={onLogout}>Terminar Sessão</Button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Nome do novo projeto..." required />
                <Button variant="primary">Criar Projeto</Button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                {projects.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Nenhum projeto criado ainda. Crie um acima para começar!</p>
                ) : (
                    projects.map(proj => (
                        <div 
                            key={proj.id} 
                            onClick={() => onSelectProject(proj)}
                            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '15px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: '0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100px' }}
                        >
                            <h4 style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem' }}>{proj.name}</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>4 Colunas Personalizáveis</span>
                                <Button variant="danger" size="sm" onClick={(e) => handleDeleteProject(proj.id, e)}>Excluir</Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}