
import React, { useState } from 'react';
import LandingPage from './LandingPage';
import Auth from './Auth';

const PublicContainer: React.FC = () => {
    const [view, setView] = useState<'landing' | 'auth'>('landing');

    const handleNavigateToAuth = () => setView('auth');

    if (view === 'auth') {
        return <Auth />;
    }

    return <LandingPage onNavigateToAuth={handleNavigateToAuth} />;
};
export default PublicContainer;
