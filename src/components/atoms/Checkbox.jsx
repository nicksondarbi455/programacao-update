export function Checkbox({ checked, onChange }) {
    return (
        <input
            type="checkbox"
            checked={!!checked}
            onChange={onChange}
            style={{ width: '14px', height: '14px', cursor: 'pointer', display: 'block', margin: '0 auto' }}
        />
    );
}