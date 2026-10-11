export function Button({ children, onClick, variant = 'primary', size = 'sm', style = {}, className = '' }) {
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = size === 'sm' ? 'btn-sm' : '';
    
    // Converte string de estilo em objeto caso venha como texto por engano
    const parsedStyle = typeof style === 'string' 
        ? style.split(';').reduce((acc, rule) => {
            const [property, value] = rule.split(':');
            if (property && value) {
                const camelCaseProp = property.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                acc[camelCaseProp] = value.trim();
            }
            return acc;
          }, {})
        : style;

    return (
        <button className={`${baseClass} ${variantClass} ${sizeClass} ${className}`} onClick={onClick} style={parsedStyle}>
            {children}
        </button>
    );
}