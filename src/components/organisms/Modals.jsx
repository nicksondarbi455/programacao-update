import { useState } from 'react';
import { Button } from '../atoms/Button';

export function Modals({ 
    modalData, 
    onCloseModal, 
    onSaveEvent, 
    onDeleteSchedule, 
    onToggleCompleteSchedule, 
    colModalOpen, 
    onSaveCol, 
    onCloseCol, 
    columnConfig 
}) {
    const [selectedItem, setSelectedItem] = useState('');
    const [customColName, setCustomColName] = useState('');
    const [customColType, setCustomColType] = useState('text');
    const [customColScope, setCustomColScope] = useState('all');

    if (!modalData?.isOpen && !colModalOpen) return null;

    const handleAddEventSubmit = (e) => {
        e.preventDefault();
        if (!selectedItem.trim()) return alert('Selecione um evento para agendar!');
        onSaveEvent(selectedItem);
        setSelectedItem('');
    };

    const handleAddColSubmit = (e) => {
        e.preventDefault();
        if (!customColName.trim()) return alert('Digite o nome da coluna!');
        onSaveCol(customColName.trim(), customColType, customColScope);
        setCustomColName('');
        setCustomColType('text');
        setCustomColScope('all');
    };

    // Verifica se existem Eventos Únicos (faixas cinzas) na tabela
    const hasGroupHeaders = (modalData.equipments || []).some(eq => eq.isGroupHeader);

    // Filtra para exibir SOMENTE os Eventos Únicos na caixa de seleção do calendário
    const availableEvents = (modalData.equipments || []).filter(eq => {
        if (hasGroupHeaders) {
            return eq.isGroupHeader === true;
        }
        return !eq.groupId;
    });

    return (
        <>
            {/* Modal de Agendamentos do Dia */}
            {modalData?.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '420px', maxWidth: '92%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px', fontFamily: 'DM Sans, sans-serif' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Gerenciar Agendamentos do Dia</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Data: <strong>{modalData.friendlyDate || modalData.dateStr}</strong></p>
                            </div>
                            <Button size="sm" style={{ background: '#cbd5e1', color: '#1e293b' }} onClick={onCloseModal}>X</Button>
                        </div>

                        {/* Lista dos Agendamentos do Dia */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                            {(!modalData.items || modalData.items.length === 0) ? (
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                                    Nenhum agendamento para este dia.
                                </p>
                            ) : (
                                modalData.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: item.completed ? '#f0fdf4' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={item.completed || false} 
                                                onChange={() => onToggleCompleteSchedule(modalData.dateStr, idx)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: item.completed ? '#16a34a' : '#1e293b', textDecoration: item.completed ? 'line-through' : 'none', userSelect: 'none' }}>
                                                {item.text}
                                            </span>
                                        </div>
                                        <Button variant="danger" size="sm" onClick={() => onDeleteSchedule(modalData.dateStr, idx)}>Remover</Button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Seleção exclusiva de Eventos Únicos */}
                        <form onSubmit={handleAddEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>
                                Selecionar evento único para agendar:
                            </label>

                            <select 
                                value={selectedItem} 
                                onChange={(e) => setSelectedItem(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', color: '#0f172a' }}
                            >
                                <option value="">-- Escolha o Evento --</option>
                                {availableEvents.map((eq) => {
                                    const labelText = eq.isGroupHeader 
                                        ? `📌 ${eq.groupName || 'Sem Nome'}` 
                                        : (columnConfig[0] ? String(eq[columnConfig[0].id] || 'Sem Nome') : 'Equipamento');

                                    return (
                                        <option key={eq.id} value={labelText}>
                                            {labelText}
                                        </option>
                                    );
                                })}
                            </select>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '5px' }}>
                                <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={onCloseModal}>Fechar</Button>
                                <Button variant="primary" type="submit">+ Agendar Evento</Button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

            {/* Modal de Criar Nova Coluna */}
            {colModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'DM Sans, sans-serif' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold' }}>➕ Nova Coluna</h3>
                        
                        <form onSubmit={handleAddColSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                    Nome da Coluna:
                                </label>
                                <input 
                                    type="text" 
                                    value={customColName} 
                                    onChange={(e) => setCustomColName(e.target.value)} 
                                    placeholder="Ex: Responsável, Status, Alvo" 
                                    autoFocus
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                    Tipo de Campo:
                                </label>
                                <select 
                                    value={customColType} 
                                    onChange={(e) => setCustomColType(e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', color: '#0f172a' }}
                                >
                                    <option value="text">📝 Texto Livre</option>
                                    <option value="checkbox">☑️ Caixa de Seleção (Check)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                    Onde aplicar esta coluna:
                                </label>
                                <select 
                                    value={customColScope} 
                                    onChange={(e) => setCustomColScope(e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', color: '#0f172a' }}
                                >
                                    <option value="all">🌐 Em Todas as Linhas da Tabela</option>
                                    <option value="events">📌 Apenas nas Faixas de Evento (Eventos Únicos)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                                <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={onCloseCol}>Cancelar</Button>
                                <Button variant="primary" type="submit">Adicionar Coluna</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}