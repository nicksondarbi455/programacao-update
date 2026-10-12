import { useState } from 'react';
import { storageService } from '../services/storageService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import * as XLSX from 'xlsx';

export function DashboardPage({ user, onSelectProject, onLogout }) {
    const [projects, setProjects] = useState(storageService.getProjects(user.email));
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estados do formulário
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [hasCalendar, setHasCalendar] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [projectType, setProjectType] = useState('tabela');
    const [tableSource, setTableSource] = useState('manual'); // 'manual' ou 'exportar'
    const [numRows, setNumRows] = useState(3);
    const [numCols, setNumCols] = useState(4);
    
    // Estado para guardar os dados do ficheiro importado
    const [importedData, setImportedData] = useState({ columns: [], rows: [] });

    // Função para ler o ficheiro Excel enviado via upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length > 0) {
                // A primeira linha vira o cabeçalho
                const headers = data[0].map((h, i) => ({
                    id: `col_imp_${i}_${Date.now()}`,
                    name: String(h || `Coluna ${i + 1}`),
                    type: 'text',
                    position: i,
                    width: 150
                }));

                // As linhas seguintes são filtradas para ignorar linhas totalmente em branco
                const rows = data.slice(1)
                    .filter(r => r.some(cell => cell !== undefined && String(cell).trim() !== ''))
                    .map((r, rIdx) => {
                        let rowObj = { id: `eq_imp_${rIdx}_${Date.now()}`, color: 'padrao' };
                        headers.forEach((col, cIdx) => {
                            rowObj[col.id] = r[cIdx] !== undefined ? String(r[cIdx]) : '';
                        });
                        return rowObj;
                    });

                setImportedData({ columns: headers, rows: rows.length > 0 ? rows : [] });
                alert(`Ficheiro carregado com sucesso! ${headers.length} colunas e ${rows.length} registos válidos detetados.`);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleCreateProject = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        let initialColumns = [];
        let initialEquipments = [];

        if (tableSource === 'exportar' && importedData.columns.length > 0) {
            initialColumns = importedData.columns;
            initialEquipments = importedData.rows;
        } else {
            // Criação manual
            for (let i = 1; i <= parseInt(numCols); i++) {
                initialColumns.push({
                    id: `col_${i}_${Date.now()}`,
                    name: `Coluna ${i}`,
                    type: 'text',
                    position: i - 1,
                    width: 150
                });
            }

            for (let r = 1; r <= parseInt(numRows); r++) {
                let rowObj = { id: `eq_${r}_${Date.now()}`, color: 'padrao' };
                initialColumns.forEach(col => {
                    rowObj[col.id] = '';
                });
                initialEquipments.push(rowObj);
            }
        }

        const newProject = {
            id: 'proj_' + Date.now(),
            name: name.trim(),
            description: description.trim(),
            hasCalendar,
            isPrivate,
            projectType,
            tableSource,
            columnConfig: initialColumns,
            equipments: initialEquipments,
            schedules: {}
        };

        const updated = [...projects, newProject];
        storageService.saveProjects(user.email, updated);
        setProjects(updated);
        
        // Limpa e fecha modal
        setName('');
        setDescription('');
        setHasCalendar(true);
        setIsPrivate(false);
        setImportedData({ columns: [], rows: [] });
        setIsModalOpen(false);
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
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem' }}>Meus Projetos e Serviços</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Gerencie os seus quadros e agendamentos de forma profissional.</p>
                </div>
                <Button style={{ background: '#dc2626', color: '#fff' }} onClick={onLogout}>Terminar Sessão</Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                <div 
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', height: '140px', transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                >
                    <div style={{ fontSize: '1.8rem', color: '#2563eb', fontWeight: 'bold', marginBottom: '4px' }}>+</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>Criar Novo Projeto</span>
                </div>

                {projects.map(proj => (
                    <div 
                        key={proj.id} 
                        onClick={() => onSelectProject(proj)}
                        style={{ 
                            background: '#fff', border: '1px solid #cbd5e1', padding: '18px', borderRadius: '12px', 
                            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: '0.2s', 
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px', position: 'relative'
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1rem' }}>{proj.name}</h4>
                                {proj.isPrivate && <span title="Projeto Privado">🔒</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {proj.description || 'Sem descrição informada.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px' }}>
                                {proj.hasCalendar ? '📅 Com Calendário' : '📋 Apenas Tabela'}
                            </span>
                            <Button variant="danger" size="sm" onClick={(e) => handleDeleteProject(proj.id, e)}>Excluir</Button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '440px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#0f172a' }}>Configurar Novo Projeto</h3>
                        
                        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Nome do Projeto</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gestão de Ativos NOC" required />

                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Descrição</label>
                            <textarea 
                                value={description} onChange={(e) => setDescription(e.target.value)} 
                                placeholder="Breve resumo sobre o projeto..." 
                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'none', height: '50px' }}
                            />

                            <div style={{ display: 'flex', gap: '15px', margin: '2px 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                                    <input type="checkbox" checked={hasCalendar} onChange={(e) => setHasCalendar(e.target.checked)} style={{ width: '14px', height: '14px' }} />
                                    Usar Calendário
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ width: '14px', height: '14px' }} />
                                    Projeto Privado 🔒
                                </label>
                            </div>

                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Tipo de Projeto</label>
                            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={{ padding: '7px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}>
                                <option value="tabela">Tabela de Gestão</option>
                            </select>

                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Origem dos Dados da Tabela</label>
                            <select value={tableSource} onChange={(e) => setTableSource(e.target.value)} style={{ padding: '7px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}>
                                <option value="manual">Criação Manual (Linhas e Colunas)</option>
                                <option value="exportar">Importar Ficheiro Excel (.xlsx)</option>
                            </select>

                            {tableSource === 'manual' ? (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd. Linhas</label>
                                        <Input type="number" min="1" max="50" value={numRows} onChange={(e) => setNumRows(e.target.value)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd. Colunas</label>
                                        <Input type="number" min="1" max="10" value={numCols} onChange={(e) => setNumCols(e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Selecione o ficheiro Excel (.xlsx):</label>
                                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ fontSize: '0.75rem', width: '100%' }} />
                                    {importedData.rows.length > 0 && (
                                        <p style={{ fontSize: '0.7rem', color: '#16a34a', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                                            ✔ {importedData.rows.length} registos prontos para importar!
                                        </p>
                                    )}
                                </div>
                            )}

                            <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button variant="primary">Criar Projeto</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}