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

    if (!modalData?.isOpen && !colModalOpen) return null;

    const handleAddEventSubmit = (e) => {
        e.preventDefault();
        if (!selectedItem.trim()) return alert('Selecione um evento ou equipamento!');
        onSaveEvent(selectedItem);
        setSelectedItem('');
    };

    const handleAddColSubmit = (e) => {
        e.preventDefault();
        if (!customColName.trim()) return alert('Digite o nome da coluna!');
        onSaveCol(customColName.trim(), customColType);
        setCustomColName('');
    };

    // Filtra os equipamentos para exibir SOMENTE os Eventos Unificados e equipamentos avulsos (oculta itens que foram agrupados)
    const availableEvents = (modalData.equipments || []).filter(eq => {
        // Se for um Evento Unificado (Faixa Cinza), exibe no menu
        if (eq.isGroupHeader) return true;
        // Se a linha pertencer a um grupo/evento unificado, NÃO exibe individualmente
        if (eq.groupId) return false;
        return true;
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
                                            {/* SOMENTE o clique no checkbox altera o status de concluído */}
                                            <input 
                                                type="checkbox" 
                                                checked={item.completed || false} 
                                                onChange={() => onToggleCompleteSchedule(modalData.dateStr, idx)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            {/* O texto do nome do evento apenas exibe a informação, sem marcar como feito ao clicar */}
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: item.completed ? '#16a34a' : '#1e293b', textDecoration: item.completed ? 'line-through' : 'none', userSelect: 'none' }}>
                                                {item.text}
                                            </span>
                                        </div>
                                        <Button variant="danger" size="sm" onClick={() => onDeleteSchedule(modalData.dateStr, idx)}>Remover</Button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Form para Agendar Novo Evento */}
                        <form onSubmit={handleAddEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>
                                Selecionar evento para agendar:
                            </label>

                            <select 
                                value={selectedItem} 
                                onChange={(e) => setSelectedItem(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', color: '#0f172a' }}
                            >
                                <option value="">-- Escolha o Evento ou Equipamento --</option>
                                {availableEvents.map((eq) => {
                                    const labelText = eq.isGroupHeader 
                                        ? eq.groupName || 'Sem Nome' 
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

            {/* Modal de Criar Coluna */}
            {colModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000, backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'DM Sans, sans-serif' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Nova Coluna</h3>
                        <form onSubmit={handleAddColSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input 
                                type="text" 
                                value={customColName} 
                                onChange={(e) => setCustomColName(e.target.value)} 
                                placeholder="Nome da Coluna" 
                                autoFocus
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            />
                            <select 
                                value={customColType} 
                                onChange={(e) => setCustomColType(e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            >
                                <option value="text">Texto</option>
                                <option value="checkbox">Caixa de Seleção (Check)</option>
                            </select>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={onCloseCol}>Cancelar</Button>
                                <Button variant="primary" type="submit">Adicionar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}