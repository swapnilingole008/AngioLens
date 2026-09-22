import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import drSharmaImg from '../assets/images/dr-sharma.jpg';
import api from '../api';

export default function Header({ currentPath, onNavigate }) {
  const user = api.getCurrentUser();
  const userName = user?.name || 'Dr. Sharma';
  const userRole = user?.role || 'Cardiologist';
  return (
    <header className="top-header">
      {/* Brand Logo & Name */}
      <div className="header-brand" onClick={() => onNavigate('/')} role="button" tabIndex={0}>
        <div className="logo-badge">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="#FFFFFF" stroke="#FFFFFF" />
            <path d="M3 12h4l2-4 3 8 2-4h4" stroke="#851036" strokeWidth="2" />
          </svg>
        </div>
        <div className="brand-text">
          <h1 className="brand-title">Coronary Vessel Analyzer</h1>
          <p className="brand-subtitle">AI for clearer hearts</p>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="header-search-container">
        <div className="header-search-box">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search patients, reports..."
            aria-label="Search patients, reports"
          />
        </div>
      </div>

      {/* Right User Profile & Notifications */}
      <div className="header-actions">
        <button className="notification-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>

        <div className="user-profile-menu" onClick={() => onNavigate('/profile')} role="button" tabIndex={0}>
          <div className="avatar-wrapper">
            <img src={drSharmaImg} alt="Dr. Sharma" className="user-avatar" />
          </div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <ChevronDown size={16} className="dropdown-icon" />
        </div>
      </div>

      <style>{`
        .top-header {
          height: var(--header-height);
          background-color: #FFFFFF;
          border-bottom: 1px solid var(--burgundy-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px rgba(133, 16, 54, 0.04);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }

        .logo-badge {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #851036 0%, #A21A44 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(133, 16, 54, 0.25);
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.2px;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          line-height: 1.2;
        }

        .header-search-container {
          flex: 1;
          max-width: 460px;
          margin: 0 24px;
        }

        .header-search-box {
          position: relative;
          display: flex;
          align-items: center;
          background-color: #FAF2F4;
          border: 1px solid #F1D4DC;
          border-radius: var(--radius-pill);
          padding: 8px 18px;
          transition: all 0.2s ease;
        }

        .header-search-box:focus-within {
          border-color: var(--burgundy-primary);
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(133, 16, 54, 0.08);
        }

        .search-icon {
          color: #98A2B3;
          margin-right: 10px;
          flex-shrink: 0;
        }

        .search-input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--text-main);
          outline: none;
        }

        .search-input::placeholder {
          color: #98A2B3;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .notification-btn {
          position: relative;
          background: transparent;
          border: none;
          color: #475467;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .notification-btn:hover {
          background-color: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .notification-badge {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 8px;
          height: 8px;
          background-color: var(--burgundy-primary);
          border-radius: 50%;
          border: 2px solid #FFFFFF;
        }

        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 6px 12px 6px 6px;
          border-radius: var(--radius-pill);
          transition: background-color 0.2s;
        }

        .user-profile-menu:hover {
          background-color: var(--pink-surface);
        }

        .avatar-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          border: 1.5px solid var(--burgundy-border);
          flex-shrink: 0;
        }

        .user-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .user-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
        }

        .user-role {
          font-size: 11.5px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .dropdown-icon {
          color: #98A2B3;
          margin-left: 2px;
        }
      `}</style>
    </header>
  );
}
