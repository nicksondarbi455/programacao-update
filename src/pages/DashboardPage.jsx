import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { supabaseService } from '../services/supabaseService';
import { usersService } from '../services/usersService';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Checkbox } from '../components/atoms/Checkbox';
import { ProgressCircle } from '../components/molecules/ProgressCircle';
import { DepartmentPicker } from '../components/molecules/DepartmentPicker';
import { ModalShell } from '../components/molecules/ModalShell';
import { FolderFormModal } from '../components/organisms/FolderFormModal';
import { MoveModal } from '../components/organisms/MoveModal';
import { ProjectSettingsModal } from '../components/organisms/ProjectSettingsModal';
import { DEFAULT_PROJECT_ICON } from '../constants/projectIcons';
import { ProjectIconPicker } from '../components/molecules/ProjectIconPicker';
import { flattenFolderTree, subtreeIds } from '../utils/folderTree';
import { UpcomingPanel } from '../components/organisms/UpcomingPanel';
import { DuplicateProjectModal } from '../components/organisms/DuplicateProjectModal';
import { MentionsPanel } from '../components/organisms/MentionsPanel';
import * as XLSX from 'xlsx';

const labelStyle = { fontSize: '0.75rem', color: 'var(--th-muted)', fontWeight: 'bold' };
const selectStyle = { padding: '7px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '4px', fontSize: '0.8rem' };
const textareaStyle = { background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'none', height: '50px', fontFamily: 'inherit' };
const checkLabelStyle = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--th-text-3)', whiteSpace: 'nowrap' };
// Mesmo fundo e borda da descrição; largura só para 4 dígitos
const numInputStyle = { width: '72px', padding: '8px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--th-text)', boxSizing: 'border-box', appearance: 'textfield' };
const crumbStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--th-text-4)' };

// Botão pequeno de ícone que não dispara o clique do cartão
function IconButton({ icon, title, onClick, active = false }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={(e) => { e.stopPropagation(); onClick(e); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', color: active ? '#2563eb' : 'var(--th-muted)', fontSize: '0.8rem' }}
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
                padding: '18px 12px', background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', borderRadius: '10px',
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
                fontFamily: 'inherit', textAlign: 'center'
            }}
        >
            <i className={`fa-regular ${icon}`} style={{ fontSize: '2rem', color: '#4e73df' }}></i>
            <span style={{ fontWeight: 700, color: 'var(--th-text)', fontSize: '0.95rem' }}>{title}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--th-muted)' }}>{description}</span>
        </button>
    );
}

export function DashboardPage({ user, onSelectProject, onLogout, focusFolderId, onFocusHandled, initialFolderPath = [], onFolderPathChange }) {
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [foldersError, setFoldersError] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    // Caminho da pasta aberta: [pasta-raiz, subpasta, sub-subpasta...]. Vazio = Meus Projetos.
    const [folderPath, setFolderPath] = useState(() => [...initialFolderPath]);
    // Ordem e fixação personalizadas: { 'pasta:ID' | 'projeto:ID': { pinned, position } }
    const [layout, setLayout] = useState({});
    const [draggingKey, setDraggingKey] = useState(null);

    // Modais
    const [isChooserOpen, setIsChooserOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [folderModal, setFolderModal] = useState(null); // null | { folder: null (nova) | pasta (editar) }
    const [movingProject, setMovingProject] = useState(null);
    const [duplicatingProject, setDuplicatingProject] = useState(null);
    const [movingFolder, setMovingFolder] = useState(null);
    const [settingsProject, setSettingsProject] = useState(null);

    // Formulário de projeto
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [hasCalendar, setHasCalendar] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    // Acompanhamento do projeto: 'pontual' (com check e linha verde) ou 'recorrente' (revisões que se repetem)
    const [projectType, setProjectType] = useState('pontual');
    // Ícone do card do projeto (null = ícone padrão) e se a grade de ícones está aberta
    const [projectIcon, setProjectIcon] = useState(null);
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
        const [projsRes, fldsRes, layoutRes] = await Promise.allSettled([
            supabaseService.getProjects(user.email),
            supabaseService.getFolders(user.email),
            supabaseService.getLayout(user.email)
        ]);

        if (projsRes.status === 'rejected') throw projsRes.reason;
        setProjects(projsRes.value);

        // Sem preferências (ou com erro), a ordem padrão continua valendo
        if (layoutRes.status === 'fulfilled') {
            setLayout(Object.fromEntries(
                layoutRes.value.map((r) => [`${r.kind}:${r.id}`, { pinned: r.pinned, position: r.position }])
            ));
        } else {
            console.warn('Preferências indisponíveis:', layoutRes.reason);
        }

        if (fldsRes.status === 'fulfilled') {
            const flds = fldsRes.value;
            setFolders(flds);
            setFoldersError('');
            // Mantém só o caminho que ainda existe (pasta aberta pode ter sido excluída por outro usuário)
            setFolderPath((prev) => {
                const valid = [];
                for (const id of prev) {
                    if (flds.some((f) => f.id === id)) valid.push(id);
                    else break;
                }
                return valid.length === prev.length ? prev : valid;
            });
        } else {
            console.error('Pastas indisponíveis:', fldsRes.reason);
            setFolders([]);
            setFolderPath([]);
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

    // Tempo real: qualquer mudança em projetos ou pastas recarrega a lista (com um pequeno atraso)
    const [liveStatus, setLiveStatus] = useState('conectando');
    const refreshTimerRef = useRef(null);
    useEffect(() => {
        const scheduleRefresh = () => {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => {
                loadAll().catch(() => {});
            }, 500);
        };

        const channel = supabase
            .channel(`dashboard-${user.email}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'folder_departments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_departments' }, scheduleRefresh)
            .subscribe((status) => setLiveStatus(status === 'SUBSCRIBED' ? 'online' : 'offline'));

        return () => {
            clearTimeout(refreshTimerRef.current);
            supabase.removeChannel(channel);
        };
    }, [user.email]);

    // Guarda a pasta em que o usuário está, para voltar a ela ao sair de um projeto
    useEffect(() => {
        if (onFolderPathChange) onFolderPathChange(folderPath);
    }, [folderPath, onFolderPathChange]);

    // Abertura vinda da busca global (Ctrl+K): abre a pasta com o caminho até ela
    useEffect(() => {
        if (!focusFolderId || folders.length === 0) return;
        const chain = [];
        let current = folders.find((f) => f.id === focusFolderId);
        while (current) {
            chain.unshift(current.id);
            const parentId = current.parentId;
            current = parentId ? folders.find((f) => f.id === parentId) : null;
        }
        setSearch('');
        setFolderPath(chain);
        if (onFocusHandled) onFocusHandled();
    }, [focusFolderId, folders, onFocusHandled]);

    // --- Pastas: busca, caminho completo e navegação ---
    const folderById = Object.fromEntries(folders.map((f) => [f.id, f]));

    // "Infraestrutura / Redes / Core" para mostrar onde a pasta está
    const folderLabel = (id) => {
        const names = [];
        let cur = id ? folderById[id] : null;
        while (cur) {
            names.unshift(cur.name);
            cur = cur.parentId ? folderById[cur.parentId] : null;
        }
        return names.join(' / ');
    };

    // Pastas na ordem da árvore, começando pela raiz; cada nível tem um recuo
    const folderOptions = (excludeIds = new Set()) => flattenFolderTree(folders, excludeIds).map((f) => ({
        ...f,
        label: `${'\u2003'.repeat(f.depth)}${f.depth ? '↳ ' : ''}${f.name}`
    }));
    const foldersWithLabel = folderOptions();

    const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
    const currentFolder = currentFolderId ? folderById[currentFolderId] || null : null;

    const query = search.trim().toLowerCase();
    const isSearching = query.length > 0;

    // Pesquisa: procura em todas as pastas e projetos. Sem pesquisa: mostra o nível atual.
    const shownFolders = isSearching
        ? folders.filter((f) => f.name.toLowerCase().includes(query))
        : folders.filter((f) => (f.parentId || null) === currentFolderId);

    const shownProjects = isSearching
        ? projects.filter((p) => p.name.toLowerCase().includes(query))
        : projects.filter((p) => (p.folderId || null) === currentFolderId);

    const openFolder = (f) => {
        setSearch('');
        setFolderPath((prev) => [...prev, f.id]);
    };
    const goBack = () => setFolderPath((prev) => prev.slice(0, -1));
    const goToLevel = (index) => setFolderPath((prev) => prev.slice(0, index + 1));

    // --- Criação ---
    const openProjectModal = () => {
        setProjectFolderId(currentFolderId || '');
        setIsProjectModalOpen(true);
    };

    const handleChoose = (kind) => {
        setIsChooserOpen(false);
        if (kind === 'pasta') setFolderModal({ folder: null });
        else openProjectModal();
    };

    const resetProjectForm = () => {
        setName('');
        setDescription('');
        setHasCalendar(true);
        setIsPrivate(false);
        setShowProgress(false);
        setProjectType('pontual');
        setProjectIcon(null);
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
                showProgress: projectType === 'pontual' && showProgress,
                projectType,
                icon: projectIcon,
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

    // --- Ordem personalizada dentro do nível atual: fixados primeiro, depois a ordem escolhida ---
    const levelItems = [
        ...shownFolders.map((f) => ({ key: `pasta:${f.id}`, kind: 'pasta', id: f.id, data: f })),
        ...shownProjects.map((p) => ({ key: `projeto:${p.id}`, kind: 'projeto', id: p.id, data: p }))
    ]
        .map((it, idx) => ({
            ...it,
            idx,
            pinned: Boolean(layout[it.key]?.pinned),
            position: layout[it.key]?.position ?? Number.MAX_SAFE_INTEGER
        }))
        .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (a.position - b.position) || (a.idx - b.idx));

    // Grava a ordem do nível inteiro (posições 1..n) e a fixação de cada item
    const saveLevelOrder = async (list) => {
        const rows = list.map((it, idx) => ({ kind: it.kind, id: it.id, pinned: it.pinned, position: idx + 1 }));
        setLayout((prev) => {
            const next = { ...prev };
            rows.forEach((r) => {
                next[`${r.kind}:${r.id}`] = { pinned: r.pinned, position: r.position };
            });
            return next;
        });
        try {
            await supabaseService.saveLayout(user.email, rows);
        } catch (err) {
            alert('Erro ao salvar a ordem: ' + err.message);
            refresh();
        }
    };

    // Soltar um item sobre outro: ele entra antes do destino e assume a fixação do destino
    const handleDrop = (targetKey) => {
        const draggedKey = draggingKey;
        setDraggingKey(null);
        if (!draggedKey || draggedKey === targetKey) return;

        const list = [...levelItems];
        const from = list.findIndex((i) => i.key === draggedKey);
        if (from < 0) return;
        const [moved] = list.splice(from, 1);

        const to = list.findIndex((i) => i.key === targetKey);
        if (to < 0) return;
        const target = list[to];
        list.splice(to, 0, { ...moved, pinned: target.pinned });

        saveLevelOrder(list);
    };

    const togglePin = (item) => {
        const list = levelItems.map((i) => (i.key === item.key ? { ...i, pinned: !i.pinned } : i));
        saveLevelOrder(list);
    };

    // Cartão de pasta ou de projeto, com fixar e arrastar
    const renderItem = (item) => {
        const isDragging = draggingKey === item.key;
        const dragProps = {
            draggable: !isSearching,
            onDragStart: (e) => {
                setDraggingKey(item.key);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.key);
            },
            onDragOver: (e) => e.preventDefault(),
            onDrop: (e) => {
                e.preventDefault();
                handleDrop(item.key);
            },
            onDragEnd: () => setDraggingKey(null)
        };
        const pinBadge = item.pinned && (
            <i className="fa-solid fa-thumbtack" title="Fixado" style={{ fontSize: '0.7rem', color: '#2563eb', alignSelf: 'center', marginRight: '4px' }}></i>
        );
        const hoverIn = (shadow) => (e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = shadow;
        };
        const hoverOut = (e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
        };

        if (item.kind === 'pasta') {
            const f = item.data;
            const subCount = folders.filter((x) => x.parentId === f.id).length;
            return (
                <div
                    key={item.key}
                    {...dragProps}
                    onClick={() => openFolder(f)}
                    onMouseEnter={hoverIn('0 6px 16px rgba(78, 115, 223, 0.2)')}
                    onMouseLeave={hoverOut}
                    style={{
                        background: 'linear-gradient(var(--th-surface), var(--th-surface)) padding-box, linear-gradient(135deg, #4e73df 0%, #224abe 100%) border-box',
                        border: '2px solid transparent',
                        padding: '18px', borderRadius: '12px', cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px',
                        opacity: isDragging ? 0.4 : 1
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <i className="fa-regular fa-folder" style={{ fontSize: '2rem', color: '#4e73df' }}></i>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {pinBadge}
                            <IconButton icon="fa-thumbtack" title={item.pinned ? 'Desafixar' : 'Fixar'} active={item.pinned} onClick={() => togglePin(item)} />
                            {f.canManage && (
                                <IconButton icon="fa-folder-open" title="Mover pasta" onClick={() => setMovingFolder(f)} />
                            )}
                            {f.canManage && (
                                <IconButton icon="fa-gear" title="Configurações da pasta" onClick={() => setFolderModal({ folder: f })} />
                            )}
                        </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px 0', color: 'var(--th-text)', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>
                            {isSearching && f.parentId ? `${folderLabel(f.parentId)} · ` : ''}
                            {subCount > 0 && `${subCount} ${subCount === 1 ? 'pasta' : 'pastas'} · `}
                            {f.projectCount} {f.projectCount === 1 ? 'projeto' : 'projetos'}
                        </p>
                    </div>
                </div>
            );
        }

        const proj = item.data;
        return (
            <div
                key={item.key}
                {...dragProps}
                onClick={() => onSelectProject(proj)}
                onMouseEnter={hoverIn('0 6px 16px rgba(255, 90, 205, 0.2)')}
                onMouseLeave={hoverOut}
                style={{
                    background: 'linear-gradient(var(--th-surface), var(--th-surface)) padding-box, linear-gradient(45deg, #fada61 0%, #ff9188 50%, #ff5acd 100%) border-box',
                    border: '2px solid transparent',
                    padding: '20px', borderRadius: '12px', cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '168px',
                    opacity: isDragging ? 0.4 : 1
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <span aria-hidden="true" style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', color: 'var(--th-text)', background: 'var(--th-surface-2)', border: '1px solid var(--th-border)' }}>
                        <i className={proj.icon || DEFAULT_PROJECT_ICON}></i>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: '0 0 4px 0', color: 'var(--th-text)', fontSize: '1rem', flex: 1, minWidth: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{proj.name}</h4>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                {pinBadge}
                                {proj.isPrivate && <span title="Projeto Privado">🔒</span>}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {proj.description || 'Sem descrição informada.'}
                        </p>
                    </div>
                    {proj.showProgress && <ProgressCircle value={proj.progress} size={56} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', borderTop: '1px solid var(--th-surface-3)', paddingTop: '8px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--th-muted-2)', background: 'var(--th-surface-2)', padding: '2px 6px', borderRadius: '4px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj.hasCalendar ? <><i className="fa-regular fa-calendar-days"></i> Com Calendário</> : <><i className="fa-regular fa-clipboard"></i> Apenas Tabela</>}
                        {isSearching && proj.folderId && folderLabel(proj.folderId) && (
                            <> · <i className="fa-regular fa-folder"></i> {folderLabel(proj.folderId)}</>
                        )}
                    </span>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                        <IconButton icon="fa-thumbtack" title={item.pinned ? 'Desafixar' : 'Fixar'} active={item.pinned} onClick={() => togglePin(item)} />
                        <IconButton icon="fa-copy" title="Duplicar projeto" onClick={() => setDuplicatingProject(proj)} />
                        {proj.canManage && (
                            <IconButton icon="fa-folder-open" title="Mover para pasta" onClick={() => setMovingProject(proj)} />
                        )}
                        {proj.canManage && (
                            <IconButton icon="fa-gear" title="Configurações do projeto" onClick={() => setSettingsProject(proj)} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--th-border-strong)', paddingBottom: '15px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--th-text)', fontSize: '1.4rem' }}>Meus Projetos e Serviços</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--th-muted)' }}>{liveStatus === 'online' ? 'Sincronização em tempo real ativada.' : 'Conectando à sincronização em tempo real...'}</p>
                </div>
                <Button variant="danger" onClick={onLogout}>Terminar sessão</Button>
            </div>

            {foldersError && (
                <div role="alert" style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--th-tint-amber-2)', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '0.8rem', color: '#92400e' }}>
                    <strong>Pastas indisponíveis.</strong> Verifique se os arquivos <code>pastas.sql</code> e <code>lixeira_pastas_admin.sql</code> foram executados no SQL Editor do Supabase.
                    <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#b45309' }}>Detalhe: {foldersError}</div>
                </div>
            )}

            {/* Pesquisa por nome de projetos e pastas */}
            <div style={{ position: 'relative', maxWidth: '420px', marginBottom: '16px' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--th-muted-2)', fontSize: '0.85rem' }}></i>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar projetos e pastas..."
                    style={{ width: '100%', padding: '9px 34px', border: '1px solid var(--th-border-strong)', borderRadius: '8px', background: 'var(--th-surface)', fontSize: '0.85rem', color: 'var(--th-text-2)', boxSizing: 'border-box', outline: 'none' }}
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        title="Limpar pesquisa"
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--th-muted-2)', padding: '4px' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

            {!isSearching && folderPath.length === 0 && !loading && (
                <>
                    <MentionsPanel
                        email={user.email}
                        onOpenProject={(id) => {
                            const target = projects.find((p) => p.id === id);
                            if (target) onSelectProject(target);
                        }}
                    />
                    <UpcomingPanel
                        projects={projects}
                        onOpenProject={(id) => {
                            const target = projects.find((p) => p.id === id);
                            if (target) onSelectProject(target);
                        }}
                    />
                </>
            )}

            {/* Caminho: Início > Pasta > Subpasta, com Voltar */}
            {!isSearching && folderPath.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <button type="button" onClick={() => setFolderPath([])} style={crumbStyle}>
                        <i className="fa-solid fa-house"></i> Início
                    </button>
                    {folderPath.map((id, i) => {
                        const isLast = i === folderPath.length - 1;
                        return (
                            <span key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.6rem', color: 'var(--th-muted-2)' }}></i>
                                <button
                                    type="button"
                                    onClick={() => goToLevel(i)}
                                    style={{ ...crumbStyle, fontWeight: isLast ? 700 : 500, color: isLast ? 'var(--th-text)' : 'var(--th-text-4)' }}
                                >
                                    {folderById[id]?.name || '...'}
                                </button>
                            </span>
                        );
                    })}
                    <button type="button" onClick={goBack} style={{ ...crumbStyle, marginLeft: 'auto' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar
                    </button>
                </div>
            )}

            {!isSearching && (
                <div style={{ marginBottom: '14px' }}>
                    <div
                        onClick={() => setIsChooserOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(var(--th-surface), var(--th-surface)) padding-box, linear-gradient(90deg, #07aeea 0%, #2bf598 100%) border-box',
                            border: '2px solid transparent',
                            borderRadius: '10px',
                            padding: '8px 16px',
                            cursor: 'pointer',
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
                        <i className="fa-regular fa-plus" style={{ fontSize: '1.1rem', color: '#07aeea', lineHeight: '1' }}></i>
                        <span style={{ fontFamily: "'Playfair Display', serif", color: 'var(--th-text)', fontWeight: '700', fontSize: '0.95rem' }}>Novo</span>
                    </div>
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--th-muted)' }}>A carregar projetos...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {levelItems.map((item) => renderItem(item))}

                    {levelItems.length === 0 && (
                        <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--th-muted)', fontSize: '0.85rem', margin: '20px 0' }}>
                            {isSearching
                                ? `Nenhum projeto ou pasta encontrado para "${search.trim()}".`
                                : currentFolder ? 'Esta pasta ainda está vazia.' : 'Nenhum projeto ainda.'}
                        </p>
                    )}
                </div>
            )}

            {/* Escolha: pasta ou projeto */}
            {isChooserOpen && (
                <ModalShell title="O que deseja criar?" width={360}>
                    {currentFolder && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>
                            Local: <strong style={{ color: 'var(--th-text-3)' }}>{folderLabel(currentFolder.id)}</strong>
                        </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <ChoiceCard
                            icon="fa-folder"
                            title="Pasta"
                            description="Agrupa projetos e outras pastas"
                            onClick={() => handleChoose('pasta')}
                        />
                        <ChoiceCard
                            icon="fa-clipboard"
                            title="Projeto"
                            description="Tabela, linhas e calendário"
                            onClick={() => handleChoose('projeto')}
                        />
                    </div>
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

                        <label style={labelStyle}>Ícone</label>
                        <ProjectIconPicker value={projectIcon} onChange={setProjectIcon} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', margin: '2px 0' }}>
                            <label style={checkLabelStyle}>
                                <span style={{ display: 'inline-flex', flexShrink: 0 }}><Checkbox checked={hasCalendar} onChange={(e) => setHasCalendar(e.target.checked)} /></span>
                                Usar Calendário
                            </label>
                            <label style={checkLabelStyle}>
                                <span style={{ display: 'inline-flex', flexShrink: 0 }}><Checkbox checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /></span>
                                Projeto Privado
                            </label>
                            {projectType === 'pontual' && (
                                <label style={checkLabelStyle}>
                                    <span style={{ display: 'inline-flex', flexShrink: 0 }}><Checkbox checked={showProgress} onChange={(e) => setShowProgress(e.target.checked)} /></span>
                                    Mostrar progresso
                                </label>
                            )}
                        </div>

                        <label style={labelStyle}>Acompanhamento</label>
                        <select value={projectType} onChange={(e) => setProjectType(e.target.value)} style={selectStyle}>
                            <option value="pontual">Pontual</option>
                            <option value="recorrente">Recorrente</option>
                        </select>

                        <label style={labelStyle}>Pasta</label>
                        <select value={projectFolderId} onChange={(e) => setProjectFolderId(e.target.value)} style={selectStyle}>
                            <option value="">Nenhuma (raiz)</option>
                            {foldersWithLabel.map((f) => (
                                <option key={f.id} value={f.id}>{f.label}</option>
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
                                    <label style={{ fontSize: '0.7rem', color: 'var(--th-muted)' }}>Qtd. Linhas</label>
                                    <Input type="number" className="num-input" style={numInputStyle} min="1" max="50" value={numRows} onChange={(e) => setNumRows(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.7rem', color: 'var(--th-muted)' }}>Qtd. Colunas</label>
                                    <Input type="number" className="num-input" style={numInputStyle} min="1" max="10" value={numCols} onChange={(e) => setNumCols(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: 'var(--th-surface-2)', border: '1px dashed var(--th-border-strong)', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--th-text-4)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Selecione o ficheiro Excel (.xlsx):</label>
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
                    parentId={currentFolderId}
                    parentLabel={currentFolderId ? folderLabel(currentFolderId) : ''}
                    departments={departments}
                    loadingDeps={loadingDeps}
                    onCancel={() => setFolderModal(null)}
                    onSaved={() => { setFolderModal(null); refresh(); }}
                    onDeleted={() => {
                        const deletedId = folderModal.folder?.id;
                        setFolderModal(null);
                        // Se a pasta excluída estava aberta (ou no caminho), volta para o nível acima
                        setFolderPath((prev) => {
                            const i = prev.indexOf(deletedId);
                            return i >= 0 ? prev.slice(0, i) : prev;
                        });
                        refresh();
                    }}
                />
            )}

            {/* Duplicar projeto */}
            {duplicatingProject && (
                <DuplicateProjectModal
                    project={duplicatingProject}
                    userEmail={user.email}
                    onCancel={() => setDuplicatingProject(null)}
                    onDone={() => { setDuplicatingProject(null); refresh(); }}
                />
            )}

            {/* Configurações do projeto (sem precisar abrir o projeto) */}
            {settingsProject && (
                <ProjectSettingsModal
                    project={settingsProject}
                    onClose={() => setSettingsProject(null)}
                    onDelete={async () => {
                        try {
                            await supabaseService.deleteProject(settingsProject.id, settingsProject.name);
                            setSettingsProject(null);
                            refresh();
                        } catch (err) {
                            alert('Erro ao excluir projeto: ' + err.message);
                        }
                    }}
                    onSave={async (fields) => {
                        await supabaseService.updateProject(settingsProject.id, fields);
                        setSettingsProject(null);
                        refresh();
                    }}
                />
            )}

            {/* Mover projeto para outra pasta */}
            {movingProject && (
                <MoveModal
                    title="Mover projeto"
                    itemName={movingProject.name}
                    currentFolderId={movingProject.folderId}
                    options={foldersWithLabel}
                    onCancel={() => setMovingProject(null)}
                    onConfirm={async (targetId) => {
                        const target = foldersWithLabel.find((f) => f.id === targetId);
                        await supabaseService.updateProject(movingProject.id, {
                            folderId: targetId,
                            folderName: target ? target.label : 'Raiz'
                        });
                    }}
                    onDone={() => { setMovingProject(null); refresh(); }}
                />
            )}

            {/* Mover pasta para dentro de outra pasta: não pode ir para ela mesma nem para as subpastas */}
            {movingFolder && (
                <MoveModal
                    title="Mover pasta"
                    itemName={movingFolder.name}
                    currentFolderId={movingFolder.parentId}
                    options={folderOptions(subtreeIds(folders, movingFolder.id))}
                    onCancel={() => setMovingFolder(null)}
                    onConfirm={async (targetId) => {
                        const target = foldersWithLabel.find((f) => f.id === targetId);
                        await supabaseService.moveFolder(movingFolder.id, targetId, movingFolder.name, target ? target.label : 'Raiz');
                    }}
                    onDone={() => { setMovingFolder(null); refresh(); }}
                />
            )}
        </div>
    );
}
