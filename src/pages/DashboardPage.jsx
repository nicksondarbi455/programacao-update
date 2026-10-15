import { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { SideMenu } from '../components/organisms/SideMenu';
import { UsersPage } from './UsersPage';
import * as XLSX from 'xlsx';

const PLACEHOLDER_TITLES = {
    historico: 'Histórico',
    personalizacao: 'Personalização',
    sobre: 'Sobre'
};

export function DashboardPage({ user, onSelectProject, onLogout }) {
    const [section, setSection] = useState('projetos');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [hasCalendar, setHasCalendar] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [tableSource, setTableSource] = useState('manual');
    const [numRows, setNumRows] = useState(3);
    const [numCols, setNumCols] = useState(4);

    const [importedData, setImportedData] = useState({ columns: [], rows: [] });

    const loadProjects = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getProjects(user.email);
            setProjects(data);
            setLoadError('');
        } catch (err) {
            setLoadError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [user.email]);

    // Detecção automática de linhas de eventos no Excel
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

                const rows = data.slice(1)
                    .filter(r => r.some(cell => cell !== undefined && String(cell).trim() !== ''))
                    .map((r, rIdx) => {
                        // Conta quantas colunas possuem conteúdo preenchido
                        const filledCells = r.filter(c => c !== undefined && String(c).trim() !== '');

                        // Se a linha tiver apenas 1 coluna preenchida, considera como Título de Evento / Seção Cinza
                        if (filledCells.length === 1) {
                            return {
                                id: `eq_imp_${rIdx}_${Date.now()}`,
                                isGroupHeader: true,
                                groupName: String(filledCells[0]).trim(),
                                color: 'cinza'
                            };
                        }

                        // Linha normal de dados
                        let rowObj = { id: `eq_imp_${rIdx}_${Date.now()}`, color: 'padrao' };
                        headers.forEach((col, cIdx) => {
                            rowObj[col.id] = r[cIdx] !== undefined ? String(r[cIdx]) : '';
                        });
                        return rowObj;
                    });

                setImportedData({ columns: headers, rows: rows.length > 0 ? rows : [] });
                alert(`Ficheiro lido com sucesso! ${headers.length} colunas e ${rows.length} registos/eventos identificados.`);
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
                hasCalendar,
                isPrivate,
                columnConfig: initialColumns,
                equipments: initialEquipments
            }, user.email);

            await loadProjects();

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

    const renderProjects = () => (
        <>
            <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '15px', marginBottom: '25px' }}>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem' }}>Meus Projetos e Serviços</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Sincronização em tempo real ativada.</p>
            </div>

            {loadError && (
                <p role="alert" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    ⚠️ {loadError}
                </p>
            )}

            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>A carregar projetos...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>

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
                    >
                        <span style={{ fontSize: '4.5rem', color: '#07aeea', fontFamily: "'Playfair Display', serif", lineHeight: '1', marginTop: '-4px' }}>+</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontFamily: "'Playfair Display', serif", color: '#0f172a', fontWeight: '700', fontSize: '1.25rem', lineHeight: '1.15' }}>Novo</span>
                            <span style={{ fontFamily: "'Playfair Display', serif", color: '#0f172a', fontWeight: '700', fontSize: '1.25rem', lineHeight: '1.15' }}>Projeto</span>
                        </div>
                    </div>

                    {projects.map(proj => (
                        <div
                            key={proj.id}
                            onClick={() => onSelectProject(proj)}
                            style={{
                                background: 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(45deg, #fada61 0%, #ff9188 50%, #ff5acd 100%) border-box',
                                border: '2px solid transparent',
                                padding: '18px', borderRadius: '12px', cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px'
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
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                placeholder="Breve resumo..."
                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'none', height: '50px' }}
                            />

                            <div style={{ display: 'flex', gap: '15px', margin: '2px 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                                    <input type="checkbox" checked={hasCalendar} onChange={(e) => setHasCalendar(e.target.checked)} />
                                    Usar Calendário
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                                    Projeto Privado 🔒
                                </label>
                            </div>

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
                                            ✔ {importedData.rows.length} registos/eventos prontos para importar!
                                        </p>
                                    )}
                                </div>
                            )}

                            <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" variant="primary">Criar Projeto no Supabase</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: 'DM Sans, sans-serif' }}>
            <SideMenu
                active={section}
                onSelect={setSection}
                userEmail={user.email}
                onLogout={onLogout}
            />

            <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '30px', boxSizing: 'border-box' }}>
                {section === 'projetos' && <div style={{ maxWidth: '1000px', margin: '0 auto' }}>{renderProjects()}</div>}
                {section === 'usuario' && <UsersPage currentUserEmail={user.email} />}
                {PLACEHOLDER_TITLES[section] && <h2 style={{ fontSize: '1.4rem', color: '#0f172a' }}>{PLACEHOLDER_TITLES[section]}</h2>}
            </main>
        </div>
    );
}
