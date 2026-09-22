import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Upload, 
  BarChart2, 
  FileText, 
  BookOpen, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import heartImg from '../assets/images/heart-illustration.png';

export default function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapse }) {
  // Local state fallback if not controlled from parent
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('angiolens_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const activeCollapsed = collapsed !== undefined ? collapsed : isCollapsed;

  const handleToggle = () => {
    const next = !activeCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('angiolens_sidebar_collapsed', String(next));
    } catch {}
    if (onToggleCollapse) {
      onToggleCollapse(next);
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/results', label: 'Results', icon: BarChart2 },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/resources', label: 'Resources', icon: BookOpen },
    { path: '/history', label: 'History', icon: Clock },
  ];

  // Helper to determine active state
  const isItemActive = (item) => {
    if (item.label === 'Home' && (currentPath === '/' || currentPath === '/dashboard')) return true;
    if (item.label === 'Upload' && currentPath === '/upload') return true;
    if (item.label === 'Results' && (currentPath === '/results' || currentPath === '/analyze')) return true;
    if (item.label === 'Reports' && currentPath === '/reports') return true;
    if (item.label === 'Resources' && currentPath === '/resources') return true;
    if (item.label === 'History' && currentPath === '/history') return true;
    return false;
  };

  return (
    <aside className={`app-sidebar ${activeCollapsed ? 'collapsed' : ''}`}>
      {/* Top Toggle Row */}
      <div className="sidebar-header-toggle">
        {!activeCollapsed && <span className="sidebar-section-title">Navigation</span>}
        <button 
          className="sidebar-collapse-btn" 
          onClick={handleToggle} 
          title={activeCollapsed ? "Expand sidebar" : "Shrink sidebar"}
          aria-label={activeCollapsed ? "Expand sidebar" : "Shrink sidebar"}
        >
          {activeCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const IconComponent = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={`${item.label}-${idx}`}
              className={`nav-link ${active ? 'active' : ''} ${activeCollapsed ? 'icon-only' : ''}`}
              onClick={() => onNavigate(item.path)}
              title={activeCollapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <IconComponent size={20} className="nav-icon" />
              {!activeCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Decorative Bottom Artwork & Inspiration */}
      <div className="sidebar-bottom">
        <div className="sidebar-heart-wrapper">
          <img src={heartImg} alt="Healthy Heart Graphic" className="sidebar-heart-img" />
        </div>
        {!activeCollapsed && (
          <div className="sidebar-motto">
            <span>Healthier</span>
            <span>Hearts</span>
            <span>Brighter</span>
            <span>Tomorrows</span>
          </div>
        )}
      </div>

      <style>{`
        .app-sidebar {
          width: ${activeCollapsed ? '76px' : 'var(--sidebar-width)'};
          min-width: ${activeCollapsed ? '76px' : 'var(--sidebar-width)'};
          background-color: #F9E8EC;
          border-right: 1px solid var(--burgundy-border);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px ${activeCollapsed ? '10px' : '16px'};
          flex-shrink: 0;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease;
          position: sticky;
          top: var(--header-height);
          height: calc(100vh - var(--header-height));
          box-sizing: border-box;
          z-index: 20;
        }

        .sidebar-header-toggle {
          display: flex;
          align-items: center;
          justify-content: ${activeCollapsed ? 'center' : 'space-between'};
          margin-bottom: 14px;
          padding: 0 4px;
        }

        .sidebar-section-title {
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
          color: var(--burgundy-primary);
          opacity: 0.8;
        }

        .sidebar-collapse-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(133, 16, 54, 0.08);
        }

        .sidebar-collapse-btn:hover {
          background-color: var(--pink-surface);
          transform: scale(1.05);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: ${activeCollapsed ? '10px 0' : '10px 16px'};
          justify-content: ${activeCollapsed ? 'center' : 'flex-start'};
          border-radius: var(--radius-md);
          background: transparent;
          border: none;
          color: #344054;
          font-size: 14.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
          width: 100%;
          text-align: left;
          font-family: inherit;
          position: relative;
        }

        .nav-link:hover {
          background-color: #F2D5DC;
          color: var(--burgundy-primary);
        }

        .nav-link.active {
          background-color: var(--burgundy-primary);
          color: #FFFFFF;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(133, 16, 54, 0.28);
        }

        .nav-link.active .nav-icon {
          color: #FFFFFF;
        }

        .nav-icon {
          color: inherit;
          flex-shrink: 0;
        }

        .nav-label {
          letter-spacing: -0.1px;
          white-space: nowrap;
        }

        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          align-items: ${activeCollapsed ? 'center' : 'flex-start'};
          padding: ${activeCollapsed ? '8px 0 0 0' : '12px 10px 0 10px'};
          margin-top: auto;
        }

        .sidebar-heart-wrapper {
          width: ${activeCollapsed ? '44px' : '86px'};
          height: ${activeCollapsed ? '44px' : '86px'};
          margin-bottom: ${activeCollapsed ? '4px' : '12px'};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
        }

        .sidebar-heart-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 4px 8px rgba(133, 16, 54, 0.12));
        }

        .sidebar-motto {
          display: flex;
          flex-direction: column;
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.25;
          color: var(--burgundy-primary);
          letter-spacing: -0.2px;
          white-space: nowrap;
        }
      `}</style>
    </aside>
  );
}
