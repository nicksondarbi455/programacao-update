// src/services/storageService.js

export const storageService = {
    // Utilizadores
    getUsers: () => JSON.parse(localStorage.getItem('noc_users') || '[]'),
    saveUsers: (users) => localStorage.setItem('noc_users', JSON.stringify(users)),

    // Sessão Ativa
    getCurrentUser: () => JSON.parse(localStorage.getItem('noc_current_user') || 'null'),
    setCurrentUser: (user) => localStorage.setItem('noc_current_user', JSON.stringify(user)),
    logout: () => localStorage.removeItem('noc_current_user'),

    // Projetos por Utilizador
    getProjects: (username) => {
        const allProjects = JSON.parse(localStorage.getItem('noc_projects') || '{}');
        return allProjects[username] || [];
    },
    saveProjects: (username, projects) => {
        const allProjects = JSON.parse(localStorage.getItem('noc_projects') || '{}');
        allProjects[username] = projects;
        localStorage.setItem('noc_projects', JSON.stringify(allProjects));
    }
};