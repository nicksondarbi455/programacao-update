export function ProgressBar({ percentage }) {
    return (
        <div className="progress-wrapper">
            <span>{percentage}% Concluído</span>
            <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}