import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';

const colorMap = {
    'vermelho': '#fee2e2', 'azul': '#dbeafe', 'verde': '#dcfce7',
    'amarelo': '#fef3c7', 'preto': '#f1f5f9', 'padrao': '#ffffff'
};

// Largura fixa da coluna "Check" (antes "Status", que ficava com 40px e mostrava só "S")
const CHECK_COL_WIDTH = 70;

// Verifica se a linha ou evento possui status de concluído nos agendamentos
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

export function NocTable({ 
    columnConfig, 
    equipments, 
    isEditMode, 
    selectedRowIds = [],
    onToggleSelectRow,
    onUpdateField, 
    onUpdateColName, 
    onDeleteCol, 
    onDeleteRow, 
    onMoveRow,
    onDragStart, 
    onDragOver, 
    onDrop, 
    onInitResize, 
    schedules = {},
    searchTerm = '', 
    statusFilter = 'all' 
}) {
    
    const filteredEquipments = equipments.filter(eq => {
        // Concluído = agendamento marcado como feito no calendário
        const done = isRowCompleted(eq, schedules, columnConfig);
        if (statusFilter === 'pending' && done) return false;
        if (statusFilter === 'completed' && !done) return false;

        if (eq.isGroupHeader) return true;

        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        
        return Object.keys(eq).some(key => {
            let itemVal = eq[key];
            if (typeof itemVal === 'string' && itemVal.toLowerCase().includes(term)) return true;
            return false;
        });
    });

    // Botões ▲ ▼ para reordenar as linhas (apenas no modo de edição)
    const renderMoveButtons = (eq) => (
        <>
            <Button variant="secondary" size="sm" style={{ padding: '2px 6px' }} onClick={() => onMoveRow(eq.id, -1)} title="Mover para cima">▲</Button>
            <Button variant="secondary" size="sm" style={{ padding: '2px 6px' }} onClick={() => onMoveRow(eq.id, 1)} title="Mover para baixo">▼</Button>
        </>
    );

    const totalWidth = columnConfig.reduce((acc, col) => acc + (parseInt(col.width) || 150), 0) + CHECK_COL_WIDTH + (isEditMode ? 220 : 0);

    /**
     * Monta as células de uma faixa de Evento Único respeitando a MESMA ordem das colunas
     * do cabeçalho. Colunas gerais consecutivas viram um único bloco com o nome do evento;
     * colunas exclusivas de evento (ex.: Check) ficam em célula própria, na sua posição.
     * Assim a faixa cinza não invade nem desalinha as outras colunas.
     */
    const renderGroupCells = (eq, completed) => {
        const segments = [];
        columnConfig.forEach(col => {
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
            if (seg.kind === 'std') {
                const isTitle = !titleShown;
                titleShown = true;
                return (
                    <td
                        key={`std-${i}`}
                        colSpan={seg.span}
                        style={{ textAlign: 'center', padding: '6px 12px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '1px', textTransform: 'uppercase' }}
                    >
                        {isTitle && (isEditMode ? (
                            <input
                                type="text"
                                value={eq.groupName || ''}
                                onChange={(e) => onUpdateField(eq.id, 'groupName', e.target.value)}
                                placeholder="NOME DO EVENTO"
                                style={{
                                    fontWeight: '800', textAlign: 'center', background: '#e2e8f0', borderRadius: '4px',
                                    border: '1px solid #475569', color: '#0f172a', width: '100%', maxWidth: '100%',
                                    boxSizing: 'border-box', display: 'block', padding: '3px 6px', margin: 0
                                }}
                            />
                        ) : (
                            <span>📌 {eq.groupName || 'EVENTO SEM NOME'} {completed ? <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i> : ''}</span>
                        ))}
                    </td>
                );
            }

            const col = seg.col;
            let w = parseInt(col.width) || 150;
            let cellValue = eq[col.id] !== undefined ? eq[col.id] : '';
            return (
                <td key={col.id} className={col.type === 'checkbox' ? 'checkbox-cell' : ''} style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, background: '#cbd5e1' }}>
                    {col.type === 'checkbox' ? (
                        <Checkbox checked={!!cellValue} onChange={(e) => onUpdateField(eq.id, col.id, e.target.checked)} />
                    ) : (
                        <Input
                            className={isEditMode ? 'editable' : ''}
                            value={cellValue}
                            placeholder={col.name}
                            readOnly={!isEditMode}
                            onChange={(e) => onUpdateField(eq.id, col.id, e.target.value)}
                        />
                    )}
                </td>
            );
        });
    };

    return (
        <div className="section-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestão de Dados ({filteredEquipments.length} registos)</h2>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>💡 No modo de edição, marque as caixas das linhas desejadas e clique em "Unir em 1 Evento"</span>
            </div>
            <div className="table-container">
                <table id="noc-table" style={{ width: `${totalWidth}px` }}>
                    <thead>
                        <tr>
                            <th style={{ width: `${CHECK_COL_WIDTH}px`, minWidth: `${CHECK_COL_WIDTH}px`, maxWidth: `${CHECK_COL_WIDTH}px`, textAlign: 'center' }}>
                                Check
                            </th>

                            {columnConfig.map((col, idx) => {
                                let w = parseInt(col.width) || 150;
                                const isEventScope = col.targetScope === 'events';
                                return (
                                    <th
                                        key={col.id}
                                        style={{ 
                                            width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`,
                                            background: isEventScope ? '#334155' : undefined 
                                        }}
                                        draggable={isEditMode}
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, idx)}
                                        title={isEventScope ? 'Coluna exclusiva de Eventos' : 'Coluna geral'}
                                    >
                                        {isEditMode && columnConfig.length > 1 && (
                                            <Button variant="danger" size="sm" style={{ padding: '0 2px', float: 'right' }} onClick={() => onDeleteCol(col.id)}>X</Button>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {isEventScope && <span style={{ fontSize: '0.7rem' }} title="Apenas Eventos">📌</span>}
                                            <span
                                                className={isEditMode ? "col-title-display editable" : "col-title-display"}
                                                contentEditable={isEditMode}
                                                suppressContentEditableWarning={true}
                                                onBlur={(e) => onUpdateColName(col.id, e.target.innerText)}
                                            >
                                                {col.name}
                                            </span>
                                        </div>
                                        <div className="resizer" onMouseDown={(e) => onInitResize(e, idx)} />
                                    </th>
                                );
                            })}
                            {isEditMode && <th style={{ textAlign: 'center', width: '200px', minWidth: '200px' }}>Prioridade / Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEquipments.length === 0 ? (
                            <tr>
                                <td colSpan={columnConfig.length + (isEditMode ? 2 : 1)} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    Nenhum registo encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredEquipments.map(eq => {
                                const completed = isRowCompleted(eq, schedules, columnConfig);

                                // FAIXA CINZA DE EVENTO ÚNICO
                                if (eq.isGroupHeader) {
                                    return (
                                        <tr key={eq.id} style={{ backgroundColor: completed ? '#d1fae5' : '#94a3b8', borderBottom: '2px solid #64748b' }}>
                                            <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                                                {completed ? <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i> : '📌'}
                                            </td>

                                            {renderGroupCells(eq, completed)}

                                            {isEditMode && (
                                                <td style={{ textAlign: 'center', width: '200px' }}>
                                                    {renderMoveButtons(eq)}
                                                    <Button variant="danger" size="sm" style={{ padding: '2px 8px' }} onClick={() => onDeleteRow(eq.id)}>Excluir Evento</Button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                }

                                // LINHA DE DADOS PADRÃO
                                let rowBg = completed ? '#f0fdf4' : (colorMap[eq.color] || '#ffffff');
                                const isSelected = selectedRowIds.includes(eq.id);

                                return (
                                    <tr key={eq.id} style={{ backgroundColor: rowBg, borderLeft: eq.groupId ? '4px solid #8b5cf6' : 'none' }}>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            {isEditMode ? (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => onToggleSelectRow(eq.id)} 
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                            ) : (
                                                completed ? <i className="fa-solid fa-circle-check" title="Concluído" style={{ color: '#16a34a', fontSize: '1.1rem' }}></i> : null
                                            )}
                                        </td>

                                        {columnConfig.map(col => {
                                            let w = parseInt(col.width) || 150;
                                            
                                            // Se a coluna for exclusiva para Eventos, exibe travada nas linhas padrão
                                            if (col.targetScope === 'events') {
                                                return (
                                                    <td key={col.id} style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px`, textAlign: 'center', color: '#cbd5e1', background: '#f8fafc', fontSize: '0.8rem' }} title="Campo exclusivo para faixas de evento">
                                                        —
                                                    </td>
                                                );
                                            }

                                            let cellValue = eq[col.id] !== undefined ? eq[col.id] : '';
                                            return (
                                                <td key={col.id} className={col.type === 'checkbox' ? 'checkbox-cell' : ''} style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }}>
                                                    {col.type === 'checkbox' ? (
                                                        <Checkbox checked={!!cellValue} onChange={(e) => onUpdateField(eq.id, col.id, e.target.checked)} />
                                                    ) : (
                                                        <Input
                                                            className={isEditMode ? 'editable' : ''}
                                                            value={cellValue}
                                                            readOnly={!isEditMode}
                                                            onChange={(e) => onUpdateField(eq.id, col.id, e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {isEditMode && (
                                            <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center', height: '32px', width: '200px' }}>
                                                <select 
                                                    className="color-select" 
                                                    value={eq.color || 'padrao'} 
                                                    onChange={(e) => onUpdateField(eq.id, 'color', e.target.value)} 
                                                    style={{ fontSize: '0.65rem', padding: '2px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                                                >
                                                    <option value="padrao">Normal</option>
                                                    <option value="vermelho">🔴 Crítico</option>
                                                    <option value="amarelo">🟡 Atenção</option>
                                                    <option value="verde">🟢 Baixa</option>
                                                    <option value="azul">🔵 Info</option>
                                                </select>
                                                {renderMoveButtons(eq)}
                                                <Button variant="danger" size="sm" style={{ padding: '2px 5px' }} onClick={() => onDeleteRow(eq.id)}>X</Button>
                                            </td>
                                        )}
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
