import { StatusDot } from '../atoms/StatusDot';

export function ConnectionStatus({ status, text }) {
    return (
        <div className="connection-status">
            <StatusDot status={status} />
            <span>{text}</span>
        </div>
    );
}