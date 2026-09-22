import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Award, Settings, Bell, LogOut, Check } from 'lucide-react';
import drSharmaImg from '../assets/images/dr-sharma.jpg';
import api from '../api';

export default function ProfilePage({ onNavigate }) {
  const [threshold, setThreshold] = useState(50);
  const [autoSave, setAutoSave] = useState(true);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const current = api.getCurrentUser();
      if (current) {
        setUser(current);
      }
      try {
        const res = await api.getProfile(current?.id);
        if (res?.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    loadProfile();
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = () => {
    api.logout();
    onNavigate('/login');
  };

  const doctorName = user?.name || 'Dr. Priya Sharma, MD';
  const doctorRole = user?.role || 'Senior Interventional Cardiologist';
  const doctorEmail = user?.email || 'dr.sharma@centralhospital.org';

  return (
    <div className="profile-page-container">
      <div className="profile-header">
        <h1 className="profile-title">Physician Profile & Preferences</h1>
        <p className="profile-sub">Manage your clinical credentials, institution settings, and AI sensitivity thresholds</p>
      </div>

      <div className="profile-grid">
        {/* Left Card: Doctor ID & Badges */}
        <div className="angio-card doctor-card">
          <div className="avatar-big-wrap">
            <img src={drSharmaImg} alt="Dr. Sharma" className="avatar-big-img" />
          </div>
          <h2 className="doctor-name">{doctorName}</h2>
          <p className="doctor-spec">{doctorRole}</p>
          <div className="badge-row">
            <span className="spec-badge">FACC</span>
            <span className="spec-badge">FSCAI</span>
            <span className="spec-badge">Cath Lab Lead</span>
          </div>

          <div className="info-list">
            <div className="info-row">
              <Mail size={16} className="info-icon" />
              <span>{doctorEmail}</span>
            </div>
            <div className="info-row">
              <Shield size={16} className="info-icon" />
              <span>Medical License: MC-CARD-89421</span>
            </div>
            <div className="info-row">
              <Award size={16} className="info-icon" />
              <span>Central Hospital Cath Lab • Mumbai</span>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out from AngioLens</span>
          </button>
        </div>

        {/* Right Card: Clinical AI Settings */}
        <div className="angio-card settings-card">
          <div className="settings-section-header">
            <Settings size={20} className="section-icon" />
            <h3 className="section-heading">AI Analysis Configuration</h3>
          </div>

          <div className="setting-group">
            <div className="setting-label-row">
              <label className="setting-label">Critical Stenosis Alert Threshold</label>
              <span className="setting-val-tag">{threshold}% Stenosis</span>
            </div>
            <input
              type="range"
              min="30"
              max="80"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="threshold-slider"
            />
            <p className="setting-hint">Vessels exceeding this diameter narrowing percentage trigger immediate critical clinical alerts.</p>
          </div>

          <hr className="setting-divider" />

          <div className="setting-group">
            <label className="setting-label">Hemodynamic AI-FFR Simulation</label>
            <div className="toggle-row">
              <span className="toggle-desc">Automatically estimate physiological pressure gradient from single-plane cine angiograms</span>
              <input type="checkbox" defaultChecked className="toggle-checkbox" />
            </div>
          </div>

          <hr className="setting-divider" />

          <div className="setting-group">
            <label className="setting-label">Automated Clinical Notes Synthesis</label>
            <div className="toggle-row">
              <span className="toggle-desc">Synthesize standardized narrative impressions (AHA / ACC compliant)</span>
              <input 
                type="checkbox" 
                checked={autoSave} 
                onChange={(e) => setAutoSave(e.target.checked)} 
                className="toggle-checkbox" 
              />
            </div>
          </div>

          <div className="save-action-row">
            <button className="btn-burgundy save-btn" onClick={handleSave}>
              {saved ? (
                <>
                  <Check size={16} />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .profile-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .profile-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .profile-sub {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }

        .doctor-card {
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .avatar-big-wrap {
          width: 108px;
          height: 108px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid var(--burgundy-border);
          margin-bottom: 14px;
          box-shadow: 0 4px 14px rgba(133, 16, 54, 0.15);
        }

        .avatar-big-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .doctor-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.2px;
        }

        .doctor-spec {
          font-size: 13px;
          color: var(--burgundy-primary);
          font-weight: 600;
          margin-top: 2px;
        }

        .badge-row {
          display: flex;
          gap: 6px;
          margin: 14px 0 20px 0;
          flex-wrap: wrap;
          justify-content: center;
        }

        .spec-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          border-top: 1px solid #F6E2E7;
          border-bottom: 1px solid #F6E2E7;
          padding: 18px 0;
          text-align: left;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .info-icon {
          color: var(--burgundy-primary);
          flex-shrink: 0;
        }

        .logout-btn {
          margin-top: 24px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid #FECACA;
          color: #DC2626;
          border-radius: var(--radius-sm);
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background-color: #FEF2F2;
        }

        .settings-card {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .settings-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-icon {
          color: var(--burgundy-primary);
        }

        .section-heading {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .setting-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .setting-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
        }

        .setting-val-tag {
          font-size: 13px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: var(--pink-surface);
          padding: 3px 8px;
          border-radius: 4px;
        }

        .threshold-slider {
          accent-color: var(--burgundy-primary);
          height: 6px;
          cursor: pointer;
        }

        .setting-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        .setting-divider {
          border: none;
          border-top: 1px solid #F6E2E7;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .toggle-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .toggle-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--burgundy-primary);
          cursor: pointer;
        }

        .save-action-row {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }

        .save-btn {
          min-width: 170px;
        }

        @media (max-width: 960px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
