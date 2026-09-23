import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  UserPlus, 
  FileCheck2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Stethoscope,
  Building2
} from 'lucide-react';
import heartImg from '../assets/images/heart-illustration.png';
import api from '../api';
import DoctorApplicationModal from './DoctorApplicationModal';

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('dr.sharma@centralhospital.org');
  const [password, setPassword] = useState('doctor123');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Application Modal state
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);

  // Forgot Password / OTP Modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter Email | 2: Enter OTP & New Password | 3: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await api.login({ email, password });
      // Keep loading active during page transition
      onNavigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  // Forgot Password Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      if (res.success) {
        setForgotStep(2);
        setForgotSuccessMsg(res.message || '6-digit OTP code has been sent to your email.');
      } else {
        setForgotError(res.message || 'Failed to request OTP');
      }
    } catch (err) {
      setForgotError(err.message || 'Error communicating with authentication server.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 2: Verify OTP & Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!otpCode.trim() || otpCode.length < 6) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 4) {
      setForgotError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.resetPassword({
        email: forgotEmail,
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });

      if (res.success) {
        setForgotStep(3);
        setPassword(newPassword);
        setEmail(forgotEmail);
      } else {
        setForgotError(res.message || 'Failed to reset password');
      }
    } catch (err) {
      setForgotError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep(1);
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccessMsg('');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-cards-wrapper">
        <div className="angio-card auth-card-split">
          {/* Left Visual Branding Panel */}
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
              <p className="auth-script-quote">"Better insights. Healthier hearts."</p>
              <div className="quote-underline"></div>
              <p className="auth-caption">
                AI-driven vessel segmentation, caliber profiling, and clinical decision support for cath lab teams.
              </p>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="auth-right-form">
            <div className="form-header">
              <h2 className="form-title">Physician Sign In</h2>
              <p className="form-subtitle">Access your verified clinical workstation</p>
              {errorMsg && (
                <div className="auth-error-banner">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="input-field-group">
                <label className="field-label">Doctor Email / Username</label>
                <div className="input-with-icon">
                  <Mail size={17} className="input-icon" />
                  <input
                    type="email"
                    required
                    className="auth-input"
                    placeholder="dr.sharma@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

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

              <div className="options-row">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked className="remember-checkbox" />
                  <span>Remember me</span>
                </label>
                <button 
                  type="button" 
                  className="forgot-link"
                  onClick={() => setIsForgotModalOpen(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn-burgundy submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workstation</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="demo-credentials-note">
              <span><strong>Pre-seeded Doctor Login:</strong> <code>dr.sharma@centralhospital.org</code> • Pass: <code>doctor123</code></span>
            </div>
          </div>
        </div>

        {/* SIDE CARD: Doctor Verification Application */}
        <div className="angio-card doctor-apply-side-card">
          <div className="apply-side-header">
            <div className="apply-shield-icon">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="apply-side-title">New Doctor Access</h3>
              <p className="apply-side-sub">Apply for Medical Verification</p>
            </div>
          </div>

          <p className="apply-side-desc">
            Are you a licensed cardiologist or cath lab physician? Submit your Medical Council Registration and institutional affiliation to join AngioLens.
          </p>

          <div className="apply-checklist">
            <div className="check-item">
              <CheckCircle2 size={15} color="#059669" />
              <span>Medical Registration Certificate (MCI/MMC)</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={15} color="#059669" />
              <span>Medical Degree (MBBS/MD/DM)</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={15} color="#059669" />
              <span>Hospital & Institutional Association</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={15} color="#059669" />
              <span>Instant SMTP Email Dispatch & Approval</span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn-burgundy apply-modal-trigger-btn"
            onClick={() => setIsAppModalOpen(true)}
          >
            <UserPlus size={16} />
            <span>Apply for Doctor Verification</span>
          </button>

          <div className="admin-link-row">
            <span>Medical Review Board?</span>
            <button className="admin-portal-link" onClick={() => onNavigate('/admin')}>
              Open Admin Portal →
            </button>
          </div>
        </div>
      </div>

      {/* DOCTOR REGISTRATION APPLICATION MODAL */}
      <DoctorApplicationModal 
        isOpen={isAppModalOpen} 
        onClose={() => setIsAppModalOpen(false)} 
      />

      {/* FORGOT PASSWORD / OTP MODAL */}
      {isForgotModalOpen && (
        <div className="forgot-modal-overlay">
          <div className="forgot-modal-card">
            <div className="forgot-modal-header">
              <div className="header-icon-title">
                <KeyRound size={20} className="text-burgundy" />
                <h3>Reset Physician Password</h3>
              </div>
              <button className="forgot-close-btn" onClick={closeForgotModal}>
                <X size={18} />
              </button>
            </div>

            <div className="forgot-modal-body">
              {forgotError && (
                <div className="forgot-error-alert">
                  <AlertCircle size={15} />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* STEP 1: Enter Email */}
              {forgotStep === 1 && (
                <form onSubmit={handleRequestOtp} className="forgot-form">
                  <p className="forgot-instruction">
                    Enter the email address associated with your doctor account. We will dispatch a <strong>6-digit OTP verification code</strong> via SMTP.
                  </p>

                  <div className="form-group">
                    <label>Registered Email Address</label>
                    <div className="input-with-icon">
                      <Mail size={16} className="input-icon" />
                      <input
                        type="email"
                        placeholder="e.g. dr.sharma@centralhospital.org"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-burgundy forgot-submit-btn" disabled={forgotLoading}>
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Enter OTP & New Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleResetPasswordSubmit} className="forgot-form">
                  {forgotSuccessMsg && (
                    <div className="forgot-info-alert">
                      <CheckCircle2 size={15} color="#059669" />
                      <span>{forgotSuccessMsg}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Enter 6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 849201"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="auth-input otp-input-field"
                      required
                    />
                    <small className="field-hint">Check your email inbox or spam folder.</small>
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="input-icon" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <div className="input-with-icon">
                      <Lock size={16} className="input-icon" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="forgot-btn-row">
                    <button type="button" className="btn-back-step" onClick={() => setForgotStep(1)}>
                      ← Change Email
                    </button>
                    <button type="submit" className="btn-burgundy forgot-submit-btn" disabled={forgotLoading}>
                      {forgotLoading ? (
                        <>
                          <Loader2 size={16} className="spinner" />
                          <span>Resetting...</span>
                        </>
                      ) : (
                        <span>Confirm & Reset Password</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success Confirmation */}
              {forgotStep === 3 && (
                <div className="forgot-success-box">
                  <CheckCircle2 size={44} color="#059669" />
                  <h4>Password Reset Successfully!</h4>
                  <p>Your password has been updated. You can now sign in using your new password.</p>
                  <button className="btn-burgundy" onClick={closeForgotModal}>
                    Proceed to Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

        .auth-cards-wrapper {
          display: flex;
          align-items: stretch;
          gap: 24px;
          max-width: 1240px;
          width: 100%;
        }

        .auth-card-split {
          flex: 1.6;
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          overflow: hidden;
          background: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          box-shadow: 0 12px 36px -4px rgba(133, 16, 54, 0.1);
          border-radius: 12px;
        }

        .auth-left-branding {
          background-color: #FAF1F3;
          border-right: 1px solid var(--burgundy-border);
          padding: 40px 32px;
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
          width: 120px;
          height: 120px;
          margin-bottom: 6px;
        }

        .auth-heart-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 6px 14px rgba(133, 16, 54, 0.16));
        }

        .auth-ecg-svg {
          width: 180px;
          height: 30px;
        }

        .auth-quote-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .auth-script-quote {
          font-family: var(--font-script);
          font-size: 24px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .auth-caption {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-top: 4px;
        }

        .auth-right-form {
          padding: 40px 36px;
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
          margin: 0;
        }

        .form-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #DC2626;
          font-size: 12.5px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          padding: 8px 12px;
          border-radius: 6px;
          margin-top: 12px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 700;
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
          padding: 10px 14px 10px 38px;
          background: #FAF2F4;
          border: 1px solid #F1D4DC;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-family: inherit;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s;
        }

        .auth-input:focus {
          background: #FFFFFF;
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 3px rgba(133, 16, 54, 0.08);
        }

        .options-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .remember-checkbox {
          accent-color: var(--burgundy-primary);
        }

        .forgot-link {
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .submit-btn {
          width: 100%;
          padding: 11px;
          font-size: 14px;
          border-radius: var(--radius-sm);
          margin-top: 6px;
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .demo-credentials-note {
          margin-top: 18px;
          background: #FAF1F3;
          border-left: 3px solid var(--burgundy-primary);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 11.5px;
          color: var(--text-main);
        }

        .demo-credentials-note code {
          background: #FFFFFF;
          padding: 1px 4px;
          border-radius: 3px;
          color: var(--burgundy-primary);
          font-weight: bold;
        }

        /* SIDE CARD: Doctor Verification Application */
        .doctor-apply-side-card {
          flex: 1;
          background: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          border-radius: 12px;
          padding: 36px 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 12px 36px -4px rgba(133, 16, 54, 0.1);
        }

        .apply-side-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .apply-shield-icon {
          width: 48px;
          height: 48px;
          background: #FAF1F3;
          color: var(--burgundy-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .apply-side-title {
          font-size: 19px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
        }

        .apply-side-sub {
          font-size: 12px;
          font-weight: 600;
          color: var(--burgundy-primary);
          margin: 2px 0 0 0;
        }

        .apply-side-desc {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 18px 0;
        }

        .apply-checklist {
          background: #FCF8F9;
          border: 1px solid #F3DBE2;
          border-radius: 8px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 22px;
        }

        .check-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
        }

        .apply-modal-trigger-btn {
          width: 100%;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
        }

        .admin-link-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          margin-top: 16px;
          border-top: 1px solid #F4DFE5;
          font-size: 12px;
          color: var(--text-muted);
        }

        .admin-portal-link {
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .admin-portal-link:hover {
          text-decoration: underline;
        }

        /* Forgot Password Modal */
        .forgot-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 10, 12, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .forgot-modal-card {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 460px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          border: 1px solid var(--burgundy-border);
        }

        .forgot-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #FAF1F3;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .header-icon-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-icon-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
        }

        .forgot-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }

        .forgot-modal-body {
          padding: 22px;
        }

        .forgot-instruction {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .forgot-error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FEE2E2;
          color: #991B1B;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .forgot-info-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ECFDF5;
          color: #065F46;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .forgot-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .otp-input-field {
          padding-left: 14px !important;
          letter-spacing: 4px;
          font-size: 18px !important;
          font-weight: 800;
          text-align: center;
          font-family: monospace !important;
        }

        .field-hint {
          font-size: 11px;
          color: var(--text-muted);
        }

        .forgot-btn-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 6px;
        }

        .btn-back-step {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .forgot-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 18px;
          font-size: 13px;
        }

        .forgot-success-box {
          text-align: center;
          padding: 14px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .forgot-success-box h4 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #059669;
        }

        .forgot-success-box p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 10px 0;
        }

        @media (max-width: 960px) {
          .auth-cards-wrapper {
            flex-direction: column;
          }
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
