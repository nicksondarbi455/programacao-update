import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { DepartmentPicker } from '../molecules/DepartmentPicker';
import { ModalShell } from '../molecules/ModalShell';
import { supabaseService } from '../../services/supabaseService';

const labelStyle = { fontSize: '0.75rem', color: 'var(--th-muted)', fontWeight: 'bold' };
const textareaStyle = { background: 'var(--th-surface-2)', border: '1px solid var(--th-border-strong)', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'none', height: '50px', fontFamily: 'inherit' };

// Criar pasta (na raiz ou dentro de outra pasta) ou abrir as configurações de uma pasta
export function FolderFormModal({ folder, userEmail, parentId, parentLabel, departments, loadingDeps, onSaved, onDeleted, onCancel }) {
    const isEdit = Boolean(folder);
    const [name, setName] = useState(folder?.name || '');
    const [description, setDescription] = useState(folder?.description || '');
    const [selectedDeptIds, setSelectedDeptIds] = useState(folder?.departmentIds || []);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            const fields = {
                name: name.trim(),
                description: description.trim(),
                departmentIds: selectedDeptIds
            };
            if (isEdit) {
                await supabaseService.updateFolder(folder.id, fields);
            } else {
                await supabaseService.createFolder({
                    ...fields,
                    parentId: parentId || null,
                    parentName: parentLabel || 'Raiz'
                }, userEmail);
            }
            onSaved();
        } catch (err) {
            alert('Erro ao salvar pasta: ' + err.message);
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await supabaseService.deleteFolder(folder.id, folder.name);
            onDeleted();
        } catch (err) {
            alert('Erro ao excluir pasta: ' + err.message);
            setDeleting(false);
        }
    };

    return (
        <ModalShell title={isEdit ? 'Configurações da Pasta' : 'Nova Pasta'}>
            {!isEdit && (
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--th-muted)' }}>
                    Local: <strong style={{ color: 'var(--th-text-3)' }}>{parentLabel || 'Raiz (Meus Projetos)'}</strong>
                </p>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={labelStyle}>Nome da Pasta</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Infraestrutura 2026" required />

                <label style={labelStyle}>Descrição</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve resumo..."
                    style={textareaStyle}
                />

                <DepartmentPicker
                    label="Departamentos que podem ver o conteúdo desta pasta"
                    departments={departments}
                    selectedIds={selectedDeptIds}
                    onChange={setSelectedDeptIds}
                    loading={loadingDeps}
                    helpText="Quem está nesses departamentos vê a pasta e os projetos não privados dentro dela."
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <Button variant="secondary" className="btn-modal" onClick={onCancel}><span>Cancelar</span></Button>
                    <Button type="submit" variant="primary" className="btn-modal" disabled={saving}>
                        <span><i className="fa-regular fa-floppy-disk"></i> {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar pasta'}</span>
                    </Button>
                </div>
            </form>

            {/* Excluir pasta: fica no fim e pede confirmação */}
            {isEdit && (
                <div style={{ borderTop: '1px solid var(--th-border)', marginTop: '6px', paddingTop: '12px' }}>
                    {!confirmDelete ? (
                        <Button variant="danger" className="btn-modal" onClick={() => setConfirmDelete(true)}>
                            <span><i className="fa-solid fa-trash"></i> Excluir pasta</span>
                        </Button>
                    ) : (
                        <div style={{ background: 'var(--th-tint-red)', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                                Tem certeza que deseja excluir a pasta "{folder.name}"?
                            </strong>
                            <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
                                Essa ação irá excluir todos os projetos dessa pasta, incluindo as subpastas.
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                                Eles vão para a lixeira e podem ser restaurados em até 30 dias.
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button variant="secondary" className="btn-modal" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                                    <span>Cancelar</span>
                                </Button>
                                <Button variant="danger" className="btn-modal" onClick={handleDelete} disabled={deleting}>
                                    <span>{deleting ? 'Enviando...' : 'Sim, excluir'}</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </ModalShell>
    );
}
