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
    const [customColQty, setCustomColQty] = useState(1);
    const [eventSearch, setEventSearch] = useState('');
    // Agendamento aguardando confirmação (marcar ou desmarcar como feito)
    const [confirmItem, setConfirmItem] = useState(null);

    if (!modalData?.isOpen && !colModalOpen) return null;

    const handleAddEventSubmit = (e) => {
        e.preventDefault();
        if (!selectedItem.trim()) return alert('Selecione um evento para agendar!');
        onSaveEvent(selectedItem);
        setSelectedItem('');
        setEventSearch('');
    };

    const handleAddColSubmit = (e) => {
        e.preventDefault();
        if (!customColName.trim()) return alert('Digite o nome da coluna!');
        onSaveCol(customColName.trim(), customColType, customColScope, customColQty);
        setCustomColName('');
        setCustomColType('text');
        setCustomColScope('all');
        setCustomColQty(1);
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

    // Opções de evento com o rótulo que será gravado no agendamento
    const eventOptions = availableEvents.map((eq) => ({
        id: eq.id,
        label: eq.isGroupHeader
            ? (eq.groupName || 'Sem Nome')
            : (columnConfig[0] ? String(eq[columnConfig[0].id] || 'Sem Nome') : 'Equipamento')
    }));

    const term = eventSearch.trim().toLowerCase();
    // Esconde da busca os eventos que já foram marcados como feito neste dia
    const completedLabels = new Set((modalData.items || []).filter(i => i.completed).map(i => i.text));
    const filteredOptions = eventOptions.filter(opt => !completedLabels.has(opt.label) && opt.label.toLowerCase().includes(term));

    const closeDayModal = () => {
        setSelectedItem('');
        setEventSearch('');
        onCloseModal();
    };

    // Clicar no evento já selecionado desmarca ele
    const pickOption = (label) => setSelectedItem(prev => (prev === label ? '' : label));

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
                                                onChange={() => setConfirmItem({ type: 'toggle', idx, completed: !item.completed })}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: item.completed ? '#16a34a' : '#1e293b', textDecoration: item.completed ? 'line-through' : 'none', userSelect: 'none' }}>
                                                {item.text}
                                            </span>
                                        </div>
                                        <Button variant="danger" size="sm" onClick={() => setConfirmItem({ type: 'remove', idx })}>Remover</Button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pesquisa e seleção exclusiva de Eventos Únicos */}
                        <form onSubmit={handleAddEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>
                                Pesquisar evento único para agendar:
                            </label>

                            <input
                                type="text"
                                value={eventSearch}
                                placeholder="Digite para pesquisar um evento..."
                                autoComplete="off"
                                onChange={(e) => { setEventSearch(e.target.value); setSelectedItem(''); }}
                                onKeyDown={(e) => {
                                    // Enter escolhe o primeiro resultado sem enviar o formulário
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (filteredOptions.length > 0) pickOption(filteredOptions[0].label);
                                    }
                                }}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a' }}
                            />

                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                                {filteredOptions.length === 0 ? (
                                    <p style={{ margin: 0, padding: '10px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                        {eventOptions.length === 0 ? 'Nenhum evento único cadastrado.' : 'Nenhum evento encontrado.'}
                                    </p>
                                ) : (
                                    filteredOptions.map((opt) => {
                                        const isPicked = selectedItem === opt.label;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => pickOption(opt.label)}
                                                style={{
                                                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
                                                    border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                                    fontSize: '0.85rem', color: '#0f172a',
                                                    background: isPicked ? '#dbeafe' : '#ffffff',
                                                    fontWeight: isPicked ? 'bold' : 'normal'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <span style={{ fontSize: '0.75rem', color: selectedItem ? '#16a34a' : '#94a3b8' }}>
                                {selectedItem ? <>Selecionado: <strong>{selectedItem}</strong></> : 'Nenhum evento selecionado'}
                            </span>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '5px' }}>
                                <Button variant="secondary" className="btn-modal" onClick={closeDayModal}>Fechar</Button>
                                <button type="submit" className="btn-agendar">
                                    <svg className="svg-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <g strokeWidth="2" strokeLinecap="round" stroke="currentColor">
                                            <rect y="5" x="4" width="16" rx="2" height="16"></rect>
                                            <path d="m8 3v4"></path>
                                            <path d="m16 3v4"></path>
                                            <path d="m4 11h16"></path>
                                        </g>
                                    </svg>
                                    Agendar evento
                                </button>
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
                                    Quantidade de colunas (máx. 20):
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={customColQty}
                                    onChange={(e) => setCustomColQty(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                />
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
                                    <option value="events">Apenas nas Faixas de Evento (Eventos Únicos)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                                <Button variant="secondary" onClick={onCloseCol}>Cancelar</Button>
                                <Button variant="primary" type="submit">Adicionar coluna</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {confirmItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '10px', padding: '18px 20px', width: '280px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, textAlign: 'center' }}>
                            {confirmItem.type === 'remove'
                                ? 'Tem certeza que deseja remover este agendamento?'
                                : confirmItem.completed
                                    ? 'Tem certeza que deseja marcar este agendamento como feito?'
                                    : 'Tem certeza que deseja desmarcar este agendamento?'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <Button variant="secondary" className="btn-modal" onClick={() => setConfirmItem(null)}><span>Cancelar</span></Button>
                            <Button variant={confirmItem.type === 'remove' ? 'danger' : 'success'} className="btn-modal" onClick={() => {
                                if (confirmItem.type === 'remove') onDeleteSchedule(modalData.dateStr, confirmItem.idx);
                                else onToggleCompleteSchedule(modalData.dateStr, confirmItem.idx);
                                setConfirmItem(null);
                            }}><span>Sim</span></Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}