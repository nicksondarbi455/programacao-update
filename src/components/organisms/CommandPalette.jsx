import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseService } from '../../services/supabaseService';

// Busca global (Ctrl+K): projetos e pastas, com navegação pelo teclado
export function CommandPalette({ userEmail, onClose, onOpenProject, onOpenFolder }) {
    const [query, setQuery] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            supabaseService.getProjects(userEmail),
            supabaseService.getFolders(userEmail)
        ])
            .then(([projects, folders]) => {
                if (cancelled) return;
                const byId = Object.fromEntries(folders.map((f) => [f.id, f]));

                // "Infraestrutura / Redes" ou "Raiz"
                const labelOf = (id) => {
                    const names = [];
                    let current = id ? byId[id] : null;
                    while (current) {
                        names.unshift(current.name);
                        current = current.parentId ? byId[current.parentId] : null;
                    }
                    return names.length ? names.join(' / ') : 'Raiz';
                };

                setItems([
                    ...projects.map((p) => ({ kind: 'projeto', id: p.id, name: p.name, subtitle: labelOf(p.folderId), project: p })),
                    ...folders.map((f) => ({ kind: 'pasta', id: f.id, name: f.name, subtitle: labelOf(f.parentId) }))
                ]);
            })
            .catch((err) => {
                if (!cancelled) alert('Erro ao carregar a busca: ' + err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userEmail]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q
            ? items.filter((i) => i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
            : items;
        return list.slice(0, 8);
    }, [items, query]);

    useEffect(() => {
        setActive(0);
    }, [query]);

    const choose = (item) => {
        if (!item) return;
        if (item.kind === 'projeto') onOpenProject(item.project);
        else onOpenFolder(item.id);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[active]);
        }
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100005, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '560px', maxWidth: '92%', boxShadow: '0 16px 40px rgba(0,0,0,0.25)', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar projetos e pastas..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '14px 14px 14px 40px', border: 'none', outline: 'none', fontSize: '0.95rem', color: '#0f172a' }}
                    />
                </div>

                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {loading && (
                        <p style={{ margin: 0, padding: '14px', fontSize: '0.8rem', color: '#64748b' }}>Carregando...</p>
                    )}
                    {!loading && results.length === 0 && (
                        <p style={{ margin: 0, padding: '14px', fontSize: '0.8rem', color: '#94a3b8' }}>Nada encontrado.</p>
                    )}
                    {results.map((item, idx) => (
                        <button
                            key={`${item.kind}-${item.id}`}
                            type="button"
                            onClick={() => choose(item)}
                            onMouseEnter={() => setActive(idx)}
                            style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f1f5f9', background: idx === active ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <i className={item.kind === 'projeto' ? 'fa-regular fa-clipboard' : 'fa-regular fa-folder'} style={{ color: item.kind === 'projeto' ? '#ff5acd' : '#4e73df' }}></i>
                                <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                {item.kind === 'projeto' ? 'Projeto' : 'Pasta'} · {item.subtitle}
                            </span>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '14px', padding: '8px 14px', fontSize: '0.68rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <span>↑↓ navegar</span>
                    <span>Enter abrir</span>
                    <span>Esc fechar</span>
                </div>
            </div>
        </div>
    );
}
