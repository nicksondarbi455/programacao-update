import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';

const colorMap = {
    'vermelho': '#fee2e2', 'azul': '#dbeafe', 'verde': '#dcfce7',
    'amarelo': '#fef3c7', 'preto': '#f1f5f9', 'padrao': '#ffffff'
};

export function NocTable({ columnConfig, equipments, isEditMode, onUpdateField, onUpdateColName, onDeleteCol, onDeleteRow, onDragStart, onDragOver, onDrop, onInitResize, searchTerm = '', statusFilter = 'all' }) {
    
    const filteredEquipments = equipments.filter(eq => {
        if (statusFilter === 'pending' && eq.status) return false;
        if (statusFilter === 'completed' && !eq.status) return false;

        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        
        return Object.keys(eq).some(key => {
            let itemVal = eq[key];
            if (typeof itemVal === 'string' && itemVal.toLowerCase().includes(term)) return true;
            if (eq.custom && typeof eq.custom === 'object') {
                return Object.values(eq.custom).some(cVal => String(cVal).toLowerCase().includes(term));
            }
            return false;
        });
    });

    // Ajusta a largura total da tabela para acomodar a coluna de ações/prioridades quando em modo de edição
    const totalWidth = columnConfig.reduce((acc, col) => acc + (parseInt(col.width) || 150), 0) + (isEditMode ? 140 : 0);

    return (
        <div className="section-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestão de Dados ({filteredEquipments.length} registos)</h2>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>💡 Clique em "Editar" no topo para alterar dados, cores ou remover itens</span>
            </div>
            <div className="table-container">
                <table id="noc-table" style={{ width: `${totalWidth}px` }}>
                    <thead>
                        <tr>
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
                            {/* A coluna de Prioridade e Ações só aparece quando o modo de edição está ativo */}
                            {isEditMode && <th style={{ textAlign: 'center', width: '140px', minWidth: '140px' }}>Prioridade / Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEquipments.length === 0 ? (
                            <tr>
                                <td colSpan={columnConfig.length + (isEditMode ? 1 : 0)} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    Nenhum registo encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredEquipments.map(eq => {
                                let rowBg = colorMap[eq.color] || '#ffffff';
                                return (
                                    <tr key={eq.id} style={{ backgroundColor: rowBg }}>
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
                                        {/* Seletor de Prioridade (Cores) + Botão de Excluir linha no modo de edição */}
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