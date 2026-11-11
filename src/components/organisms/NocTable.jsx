import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '../atoms/Checkbox';

const CHECK_COL_WIDTH = 70;
// Largura da coluna com o número da linha (à esquerda do Check)
const ROW_NUM_WIDTH = 44;

// Cores de seleção (estilo Google Sheets)
const SELECT_BLUE = '#1a73e8';
const SELECT_TINT = '#d2e3fc';

// Ícones de ação (bandeira e comentário) no fim de cada linha
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px', fontSize: '0.9rem', color: 'var(--th-sheet-text)', lineHeight: 1 };

export function isRowCompleted(eq, schedules, columnConfig) {

    let label = eq.isGroupHeader ? eq.groupName : (columnConfig[0] ? eq[columnConfig[0].id] : '');
    if (!label) return false;

    const cleanedLabel = String(label).replace(/^📌\s*/, '').trim().toLowerCase();

    for (const dateKey in schedules) {
        const items = schedules[dateKey] || [];
        const match = items.find(item => {
            if (!item.text) return false;
            const cleanedText = String(item.text).replace(/^📌\s*/, '').trim().toLowerCase();
            return cleanedText === cleanedLabel;
        });
        if (match && match.completed) {
            return true;
        }
    }
    return false;
}

// Formatação de uma célula (guardada em eq._fmt[colId]): negrito, alinhamento e cor do texto
function fmtStyle(fmt) {
    if (!fmt) return {};
    return {
        fontWeight: fmt.b ? 700 : undefined,
        textAlign: fmt.a || undefined,
        color: fmt.c || undefined
    };
}

// Célula de planilha: sem caixa e ocupando a célula inteira.
// Um clique só seleciona (campo somente leitura, com o texto ainda selecionável).
// Duplo clique (ou Enter/F2) libera a edição. Lembra o valor de antes e grava ao sair da célula.
function SheetInput({ value, onChange, onCommit, onFocusCell, style, placeholder, readOnly, editing, canEdit, onStartEdit, onStopEdit }) {
    const startRef = useRef(value);
    const inputRef = useRef(null);

    // Ao entrar em edição, o cursor vai para o fim do texto
    useEffect(() => {
        if (editing && inputRef.current) {
            const el = inputRef.current;
            el.focus();
            const end = el.value.length;
            el.setSelectionRange(end, end);
        }
    }, [editing]);

    return (
        <input
            ref={inputRef}
            type="text"
            className="sheet-input"
            value={value ?? ''}
            placeholder={placeholder}
            readOnly={readOnly || !editing}
            style={{ background: 'transparent', cursor: editing ? 'text' : 'cell', ...style }}
            onFocus={() => {
                startRef.current = value;
                if (onFocusCell) onFocusCell();
            }}
            onChange={(e) => {
                if (!readOnly && editing) onChange(e.target.value);
            }}
            onKeyDown={(e) => {
                if (!editing && canEdit && onStartEdit && (e.key === 'Enter' || e.key === 'F2')) {
                    e.preventDefault();
                    onStartEdit();
                } else if (editing && e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
            onBlur={() => {
                if (editing && !readOnly && String(startRef.current ?? '') !== String(value ?? '')) {
                    onCommit(startRef.current);
                }
                if (onStopEdit) onStopEdit();
            }}
        />
    );
}

export function NocTable({
    columnConfig,
    equipments,
    readOnly = false,
    selRows = new Set(),
    selCols = new Set(),
    selRange = null,
    onRangeSelect,
    activeCell,
    onActivateCell,
    onRowClick,
    onColClick,
    onSelectAll,
    onUpdateField,
    onCommitField,
    onUpdateColName,
    onRowDragStart,
    onRowDrop,
    onToggleEventRow,
    onOpenRowComments,
    commentCounts = {},
    onOpenSettings,
    onDragStart,
    onDragOver,
    onDrop,
    onInitResize,
    schedules = {},
    searchTerm = '',
    statusFilter = 'all',
    projectType = 'pontual'
}) {
    // Coluna que está sendo renomeada (duplo clique no nome)
    const [editingCol, setEditingCol] = useState(null);

    const hasGroupHeaders = equipments.some((eq) => eq.isGroupHeader);

    // Projeto recorrente: não tem coluna Check nem linha verde (revisões que sempre se repetem)
    const isRecurring = projectType === 'recorrente';
    const isDone = (eq) => !isRecurring && isRowCompleted(eq, schedules, columnConfig);
    const checkWidth = isRecurring ? 0 : CHECK_COL_WIDTH;

    const filteredEquipments = equipments.filter((eq) => {
        const done = isDone(eq);
        if (hasGroupHeaders && statusFilter !== 'all' && !eq.isGroupHeader) return false;
        if (statusFilter === 'pending' && done) return false;
        if (statusFilter === 'completed' && !done) return false;

        if (eq.isGroupHeader) return true;
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase();
        return Object.keys(eq).some((key) => typeof eq[key] === 'string' && eq[key].toLowerCase().includes(term));
    });

    // Ordem visível das linhas e de todas as colunas (usadas para a seleção com Shift)
    const orderedRowIds = filteredEquipments.map((eq) => eq.id);
    const orderedColIds = columnConfig.map((col) => col.id);

    const isActive = (rowId, colId) => !!activeCell && activeCell.rowId === rowId && activeCell.colId === colId;

    const focusCell = (rowId, colId) => () => {
        if (onActivateCell) onActivateCell({ rowId, colId });
    };

    // Célula em edição (duplo clique, Enter ou F2)
    const [editingCell, setEditingCell] = useState(null);
    const isEditingCell = (rowId, colId) => !!editingCell && editingCell.rowId === rowId && editingCell.colId === colId;

    // Retângulo entre duas células (linhas e colunas na ordem da tela)
    const buildRect = (from, to) => {
        const r1 = orderedRowIds.indexOf(from.rowId);
        const r2 = orderedRowIds.indexOf(to.rowId);
        const c1 = orderedColIds.indexOf(from.colId);
        const c2 = orderedColIds.indexOf(to.colId);
        if (r1 < 0 || r2 < 0 || c1 < 0 || c2 < 0) return null;
        const rowList = orderedRowIds.slice(Math.min(r1, r2), Math.max(r1, r2) + 1);
        const colList = orderedColIds.slice(Math.min(c1, c2), Math.max(c1, c2) + 1);
        return { rowList, colList, rows: new Set(rowList), cols: new Set(colList) };
    };
    const rangeRect = selRange ? buildRect(selRange.from, selRange.to) : null;
    const inRange = (rowId, colId) => !!rangeRect && rangeRect.rows.has(rowId) && rangeRect.cols.has(colId);

    // Texto da seleção: colunas separadas por Tab e linhas por quebra de linha (cola direto no Excel)
    const rangeToText = (rect) => {
        const byId = new Map(filteredEquipments.map((eq) => [eq.id, eq]));
        const cols = rect.colList.map((cid) => columnConfig.find((c) => c.id === cid)).filter(Boolean);
        return rect.rowList.map((rid) => {
            const eq = byId.get(rid);
            if (!eq) return '';
            return cols.map((col) => {
                const v = eq[col.id];
                if (col.type === 'checkbox') return v ? 'Sim' : 'Não';
                return v === undefined || v === null ? '' : String(v).replace(/[\t\r\n]+/g, ' ');
            }).join('\t');
        }).join('\n');
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Sem permissão do navegador: usa o método antigo de cópia
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch { /* sem acesso à área de transferência */ }
            document.body.removeChild(ta);
        }
    };

    // Copia uma linha inteira (todas as colunas) ou uma coluna inteira (todas as linhas)
    const copyRowAll = (rowId) => {
        if (orderedColIds.length === 0) return;
        const rect = buildRect({ rowId, colId: orderedColIds[0] }, { rowId, colId: orderedColIds[orderedColIds.length - 1] });
        if (rect) copyText(rangeToText(rect));
    };
    const copyColAll = (colId) => {
        if (orderedRowIds.length === 0) return;
        const rect = buildRect({ rowId: orderedRowIds[0], colId }, { rowId: orderedRowIds[orderedRowIds.length - 1], colId });
        if (rect) copyText(rangeToText(rect));
    };

    // Arrastar o mouse entre células: marca o retângulo e, ao soltar, copia o conteúdo marcado
    const dragRef = useRef(null);
    const latestRef = useRef({});
    latestRef.current = { buildRect, rangeToText, copyText };
    useEffect(() => {
        const onUp = () => {
            const d = dragRef.current;
            dragRef.current = null;
            if (!d) return;
            const { buildRect: rect, rangeToText: toText, copyText: copy } = latestRef.current;

            if (!d.moved) {
                // Clique numa célula: não copia se o usuário selecionou só um trecho do texto dentro dela
                const el = document.activeElement;
                if (el && el.tagName === 'INPUT' && el.selectionStart !== el.selectionEnd) return;
            }

            const r = rect(d.from, d.to);
            if (!r) return;
            const text = toText(r);
            // Célula vazia clicada não substitui o que estava na área de transferência
            if (!d.moved && text === '') return;
            copy(text);
        };
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    // Eventos de mouse de uma célula: clique e arrastar (seleção e cópia)
    const cellMouse = (rowId, colId, canStartEdit) => ({
        onMouseDown: (e) => {
            if (e.button !== 0 || isEditingCell(rowId, colId)) return;
            const cell = { rowId, colId };
            dragRef.current = { from: cell, to: cell, moved: false };
            if (onActivateCell) onActivateCell(cell);
        },
        onMouseEnter: () => {
            const d = dragRef.current;
            if (!d) return;
            if (d.to.rowId === rowId && d.to.colId === colId) return;
            d.to = { rowId, colId };
            d.moved = true;
            if (onRangeSelect) onRangeSelect(d.from, d.to);
        },
        onDoubleClick: () => {
            if (!readOnly && canStartEdit) setEditingCell({ rowId, colId });
        }
    });

    // Cor de fundo da linha antes de qualquer seleção: faixa de evento (cinza ou verde) ou linha comum
    const rowBase = (eq, completed) => {
        if (eq.isGroupHeader) return completed ? '#86efac' : '#94a3b8';
        return completed ? '#f0fdf4' : 'var(--th-sheet)';
    };

    // Estilo de uma célula: cor da linha, seleção (azul) e cor de fundo escolhida pelo usuário
    const cellLook = (eq, colId, base, extra = {}) => {
        const isGroup = !!eq.isGroupHeader;
        const rowSel = selRows.has(eq.id);
        const colSel = selCols.has(colId);
        const fmt = eq._fmt && eq._fmt[colId];

        const inSel = inRange(eq.id, colId);

        let bg = base;
        if (!isGroup && (colSel || inSel)) bg = SELECT_TINT;
        if (fmt && fmt.bg) bg = fmt.bg;

        // Linha selecionada, célula ativa e área arrastada usam a mesma borda azul; a cor da célula continua visível
        const outline = isActive(eq.id, colId) || rowSel || colSel || inSel;
        return { background: bg, boxShadow: outline ? `inset 0 0 0 2px ${SELECT_BLUE}` : 'none', ...extra };
    };

    const totalWidth = columnConfig.reduce((acc, col) => acc + (parseInt(col.width) || 150), 0)
        + ROW_NUM_WIDTH + checkWidth + 70;
    const emptyColSpan = columnConfig.length + (isRecurring ? 2 : 3);

    // Borda azul de seleção de linha (mesmo estilo da célula ativa)
    const rowOutline = (eq) => (selRows.has(eq.id) ? { boxShadow: `inset 0 0 0 2px ${SELECT_BLUE}` } : {});

    // Número da linha: clique seleciona a linha (Ctrl soma, Shift vai até a linha anterior selecionada)
    const renderRowNum = (eq, index, base, dragProps = {}) => {
        const selected = selRows.has(eq.id);
        const isGroup = !!eq.isGroupHeader;
        return (
            <td
                className="row-num"
                title="Clique seleciona e copia a linha (Ctrl para várias, Shift para um intervalo). Arraste pelo número para mover a linha."
                onClick={(e) => {
                    onRowClick(eq.id, e, orderedRowIds);
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) copyRowAll(eq.id);
                }}
                {...dragProps}
                style={{
                    width: `${ROW_NUM_WIDTH}px`, minWidth: `${ROW_NUM_WIDTH}px`, maxWidth: `${ROW_NUM_WIDTH}px`,
                    textAlign: 'center', cursor: 'pointer', userSelect: 'none', fontSize: '0.72rem',
                    background: selected ? SELECT_BLUE : (isGroup ? base : 'var(--th-surface-2)'),
                    color: selected ? '#ffffff' : 'var(--th-sheet-muted)',
                    fontWeight: selected ? 700 : 400
                }}
            >
                {index + 1}
            </td>
        );
    };

    // Bandeira (marca evento) e comentários, no fim de cada linha
    const renderActions = (eq, base) => {
        const count = commentCounts[`linha|${eq.id}`] || 0;
        return (
            <td style={{ width: '70px', minWidth: '70px', textAlign: 'center', padding: '0 4px', background: base, ...rowOutline(eq) }}>
                {!readOnly && (
                    <button
                        type="button"
                        title={eq.isGroupHeader ? 'Desmarcar como evento' : 'Marcar como evento'}
                        onClick={() => onToggleEventRow(eq)}
                        style={iconBtn}
                    >
                        <i className="fa-regular fa-flag"></i>
                    </button>
                )}
                <button
                    type="button"
                    title={count ? `${count} comentário(s)` : 'Comentar'}
                    onClick={() => onOpenRowComments(eq)}
                    style={{ ...iconBtn, color: count ? '#2563eb' : 'var(--th-sheet-text)', opacity: count ? 1 : 0.55 }}
                >
                    <i className={count ? 'fa-solid fa-comment' : 'fa-regular fa-comment'}></i>
                    {count > 0 && <span style={{ marginLeft: '3px', fontSize: '0.65rem', fontWeight: 700 }}>{count}</span>}
                </button>
            </td>
        );
    };

    // Célula de uma coluna exclusiva de Eventos nas linhas comuns (não se edita aqui)
    const renderLockedCell = (col, eq, base) => {
        const w = parseInt(col.width) || 150;
        return (
            <td
                key={col.id}
                className="sheet-cell"
                onClick={focusCell(eq.id, col.id)}
                {...cellMouse(eq.id, col.id, false)}
                style={cellLook(eq, col.id, base, { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, textAlign: 'center', color: '#cbd5e1' })}
            >
                —
            </td>
        );
    };

    // Célula editável de uma coluna (ou caixa, se a coluna for checkbox)
    const renderDataCell = (eq, col, base) => {
        const w = parseInt(col.width) || 150;
        const size = { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` };
        const value = eq[col.id] !== undefined ? eq[col.id] : '';
        const look = cellLook(eq, col.id, base, size);

        if (col.type === 'checkbox') {
            return (
                <td key={col.id} className="sheet-cell checkbox-cell" style={look} onClick={focusCell(eq.id, col.id)} {...cellMouse(eq.id, col.id, false)}>
                    <Checkbox
                        checked={!!value}
                        onChange={(e) => {
                            if (readOnly) return;
                            onUpdateField(eq.id, col.id, e.target.checked);
                            onCommitField(eq.id, col.id, value, e.target.checked);
                        }}
                    />
                </td>
            );
        }

        return (
            <td key={col.id} className="sheet-cell" style={look} {...cellMouse(eq.id, col.id, true)}>
                <SheetInput
                    value={value}
                    readOnly={readOnly}
                    canEdit={!readOnly}
                    editing={isEditingCell(eq.id, col.id)}
                    onStartEdit={() => setEditingCell({ rowId: eq.id, colId: col.id })}
                    onStopEdit={() => setEditingCell(null)}
                    style={fmtStyle(eq._fmt && eq._fmt[col.id])}
                    onFocusCell={focusCell(eq.id, col.id)}
                    onChange={(v) => onUpdateField(eq.id, col.id, v)}
                    onCommit={(before) => onCommitField(eq.id, col.id, before)}
                />
            </td>
        );
    };

    /**
     * Células de uma faixa de Evento Único, na MESMA ordem das colunas do cabeçalho.
     * Colunas gerais consecutivas viram um bloco com o nome do evento; colunas exclusivas
     * de evento ficam em célula própria, na sua posição.
     */
    const renderGroupCells = (eq, base) => {
        const segments = [];
        columnConfig.forEach((col) => {
            if (col.targetScope === 'events') {
                segments.push({ kind: 'event', col });
            } else {
                const last = segments[segments.length - 1];
                if (last && last.kind === 'std') last.span += 1;
                else segments.push({ kind: 'std', span: 1 });
            }
        });

        let titleShown = false;
        return segments.map((seg, i) => {
            if (seg.kind === 'event') return renderDataCell(eq, seg.col, base);

            const isTitle = !titleShown;
            titleShown = true;
            return (
                <td
                    key={`std-${i}`}
                    colSpan={seg.span}
                    style={cellLook(eq, '__titulo__', base, { padding: 0, fontWeight: 'bold', color: 'var(--th-sheet-text)', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' })}
                >
                    {isTitle && (
                        <SheetInput
                            value={eq.groupName || ''}
                            placeholder="NOME DO EVENTO"
                            readOnly={readOnly}
                            style={{ fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', background: 'transparent' }}
                            onChange={(v) => onUpdateField(eq.id, 'groupName', v)}
                            onCommit={(before) => onCommitField(eq.id, 'groupName', before)}
                        />
                    )}
                </td>
            );
        });
    };

    return (
        <div className="section-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2>Gestão de Dados ({filteredEquipments.length} registos)</h2>
                    {onOpenSettings && (
                        <button type="button" title="Configurações do projeto" onClick={onOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--th-sheet-muted)', fontSize: '1rem' }}>
                            <i className="fa-solid fa-gear"></i>
                        </button>
                    )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--th-sheet-muted)' }}>
                    {readOnly
                        ? 'Somente leitura'
                        : 'Clique numa célula · número da linha para selecionar · cabeçalho para selecionar coluna · duplo clique no nome para renomear'}
                </span>
            </div>

            <div className="table-container">
                <table id="noc-table" style={{ width: `${totalWidth}px` }}>
                    <thead>
                        <tr>
                            <th
                                title="Selecionar tudo"
                                onClick={() => onSelectAll && onSelectAll()}
                                style={{ width: `${ROW_NUM_WIDTH}px`, minWidth: `${ROW_NUM_WIDTH}px`, maxWidth: `${ROW_NUM_WIDTH}px`, cursor: 'pointer' }}
                            />
                            {!isRecurring && (
                                <th style={{ width: `${CHECK_COL_WIDTH}px`, minWidth: `${CHECK_COL_WIDTH}px`, maxWidth: `${CHECK_COL_WIDTH}px`, textAlign: 'center' }}>
                                    Check
                                </th>
                            )}

                            {columnConfig.map((col, idx) => {
                                const w = parseInt(col.width) || 150;
                                const isEventScope = col.targetScope === 'events';
                                const selected = selCols.has(col.id);
                                return (
                                    <th
                                        key={col.id}
                                        className={selCols.has(col.id) ? 'col-selected' : undefined}
                                        style={{
                                            width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`,
                                            background: selected ? SELECT_BLUE : (isEventScope ? '#334155' : undefined),
                                            cursor: 'pointer'
                                        }}
                                        draggable={!readOnly}
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, idx)}
                                        onClick={(e) => {
                                            if (editingCol === col.id) return;
                                            if (onColClick) onColClick(col.id, e, orderedColIds);
                                            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) copyColAll(col.id);
                                        }}
                                        title={isEventScope ? 'Coluna exclusiva de Eventos (clique seleciona e copia a coluna; Ctrl/Shift para várias)' : 'Coluna geral (clique seleciona e copia a coluna; Ctrl/Shift para várias)'}
                                    >
                                        {editingCol === col.id ? (
                                            <input
                                                className="col-title-input"
                                                autoFocus
                                                defaultValue={col.name}
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={(e) => {
                                                    const novo = e.target.value.trim();
                                                    if (novo && novo !== col.name && !readOnly) onUpdateColName(col.id, novo);
                                                    setEditingCol(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                    if (e.key === 'Escape') {
                                                        e.currentTarget.value = col.name;
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className="col-title-display"
                                                onDoubleClick={(e) => {
                                                    if (readOnly) return;
                                                    e.stopPropagation();
                                                    setEditingCol(col.id);
                                                }}
                                            >
                                                {col.name}
                                            </span>
                                        )}
                                        {!readOnly && <div className="resizer" onMouseDown={(e) => onInitResize(e, idx)} />}
                                    </th>
                                );
                            })}

                            <th style={{ width: '70px', minWidth: '70px' }} />
                        </tr>
                    </thead>

                    <tbody>
                        {filteredEquipments.length === 0 ? (
                            <tr>
                                <td colSpan={emptyColSpan} style={{ textAlign: 'center', padding: '20px', color: 'var(--th-sheet-muted)' }}>
                                    Nenhum registo encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredEquipments.map((eq, index) => {
                                const completed = isDone(eq);
                                const base = rowBase(eq, completed);

                                // Só o número da linha pode ser arrastado para mudar de posição (a linha inteira é o destino)
                                const rowDrag = !readOnly ? {
                                    draggable: true,
                                    onDragStart: (e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', eq.id);
                                        onRowDragStart(eq.id);
                                    }
                                } : {};
                                const rowDrop = !readOnly ? {
                                    onDragOver: (e) => e.preventDefault(),
                                    onDrop: () => onRowDrop(eq.id)
                                } : {};

                                if (eq.isGroupHeader) {
                                    return (
                                        <tr key={eq.id} {...rowDrop} style={{ backgroundColor: base, borderBottom: '2px solid #64748b' }}>
                                            {renderRowNum(eq, index, base, rowDrag)}
                                            {!isRecurring && (
                                                <td style={{ textAlign: 'center', fontSize: '1rem', background: base, ...rowOutline(eq) }}>
                                                    {completed ? <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', fontSize: '18px' }}></i> : null}
                                                </td>
                                            )}
                                            {renderGroupCells(eq, base)}
                                            {renderActions(eq, base)}
                                        </tr>
                                    );
                                }

                                return (
                                    <tr
                                        key={eq.id}
                                        {...rowDrop}
                                        style={{ backgroundColor: base, borderLeft: eq.groupId ? '4px solid #8b5cf6' : 'none' }}
                                    >
                                        {renderRowNum(eq, index, base, rowDrag)}
                                        {!isRecurring && (
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', background: base, ...rowOutline(eq) }}>
                                                {completed ? <i className="fa-solid fa-circle-check" title="Concluído" style={{ color: '#16a34a', fontSize: '18px' }}></i> : null}
                                            </td>
                                        )}
                                        {columnConfig.map((col) => (col.targetScope === 'events' ? renderLockedCell(col, eq, base) : renderDataCell(eq, col, base)))}
                                        {renderActions(eq, base)}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
