import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { DepartmentPicker } from '../molecules/DepartmentPicker';
import { ModalShell } from '../molecules/ModalShell';
import { supabaseService } from '../../services/supabaseService';

const labelStyle = { fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' };
const textareaStyle = { background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', fontSize: '0.8rem', resize: 'none', height: '50px', fontFamily: 'inherit' };

// Criar ou editar uma pasta: nome, descrição e departamentos que veem o conteúdo
export function FolderFormModal({ folder, userEmail, departments, loadingDeps, onSaved, onCancel }) {
    const isEdit = Boolean(folder);
    const [name, setName] = useState(folder?.name || '');
    const [description, setDescription] = useState(folder?.description || '');
    const [selectedDeptIds, setSelectedDeptIds] = useState(folder?.departmentIds || []);
    const [saving, setSaving] = useState(false);

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
                await supabaseService.createFolder(fields, userEmail);
            }
            onSaved();
        } catch (err) {
            alert('Erro ao salvar pasta: ' + err.message);
            setSaving(false);
        }
    };

    return (
        <ModalShell title={isEdit ? 'Editar Pasta' : 'Nova Pasta'}>
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
        </ModalShell>
    );
}
