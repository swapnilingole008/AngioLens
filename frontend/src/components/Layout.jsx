import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout({ children, currentPath, onNavigate }) {
  return (
    <div className="app-container">
      <Header currentPath={currentPath} onNavigate={onNavigate} />
      <div className="main-layout">
        <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
