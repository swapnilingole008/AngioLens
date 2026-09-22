import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import ReportsPage from './pages/ReportsPage';
import HistoryPage from './pages/HistoryPage';
import ResourcesPage from './pages/ResourcesPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

export default function App() {
  // Simple client-side routing state matching browser history or URL hash
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check for standalone pages (Login, Signup)
  if (currentPath === '/login') {
    return <LoginPage onNavigate={navigate} />;
  }
  if (currentPath === '/signup') {
    return <SignupPage onNavigate={navigate} />;
  }

  // Render main application with shared Header and Sidebar Layout
  const renderContent = () => {
    switch (currentPath) {
      case '/upload':
        return <UploadPage onNavigate={navigate} />;
      case '/results':
      case '/analyze':
        return <ResultsPage onNavigate={navigate} />;
      case '/reports':
        return <ReportsPage onNavigate={navigate} />;
      case '/history':
        return <HistoryPage onNavigate={navigate} />;
      case '/resources':
        return <ResourcesPage onNavigate={navigate} />;
      case '/profile':
        return <ProfilePage onNavigate={navigate} />;
      case '/':
      case '/dashboard':
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      {renderContent()}
    </Layout>
  );
}
