export function Button({ children, variant = 'primary', size = 'md', className = '', style = {}, ...props }) {
    const variantClass = `btn-${variant}`;
    const sizeClass = size === 'sm' ? 'btn-sm' : '';
    
    return (
        <button 
            className={`btn ${variantClass} ${sizeClass} ${className}`.trim()} 
            style={style} 
            {...props}
        >
            {children}
        </button>
    );
}