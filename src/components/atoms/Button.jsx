// Propriedades visuais controladas pela classe .btn (gradiente padrão do site).
// Layout (width, padding, margin, float...) ainda pode ser passado via style.
const LOCKED_STYLE_PROPS = [
    'background', 'backgroundColor', 'backgroundImage', 'color',
    'boxShadow', 'border', 'borderRadius', 'textTransform', 'fontWeight'
];

export function Button({ children, onClick, variant = 'primary', size = 'sm', style = {}, className = '', type = 'button', disabled = false }) {
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = size === 'sm' ? 'btn-sm' : '';

    // Converte string de estilo em objeto caso venha como texto por engano
    const styleObj = typeof style === 'string'
        ? style.split(';').reduce((acc, rule) => {
            const [property, value] = rule.split(':');
            if (property && value) {
                const camelCaseProp = property.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                acc[camelCaseProp] = value.trim();
            }
            return acc;
          }, {})
        : { ...style };

    // Remove cores/sombras inline para manter todos os botões padronizados
    LOCKED_STYLE_PROPS.forEach((prop) => delete styleObj[prop]);

    return (
        <button type={type} disabled={disabled} className={`${baseClass} ${variantClass} ${sizeClass} ${className}`.trim()} onClick={onClick} style={styleObj}>
            {children}
        </button>
    );
}
