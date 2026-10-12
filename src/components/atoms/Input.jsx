export function Input({ type = 'text', value, onChange, readOnly, placeholder, className = '', list }) {
    return (
        <input
            type={type}
            value={value !== undefined && value !== null ? value : ''}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            className={className}
            list={list}
            autoComplete="off"
        />
    );
}