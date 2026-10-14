import { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import * as XLSX from 'xlsx';

export function DashboardPage({ user, onSelectProject, onLogout }) {
    const [projects, setProjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estados do formulário
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [hasCalendar, setHasCalendar] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [projectType, setProjectType] = useState('tabela');
    const [tableSource, setTableSource] = useState('manual');
    const [numRows, setNumRows] = useState(3);
    const [numCols, setNumCols] = useState(4);
    
    const [importedData, setImportedData] = useState({ columns: [], rows: [] });

    const loadData = async () => {
        setLoading(true);
        const depts = await supabaseService.getDepartments();
        setDepartments(depts);
        if (depts.length > 0) setSelectedDepartment(depts[0].id);

        const projs = await supabaseService.getProjects(user.email, user.departmentId);
        setProjects(projs);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user.email]);

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
                const headers = data[0].map((h, i) => ({
                    id: `col_imp_${i}_${Date.now()}`,
                    name: String(h || `Coluna ${i + 1}`),
                    type: 'text',
                    position: i,
                    width: 150
                }));

                const rows = data.slice(1)
                    .filter(r => r.some(cell => cell !== undefined && String(cell).trim() !== ''))
                    .map((r, rIdx) => {
                        const nonColsCount = r.filter(c => c !== undefined && String(c).trim() !== '').length;
                        if (nonColsCount === 1) {
                            return {
                                id: `eq_imp_${rIdx}_${Date.now()}`,
                                isGroupHeader: true,
                                groupName: String(r[0] || 'Novo Evento').trim(),
                                color: 'cinza'
                            };
                        }
                        let rowObj = { id: `eq_imp_${rIdx}_${Date.now()}`, color: 'padrao' };
                        headers.forEach((col, cIdx) => {
                            rowObj[col.id] = r[cIdx] !== undefined ? String(r[cIdx]) : '';
                        });
                        return rowObj;
                    });

                setImportedData({ columns: headers, rows: rows.length > 0 ? rows : [] });
                alert(`Planilha carregada com sucesso! ${headers.length} colunas e ${rows.length} registros válidos.`);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        let initialColumns = [];
        let initialEquipments = [];

        if (tableSource === 'exportar' && importedData.columns.length > 0) {
            initialColumns = importedData.columns;
            initialEquipments = importedData.rows;
        } else {
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

        try {
            await supabaseService.createProject({
                name: name.trim(),
                description: description.trim(),
                departmentId: selectedDepartment,
                hasCalendar,
                isPrivate,
                projectType,
                columnConfig: initialColumns,
                equipments: initialEquipments
            }, user.email);

            await loadData();
            
            setName('');
            setDescription('');
            setHasCalendar(true);
            setIsPrivate(false);
            setImportedData({ columns: [], rows: [] });
            setIsModalOpen(false);
        } catch (err) {
            alert('Erro ao criar projeto no Supabase: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Cabeçalho com Logo Proporcional */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '18px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                        style={{ height: '42px', objectFit: 'contain' }} 
                    />
                    <div>
                        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: '800' }}>Meus Projetos e Serviços</h2>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Sincronizados em tempo real com o banco de dados.</p>
                    </div>
                </div>
                <Button variant="danger" onClick={onLogout}>Terminar Sessão</Button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Carregando projetos...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                    
                    {/* Botão Criar Novo Projeto */}
                    <div 
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(90deg, #07aeea 0%, #2bf598 100%) border-box',
                            border: '2px solid transparent',
                            borderRadius: '12px', 
                            padding: '20px',
                            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            gap: '12px', cursor: 'pointer', height: '140px', 
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(7, 174, 234, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                        }}
                    >
                        <span style={{ fontSize: '4.5rem', color: '#07aeea', fontFamily: "'Playfair Display', serif", lineHeight: '1', marginTop: '-4px' }}>+</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontFamily: "'Playfair Display', serif", color: '#0f172a', fontWeight: '700', fontSize: '1.25rem', lineHeight: '1.15' }}>Novo</span>
                            <span style={{ fontFamily: "'Playfair Display', serif", color: '#0f172a', fontWeight: '700', fontSize: '1.25rem', lineHeight: '1.15' }}>Projeto</span>
                        </div>
                    </div>

                    {/* Projetos Existentes */}
                    {projects.map(proj => {
                        const dept = departments.find(d => d.id === proj.departmentId);
                        return (
                            <div 
                                key={proj.id} 
                                onClick={() => onSelectProject(proj)}
                                style={{ 
                                    background: 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(45deg, #fada61 0%, #ff9188 50%, #ff5acd 100%) border-box',
                                    border: '2px solid transparent',
                                    padding: '18px', borderRadius: '12px', cursor: 'pointer', 
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)', 
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 90, 205, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
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
                                    <span style={{ fontSize: '0.65rem', color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        🏢 {dept ? dept.name : 'Geral'}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                        {proj.hasCalendar ? '📅 Calendário' : '📋 Tabela'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Criação com Seletor de Departamento */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(3px)' }}>
                    <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '450px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Configurar Novo Projeto</h3>
                        
                        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nome do Projeto</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gestão de Ativos NOC" required style={{ width: '100%' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Departamento Responsável</label>
                                <select 
                                    value={selectedDepartment} 
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Descrição</label>
                                <textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Breve resumo..." 
                                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', resize: 'none', height: '50px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                                    <input type="checkbox" checked={hasCalendar} onChange={(e) => setHasCalendar(e.target.checked)} />
                                    Usar Calendário
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                                    Projeto Privado 🔒
                                </label>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Origem dos Dados</label>
                                <select value={tableSource} onChange={(e) => setTableSource(e.target.value)} style={{ width: '100%' }}>
                                    <option value="manual">Criação Manual (Linhas e Colunas)</option>
                                    <option value="exportar">Importar Planilha Excel (.xlsx)</option>
                                </select>
                            </div>

                            {tableSource === 'manual' ? (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd. Linhas</label>
                                        <Input type="number" min="1" max="50" value={numRows} onChange={(e) => setNumRows(e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd. Colunas</label>
                                        <Input type="number" min="1" max="10" value={numCols} onChange={(e) => setNumCols(e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Selecione o arquivo Excel (.xlsx):</label>
                                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ fontSize: '0.75rem', width: '100%' }} />
                                    {importedData.rows.length > 0 && (
                                        <p style={{ fontSize: '0.7rem', color: '#16a34a', margin: '6px 0 0 0', fontWeight: 'bold' }}>
                                            ✔ {importedData.rows.length} registros prontos para importar!
                                        </p>
                                    )}
                                </div>
                            )}

                            <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button type="button" style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button variant="primary" type="submit">Criar Projeto</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}