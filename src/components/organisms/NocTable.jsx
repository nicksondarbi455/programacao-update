import { useRef } from 'react';
import { Checkbox } from '../atoms/Checkbox';

const CHECK_COL_WIDTH = 70;
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
// Lembra o valor de antes ao ganhar o foco e avisa ao sair, para gravar só ao terminar.
function SheetInput({ value, onChange, onCommit, onFocusCell, style, placeholder, readOnly }) {
    const startRef = useRef(value);
    return (
        <input
            type="text"
            className="sheet-input"
            value={value ?? ''}
            placeholder={placeholder}
            readOnly={readOnly}
            style={style}
            onFocus={() => {
                startRef.current = value;
                if (onFocusCell) onFocusCell();
            }}
            onChange={(e) => {
                if (!readOnly) onChange(e.target.value);
            }}
            onBlur={() => {
                if (readOnly) return;
                if (String(startRef.current ?? '') !== String(value ?? '')) {
                    onCommit(startRef.current);
                }
            }}
        />
    );
}

export function NocTable({
    columnConfig,
    equipments,
    readOnly = false,
    deleteMode = false,
    selectedRows = new Set(),
    selectedCols = new Set(),
    onToggleRow,
    onToggleCol,
    onUpdateField,
    onCommitField,
    onUpdateColName,
    onRowDragStart,
    onRowDrop,
    onToggleEventRow,
    onOpenRowComments,
    activeCell,
    onActivateCell,
    commentCounts = {},
    onOpenSettings,
    onDragStart,
    onDragOver,
    onDrop,
    onInitResize,
    schedules = {},
    searchTerm = '',
    statusFilter = 'all'
}) {
    const hasGroupHeaders = equipments.some((eq) => eq.isGroupHeader);

    const filteredEquipments = equipments.filter((eq) => {
        const done = isRowCompleted(eq, schedules, columnConfig);
        if (hasGroupHeaders && statusFilter !== 'all' && !eq.isGroupHeader) return false;
        if (statusFilter === 'pending' && done) return false;
        if (statusFilter === 'completed' && !done) return false;

        if (eq.isGroupHeader) return true;
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase();
        return Object.keys(eq).some((key) => typeof eq[key] === 'string' && eq[key].toLowerCase().includes(term));
    });

    const isActive = (rowId, colId) => !!activeCell && activeCell.rowId === rowId && activeCell.colId === colId;
    const focusCell = (rowId, colId) => () => {
        if (onActivateCell) onActivateCell({ rowId, colId });
    };

    const totalWidth = columnConfig.reduce((acc, col) => acc + (parseInt(col.width) || 150), 0)
        + CHECK_COL_WIDTH + 70 + (deleteMode ? 36 : 0);
    const emptyColSpan = columnConfig.length + 2 + (deleteMode ? 1 : 0);

    // Caixa de seleção para excluir (só aparece no modo excluir)
    const renderSelectCell = (checked, onToggle) => (deleteMode ? (
        <td style={{ width: '36px', minWidth: '36px', textAlign: 'center' }}>
            <input type="checkbox" checked={checked} onChange={onToggle} />
        </td>
    ) : null);

    // Bandeira (marca evento) e comentários, no fim de cada linha
    const renderActions = (eq) => {
        const count = commentCounts[`linha|${eq.id}`] || 0;
        return (
            <td style={{ width: '70px', minWidth: '70px', textAlign: 'center', padding: '0 4px' }}>
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
    const renderLockedCell = (col) => {
        const w = parseInt(col.width) || 150;
        return (
            <td key={col.id} className="sheet-cell" style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, textAlign: 'center', color: '#cbd5e1', background: 'var(--th-sheet)' }}>
                —
            </td>
        );
    };

    // Célula editável de uma coluna (ou caixa, se a coluna for checkbox)
    const renderDataCell = (eq, col) => {
        const w = parseInt(col.width) || 150;
        const size = { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` };
        const value = eq[col.id] !== undefined ? eq[col.id] : '';

        if (col.type === 'checkbox') {
            return (
                <td key={col.id} className="sheet-cell checkbox-cell" style={size}>
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
            <td key={col.id} className="sheet-cell" style={{ ...size, background: isActive(eq.id, col.id) ? '#eef6ff' : 'var(--th-sheet)' }}>
                <SheetInput
                    value={value}
                    readOnly={readOnly}
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
    const renderGroupCells = (eq) => {
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
            if (seg.kind === 'event') return renderDataCell(eq, seg.col);

            const isTitle = !titleShown;
            titleShown = true;
            return (
                <td key={`std-${i}`} colSpan={seg.span} style={{ textAlign: 'center', padding: 0, fontWeight: 'bold', color: 'var(--th-sheet-text)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {isTitle && (
                        <SheetInput
                            value={eq.groupName || ''}
                            placeholder="NOME DO EVENTO"
                            readOnly={readOnly}
                            style={{ fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' }}
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
                    {readOnly ? 'Somente leitura' : 'Clique numa célula para editar · segure e arraste uma linha ou coluna para mover'}
                </span>
            </div>

            <div className="table-container">
                <table id="noc-table" style={{ width: `${totalWidth}px` }}>
                    <thead>
                        <tr>
                            {deleteMode && <th style={{ width: '36px', minWidth: '36px' }} />}
                            <th style={{ width: `${CHECK_COL_WIDTH}px`, minWidth: `${CHECK_COL_WIDTH}px`, maxWidth: `${CHECK_COL_WIDTH}px`, textAlign: 'center' }}>
                                Check
                            </th>

                            {columnConfig.map((col, idx) => {
                                const w = parseInt(col.width) || 150;
                                const isEventScope = col.targetScope === 'events';
                                return (
                                    <th
                                        key={col.id}
                                        style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, background: isEventScope ? '#334155' : undefined }}
                                        draggable={!readOnly && !deleteMode}
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, idx)}
                                        title={isEventScope ? 'Coluna exclusiva de Eventos' : 'Coluna geral'}
                                    >
                                        {deleteMode && (
                                            <div style={{ textAlign: 'center' }}>
                                                <input type="checkbox" checked={selectedCols.has(col.id)} onChange={() => onToggleCol(col.id)} />
                                            </div>
                                        )}
                                        <span
                                            className="col-title-display editable"
                                            contentEditable={!readOnly}
                                            suppressContentEditableWarning={true}
                                            onBlur={(e) => {
                                                if (!readOnly) onUpdateColName(col.id, e.target.innerText);
                                            }}
                                        >
                                            {col.name}
                                        </span>
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
                            filteredEquipments.map((eq) => {
                                const completed = isRowCompleted(eq, schedules, columnConfig);
                                const selected = selectedRows.has(eq.id);

                                // A linha inteira é a área de arrastar (sem ícone de pontinhos)
                                const dragProps = !readOnly && !deleteMode ? {
                                    draggable: true,
                                    onDragStart: (e) => {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', eq.id);
                                        onRowDragStart(eq.id);
                                    },
                                    onDragOver: (e) => e.preventDefault(),
                                    onDrop: () => onRowDrop(eq.id)
                                } : {};

                                if (eq.isGroupHeader) {
                                    return (
                                        <tr key={eq.id} {...dragProps} style={{ backgroundColor: completed ? '#86efac' : '#94a3b8', borderBottom: '2px solid #64748b' }}>
                                            {renderSelectCell(selected, () => onToggleRow(eq.id))}
                                            <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                                                {completed ? <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', fontSize: '18px' }}></i> : null}
                                            </td>
                                            {renderGroupCells(eq)}
                                            {renderActions(eq)}
                                        </tr>
                                    );
                                }

                                return (
                                    <tr
                                        key={eq.id}
                                        {...dragProps}
                                        style={{ backgroundColor: completed ? '#f0fdf4' : 'var(--th-sheet)', borderLeft: eq.groupId ? '4px solid #8b5cf6' : 'none' }}
                                    >
                                        {renderSelectCell(selected, () => onToggleRow(eq.id))}
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            {completed ? <i className="fa-solid fa-circle-check" title="Concluído" style={{ color: '#16a34a', fontSize: '18px' }}></i> : null}
                                        </td>
                                        {columnConfig.map((col) => (col.targetScope === 'events' ? renderLockedCell(col) : renderDataCell(eq, col)))}
                                        {renderActions(eq)}
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
