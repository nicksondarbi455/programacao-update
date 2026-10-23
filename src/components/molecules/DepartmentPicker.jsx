import { Checkbox } from '../atoms/Checkbox';

// Lista de departamentos com seleção múltipla: quem está neles pode ver o projeto
export function DepartmentPicker({ departments, selectedIds, onChange, loading }) {
    const toggle = (id) => {
        onChange(selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                Departamentos que podem ver este projeto
            </label>

            {loading && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Carregando departamentos...</span>}

            {!loading && departments.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Nenhum departamento cadastrado. Só você e os administradores verão este projeto.
                </span>
            )}

            {!loading && departments.map((dep) => (
                <label key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#334155' }}>
                    <Checkbox checked={selectedIds.includes(dep.id)} onChange={() => toggle(dep.id)} />
                    {dep.name}
                </label>
            ))}

            {!loading && departments.length > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Quem está no departamento vê o projeto. Quem tiver “Visualizar e editar” também pode editar.
                </span>
            )}
        </div>
    );
}
