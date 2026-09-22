import React from 'react';
import { 
  Home, 
  Upload, 
  Stethoscope, 
  BarChart2, 
  FileText, 
  Clock, 
  BookOpen, 
  User 
} from 'lucide-react';
import heartImg from '../assets/images/heart-illustration.png';

export default function Sidebar({ currentPath, onNavigate }) {
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/results', label: 'Analyze', icon: Stethoscope },
    { path: '/results', label: 'Results', icon: BarChart2 },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/history', label: 'History', icon: Clock },
    { path: '/resources', label: 'Resources', icon: BookOpen },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Helper to determine active state
  const isItemActive = (item) => {
    if (item.label === 'Home' && (currentPath === '/' || currentPath === '/dashboard')) return true;
    if (item.label === 'Upload' && currentPath === '/upload') return true;
    if (item.label === 'Analyze' && currentPath === '/analyze') return true;
    if (item.label === 'Results' && currentPath === '/results') return true;
    if (item.label === 'Reports' && currentPath === '/reports') return true;
    if (item.label === 'History' && currentPath === '/history') return true;
    if (item.label === 'Resources' && currentPath === '/resources') return true;
    if (item.label === 'Profile' && currentPath === '/profile') return true;
    return false;
  };

  return (
    <aside className="app-sidebar">
      {/* Navigation List */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const IconComponent = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={`${item.label}-${idx}`}
              className={`nav-link ${active ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
              aria-current={active ? 'page' : undefined}
            >
              <IconComponent size={19} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Decorative Bottom Artwork & Inspiration */}
      <div className="sidebar-bottom">
        <div className="sidebar-heart-wrapper">
          <img src={heartImg} alt="Healthy Heart Graphic" className="sidebar-heart-img" />
        </div>
        <div className="sidebar-motto">
          <span>Healthier</span>
          <span>Hearts</span>
          <span>Brighter</span>
          <span>Tomorrows</span>
        </div>
      </div>

      <style>{`
        .app-sidebar {
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          background-color: #F9E8EC;
          border-right: 1px solid var(--burgundy-border);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 16px;
          flex-shrink: 0;
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
          padding: 10px 16px;
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
        }

        .sidebar-bottom {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px 10px 0 10px;
          margin-top: auto;
        }

        .sidebar-heart-wrapper {
          width: 86px;
          height: 86px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
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
        }
      `}</style>
    </aside>
  );
}
