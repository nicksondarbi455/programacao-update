// Árvore de pastas: raiz primeiro e, dentro de cada pasta, as subpastas em ordem alfabética
export function flattenFolderTree(folders, excludeIds = new Set()) {
    const ids = new Set(folders.map((f) => f.id));
    const childrenOf = {};

    folders.forEach((f) => {
        // Pasta cujo pai não está visível entra na raiz
        const parentKey = f.parentId && ids.has(f.parentId) ? f.parentId : '';
        if (!childrenOf[parentKey]) childrenOf[parentKey] = [];
        childrenOf[parentKey].push(f);
    });
    Object.values(childrenOf).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));

    const out = [];
    const visit = (parentKey, depth) => {
        (childrenOf[parentKey] || []).forEach((f) => {
            // Pasta excluída da lista leva junto as subpastas dela
            if (excludeIds.has(f.id)) return;
            out.push({ ...f, depth });
            visit(f.id, depth + 1);
        });
    };
    visit('', 0);
    return out;
}

// A pasta e todas as subpastas dela, em qualquer nível
export function subtreeIds(folders, id) {
    const out = new Set([id]);
    let grew = true;
    while (grew) {
        grew = false;
        folders.forEach((f) => {
            if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
                out.add(f.id);
                grew = true;
            }
        });
    }
    return out;
}
