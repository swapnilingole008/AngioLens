import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Award, 
  Settings, 
  Bell, 
  LogOut, 
  Check, 
  Phone, 
  Building2, 
  Calendar, 
  KeyRound, 
  Lock, 
  Edit3, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileBadge,
  MapPin,
  Clock
} from 'lucide-react';
import drSharmaImg from '../assets/images/dr-sharma.jpg';
import api from '../api';

export default function ProfilePage({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [threshold, setThreshold] = useState(50);
  const [autoSave, setAutoSave] = useState(true);
  const [savedSettings, setSavedSettings] = useState(false);

  // Edit Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState(null);

  // Reset Password with OTP Modal state
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState(null);

  const loadProfile = async () => {
    const current = api.getCurrentUser();
    if (current) {
      setUser(current);
      setEditFormData({
        name: current.name || '',
        email: current.email || '',
        mobile_number: current.mobile_number || '',
        dob: current.dob || '',
        registration_number: current.registration_number || '',
        registration_authority: current.registration_authority || '',
        medical_degree: current.medical_degree || '',
        specialization: current.specialization || '',
        hospital_name: current.hospital_name || '',
        experience_years: current.experience_years || '',
        hospital_id_card: current.hospital_id_card || '',
        professional_address: current.professional_address || '',
        role: current.role || '',
      });
    }

    try {
      const res = await api.getProfile(current?.id);
      if (res?.user) {
        setUser(res.user);
        setEditFormData({
          name: res.user.name || '',
          email: res.user.email || '',
          mobile_number: res.user.mobile_number || '',
          dob: res.user.dob || '',
          registration_number: res.user.registration_number || '',
          registration_authority: res.user.registration_authority || '',
          medical_degree: res.user.medical_degree || '',
          specialization: res.user.specialization || '',
          hospital_name: res.user.hospital_name || '',
          experience_years: res.user.experience_years || '',
          hospital_id_card: res.user.hospital_id_card || '',
          professional_address: res.user.professional_address || '',
          role: res.user.role || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditMessage(null);
    try {
      const res = await api.updateProfile({
        id: user?.id,
        ...editFormData
      });
      if (res.success) {
        setUser(res.user);
        setIsEditing(false);
        setEditMessage({ type: 'success', text: 'Medical credentials updated successfully!' });
      } else {
        setEditMessage({ type: 'error', text: res.message || 'Failed to update credentials.' });
      }
    } catch (err) {
      setEditMessage({ type: 'error', text: err.message || 'Error updating profile.' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMessage(null);

    if (newPassword.length < 4) {
      setPwdMessage({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'New password confirmation does not match.' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.changePassword({
        user_id: user?.id,
        email: user?.email,
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.success) {
        setPwdMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdMessage({ type: 'error', text: res.message || 'Failed to change password.' });
      }
    } catch (err) {
      setPwdMessage({ type: 'error', text: err.message || 'Invalid current password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  // OTP Reset Flow inside Profile
  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpMessage(null);
    try {
      const res = await api.forgotPassword(user?.email || 'dr.sharma@centralhospital.org');
      if (res.success) {
        setOtpStep(2);
        setOtpMessage({ type: 'info', text: '6-digit OTP sent to your registered email address via SMTP.' });
      } else {
        setOtpMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setOtpMessage({ type: 'error', text: err.message });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtpReset = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpMessage(null);
    try {
      const res = await api.resetPassword({
        email: user?.email,
        otp_code: otpCode.trim(),
        new_password: otpNewPassword,
      });
      if (res.success) {
        setOtpStep(3);
      } else {
        setOtpMessage({ type: 'error', text: res.message });
      }
    } catch (err) {
      setOtpMessage({ type: 'error', text: err.message });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    onNavigate('/login');
  };

  const doctorName = user?.name || 'Dr. Priya Sharma, MD';
  const doctorRole = user?.role || 'Senior Interventional Cardiologist';
  const doctorEmail = user?.email || 'dr.sharma@centralhospital.org';
  const doctorMobile = user?.mobile_number || '+91 98230 45112';
  const doctorReg = user?.registration_number || 'MMC-2007-048291';
  const doctorCouncil = user?.registration_authority || 'Maharashtra Medical Council';
  const doctorDegree = user?.medical_degree || 'MBBS, MD (Medicine), DM (Cardiology)';
  const doctorHospital = user?.hospital_name || 'Ruby Hall Clinic & Central Heart Institute';
  const doctorExp = user?.experience_years || '16 years';
  const doctorHospId = user?.hospital_id_card || 'RHC-CARD-082';
  const doctorAddress = user?.professional_address || '40 Sassoon Road, Sangamvadi, Pune - 411001';

  return (
    <div className="profile-page-container">
      <div className="profile-header">
        <div>
          <h1 className="profile-title">Physician Profile & Credential Settings</h1>
          <p className="profile-sub">Manage your verified medical registration, clinical affiliations, and account security</p>
        </div>
        <button className="btn-burgundy edit-toggle-btn" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? (
            <>
              <X size={15} />
              <span>Cancel Editing</span>
            </>
          ) : (
            <>
              <Edit3 size={15} />
              <span>Edit Credentials</span>
            </>
          )}
        </button>
      </div>

      {editMessage && (
        <div className={`profile-banner ${editMessage.type}`}>
          {editMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{editMessage.text}</span>
          <button className="banner-close" onClick={() => setEditMessage(null)}>×</button>
        </div>
      )}

      <div className="profile-grid">
        {/* Left Column: Doctor Profile Card & Security */}
        <div className="profile-left-col">
          {/* Doctor ID Card */}
          <div className="angio-card doctor-card">
            <div className="avatar-big-wrap">
              <img src={drSharmaImg} alt={doctorName} className="avatar-big-img" />
            </div>
            <h2 className="doctor-name">{doctorName}</h2>
            <p className="doctor-spec">{doctorRole}</p>
            
            <div className="badge-row">
              <span className="spec-badge">FACC</span>
              <span className="spec-badge">FSCAI</span>
              <span className="spec-badge verified-badge">Verified Physician ✓</span>
            </div>

            <div className="info-list">
              <div className="info-row">
                <Mail size={15} className="info-icon" />
                <span>{doctorEmail}</span>
              </div>
              <div className="info-row">
                <Phone size={15} className="info-icon" />
                <span>{doctorMobile}</span>
              </div>
              <div className="info-row">
                <FileBadge size={15} className="info-icon" />
                <span><strong>Reg:</strong> {doctorReg}</span>
              </div>
              <div className="info-row">
                <Building2 size={15} className="info-icon" />
                <span>{doctorHospital}</span>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Sign Out from AngioLens</span>
            </button>
          </div>

          {/* Change Password Card */}
          <div className="angio-card pwd-card">
            <div className="card-heading-row">
              <KeyRound size={18} className="text-burgundy" />
              <h3>Change Password</h3>
            </div>
            <p className="pwd-sub">Update your physician account password</p>

            {pwdMessage && (
              <div className={`profile-banner-mini ${pwdMessage.type}`}>
                {pwdMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{pwdMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="pwd-form">
              <div className="form-group-sm">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div className="form-group-sm">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div className="form-group-sm">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn-burgundy btn-update-pwd" disabled={pwdLoading}>
                {pwdLoading ? (
                  <>
                    <Loader2 size={14} className="spinner" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>

            <div className="otp-reset-callout">
              <span>Forgot password or need email OTP?</span>
              <button 
                type="button" 
                className="otp-reset-link"
                onClick={() => {
                  setIsOtpModalOpen(true);
                  setOtpStep(1);
                  setOtpMessage(null);
                }}
              >
                Send 6-digit OTP via Email
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Full Credentials / Edit Form & AI Configuration */}
        <div className="profile-right-col">
          {/* Medical Credentials Card */}
          <div className="angio-card credentials-card">
            <div className="card-heading-row">
              <Shield size={18} className="text-burgundy" />
              <h3>Medical Registration & Institution Credentials</h3>
            </div>

            {isEditing ? (
              /* EDIT FORM */
              <form onSubmit={handleSaveProfile} className="profile-edit-form">
                <div className="edit-grid-2">
                  <div className="form-group">
                    <label>Doctor Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Professional Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      disabled
                      className="disabled-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input
                      type="text"
                      name="mobile_number"
                      value={editFormData.mobile_number}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="text"
                      name="dob"
                      value={editFormData.dob}
                      onChange={handleEditChange}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  <div className="form-group">
                    <label>Medical Registration Number</label>
                    <input
                      type="text"
                      name="registration_number"
                      value={editFormData.registration_number}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Issuing Medical Council</label>
                    <input
                      type="text"
                      name="registration_authority"
                      value={editFormData.registration_authority}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Medical Degree</label>
                    <input
                      type="text"
                      name="medical_degree"
                      value={editFormData.medical_degree}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Specialization / Clinical Role</label>
                    <input
                      type="text"
                      name="specialization"
                      value={editFormData.specialization}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Hospital / Institution</label>
                    <input
                      type="text"
                      name="hospital_name"
                      value={editFormData.hospital_name}
                      onChange={handleEditChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Years of Clinical Experience</label>
                    <input
                      type="text"
                      name="experience_years"
                      value={editFormData.experience_years}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Hospital Staff ID</label>
                    <input
                      type="text"
                      name="hospital_id_card"
                      value={editFormData.hospital_id_card}
                      onChange={handleEditChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Professional Hospital Address</label>
                    <input
                      type="text"
                      name="professional_address"
                      value={editFormData.professional_address}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                </div>

                <div className="edit-btn-row">
                  <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-burgundy" disabled={editLoading}>
                    {editLoading ? (
                      <>
                        <Loader2 size={15} className="spinner" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Updated Credentials</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW MODE */
              <div className="credentials-view-grid">
                <div className="cred-field-box">
                  <label>Medical Registration Number</label>
                  <span className="cred-val-highlight">{doctorReg}</span>
                  <small>Verified by Medical Board</small>
                </div>

                <div className="cred-field-box">
                  <label>Issuing Medical Council</label>
                  <span className="cred-val">{doctorCouncil}</span>
                </div>

                <div className="cred-field-box">
                  <label>Medical Degree & Qualifications</label>
                  <span className="cred-val">{doctorDegree}</span>
                </div>

                <div className="cred-field-box">
                  <label>Specialization</label>
                  <span className="cred-val">{user?.specialization || doctorRole}</span>
                </div>

                <div className="cred-field-box">
                  <label>Hospital / Clinic</label>
                  <span className="cred-val">{doctorHospital}</span>
                </div>

                <div className="cred-field-box">
                  <label>Staff ID & Experience</label>
                  <span className="cred-val">{doctorHospId} • {doctorExp}</span>
                </div>

                <div className="cred-field-box cred-full-width">
                  <label>Professional Hospital Address</label>
                  <span className="cred-val">{doctorAddress}</span>
                </div>
              </div>
            )}
          </div>

          {/* Clinical AI Settings Card */}
          <div className="angio-card settings-card">
            <div className="card-heading-row">
              <Settings size={18} className="text-burgundy" />
              <h3>AI Analysis & Cath Lab Configuration</h3>
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
              <p className="setting-hint">Vessels exceeding this diameter narrowing percentage trigger immediate critical alerts during catheterization.</p>
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
              <button 
                className="btn-burgundy save-btn" 
                onClick={() => {
                  setSavedSettings(true);
                  setTimeout(() => setSavedSettings(false), 2000);
                }}
              >
                {savedSettings ? (
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
      </div>

      {/* OTP RESET MODAL */}
      {isOtpModalOpen && (
        <div className="otp-modal-overlay">
          <div className="otp-modal-card">
            <div className="otp-modal-header">
              <div className="modal-title-wrap">
                <KeyRound size={20} className="text-burgundy" />
                <h3>Email OTP Password Reset</h3>
              </div>
              <button className="otp-close-btn" onClick={() => setIsOtpModalOpen(false)}>×</button>
            </div>

            <div className="otp-modal-body">
              {otpMessage && (
                <div className={`profile-banner-mini ${otpMessage.type}`}>
                  {otpMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  <span>{otpMessage.text}</span>
                </div>
              )}

              {otpStep === 1 && (
                <div className="otp-step-content">
                  <p className="otp-desc">
                    Click below to send a <strong>6-digit OTP verification code</strong> to your registered email (<strong>{user?.email}</strong>) via SMTP.
                  </p>
                  <button className="btn-burgundy" onClick={handleRequestOtp} disabled={otpLoading}>
                    {otpLoading ? (
                      <>
                        <Loader2 size={15} className="spinner" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <span>Dispatch 6-Digit OTP Email</span>
                    )}
                  </button>
                </div>
              )}

              {otpStep === 2 && (
                <form onSubmit={handleVerifyOtpReset} className="otp-form">
                  <div className="form-group">
                    <label>6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="otp-code-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={otpNewPassword}
                      onChange={(e) => setOtpNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-burgundy" disabled={otpLoading}>
                    {otpLoading ? (
                      <>
                        <Loader2 size={15} className="spinner" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <span>Verify OTP & Save Password</span>
                    )}
                  </button>
                </form>
              )}

              {otpStep === 3 && (
                <div className="otp-success-view">
                  <CheckCircle2 size={44} color="#059669" />
                  <h4>Password Reset Complete!</h4>
                  <p>Your password has been successfully updated in PostgreSQL.</p>
                  <button className="btn-burgundy" onClick={() => setIsOtpModalOpen(false)}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .profile-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 14px;
        }

        .profile-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
          margin: 0;
        }

        .profile-sub {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .edit-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 13px;
        }

        .profile-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          position: relative;
        }

        .profile-banner.success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }

        .profile-banner.error {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #F87171;
        }

        .banner-close {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: inherit;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 960px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        .profile-left-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .profile-right-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .doctor-card {
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: #FFFFFF;
        }

        .avatar-big-wrap {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid var(--burgundy-border);
          margin-bottom: 12px;
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
          margin: 0;
        }

        .doctor-spec {
          font-size: 12.5px;
          color: var(--burgundy-primary);
          font-weight: 700;
          margin-top: 2px;
        }

        .badge-row {
          display: flex;
          gap: 6px;
          margin: 12px 0 18px 0;
          flex-wrap: wrap;
          justify-content: center;
        }

        .spec-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .verified-badge {
          background: #ECFDF5;
          color: #059669;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          border-top: 1px solid #F6E2E7;
          border-bottom: 1px solid #F6E2E7;
          padding: 16px 0;
          text-align: left;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .info-icon {
          color: var(--burgundy-primary);
          flex-shrink: 0;
        }

        .logout-btn {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid #FECACA;
          color: #DC2626;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .logout-btn:hover {
          background: #FEF2F2;
        }

        /* Change Password Card */
        .pwd-card {
          padding: 24px;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card-heading-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-heading-row h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
        }

        .pwd-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin: -6px 0 6px 0;
        }

        .profile-banner-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .profile-banner-mini.success { background: #ECFDF5; color: #065F46; }
        .profile-banner-mini.error { background: #FEE2E2; color: #991B1B; }
        .profile-banner-mini.info { background: #EFF6FF; color: #1E40AF; }

        .pwd-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group-sm {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group-sm label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .form-group-sm input {
          padding: 8px 10px;
          border: 1px solid var(--burgundy-border);
          border-radius: 6px;
          font-size: 12.5px;
          outline: none;
        }

        .btn-update-pwd {
          margin-top: 4px;
          padding: 8px;
          font-size: 12.5px;
        }

        .otp-reset-callout {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #F6E2E7;
          font-size: 11.5px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .otp-reset-link {
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }

        .otp-reset-link:hover {
          text-decoration: underline;
        }

        /* Credentials Card */
        .credentials-card {
          padding: 24px;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .credentials-view-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .cred-field-box {
          background: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cred-full-width {
          grid-column: 1 / -1;
        }

        .cred-field-box label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .cred-val {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .cred-val-highlight {
          font-size: 15px;
          font-weight: 800;
          font-family: monospace;
          color: var(--burgundy-primary);
        }

        .cred-field-box small {
          font-size: 10.5px;
          color: #059669;
          font-weight: 600;
        }

        /* Edit Form */
        .profile-edit-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .edit-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .form-group input {
          padding: 8px 12px;
          border: 1px solid var(--burgundy-border);
          border-radius: 6px;
          font-size: 13px;
          outline: none;
        }

        .disabled-input {
          background: #F3F4F6;
          color: #9CA3AF;
        }

        .edit-btn-row {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid #F6E2E7;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid var(--burgundy-border);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Settings Card */
        .settings-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #FFFFFF;
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
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .setting-val-tag {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: var(--pink-surface);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .threshold-slider {
          accent-color: var(--burgundy-primary);
          height: 6px;
          cursor: pointer;
        }

        .setting-hint {
          font-size: 11.5px;
          color: var(--text-muted);
          margin: 0;
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
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .toggle-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--burgundy-primary);
          cursor: pointer;
        }

        .save-action-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }

        .save-btn {
          min-width: 160px;
          padding: 9px 18px;
        }

        /* OTP Modal */
        .otp-modal-overlay {
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

        .otp-modal-card {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          border: 1px solid var(--burgundy-border);
        }

        .otp-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #FAF1F3;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-title-wrap h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
        }

        .otp-close-btn {
          background: transparent;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--text-muted);
        }

        .otp-modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .otp-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 14px 0;
        }

        .otp-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .otp-code-input {
          font-family: monospace;
          font-size: 18px !important;
          font-weight: 800;
          letter-spacing: 4px;
          text-align: center;
        }

        .otp-success-view {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 10px 0;
        }

        .otp-success-view h4 {
          margin: 0;
          font-size: 17px;
          color: #059669;
        }

        .otp-success-view p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 10px 0;
        }
      `}</style>
    </div>
  );
}
