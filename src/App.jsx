import { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { NocPage } from './pages/NocPage'; // A página do editor que já criámos anteriormente

export default function App() {
    const [user, setUser] = useState(storageService.getCurrentUser());
    const [currentProject, setCurrentProject] = useState(null);

    if (!user) {
        return <AuthPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
    }

    if (!currentProject) {
        return (
            <DashboardPage 
                user={user} 
                onSelectProject={(proj) => setCurrentProject(proj)} 
                onLogout={() => { storageService.logout(); setUser(null); }} 
            />
        );
    }

    return (
        <NocPage 
            project={currentProject} 
            userEmail={user.email} 
            onBackToDashboard={() => setCurrentProject(null)} 
        />
    );
}