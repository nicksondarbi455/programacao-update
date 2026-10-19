export function Checkbox({ checked, onChange }) {
    const isChecked = !!checked;

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={isChecked}
            onClick={() => onChange && onChange({ target: { checked: !isChecked } })}
            style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'block',
                margin: '0 auto',
                fontSize: '14px',
                lineHeight: 1
            }}
        >
            {isChecked
                ? <i className="fa-solid fa-square-check" style={{ color: 'rgb(99, 230, 190)' }}></i>
                : <i className="fa-regular fa-square"></i>
            }
        </button>
    );
}