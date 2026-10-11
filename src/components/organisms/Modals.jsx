import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

export function Modals({ modalData, onSaveEvent, onCloseModal, onDeleteSchedule, onToggleCompleteSchedule, colModalOpen, onSaveCol, onCloseCol }) {
    const [inputValue, setInputValue] = useState('');
    const [colName, setColName] = useState('');
    const [colType, setColType] = useState('text');

    return (
        <>
            {/* Modal de Agendamento */}
            {modalData.isOpen && (
                <div id="modal" style={{ display: 'flex' }}>
                    <div className="modal-content">
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>Gerenciar Agendamentos do Dia</h3>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#64748b' }}>Data: <strong style={{ color: '#0f172a' }}>{modalData.friendlyDate}</strong></p>
                        
                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px', background: '#f8fafc', padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            {modalData.items.length === 0 ? (
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Nenhum agendamento para este dia.</span>
                            ) : (
                                modalData.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#94a3b8' : '#0f172a' }}>
                                            <input type="checkbox" checked={item.completed} onChange={() => onToggleCompleteSchedule(modalData.dateStr, idx)} style={{ width: '12px', height: '12px', cursor: 'pointer' }} />
                                            <span>{item.text}</span>
                                        </label>
                                        <Button variant="danger" size="sm" style={{ padding: '1px 5px' }} onClick={() => onDeleteSchedule(modalData.dateStr, idx)}>Excluir</Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Pesquisar evento cadastrado:</label>
                        <Input 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            list="equipment-suggestions" 
                            placeholder="Digite para buscar..." 
                        />
                        <datalist id="equipment-suggestions">
                            {modalData.equipments.map(eq => <option key={eq.id} value={eq.cpd || eq.id} />)}
                        </datalist>
                        
                        <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={() => { setInputValue(''); onCloseModal(); }}>Fechar</Button>
                            <Button variant="primary" onClick={() => { onSaveEvent(inputValue); setInputValue(''); }}>Adicionar Agendamento</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Criar Coluna */}
            {colModalOpen && (
                <div id="modal-col" style={{ display: 'flex' }}>
                    <div className="modal-content">
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>Adicionar Nova Coluna</h3>
                        <Input 
                            value={colName}
                            onChange={(e) => setColName(e.target.value)}
                            placeholder="Nome da coluna..." 
                        />
                        <label style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>Tipo de Coluna:</label>
                        <select 
                            value={colType}
                            onChange={(e) => setColType(e.target.value)}
                            style={{ width: '100%', padding: '6px', margin: '5px 0', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                        >
                            <option value="text">Texto livre</option>
                            <option value="checkbox">Caixa de marcação (Sim/Não)</option>
                        </select>
                        <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={() => { setColName(''); onCloseCol(); }}>Cancelar</Button>
                            <Button variant="primary" onClick={() => { onSaveCol(colName, colType); setColName(''); }}>Criar</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}