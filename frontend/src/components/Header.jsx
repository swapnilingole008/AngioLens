import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, LogOut, ShieldCheck } from 'lucide-react';
import drSharmaImg from '../assets/images/dr-sharma.jpg';
import api from '../api';

export default function Header({ currentPath, onNavigate }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = api.getCurrentUser();
  const userName = user?.name || 'Dr. Priya Sharma';
  const userRole = user?.role || 'Cardiologist';
  const userEmail = user?.email || 'dr.sharma@centralhospital.org';

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search bar state & database
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const searchableItems = [
    { type: 'patient', title: 'Ramesh Patel', id: 'PAT-00123', sub: 'LAD Proximal (68% Stenosis)', path: '/results', analysisId: 1 },
    { type: 'patient', title: 'Sunita Rao', id: 'PAT-00120', sub: 'RCA Mid (85% Stenosis - Severe)', path: '/results', analysisId: 2 },
    { type: 'patient', title: 'Anil Verma', id: 'PAT-00118', sub: 'LCx Distal (35% Stenosis - Mild)', path: '/results', analysisId: 3 },
    { type: 'patient', title: 'Kavita Menon', id: 'PAT-00115', sub: 'LAD Mid (72% Stenosis - Severe)', path: '/results', analysisId: 4 },
    { type: 'patient', title: 'Vikram Singh', id: 'PAT-00112', sub: 'LMCA Bifurcation (45% Stenosis)', path: '/results', analysisId: 5 },
    { type: 'report', title: 'Official Report #ANG-2026-0001', sub: 'Ramesh Patel • LAD Stenosis (68%)', path: '/reports', analysisId: 1 },
    { type: 'report', title: 'Official Report #ANG-2026-0002', sub: 'Sunita Rao • RCA Stenosis (85%)', path: '/reports', analysisId: 2 },
    { type: 'feature', title: 'Coronary Anatomy Map (LAD, LCx, RCA, LMCA)', sub: 'AHA 16-Segment calibers & projection angles', path: '/resources' },
    { type: 'feature', title: 'Live QCA Stenosis & CAD-RADS Calculator', sub: 'Real-time RVD & MLD lumen calculation', path: '/resources' },
    { type: 'feature', title: 'Upload New Angiogram', sub: 'DICOM, JPG, PNG, MP4 AI analysis', path: '/upload' },
    { type: 'feature', title: 'Analysis History & Patient Archive', sub: 'Audit past angiogram evaluations', path: '/history' },
    { type: 'feature', title: 'Physician Profile & AI Settings', sub: 'Manage thresholds and clinical preferences', path: '/profile' }
  ];

  const filteredSearchResults = searchQuery.trim() === '' ? [] : searchableItems.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
           (item.id && item.id.toLowerCase().includes(q)) ||
           item.sub.toLowerCase().includes(q);
  });

  // Handle clicking outside search container
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (item) => {
    if (item.analysisId) {
      api.setCurrentAnalysisId(item.analysisId);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
    onNavigate(item.path);
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
    onNavigate('/profile');
  };

  const handleSignOut = () => {
    setDropdownOpen(false);
    api.logout();
    onNavigate('/login');
  };

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

      {/* Center Working Search Input */}
      <div className="header-search-container" ref={searchContainerRef}>
        <div className="header-search-box">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search patients, reports, vessels (e.g. LAD, Ramesh, PAT-00123)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setIsSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredSearchResults.length > 0) {
                handleSearchResultClick(filteredSearchResults[0]);
              } else if (e.key === 'Escape') {
                setIsSearchOpen(false);
              }
            }}
            aria-label="Search patients, reports"
          />
          {searchQuery && (
            <button 
              className="clear-search-btn" 
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="search-dropdown-menu">
            {filteredSearchResults.length > 0 ? (
              <div className="search-results-list">
                <div className="search-results-header">
                  <span>Found {filteredSearchResults.length} match{filteredSearchResults.length > 1 ? 'es' : ''}</span>
                </div>
                {filteredSearchResults.map((item, idx) => (
                  <button
                    key={idx}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(item)}
                  >
                    <div className={`search-item-badge ${item.type}`}>
                      {item.type === 'patient' ? 'Patient' : item.type === 'report' ? 'Report' : 'Page'}
                    </div>
                    <div className="search-item-content">
                      <div className="search-item-title-row">
                        <strong className="search-item-title">{item.title}</strong>
                        {item.id && <span className="search-item-id">{item.id}</span>}
                      </div>
                      <span className="search-item-sub">{item.sub}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="search-no-results">
                <p>No results found for "<strong>{searchQuery}</strong>"</p>
                <span>Try searching by patient name, ID (e.g. PAT-00123), vessel (LAD, RCA), or "report"</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right User Profile & Notifications with Dropdown */}
      <div className="header-actions">
        <button className="notification-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>

        <div className="user-profile-dropdown-container" ref={dropdownRef}>
          <div 
            className={`user-profile-menu ${dropdownOpen ? 'open' : ''}`} 
            onClick={() => setDropdownOpen(!dropdownOpen)} 
            role="button" 
            tabIndex={0}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="avatar-wrapper">
              <img src={drSharmaImg} alt={userName} className="user-avatar" />
            </div>
            <div className="user-info">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <ChevronDown size={16} className={`dropdown-icon ${dropdownOpen ? 'rotated' : ''}`} />
          </div>

          {/* Floating Dropdown Menu */}
          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-header">
                <div className="dropdown-avatar-wrap">
                  <img src={drSharmaImg} alt={userName} className="dropdown-avatar" />
                </div>
                <div className="dropdown-user-text">
                  <strong className="dropdown-name">{userName}</strong>
                  <span className="dropdown-email">{userEmail}</span>
                  <div className="dropdown-role-badge">
                    <ShieldCheck size={12} />
                    <span>{userRole}</span>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-items">
                <button className="dropdown-item" onClick={handleProfileClick}>
                  <div className="dropdown-item-icon">
                    <User size={16} />
                  </div>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">My Profile</span>
                    <span className="dropdown-item-sub">View credentials & AI settings</span>
                  </div>
                </button>

                <button className="dropdown-item signout-item" onClick={handleSignOut}>
                  <div className="dropdown-item-icon logout-icon">
                    <LogOut size={16} />
                  </div>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title logout-title">Sign Out</span>
                    <span className="dropdown-item-sub">End current session</span>
                  </div>
                </button>
              </div>
            </div>
          )}
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
          max-width: 480px;
          margin: 0 24px;
          position: relative;
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

        .clear-search-btn {
          background: transparent;
          border: none;
          color: #98A2B3;
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .clear-search-btn:hover {
          color: var(--burgundy-primary);
        }

        /* Live Search Dropdown */
        .search-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background-color: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          box-shadow: 0 12px 32px -4px rgba(133, 16, 54, 0.18), 0 4px 12px rgba(0,0,0,0.06);
          overflow: hidden;
          z-index: 120;
          animation: dropDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 380px;
          overflow-y: auto;
        }

        .search-results-header {
          padding: 8px 14px;
          background: #FAF1F3;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--burgundy-primary);
          border-bottom: 1px solid var(--burgundy-border);
        }

        .search-results-list {
          display: flex;
          flex-direction: column;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.15s ease;
          border-bottom: 1px solid #FDF0F3;
          font-family: inherit;
          width: 100%;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .search-result-item:hover {
          background-color: var(--pink-surface);
        }

        .search-item-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .search-item-badge.patient {
          background: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .search-item-badge.report {
          background: #ECFDF5;
          color: #065F46;
        }

        .search-item-badge.feature {
          background: #EEF2F6;
          color: #334155;
        }

        .search-item-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow: hidden;
          flex: 1;
        }

        .search-item-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-item-title {
          font-size: 13.5px;
          color: var(--text-main);
          font-weight: 700;
        }

        .search-item-id {
          font-size: 11.5px;
          color: var(--burgundy-primary);
          font-weight: 700;
        }

        .search-item-sub {
          font-size: 11.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-no-results {
          padding: 24px 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .search-no-results p {
          font-size: 13.5px;
          color: var(--text-main);
        }

        .search-no-results span {
          font-size: 11.5px;
          color: var(--text-muted);
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

        /* Profile Menu & Dropdown */
        .user-profile-dropdown-container {
          position: relative;
        }

        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 6px 14px 6px 6px;
          border-radius: var(--radius-pill);
          border: 1px solid transparent;
          transition: all 0.2s ease;
          user-select: none;
        }

        .user-profile-menu:hover,
        .user-profile-menu.open {
          background-color: var(--pink-surface);
          border-color: var(--burgundy-border);
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
          color: var(--burgundy-primary);
          margin-left: 2px;
          transition: transform 0.2s ease;
        }

        .dropdown-icon.rotated {
          transform: rotate(180deg);
        }

        /* Floating Dropdown Card */
        .profile-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 280px;
          background-color: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 30px -4px rgba(133, 16, 54, 0.18), 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          z-index: 100;
          animation: dropDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes dropDownFade {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-user-header {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #FFF6F8 0%, #FAF1F3 100%);
        }

        .dropdown-avatar-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--burgundy-border);
          flex-shrink: 0;
        }

        .dropdown-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dropdown-user-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .dropdown-name {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-email {
          font-size: 11.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: #FFFFFF;
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
          margin-top: 2px;
          border: 1px solid var(--burgundy-border);
        }

        .dropdown-divider {
          height: 1px;
          background-color: #F3DCE2;
        }

        .dropdown-items {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          width: 100%;
          border: none;
          background: transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: background-color 0.15s ease;
        }

        .dropdown-item:hover {
          background-color: var(--pink-surface);
        }

        .dropdown-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: var(--pink-surface);
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dropdown-item-content {
          display: flex;
          flex-direction: column;
        }

        .dropdown-item-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        .dropdown-item-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .signout-item:hover {
          background-color: #FEF2F2;
        }

        .logout-icon {
          background: #FEE2E2;
          color: #DC2626;
        }

        .logout-title {
          color: #DC2626;
        }
      `}</style>
    </header>
  );
}
