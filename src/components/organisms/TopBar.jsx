import { Button } from '../atoms/Button';
import { ProgressBar } from '../molecules/ProgressBar';
import { ConnectionStatus } from '../molecules/ConnectionStatus';

export function TopBar({ todayAlertText, percentage, connectionStatus, connectionText, isEditMode, onToggleEdit, onNewRow, onNewCol, onExport, onImport }) {
    return (
        <div className="top-bar">
            <div className="alert-box">
                <span>{todayAlertText}</span>
                <ProgressBar percentage={percentage} />
            </div>
            <ConnectionStatus status={connectionStatus} text={connectionText} />
            <div className="action-bar">
                <Button variant={isEditMode ? 'success' : 'warning'} onClick={onToggleEdit}>
                    {isEditMode ? 'Salvar' : 'Editar'}
                </Button>
                {isEditMode && (
                    <>
                        <Button variant="primary" onClick={onNewRow}>Novo Item</Button>
                        <Button variant="primary" onClick={onNewCol}>Nova Coluna</Button>
                    </>
                )}
                <Button style={{ background: '#e2e8f0', color: '#1e293b' }} onClick={onExport}>Backup</Button>
                <label className="btn btn-sm" style={{ background: '#e2e8f0', color: '#1e293b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    Restaurar <input type="file" style={{ display: 'none' }} onChange={onImport} />
                </label>
            </div>
        </div>
    );
}