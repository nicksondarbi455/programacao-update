import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';

const colorMap = {
    'vermelho': '#fee2e2', 'azul': '#dbeafe', 'verde': '#dcfce7',
    'amarelo': '#fef3c7', 'preto': '#f1f5f9', 'padrao': '#ffffff'
};

export function NocTable({ columnConfig, equipments, isEditMode, onUpdateField, onUpdateColName, onDeleteCol, onDeleteRow, onDragStart, onDragOver, onDrop, onInitResize }) {
    
    // Cálculo total da largura para a tabela
    const totalWidth = columnConfig.reduce((acc, col) => acc + (parseInt(col.width) || 150), 0) + (isEditMode ? 130 : 0);

    return (
        <div className="section-panel">
            <div className="panel-header">
                <h2>Gestão de Serviços e Equipamentos NOC</h2>
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
                                        draggable={true}
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, idx)}
                                    >
                                        {isEditMode && idx >= 4 && (
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
                            {isEditMode && <th style={{ textAlign: 'center', width: '130px', minWidth: '130px' }}>Cor / Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {equipments.map(eq => {
                            let rowBg = colorMap[eq.color] || '#ffffff';
                            return (
                                <tr key={eq.id} style={{ backgroundColor: rowBg }}>
                                    {columnConfig.map(col => {
                                        let w = parseInt(col.width) || 150;
                                        let val = eq[col.id] !== undefined ? eq[col.id] : (eq.custom ? eq.custom[col.id] : '');
                                        return (
                                            <td key={col.id} className={col.type === 'checkbox' ? 'checkbox-cell' : ''} style={{ width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }}>
                                                {col.type === 'checkbox' ? (
                                                    <Checkbox checked={val} onChange={(e) => onUpdateField(eq.id, col.id, e.target.checked)} />
                                                ) : (
                                                    <Input
                                                        className={isEditMode ? 'editable' : ''}
                                                        value={val}
                                                        readOnly={!isEditMode}
                                                        onChange={(e) => onUpdateField(eq.id, col.id, e.target.value)}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                    {isEditMode && (
                                        <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', height: '32px', width: '130px' }}>
                                            <select className="color-select" value={eq.color || 'padrao'} onChange={(e) => onUpdateField(eq.id, 'color', e.target.value)}>
                                                <option value="padrao">Padrão</option>
                                                <option value="vermelho">Vermelho</option>
                                                <option value="azul">Azul</option>
                                                <option value="verde">Verde</option>
                                                <option value="amarelo">Amarelo</option>
                                                <option value="preto">Cinza</option>
                                            </select>
                                            <Button variant="danger" size="sm" style={{ padding: '2px 6px' }} onClick={() => onDeleteRow(eq.id)}>X</Button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}