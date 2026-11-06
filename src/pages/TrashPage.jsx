import { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Button } from '../components/atoms/Button';
import { ModalShell } from '../components/molecules/ModalShell';

const RETENTION_DAYS = 30;

// Dias restantes até a remoção definitiva (contados a partir da exclusão)
function daysLeft(deletedAt) {
    const passedDays = (Date.now() - new Date(deletedAt).getTime()) / 86400000;
    return Math.max(0, Math.ceil(RETENTION_DAYS - passedDays));
}

// Lixeira: itens excluídos ficam 30 dias. Esvaziar é exclusivo do master.
export function TrashPage({ isMaster }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const [emptying, setEmptying] = useState(false);

    const load = async () => {
        try {
            setItems(await supabaseService.listTrash());
        } catch (err) {
            alert('Erro ao carregar a lixeira: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleRestore = async (item) => {
        setBusyId(item.id);
        try {
            await supabaseService.restoreItem(item.kind, item.id, item.name);
            await load();
        } catch (err) {
            alert('Erro ao restaurar: ' + err.message);
        } finally {
            setBusyId(null);
        }
    };

    const handleEmpty = async () => {
        setEmptying(true);
        try {
            await supabaseService.emptyTrash();
            setConfirmEmpty(false);
            await load();
        } catch (err) {
            alert('Erro ao esvaziar a lixeira: ' + err.message);
        } finally {
            setEmptying(false);
        }
    };

    return (
        <div className="main-content" style={{ height: 'calc(100vh - 20px)', padding: '20px', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Lixeira</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--th-muted)' }}>
                            Itens excluídos ficam aqui por {RETENTION_DAYS} dias e depois são removidos definitivamente.
                        </p>
                    </div>
                    {isMaster && items.length > 0 && (
                        <Button size="sm" variant="danger" onClick={() => setConfirmEmpty(true)}>
                            <i className="fa-regular fa-trash-can"></i> Esvaziar lixeira
                        </Button>
                    )}
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--th-muted)' }}>Carregando lixeira...</p>
                ) : items.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--th-muted)', fontSize: '0.85rem', margin: '30px 0' }}>A lixeira está vazia.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {items.map((item) => {
                            const isFolder = item.kind === 'folder';
                            const days = daysLeft(item.deletedAt);
                            return (
                                <div key={`${item.kind}-${item.id}`} style={{ background: 'var(--th-surface)', border: '1px solid var(--th-border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <i className={isFolder ? 'fa-regular fa-folder' : 'fa-regular fa-clipboard'} style={{ fontSize: '1.4rem', color: isFolder ? '#4e73df' : '#ff5acd', flexShrink: 0 }}></i>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--th-text)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--th-muted)', marginTop: '2px' }}>
                                            {isFolder
                                                ? `Pasta · ${item.projectCount} ${item.projectCount === 1 ? 'projeto' : 'projetos'}`
                                                : `Projeto${item.folderName ? ` · na pasta ${item.folderName}` : ''}`}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--th-muted-2)', marginTop: '2px' }}>
                                            Dono: {item.ownerEmail} · Excluído em {new Date(item.deletedAt).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>

                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: days <= 5 ? '#dc2626' : 'var(--th-muted)', whiteSpace: 'nowrap' }}>
                                        {days} {days === 1 ? 'dia restante' : 'dias restantes'}
                                    </span>

                                    <Button size="sm" variant="success" onClick={() => handleRestore(item)} disabled={busyId === item.id}>
                                        <i className="fa-solid fa-rotate-left"></i> {busyId === item.id ? 'Restaurando...' : 'Restaurar'}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {confirmEmpty && (
                <ModalShell title="Esvaziar lixeira?" width={400}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--th-text-3)' }}>
                        Todos os itens da lixeira serão removidos definitivamente. Esta ação não pode ser desfeita.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <Button variant="secondary" className="btn-modal" onClick={() => setConfirmEmpty(false)} disabled={emptying}>
                            <span>Cancelar</span>
                        </Button>
                        <Button variant="danger" className="btn-modal" onClick={handleEmpty} disabled={emptying}>
                            <span>{emptying ? 'Esvaziando...' : 'Sim, esvaziar'}</span>
                        </Button>
                    </div>
                </ModalShell>
            )}
        </div>
    );
}
