import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';

const colorMap = {
    'vermelho': '#fee2e2', 'azul': '#dbeafe', 'verde': '#dcfce7',
    'amarelo': '#fef3c7', 'preto': '#f1f5f9', 'padrao': '#ffffff'
};

// Verifica se a linha ou evento possui status de concluído nos agendamentos
function isRowCompleted(eq, schedules, columnConfig) {
    if (eq.status) return true;

    // Obtém o nome/rótulo do item
    let label = eq.isGroupHeader ? eq.groupName : (columnConfig[0] ? eq[columnConfig[0].id] : '');

    if (!label) return false;

    // Procura nos agendamentos do calendário se este item foi marcado como concluído
    for (const dateKey in schedules) {
        const items = schedules[dateKey] || [];
        const match = items.find(item => item.text === label || item.text === `📌 EVENTO: ${label}`);
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
    onDragStart, 
    onDragOver, 
    onDrop, 
    onInitResize, 
    schedules = {},
    searchTerm = '', 
    statusFilter = 'all' 
}) {
    
    const filteredEquipments = equipments.filter(eq => {
        if (eq.isGroupHeader) return true;

        if (statusFilter === 'pending' && eq.status) return false;
        if (statusFilter === 'completed' && !eq.status) return false;

        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        
        return Object.keys(eq).some(key => {
            let itemVal = eq[key];
            if (typeof itemVal === 'string' && itemVal.toLowerCase().includes(term)) return true;
            return false;
        });
    });

    const totalWidth = columnConfig.reduce((acc, col) => acc + (parseInt(col.width) || 150), 0) + (isEditMode ? 180 : 40);

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
                            {/* Coluna para Seleção e Status Positivo */}
                            <th style={{ width: '40px', minWidth: '40px', textAlign: 'center' }}>
                                Status
                            </th>

                            {columnConfig.map((col, idx) => {
                                let w = parseInt(col.width) || 150;
                                return (
                                    <th
                                        key={col.id}
                                        style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }}
                                        draggable={isEditMode}
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, idx)}
                                    >
                                        {isEditMode && columnConfig.length > 1 && (
                                            <Button variant="danger" size="sm" style={{ padding: '0 2px', float: 'right' }} onClick={() => onDeleteCol(col.id)}>X</Button>
                                        )}
                                        <span
                                            className={isEditMode ? "col-title-display editable" : "col-title-display"}
                                            contentEditable={isEditMode}
                                            suppressContentEditableWarning={true}
                                            onBlur={(e) => onUpdateColName(col.id, e.target.innerText)}
                                        >
                                            {col.name}
                                        </span>
                                        <div className="resizer" onMouseDown={(e) => onInitResize(e, idx)} />
                                    </th>
                                );
                            })}
                            {isEditMode && <th style={{ textAlign: 'center', width: '140px', minWidth: '140px' }}>Prioridade / Ações</th>}
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

                                // FAIXA/EVENTO ÚNICO UNIFICADO
                                if (eq.isGroupHeader) {
                                    return (
                                        <tr key={eq.id} style={{ backgroundColor: completed ? '#d1fae5' : '#94a3b8', borderBottom: '2px solid #64748b' }}>
                                            <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                                                {completed ? '✅' : '📌'}
                                            </td>
                                            <td colSpan={columnConfig.length} style={{ textAlign: 'center', padding: '6px 12px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                                {isEditMode ? (
                                                    <input 
                                                        type="text" 
                                                        value={eq.groupName || ''} 
                                                        onChange={(e) => onUpdateField(eq.id, 'groupName', e.target.value)}
                                                        placeholder="NOME DO EVENTO ÚNICO"
                                                        style={{ fontWeight: '800', textAlign: 'center', background: '#e2e8f0', borderRadius: '4px', border: '1px solid #475569', color: '#0f172a', width: '80%' }}
                                                    />
                                                ) : (
                                                    <span>EVENTO ÚNICO: {eq.groupName || 'EVENTO SEM NOME'} {completed ? '(CONCLUÍDO ✅)' : ''}</span>
                                                )}
                                            </td>
                                            {isEditMode && (
                                                <td style={{ textAlign: 'center', width: '140px' }}>
                                                    <Button variant="danger" size="sm" style={{ padding: '2px 8px' }} onClick={() => onDeleteRow(eq.id)}>Excluir Evento</Button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                }

                                // LINHA DE DADOS PERTENCENTE A UM EVENTO OU AVULSA
                                let rowBg = completed ? '#f0fdf4' : (colorMap[eq.color] || '#ffffff');
                                const isSelected = selectedRowIds.includes(eq.id);

                                return (
                                    <tr key={eq.id} style={{ backgroundColor: rowBg, borderLeft: eq.groupId ? '4px solid #8b5cf6' : 'none' }}>
                                        {/* Coluna de Status Positivo ou Seleção no modo de edição */}
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            {isEditMode ? (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => onToggleSelectRow(eq.id)} 
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                            ) : (
                                                completed ? <span style={{ fontSize: '1.1rem' }} title="Concluído">✅</span> : null
                                            )}
                                        </td>

                                        {columnConfig.map(col => {
                                            let w = parseInt(col.width) || 150;
                                            let cellValue = eq[col.id] !== undefined ? eq[col.id] : '';
                                            return (
                                                <td key={col.id} className={col.type === 'checkbox' ? 'checkbox-cell' : ''} style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }}>
                                                    {col.type === 'checkbox' ? (
                                                        <Checkbox checked={cellValue} onChange={(e) => onUpdateField(eq.id, col.id, e.target.checked)} />
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
                                            <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center', height: '32px', width: '140px' }}>
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