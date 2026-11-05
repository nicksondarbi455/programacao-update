import { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { usersService } from '../services/usersService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Checkbox } from '../components/atoms/Checkbox';
import { ProgressCircle } from '../components/molecules/ProgressCircle';
import { DepartmentPicker } from '../components/molecules/DepartmentPicker';
import { ModalShell } from '../components/molecules/ModalShell';
import { FolderFormModal } from '../components/organisms/FolderFormModal';
import { MoveProjectModal } from '../components/organisms/MoveProjectModal';
import * as XLSX from 'xlsx';

const labelStyle = { fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' };
const selectStyle = { padding: '7px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' };
const textareaStyle = { background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'none', height: '50px', fontFamily: 'inherit' };
const checkLabelStyle = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', cursor: 'pointer', color: '#334155', whiteSpace: 'nowrap' };
// Mesmo fundo e borda da descrição; largura só para 4 dígitos
const numInputStyle = { width: '72px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', color: '#0f172a', boxSizing: 'border-box', appearance: 'textfield' };

// Botão pequeno de ícone (editar, excluir, mover) que não dispara o clique do cartão
function IconButton({ icon, title, onClick, danger = false }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={(e) => { e.stopPropagation(); onClick(e); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', color: danger ? '#dc2626' : '#64748b', fontSize: '0.8rem' }}
        >
            <i className={`fa-solid ${icon}`}></i>
        </button>
    );
}

// Opção do menu "Novo": pasta ou projeto
function ChoiceCard({ icon, title, description, disabled, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '18px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px',
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
                fontFamily: 'inherit', textAlign: 'center'
            }}
        >
            <i className={`fa-regular ${icon}`} style={{ fontSize: '2rem', color: '#4e73df' }}></i>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{title}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{description}</span>
        </button>
    );
}

export function DashboardPage({ user, onSelectProject, onLogout }) {
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [foldersError, setFoldersError] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState(null);

    // Modais
    const [isChooserOpen, setIsChooserOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [folderModal, setFolderModal] = useState(null); // null | { folder: null (nova) | pasta (editar) }
    const [movingProject, setMovingProject] = useState(null);

    // Formulário de projeto
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [hasCalendar, setHasCalendar] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [selectedDeptIds, setSelectedDeptIds] = useState([]);
    const [projectFolderId, setProjectFolderId] = useState('');
    const [tableSource, setTableSource] = useState('manual');
    const [numRows, setNumRows] = useState(3);
    const [numCols, setNumCols] = useState(4);
    const [importedData, setImportedData] = useState({ columns: [], rows: [] });

    // Departamentos (carregados ao abrir projeto ou pasta)
    const [departments, setDepartments] = useState([]);
    const [loadingDeps, setLoadingDeps] = useState(false);

    const loadAll = async () => {
        // Projetos e pastas são independentes: se as pastas falharem, os projetos continuam aparecendo
        const [projsRes, fldsRes] = await Promise.allSettled([
            supabaseService.getProjects(user.email),
            supabaseService.getFolders(user.email)
        ]);

        if (projsRes.status === 'rejected') throw projsRes.reason;
        setProjects(projsRes.value);

        if (fldsRes.status === 'fulfilled') {
            const flds = fldsRes.value;
            setFolders(flds);
            setFoldersError('');
            // Se a pasta aberta foi excluída (por outro usuário), volta para a raiz
            setCurrentFolderId((prev) => (prev && !flds.some((f) => f.id === prev) ? null : prev));
        } else {
            console.error('Pastas indisponíveis:', fldsRes.reason);
            setFolders([]);
            setCurrentFolderId(null);
            setFoldersError(fldsRes.reason?.message || 'erro desconhecido');
        }
    };

    const refresh = () => loadAll().catch((err) => alert('Erro ao atualizar: ' + err.message));

    useEffect(() => {
        setLoading(true);
        loadAll()
            .catch((err) => alert('Erro ao carregar: ' + err.message))
            .finally(() => setLoading(false));
    }, [user.email]);

    const needsDepartments = isProjectModalOpen || folderModal !== null;
    useEffect(() => {
        if (!needsDepartments) return;
        setLoadingDeps(true);
        usersService.listDepartments()
            .then(setDepartments)
            .catch((err) => alert('Erro ao carregar departamentos: ' + err.message))
            .finally(() => setLoadingDeps(false));
    }, [needsDepartments]);

    // --- Dados exibidos conforme a navegação e a pesquisa ---
    const query = search.trim().toLowerCase();
    const isSearching = query.length > 0;
    const currentFolder = folders.find((f) => f.id === currentFolderId) || null;
    const folderNameById = Object.fromEntries(folders.map((f) => [f.id, f.name]));

    // Pesquisa: procura em todas as pastas e projetos. Sem pesquisa: mostra o nível atual.
    const shownFolders = isSearching
        ? folders.filter((f) => f.name.toLowerCase().includes(query))
        : (currentFolder ? [] : folders);

    const shownProjects = isSearching
        ? projects.filter((p) => p.name.toLowerCase().includes(query))
        : projects.filter((p) => (p.folderId || null) === (currentFolder ? currentFolder.id : null));

    const openProjectModal = () => {
        setProjectFolderId(currentFolder ? currentFolder.id : '');
        setIsProjectModalOpen(true);
    };

    const handleChoose = (kind) => {
        setIsChooserOpen(false);
        if (kind === 'pasta') setFolderModal({ folder: null });
        else openProjectModal();
    };

    const handleDeleteFolder = async (f) => {
        if (!window.confirm(`Excluir a pasta "${f.name}"? Os projetos dentro dela não serão excluídos: voltam para a raiz.`)) return;
        try {
            await supabaseService.deleteFolder(f.id);
            if (currentFolderId === f.id) setCurrentFolderId(null);
            await loadAll();
        } catch (err) {
            alert('Erro ao excluir pasta: ' + err.message);
        }
    };

    const resetProjectForm = () => {
        setName('');
        setDescription('');
        setHasCalendar(true);
        setIsPrivate(false);
        setShowProgress(false);
        setSelectedDeptIds([]);
        setProjectFolderId('');
        setTableSource('manual');
        setImportedData({ columns: [], rows: [] });
    };

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
                        const filledCells = r.filter(c => c !== undefined && String(c).trim() !== '');
                        if (filledCells.length === 1) {
                            return {
                                id: `eq_imp_${rIdx}_${Date.now()}`,
                                isGroupHeader: true,
                                groupName: String(filledCells[0]).trim(),
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
                showProgress,
                folderId: projectFolderId || null,
                departmentIds: isPrivate ? [] : selectedDeptIds,
                columnConfig: initialColumns,
                equipments: initialEquipments
            }, user.email);

            await loadAll();
            resetProjectForm();
            setIsProjectModalOpen(false);
        } catch (err) {
            alert('Erro ao criar projeto no Supabase: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem' }}>Meus Projetos e Serviços</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Sincronização em tempo real ativada.</p>
                </div>
                <Button variant="danger" onClick={onLogout}>Terminar sessão</Button>
            </div>

            {foldersError && (
                <div role="alert" style={{ marginBottom: '16px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '0.8rem', color: '#92400e' }}>
                    <strong>Pastas indisponíveis.</strong> Execute o arquivo <code>supabase/pastas.sql</code> no SQL Editor do Supabase (depois do <code>permissoes_v2.sql</code>) e atualize a página.
                    <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#b45309' }}>Detalhe: {foldersError}</div>
                </div>
            )}

            {/* Pesquisa por nome de projetos e pastas */}
            <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '16px' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar projetos e pastas..."
                    style={{ width: '100%', padding: '9px 34px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.85rem', color: '#1e293b', boxSizing: 'border-box', outline: 'none' }}
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        title="Limpar pesquisa"
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

            {/* Navegação: voltar da pasta aberta */}
            {currentFolder && !isSearching && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <button
                        type="button"
                        onClick={() => setCurrentFolderId(null)}
                        style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#334155', fontFamily: 'inherit' }}
                    >
                        <i className="fa-solid fa-arrow-left"></i> Voltar
                    </button>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        <i className="fa-regular fa-folder-open" style={{ color: '#4e73df', marginRight: '6px' }}></i>
                        {currentFolder.name}
                    </span>
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>A carregar projetos...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>

                    {/* Cartão: Novo (abre a escolha entre pasta e projeto) */}
                    {!isSearching && (
                        <div
                            onClick={() => setIsChooserOpen(true)}
                            style={{
                                background: 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(90deg, #07aeea 0%, #2bf598 100%) border-box',
                                border: '2px solid transparent',
                                borderRadius: '12px',
                                padding: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '10px', cursor: 'pointer', height: '96px',
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
                            <i className="fa-regular fa-plus" style={{ fontSize: '2rem', color: '#07aeea', lineHeight: '1' }}></i>
                            <span style={{ fontFamily: "'Playfair Display', serif", color: '#0f172a', fontWeight: '700', fontSize: '1.15rem' }}>Novo</span>
                        </div>
                    )}

                    {/* Cartões das pastas */}
                    {shownFolders.map((f) => (
                        <div
                            key={f.id}
                            onClick={() => { setSearch(''); setCurrentFolderId(f.id); }}
                            style={{
                                background: 'linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(135deg, #4e73df 0%, #224abe 100%) border-box',
                                border: '2px solid transparent',
                                padding: '18px', borderRadius: '12px', cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(78, 115, 223, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <i className="fa-regular fa-folder" style={{ fontSize: '2rem', color: '#4e73df' }}></i>
                                {f.canManage && (
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <IconButton icon="fa-pen" title="Editar pasta" onClick={() => setFolderModal({ folder: f })} />
                                        <IconButton icon="fa-trash" title="Excluir pasta" danger onClick={() => handleDeleteFolder(f)} />
                                    </div>
                                )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</h4>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                    {f.projectCount} {f.projectCount === 1 ? 'projeto' : 'projetos'}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Cartões dos projetos */}
                    {shownProjects.map((proj) => (
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
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1rem' }}>{proj.name}</h4>
                                        {proj.isPrivate && <span title="Projeto Privado">🔒</span>}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {proj.description || 'Sem descrição informada.'}
                                    </p>
                                </div>
                                {proj.showProgress && <ProgressCircle value={proj.progress} size={64} />}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {proj.hasCalendar ? <><i className="fa-regular fa-calendar-days"></i> Com Calendário</> : <><i className="fa-regular fa-clipboard"></i> Apenas Tabela</>}
                                    {isSearching && proj.folderId && folderNameById[proj.folderId] && (
                                        <> · <i className="fa-regular fa-folder"></i> {folderNameById[proj.folderId]}</>
                                    )}
                                </span>
                                {proj.canManage && (
                                    <IconButton icon="fa-folder-open" title="Mover para pasta" onClick={() => setMovingProject(proj)} />
                                )}
                            </div>
                        </div>
                    ))}

                    {shownFolders.length === 0 && shownProjects.length === 0 && (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', margin: '20px 0' }}>
                            {isSearching
                                ? `Nenhum projeto ou pasta encontrado para "${search.trim()}".`
                                : currentFolder ? 'Esta pasta ainda não tem projetos.' : 'Nenhum projeto ainda.'}
                        </p>
                    )}
                </div>
            )}

            {/* Escolha: pasta ou projeto */}
            {isChooserOpen && (
                <ModalShell title="O que deseja criar?" width={360}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <ChoiceCard
                            icon="fa-folder"
                            title="Pasta"
                            description="Agrupa projetos e define quem vê"
                            disabled={Boolean(currentFolder)}
                            onClick={() => handleChoose('pasta')}
                        />
                        <ChoiceCard
                            icon="fa-clipboard"
                            title="Projeto"
                            description="Tabela, linhas e calendário"
                            onClick={() => handleChoose('projeto')}
                        />
                    </div>
                    {currentFolder && (
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Dentro de uma pasta só é possível criar projetos.</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <Button variant="secondary" className="btn-modal" onClick={() => setIsChooserOpen(false)}><span>Cancelar</span></Button>
                    </div>
                </ModalShell>
            )}

            {/* Criação de projeto */}
            {isProjectModalOpen && (
                <ModalShell title="Configurar Novo Projeto">
                    <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={labelStyle}>Nome do Projeto</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Gestão de Ativos NOC" required />

                        <label style={labelStyle}>Descrição</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Breve resumo..."
                            style={textareaStyle}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '2px 0' }}>
                            <label style={checkLabelStyle}>
                                <span style={{ display: 'inline-flex', flexShrink: 0 }}><Checkbox checked={hasCalendar} onChange={(e) => setHasCalendar(e.target.checked)} /></span>
                                Usar Calendário
                            </label>
                            <label style={checkLabelStyle}>
                                <span style={{ display: 'inline-flex', flexShrink: 0 }}><Checkbox checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /></span>
                                Projeto Privado
                            </label>
                            <label style={checkLabelStyle}>
                                <span style={{ display: 'inline-flex', flexShrink: 0 }}><Checkbox checked={showProgress} onChange={(e) => setShowProgress(e.target.checked)} /></span>
                                Mostrar progresso
                            </label>
                        </div>

                        <label style={labelStyle}>Pasta</label>
                        <select value={projectFolderId} onChange={(e) => setProjectFolderId(e.target.value)} style={selectStyle}>
                            <option value="">Nenhuma (raiz)</option>
                            {folders.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>

                        {!isPrivate && (
                            <DepartmentPicker
                                label="Departamentos que podem ver este projeto"
                                departments={departments}
                                selectedIds={selectedDeptIds}
                                onChange={setSelectedDeptIds}
                                loading={loadingDeps}
                                helpText="Quem está no departamento vê o projeto. Quem tiver “Visualizar e editar” também pode editar."
                            />
                        )}

                        <label style={labelStyle}>Origem dos Dados da Tabela</label>
                        <select value={tableSource} onChange={(e) => setTableSource(e.target.value)} style={selectStyle}>
                            <option value="manual">Criação Manual (Linhas e Colunas)</option>
                            <option value="exportar">Importar Ficheiro Excel (.xlsx)</option>
                        </select>

                        {tableSource === 'manual' ? (
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd. Linhas</label>
                                    <Input type="number" className="num-input" style={numInputStyle} min="1" max="50" value={numRows} onChange={(e) => setNumRows(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Qtd. Colunas</label>
                                    <Input type="number" className="num-input" style={numInputStyle} min="1" max="10" value={numCols} onChange={(e) => setNumCols(e.target.value)} />
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
                            <Button variant="secondary" className="btn-modal" onClick={() => { setIsProjectModalOpen(false); resetProjectForm(); }}><span>Cancelar</span></Button>
                            <Button type="submit" variant="primary" className="btn-modal"><span><i className="fa-regular fa-plus"></i> Criar projeto</span></Button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {/* Criar / editar pasta */}
            {folderModal && (
                <FolderFormModal
                    folder={folderModal.folder}
                    userEmail={user.email}
                    departments={departments}
                    loadingDeps={loadingDeps}
                    onCancel={() => setFolderModal(null)}
                    onSaved={() => { setFolderModal(null); refresh(); }}
                />
            )}

            {/* Mover projeto para outra pasta */}
            {movingProject && (
                <MoveProjectModal
                    project={movingProject}
                    folders={folders}
                    onCancel={() => setMovingProject(null)}
                    onMoved={() => { setMovingProject(null); refresh(); }}
                />
            )}
        </div>
    );
}
