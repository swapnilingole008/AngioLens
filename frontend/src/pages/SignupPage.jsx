import React, { useState } from 'react';
import { User, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import heartImg from '../assets/images/heart-illustration.png';
import api from '../api';

export default function SignupPage({ onNavigate }) {
  const [name, setName] = useState('Dr. Priya Sharma');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Interventional Cardiologist');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.signup({ name, email, role, password });
      onNavigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="angio-card auth-card-split">
        {/* Left Branding Panel */}
        <div className="auth-left-branding">
          <div className="auth-brand-logo">
            <div className="logo-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="#FFFFFF" stroke="#FFFFFF" />
                <path d="M3 12h4l2-4 3 8 2-4h4" stroke="#851036" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <span className="brand-name">AngioLens</span>
              <span className="brand-sub">Coronary Vessel Analyzer</span>
            </div>
          </div>

          <div className="auth-heart-center">
            <div className="heart-wrapper">
              <img src={heartImg} alt="Anatomical Heart Graphic" className="auth-heart-img" />
            </div>
            <svg className="auth-ecg-svg" viewBox="0 0 260 40">
              <path
                d="M 0,20 L 70,20 L 78,8 L 86,32 L 94,2 L 102,28 L 110,20 L 260,20"
                fill="none"
                stroke="#851036"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="auth-quote-block">
            <p className="auth-script-quote">"Every Beat Matters"</p>
            <div className="quote-underline"></div>
            <p className="auth-caption">
              Empowering cardiovascular specialists with real-time lumen quantification and clinical intelligence.
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="auth-right-form">
          <div className="form-header">
            <h2 className="form-title">Create Account</h2>
            <p className="form-subtitle">Join AngioLens for AI-assisted angiogram analysis</p>
            {errorMsg && (
              <div style={{ color: '#DC2626', fontSize: '13px', background: '#FEF2F2', border: '1px solid #FECACA', padding: '8px 12px', borderRadius: '6px', marginTop: '12px' }}>
                {errorMsg}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="input-field-group">
              <label className="field-label">Full Name & Credentials</label>
              <div className="input-with-icon">
                <User size={17} className="input-icon" />
                <input
                  type="text"
                  required
                  className="auth-input"
                  placeholder="e.g. Dr. Priya Sharma, MD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="input-field-group">
              <label className="field-label">Institutional Email</label>
              <div className="input-with-icon">
                <Mail size={17} className="input-icon" />
                <input
                  type="email"
                  required
                  className="auth-input"
                  placeholder="name@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-field-group">
              <label className="field-label">Clinical Specialization / Role</label>
              <div className="input-with-icon">
                <ShieldCheck size={17} className="input-icon" />
                <select
                  className="auth-input auth-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Interventional Cardiologist">Interventional Cardiologist</option>
                  <option value="General Cardiologist">General Cardiologist</option>
                  <option value="Cardiovascular Radiologist">Cardiovascular Radiologist</option>
                  <option value="Fellow / Resident in Cardiology">Fellow / Resident in Cardiology</option>
                  <option value="Cath Lab Specialist">Cath Lab Specialist</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-field-group">
                <label className="field-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={17} className="input-icon" />
                  <input
                    type="password"
                    required
                    className="auth-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="field-label">Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={17} className="input-icon" />
                  <input
                    type="password"
                    required
                    className="auth-input"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-burgundy submit-btn">
              <span>Create Account</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="switch-auth-row">
            <span>Already have an account?</span>
            <button className="switch-link" onClick={() => onNavigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 75% 25%, #FCEFF2 0%, #FAF1F3 100%);
          padding: 24px;
        }

        .auth-card-split {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          overflow: hidden;
          background: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          box-shadow: 0 12px 36px -4px rgba(133, 16, 54, 0.1);
        }

        .auth-left-branding {
          background-color: #FAF1F3;
          border-right: 1px solid var(--burgundy-border);
          padding: 44px 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .auth-brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-name {
          font-size: 19px;
          font-weight: 800;
          color: var(--text-main);
          display: block;
          line-height: 1.1;
        }

        .brand-sub {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--burgundy-primary);
        }

        .auth-heart-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 20px 0;
          position: relative;
        }

        .heart-wrapper {
          width: 130px;
          height: 130px;
          margin-bottom: 8px;
        }

        .auth-heart-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 6px 14px rgba(133, 16, 54, 0.16));
        }

        .auth-ecg-svg {
          width: 200px;
          height: 32px;
        }

        .auth-quote-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-script-quote {
          font-family: var(--font-script);
          font-size: 26px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .auth-caption {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-top: 6px;
        }

        .auth-right-form {
          padding: 40px 38px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-header {
          margin-bottom: 22px;
        }

        .form-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .form-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .input-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #98A2B3;
          pointer-events: none;
        }

        .auth-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          background: #FAF2F4;
          border: 1px solid #F1D4DC;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-family: inherit;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s;
        }

        .auth-select {
          cursor: pointer;
        }

        .auth-input:focus {
          background: #FFFFFF;
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 3px rgba(133, 16, 54, 0.08);
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .submit-btn {
          width: 100%;
          padding: 11px;
          font-size: 14.5px;
          border-radius: var(--radius-sm);
          margin-top: 6px;
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .switch-auth-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 20px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .switch-link {
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .switch-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 800px) {
          .auth-card-split {
            grid-template-columns: 1fr;
          }
          .auth-left-branding {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
