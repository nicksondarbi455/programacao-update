import { useState, useEffect, useCallback } from 'react';
import { usersService, ACCESS_LEVELS, accessLabel } from '../services/usersService';
import { Button } from '../components/atoms/Button';

const labelStyle = { fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' };
const inputStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#f8fafc', width: '100%', boxSizing: 'border-box' };
const selectStyle = { padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' };
const cardStyle = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', flexWrap: 'wrap' };
const EMPTY_NEW_USER = { name: '', email: '', password: '', confirmPassword: '' };

function Feedback({ message }) {
    if (!message) return null;
    return (
        <p role="alert" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: message.type === 'error' ? '#dc2626' : '#16a34a' }}>
            {message.text}
        </p>
    );
}

function Field({ label, type = 'text', value, onChange, autoComplete, placeholder, minLength }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
            <label style={labelStyle}>{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                placeholder={placeholder}
                minLength={minLength}
                required
                style={inputStyle}
            />
        </div>
    );
}

export function UsersPage({ currentUserEmail }) {
    const [tab, setTab] = useState('usuarios'); // 'usuarios' | 'departamentos'
    const [isAdmin, setIsAdmin] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [loadError, setLoadError] = useState('');

    const reload = useCallback(async () => {
        try {
            const [admin, deps] = await Promise.all([
                usersService.getAdminStatus(currentUserEmail),
                usersService.listDepartments()
            ]);
            setIsAdmin(admin);
            setDepartments(deps);
            setLoadError('');
        } catch (err) {
            setLoadError(err.message);
        } finally {
            setLoaded(true);
        }
    }, [currentUserEmail]);

    useEffect(() => {
        reload();
    }, [reload]);

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
                <h2 style={{ fontSize: '1.4rem' }}>Usuários</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Verifique contas, crie usuários e defina os departamentos e o acesso de cada um.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" className={tab === 'usuarios' ? '' : 'btn-inactive'} onClick={() => setTab('usuarios')}>Usuários</Button>
                <Button size="sm" className={tab === 'departamentos' ? '' : 'btn-inactive'} onClick={() => setTab('departamentos')}>Departamentos</Button>
            </div>

            {loaded && !isAdmin && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px' }}>
                    Você não é administrador: pode consultar, mas não alterar.
                </p>
            )}
            {loadError && (
                <p role="alert" style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px' }}>
                    ⚠️ {loadError}
                </p>
            )}

            {tab === 'usuarios' ? (
                <UsersTab isAdmin={isAdmin} departments={departments} currentUserEmail={currentUserEmail} onChange={reload} />
            ) : (
                <DepartmentsTab isAdmin={isAdmin} departments={departments} onChange={reload} />
            )}
        </div>
    );
}

function UsersTab({ isAdmin, departments, currentUserEmail, onChange }) {
    const [searchEmail, setSearchEmail] = useState('');
    const [found, setFound] = useState(null);
    const [searched, setSearched] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [busy, setBusy] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState(EMPTY_NEW_USER);

    const [assignDeptId, setAssignDeptId] = useState('');
    const [assignLevel, setAssignLevel] = useState(ACCESS_LEVELS[0].value);

    const memberships = found
        ? departments.filter((dep) => dep.members.some((m) => m.user_email === found.email))
        : [];

    // Executa uma ação de escrita e recarrega os dados
    const runAction = async (action, successText) => {
        setBusy(true);
        setFeedback(null);
        try {
            await action();
            if (successText) setFeedback({ type: 'success', text: successText });
            onChange();
            return true;
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setBusy(true);
        setFeedback(null);
        try {
            setFound(await usersService.findUser(searchEmail));
            setSearched(true);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
        } finally {
            setBusy(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (newUser.password !== newUser.confirmPassword) {
            setFeedback({ type: 'error', text: 'As senhas não coincidem.' });
            setNewUser(EMPTY_NEW_USER);
            return;
        }

        setBusy(true);
        setFeedback(null);
        try {
            await usersService.createUser(newUser);
            setFeedback({ type: 'success', text: `Conta criada para ${newUser.email.trim().toLowerCase()}.` });
            setNewUser(EMPTY_NEW_USER);
            setShowCreate(false);
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
            if (err.isPasswordError) setNewUser(EMPTY_NEW_USER);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = () => {
        if (!confirm(`Excluir a conta ${found.email}? Esta ação não pode ser desfeita.`)) return;
        runAction(async () => {
            await usersService.deleteUser(found.email);
            setFound(null);
            setSearched(false);
            setSearchEmail('');
        }, 'Usuário excluído.');
    };

    const handleAssign = () => {
        if (!assignDeptId) {
            setFeedback({ type: 'error', text: 'Escolha um departamento.' });
            return;
        }
        runAction(async () => {
            await usersService.setMember(assignDeptId, found.email, assignLevel);
            setAssignDeptId('');
        }, 'Departamento destinado.');
    };

    const handleRemove = (depId) =>
        runAction(() => usersService.removeMember(depId, found.email), 'Removido do departamento.');

    const updateNewUser = (field) => (e) =>
        setNewUser((prev) => ({ ...prev, [field]: e.target.value }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleVerify} style={{ ...cardStyle, flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
                    <label style={labelStyle}>Verificar usuário pelo e-mail</label>
                    <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="usuario@empresa.com"
                        required
                        style={inputStyle}
                    />
                </div>
                <Button type="submit" variant="primary" disabled={busy}>Verificar</Button>
            </form>

            <Feedback message={feedback} />

            {searched && !found && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Nenhuma conta registada com este e-mail.</p>
            )}

            {found && (
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{found.full_name || 'Sem nome'}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{found.email}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Cadastrado em {new Date(found.created_at).toLocaleDateString('pt-BR')}
                                {found.is_admin ? ' · Administrador' : ''}
                            </div>
                        </div>
                        {isAdmin && found.email !== currentUserEmail && (
                            <Button variant="danger" size="sm" onClick={handleDelete} disabled={busy}>Excluir</Button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={labelStyle}>Departamentos</label>
                        {memberships.length === 0 && <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Sem departamentos.</p>}
                        {memberships.map((dep) => {
                            const member = dep.members.find((m) => m.user_email === found.email);
                            return (
                                <div key={dep.id} style={rowStyle}>
                                    <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                                        <strong>{dep.name}</strong> · {accessLabel(member.access_level)}
                                    </span>
                                    {isAdmin && (
                                        <Button size="sm" variant="danger" onClick={() => handleRemove(dep.id)} disabled={busy}>Remover</Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {isAdmin && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                                <label style={labelStyle}>Destinar a departamento</label>
                                <select value={assignDeptId} onChange={(e) => setAssignDeptId(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                                    <option value="">-- Escolha um departamento --</option>
                                    {departments.map((dep) => (
                                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                                    ))}
                                </select>
                            </div>
                            <select value={assignLevel} onChange={(e) => setAssignLevel(e.target.value)} style={selectStyle}>
                                {ACCESS_LEVELS.map((level) => (
                                    <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                            </select>
                            <Button variant="primary" onClick={handleAssign} disabled={busy}>Destinar</Button>
                        </div>
                    )}
                </div>
            )}

            {isAdmin && (
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Criar usuário</strong>
                        <Button size="sm" variant="primary" onClick={() => setShowCreate(!showCreate)}>
                            {showCreate ? 'Fechar' : <><i className="fa-regular fa-plus"></i> Novo usuário</>}
                        </Button>
                    </div>

                    {showCreate && (
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <Field label="Nome" value={newUser.name} onChange={updateNewUser('name')} autoComplete="off" placeholder="Nome completo" />
                                <Field label="E-mail" type="email" value={newUser.email} onChange={updateNewUser('email')} autoComplete="off" placeholder="usuario@empresa.com" />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <Field label="Senha" type="password" value={newUser.password} onChange={updateNewUser('password')} autoComplete="new-password" placeholder="********" minLength={6} />
                                <Field label="Confirmar senha" type="password" value={newUser.confirmPassword} onChange={updateNewUser('confirmPassword')} autoComplete="new-password" placeholder="********" minLength={6} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button type="submit" variant="primary" disabled={busy}>Criar usuário</Button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}

function DepartmentsTab({ isAdmin, departments, onChange }) {
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [memberEmail, setMemberEmail] = useState('');
    const [memberLevel, setMemberLevel] = useState(ACCESS_LEVELS[0].value);
    const [feedback, setFeedback] = useState(null);
    const [busy, setBusy] = useState(false);

    // Executa uma ação de escrita; devolve true se correu bem
    const runAction = async (action, successText) => {
        setBusy(true);
        setFeedback(null);
        try {
            await action();
            if (successText) setFeedback({ type: 'success', text: successText });
            onChange();
            return true;
        } catch (err) {
            setFeedback({ type: 'error', text: err.message });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        const ok = await runAction(() => usersService.createDepartment(newName), 'Departamento criado.');
        if (ok) setNewName('');
    };

    const handleRename = async (depId) => {
        if (!editName.trim()) return;
        const ok = await runAction(() => usersService.renameDepartment(depId, editName), 'Departamento renomeado.');
        if (ok) setEditingId(null);
    };

    const handleDelete = (dep) => {
        if (!confirm(`Excluir o departamento "${dep.name}"? Os usuários deixam de ter acesso por ele.`)) return;
        if (expandedId === dep.id) setExpandedId(null);
        runAction(() => usersService.deleteDepartment(dep.id), 'Departamento excluído.');
    };

    const handleAddMember = async (dep) => {
        if (!memberEmail.trim()) return;
        const ok = await runAction(async () => {
            const profile = await usersService.findUser(memberEmail);
            if (!profile) throw new Error('Não existe conta registada com este e-mail.');
            await usersService.setMember(dep.id, profile.email, memberLevel);
        }, 'Usuário adicionado ao departamento.');
        if (ok) setMemberEmail('');
    };

    const handleChangeLevel = (dep, email, level) =>
        runAction(() => usersService.setMember(dep.id, email, level), 'Permissão atualizada.');

    const handleRemoveMember = (dep, email) =>
        runAction(() => usersService.removeMember(dep.id, email), 'Usuário removido do departamento.');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isAdmin && (
                <form onSubmit={handleCreate} style={{ ...cardStyle, flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
                        <label style={labelStyle}>Novo departamento</label>
                        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: NOC Turno A" required style={inputStyle} />
                    </div>
                    <Button type="submit" variant="primary" disabled={busy}><i className="fa-regular fa-plus"></i> Criar departamento</Button>
                </form>
            )}

            <Feedback message={feedback} />

            {departments.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Nenhum departamento criado ainda.</p>
            )}

            {departments.map((dep) => {
                const isEditing = editingId === dep.id;
                const isExpanded = expandedId === dep.id;

                return (
                    <div key={dep.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                    <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />
                                    <Button size="sm" variant="success" onClick={() => handleRename(dep.id)} disabled={busy}>Salvar</Button>
                                    <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : dep.id)}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', color: '#0f172a' }}
                                >
                                    <strong>{dep.name}</strong>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '8px' }}>
                                        {dep.members.length} usuário(s) {isExpanded ? '▲' : '▼'}
                                    </span>
                                </button>
                            )}

                            {isAdmin && !isEditing && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <Button size="sm" variant="primary" onClick={() => { setEditingId(dep.id); setEditName(dep.name); }}>Editar</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(dep)} disabled={busy}>Excluir</Button>
                                </div>
                            )}
                        </div>

                        {isExpanded && (
                            <>
                                {dep.members.length === 0 && (
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Nenhum usuário neste departamento.</p>
                                )}

                                {dep.members.map((m) => (
                                    <div key={m.user_email} style={rowStyle}>
                                        <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>{m.user_email}</span>
                                        {isAdmin ? (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <select
                                                    value={m.access_level}
                                                    onChange={(e) => handleChangeLevel(dep, m.user_email, e.target.value)}
                                                    style={selectStyle}
                                                >
                                                    {ACCESS_LEVELS.map((level) => (
                                                        <option key={level.value} value={level.value}>{level.label}</option>
                                                    ))}
                                                </select>
                                                <Button size="sm" variant="danger" onClick={() => handleRemoveMember(dep, m.user_email)} disabled={busy}>Remover</Button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{accessLabel(m.access_level)}</span>
                                        )}
                                    </div>
                                ))}

                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                                            <label style={labelStyle}>Adicionar usuário (e-mail)</label>
                                            <input
                                                type="email"
                                                value={memberEmail}
                                                onChange={(e) => setMemberEmail(e.target.value)}
                                                placeholder="usuario@empresa.com"
                                                style={inputStyle}
                                            />
                                        </div>
                                        <select value={memberLevel} onChange={(e) => setMemberLevel(e.target.value)} style={selectStyle}>
                                            {ACCESS_LEVELS.map((level) => (
                                                <option key={level.value} value={level.value}>{level.label}</option>
                                            ))}
                                        </select>
                                        <Button size="sm" variant="primary" onClick={() => handleAddMember(dep)} disabled={busy}>Adicionar</Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
