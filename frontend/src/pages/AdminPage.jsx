import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Clock, 
  FileText, 
  Search, 
  Filter, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Building2, 
  Phone, 
  Mail, 
  Award, 
  ExternalLink, 
  Eye, 
  Loader2,
  ArrowLeft,
  Lock,
  Calendar,
  FileCheck,
  RefreshCw,
  Download,
  ZoomIn,
  FileCheck2,
  Maximize2,
  FileX,
  EyeOff
} from 'lucide-react';
import api from '../api';

// Helper to check if a valid file / data-url was uploaded by applicant
function isRealUploadedFile(src) {
  if (!src || typeof src !== 'string') return false;
  const s = src.trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'None') return false;
  if (s.startsWith('data:image/') || s.startsWith('data:application/pdf')) return true;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/assets/')) return true;
  return false;
}

// Helper to generate an official Medical Certificate / Badge as a high-resolution Canvas Data URL
function generateCertificateDataUrl(docType, doctor) {
  if (!doctor) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 1100, 760);
  grad.addColorStop(0, '#FDFBF7');
  grad.addColorStop(0.5, '#FFFFFF');
  grad.addColorStop(1, '#F8F4EE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1100, 760);

  // Borders
  ctx.strokeStyle = '#851036';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 1064, 724);

  ctx.strokeStyle = '#C49A45'; // Gold
  ctx.lineWidth = 3.5;
  ctx.strokeRect(32, 32, 1036, 696);

  ctx.strokeStyle = '#E5B2BD';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(42, 42, 1016, 676);

  // Top Council Banner
  ctx.fillStyle = '#851036';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText((doctor.registration_authority || 'STATE MEDICAL COUNCIL').toUpperCase(), 550, 95);

  ctx.fillStyle = '#6B7280';
  ctx.font = '600 13.5px Arial, sans-serif';
  ctx.fillText('NATIONAL MEDICAL COMMISSION • REGISTERED CLINICAL PRACTITIONER', 550, 122);

  // Divider Line
  ctx.strokeStyle = '#851036';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(320, 140);
  ctx.lineTo(780, 140);
  ctx.stroke();

  // Document Title
  ctx.fillStyle = '#851036';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(docType.toUpperCase(), 550, 185);

  ctx.fillStyle = '#4B5563';
  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillText('This official credential certifies that', 550, 225);

  // Doctor Name
  ctx.fillStyle = '#851036';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(doctor.full_name || 'Dr. Physician', 550, 275);

  // Degree & Specialization
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(`${doctor.medical_degree || 'MBBS / MD Cardiology'} • ${doctor.specialization || 'Cardiology'}`, 550, 318);

  ctx.fillStyle = '#4B5563';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(`is officially recognized and affiliated with ${doctor.hospital_name || 'Cardiology Institute'}.`, 550, 355);

  // Credential Details Box
  ctx.fillStyle = '#FAF1F3';
  ctx.strokeStyle = '#DFA0AF';
  ctx.lineWidth = 1.5;
  ctx.fillRect(110, 390, 880, 150);
  ctx.strokeRect(110, 390, 880, 150);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#851036';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('REGISTRATION NUMBER:', 140, 430);
  ctx.fillText('ISSUING AUTHORITY:', 140, 472);
  ctx.fillText('HOSPITAL AFFILIATION:', 140, 514);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(doctor.registration_number || 'MMC-XXXX-XXXX', 350, 430);

  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(doctor.registration_authority || 'State Medical Council', 350, 472);
  ctx.fillText(doctor.hospital_name || 'Ruby Hall Clinic & Heart Center', 350, 514);

  // Verification Seal
  ctx.save();
  ctx.translate(880, 465);
  ctx.strokeStyle = 'rgba(133, 16, 54, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(133, 16, 54, 0.75)';
  ctx.font = 'bold 10.5px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL SEAL', 0, -8);
  ctx.fillText('★ VERIFIED ★', 0, 7);
  ctx.fillText('VALID LICENSE', 0, 22);
  ctx.restore();

  // Signatures
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4B5563';
  ctx.font = '12.5px Arial, sans-serif';

  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(150, 635);
  ctx.lineTo(350, 635);
  ctx.moveTo(750, 635);
  ctx.lineTo(950, 635);
  ctx.stroke();

  ctx.fillText('Registrar / Council Secretary', 250, 655);
  ctx.fillText(doctor.registration_authority || 'Medical Council', 250, 674);

  ctx.fillText('Medical Director / Superintendent', 850, 655);
  ctx.fillText(doctor.hospital_name || 'Clinical Authority', 850, 674);

  return canvas.toDataURL('image/png');
}

// Download certificate file/image
function handleDownloadCertificate(docType, doctor, fileSrc) {
  if (!doctor) return;
  if (fileSrc && fileSrc.startsWith('data:')) {
    const link = document.createElement('a');
    let ext = 'png';
    if (fileSrc.startsWith('data:application/pdf')) ext = 'pdf';
    else if (fileSrc.startsWith('data:image/jpeg') || fileSrc.startsWith('data:image/jpg')) ext = 'jpg';
    else if (fileSrc.startsWith('data:image/webp')) ext = 'webp';
    link.download = `${doctor.full_name?.replace(/\s+/g, '_')}_${docType.replace(/\s+/g, '_')}.${ext}`;
    link.href = fileSrc;
    link.click();
    return;
  }
  if (fileSrc && (fileSrc.startsWith('http://') || fileSrc.startsWith('https://') || fileSrc.startsWith('/assets/'))) {
    const link = document.createElement('a');
    link.download = `${doctor.full_name?.replace(/\s+/g, '_')}_${docType.replace(/\s+/g, '_')}.png`;
    link.href = fileSrc;
    link.target = '_blank';
    link.click();
    return;
  }
  const dataUrl = generateCertificateDataUrl(docType, doctor);
  const link = document.createElement('a');
  link.download = `${doctor.full_name?.replace(/\s+/g, '_')}_${docType.replace(/\s+/g, '_')}.png`;
  link.href = dataUrl;
  link.click();
}

export default function AdminPage({ onNavigate }) {
  const [adminUser, setAdminUser] = useState(api.getAdminUser());
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('12345');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // Detail Modal & Action State
  const [selectedApp, setSelectedApp] = useState(null);
  const [previewCertificate, setPreviewCertificate] = useState(null); // Fullscreen certificate modal
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [rejectModalApp, setRejectModalApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Credentials could not be verified against the state medical council registry.');

  const fetchApplications = async () => {
    setIsLoadingApps(true);
    try {
      const res = await api.getAdminApplications();
      if (res?.applications) {
        setApplications(res.applications);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch admin applications:', err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      fetchApplications();
    }
  }, [adminUser]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await api.adminLogin({ username: adminUsername, password: adminPassword });
      if (res.success && res.admin) {
        setAdminUser(res.admin);
      } else {
        setLoginError(res.message || 'Invalid admin credentials');
      }
    } catch (err) {
      setLoginError(err.message || 'Admin authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    api.adminLogout();
    setAdminUser(null);
  };

  const handleApprove = async (appId) => {
    setActionLoadingId(appId);
    setActionFeedback(null);
    try {
      const res = await api.approveApplication(appId);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: res.message || 'Doctor application approved! Account created and email dispatched.'
        });
        if (selectedApp?.id === appId) setSelectedApp(null);
        await fetchApplications();
      } else {
        setActionFeedback({ type: 'error', text: res.message || 'Approval failed' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Error approving application' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalApp) return;
    const appId = rejectModalApp.id;
    setActionLoadingId(appId);
    setActionFeedback(null);
    try {
      const res = await api.rejectApplication(appId, rejectionReason);
      if (res.success) {
        setActionFeedback({
          type: 'info',
          text: res.message || 'Application marked as rejected. Notification email sent.'
        });
        setRejectModalApp(null);
        if (selectedApp?.id === appId) setSelectedApp(null);
        await fetchApplications();
      } else {
        setActionFeedback({ type: 'error', text: res.message || 'Rejection failed' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Error rejecting application' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (app.full_name || '').toLowerCase().includes(q) ||
      (app.email || '').toLowerCase().includes(q) ||
      (app.registration_number || '').toLowerCase().includes(q) ||
      (app.hospital_name || '').toLowerCase().includes(q) ||
      (app.specialization || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="admin-page-root">
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-nav-left">
          <button className="back-to-app-btn" onClick={() => onNavigate('/')} title="Back to AngioLens Main App">
            <ArrowLeft size={16} />
            <span>AngioLens App</span>
          </button>
          <div className="admin-brand-divider" />
          <div className="admin-brand">
            <div className="admin-shield-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="admin-nav-title">Medical Board Verification Portal</h1>
              <span className="admin-nav-badge">Administrative Console</span>
            </div>
          </div>
        </div>

        {adminUser && (
          <div className="admin-nav-right">
            <div className="admin-user-info">
              <span className="admin-user-name">{adminUser.name || 'Administrator'}</span>
              <span className="admin-user-role">{adminUser.role || 'Super Admin'}</span>
            </div>
            <button className="admin-logout-btn" onClick={handleAdminLogout} title="Log Out Admin">
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="admin-main-container">
        {!adminUser ? (
          /* ADMIN LOGIN SCREEN */
          <div className="admin-login-wrapper">
            <div className="admin-login-card angio-card">
              <div className="admin-login-header">
                <div className="admin-lock-badge">
                  <Lock size={28} />
                </div>
                <h2>Administrative Authentication</h2>
                <p>Sign in to review and verify medical practitioner registrations</p>
              </div>

              {loginError && (
                <div className="admin-error-box">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="admin-login-form">
                <div className="form-group">
                  <label>Admin ID / Email</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin or admin@angiolens.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password (12345)"
                    required
                  />
                </div>

                <div className="admin-credentials-hint">
                  <strong>Default Admin Credentials:</strong>
                  <span>ID: <code>admin</code> • Password: <code>12345</code></span>
                </div>

                <button type="submit" className="btn-burgundy admin-login-btn" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Access Admin Dashboard</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ADMIN DASHBOARD */
          <div className="admin-dashboard">
            {/* Feedback Alert */}
            {actionFeedback && (
              <div className={`admin-feedback-banner ${actionFeedback.type}`}>
                {actionFeedback.type === 'success' && <CheckCircle size={18} />}
                {actionFeedback.type === 'error' && <XCircle size={18} />}
                {actionFeedback.type === 'info' && <AlertCircle size={18} />}
                <span>{actionFeedback.text}</span>
                <button className="feedback-dismiss" onClick={() => setActionFeedback(null)}>×</button>
              </div>
            )}

            {/* Statistics Cards */}
            <div className="admin-stats-grid">
              <div className={`stat-card ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                <div className="stat-icon-wrap pending">
                  <Clock size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-val">{stats.pending}</span>
                  <span className="stat-lbl">Pending Verification</span>
                </div>
              </div>

              <div className={`stat-card ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => setActiveTab('approved')}>
                <div className="stat-icon-wrap approved">
                  <UserCheck size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-val">{stats.approved}</span>
                  <span className="stat-lbl">Approved Doctors</span>
                </div>
              </div>

              <div className={`stat-card ${activeTab === 'rejected' ? 'active' : ''}`} onClick={() => setActiveTab('rejected')}>
                <div className="stat-icon-wrap rejected">
                  <UserX size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-val">{stats.rejected}</span>
                  <span className="stat-lbl">Rejected / Incomplete</span>
                </div>
              </div>

              <div className={`stat-card ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                <div className="stat-icon-wrap total">
                  <FileText size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-val">{stats.total}</span>
                  <span className="stat-lbl">Total Submissions</span>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="admin-controls-bar">
              <div className="admin-tab-group">
                {[
                  { key: 'pending', label: `Pending (${stats.pending})` },
                  { key: 'approved', label: `Approved (${stats.approved})` },
                  { key: 'rejected', label: `Rejected (${stats.rejected})` },
                  { key: 'all', label: `All (${stats.total})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="admin-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search doctor, council ID, hospital..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="admin-refresh-btn" onClick={fetchApplications} title="Refresh Applications">
                  <RefreshCw size={14} className={isLoadingApps ? 'spinner' : ''} />
                </button>
              </div>
            </div>

            {/* Applications Table Card */}
            <div className="angio-card admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Doctor Details</th>
                    <th>Medical Council Registration</th>
                    <th>Hospital / Institution</th>
                    <th>Qualifications</th>
                    <th>Status</th>
                    <th className="th-action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingApps ? (
                    <tr>
                      <td colSpan="6" className="admin-empty-cell">
                        <Loader2 size={24} className="spinner text-burgundy" />
                        <span>Loading doctor verification records...</span>
                      </td>
                    </tr>
                  ) : filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="admin-empty-cell">
                        <FileCheck size={36} style={{ opacity: 0.4 }} />
                        <span className="empty-title">No applications found</span>
                        <span className="empty-sub">There are no {activeTab !== 'all' ? activeTab : ''} doctor verification requests matching your query.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id} className="admin-row">
                        <td>
                          <div className="doctor-cell">
                            <span className="doc-name">{app.full_name}</span>
                            <span className="doc-meta"><Mail size={12} /> {app.email}</span>
                            <span className="doc-meta"><Phone size={12} /> {app.mobile_number}</span>
                          </div>
                        </td>
                        <td>
                          <div className="council-cell">
                            <span className="reg-number-pill">{app.registration_number}</span>
                            <span className="council-name">{app.registration_authority}</span>
                          </div>
                        </td>
                        <td>
                          <div className="hospital-cell">
                            <span className="hosp-name">{app.hospital_name}</span>
                            <span className="hosp-address">{app.professional_address}</span>
                          </div>
                        </td>
                        <td>
                          <div className="degree-cell">
                            <span className="spec-tag">{app.specialization}</span>
                            <span className="degree-text">{app.medical_degree}</span>
                            {app.experience_years && (
                              <span className="exp-text">Exp: {app.experience_years}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`admin-status-badge ${app.status}`}>
                            {app.status === 'approved' && 'Approved ✓'}
                            {app.status === 'pending' && 'Pending Review'}
                            {app.status === 'rejected' && 'Rejected ✕'}
                          </span>
                        </td>
                        <td className="td-actions">
                          <div className="admin-action-btn-group">
                            <button 
                              className="btn-action-view" 
                              onClick={() => setSelectedApp(app)}
                              title="View complete credentials and certificates"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>

                            {app.status !== 'approved' && (
                              <button 
                                className="btn-action-approve" 
                                onClick={() => handleApprove(app.id)}
                                disabled={actionLoadingId === app.id}
                                title="Approve doctor and generate account"
                              >
                                {actionLoadingId === app.id ? (
                                  <>
                                    <Loader2 size={13} className="spinner" />
                                    <span>Approving...</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={13} />
                                    <span>Approve</span>
                                  </>
                                )}
                              </button>
                            )}

                            {app.status === 'pending' && (
                              <button 
                                className="btn-action-reject" 
                                onClick={() => setRejectModalApp(app)}
                                disabled={actionLoadingId === app.id}
                                title="Reject application"
                              >
                                <UserX size={13} />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedApp && (
        <div className="admin-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="admin-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div className="header-badge-title">
                <ShieldCheck size={22} className="text-burgundy" />
                <div>
                  <h3>{selectedApp.full_name}</h3>
                  <span className={`admin-status-badge ${selectedApp.status}`}>
                    {selectedApp.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <button className="detail-close-btn" onClick={() => setSelectedApp(null)}>×</button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-section">
                <h4>Medical Council Credentials</h4>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Registration Number:</label>
                    <span className="val-highlight">{selectedApp.registration_number}</span>
                  </div>
                  <div className="detail-field">
                    <label>Issuing Council:</label>
                    <span>{selectedApp.registration_authority}</span>
                  </div>
                  <div className="detail-field">
                    <label>Medical Degree:</label>
                    <span>{selectedApp.medical_degree}</span>
                  </div>
                  <div className="detail-field">
                    <label>Specialization:</label>
                    <span>{selectedApp.specialization}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Hospital & Affiliation</h4>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Hospital / Clinic:</label>
                    <span>{selectedApp.hospital_name}</span>
                  </div>
                  <div className="detail-field">
                    <label>Hospital Staff ID:</label>
                    <span>{selectedApp.hospital_id_card || 'Not provided'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Clinical Experience:</label>
                    <span>{selectedApp.experience_years || 'Not specified'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Professional Address:</label>
                    <span>{selectedApp.professional_address}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Contact Details</h4>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Email Address:</label>
                    <span>{selectedApp.email}</span>
                  </div>
                  <div className="detail-field">
                    <label>Mobile Number:</label>
                    <span>{selectedApp.mobile_number}</span>
                  </div>
                  <div className="detail-field">
                    <label>Date of Birth:</label>
                    <span>{selectedApp.dob || 'Not provided'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Applied On:</label>
                    <span>{selectedApp.created_at ? new Date(selectedApp.created_at).toLocaleDateString('en-GB') : 'Recent'}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Verification Certificates with visual previews and download options */}
              <div className="detail-section">
                <div className="cert-section-header">
                  <h4>Uploaded Verification Certificates & Documents</h4>
                  <span className="cert-count-pill">5 Official Credentials</span>
                </div>

                <div className="cert-cards-grid">
                  {[
                    {
                      id: 'reg_cert',
                      title: 'Medical Registration Certificate',
                      category: 'Council Registration',
                      sub: `${selectedApp.registration_authority || 'Medical Council'} • ${selectedApp.registration_number}`,
                      fileSrc: selectedApp.registration_certificate,
                      defaultFileName: `${selectedApp.full_name?.replace(/\s+/g, '_')}_Registration_Cert`,
                      isOptional: false,
                    },
                    {
                      id: 'deg_cert',
                      title: 'Medical Degree Certificate',
                      category: 'Academic Qualification',
                      sub: `${selectedApp.medical_degree || 'MBBS / MD / DM'}`,
                      fileSrc: selectedApp.degree_certificate,
                      defaultFileName: `${selectedApp.full_name?.replace(/\s+/g, '_')}_Medical_Degree`,
                      isOptional: false,
                    },
                    {
                      id: 'spec_cert',
                      title: 'Specialization Certificate',
                      category: 'Specialty Qualification',
                      sub: `${selectedApp.specialization || 'Cardiology Specialization'}`,
                      fileSrc: selectedApp.specialization_certificate,
                      defaultFileName: `${selectedApp.full_name?.replace(/\s+/g, '_')}_Specialization_Cert`,
                      isOptional: true,
                    },
                    {
                      id: 'hosp_doc',
                      title: 'Hospital Staff ID / Badge',
                      category: 'Institutional ID',
                      sub: `${selectedApp.hospital_name || 'Affiliated Hospital'}`,
                      fileSrc: selectedApp.hospital_id_doc,
                      defaultFileName: `${selectedApp.full_name?.replace(/\s+/g, '_')}_Hospital_ID`,
                      isOptional: true,
                    },
                    {
                      id: 'govt_doc',
                      title: 'Government Identity Proof',
                      category: 'Identity Proof',
                      sub: 'Official Photo Identification',
                      fileSrc: selectedApp.govt_id_doc,
                      defaultFileName: `${selectedApp.full_name?.replace(/\s+/g, '_')}_Govt_ID`,
                      isOptional: true,
                    }
                  ].map((cert) => {
                    const hasRealFile = isRealUploadedFile(cert.fileSrc);
                    const isUserImg = hasRealFile && (
                      cert.fileSrc.startsWith('data:image/') || 
                      cert.fileSrc.startsWith('http://') || 
                      cert.fileSrc.startsWith('https://') || 
                      cert.fileSrc.startsWith('/assets/')
                    );
                    const isUserPdf = hasRealFile && (
                      cert.fileSrc.startsWith('data:application/pdf') || 
                      cert.fileSrc.endsWith('.pdf')
                    );

                    if (!hasRealFile) {
                      return (
                        <div key={cert.id} className="cert-card-item not-avail-card">
                          <div className="cert-card-header">
                            <div className="cert-card-header-text">
                              <span className="cert-category-tag">{cert.category}</span>
                              <h5 className="cert-card-title">{cert.title}</h5>
                              <p className="cert-card-sub">{cert.isOptional ? 'Optional - Not Provided' : 'Not attached by applicant'}</p>
                            </div>
                            <span className="cert-badge not-avail">
                              {cert.isOptional ? 'Optional' : 'Not Provided'}
                            </span>
                          </div>

                          <div className="cert-thumb-wrap cert-thumb-not-avail" title="Document not uploaded by doctor">
                            <div className="not-avail-content">
                              <FileX size={34} className="not-avail-icon" />
                              <span className="not-avail-title">Not Available</span>
                              <span className="not-avail-sub">
                                {cert.isOptional ? 'Optional document omitted by applicant' : 'No document file uploaded'}
                              </span>
                            </div>
                          </div>

                          <div className="cert-card-actions">
                            <button type="button" className="btn-cert-disabled" disabled>
                              <EyeOff size={13} />
                              <span>Not Available</span>
                            </button>
                            <button type="button" className="btn-cert-disabled" disabled>
                              <Download size={13} />
                              <span>No File</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={cert.id} className="cert-card-item">
                        <div className="cert-card-header">
                          <div className="cert-card-header-text">
                            <span className="cert-category-tag">{cert.category}</span>
                            <h5 className="cert-card-title">{cert.title}</h5>
                            <p className="cert-card-sub">{cert.sub}</p>
                          </div>
                          <span className="cert-badge uploaded">
                            Doctor Uploaded ✓
                          </span>
                        </div>

                        {isUserPdf ? (
                          <div 
                            className="cert-thumb-wrap cert-pdf-thumb-wrap"
                            onClick={() => setPreviewCertificate({ title: cert.title, src: cert.fileSrc, doctor: selectedApp, isPdf: true, isUserUpload: true })}
                            title="Click to view uploaded PDF document"
                          >
                            <div className="pdf-thumb-content">
                              <FileText size={38} className="pdf-thumb-icon" />
                              <span className="pdf-thumb-badge">PDF DOCUMENT</span>
                              <span className="pdf-thumb-name">{cert.defaultFileName}.pdf</span>
                            </div>
                            <div className="cert-thumb-overlay">
                              <Maximize2 size={22} />
                              <span>Open PDF Viewer</span>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="cert-thumb-wrap"
                            onClick={() => setPreviewCertificate({ title: cert.title, src: cert.fileSrc, doctor: selectedApp, isPdf: false, isUserUpload: true })}
                            title="Click to view full image"
                          >
                            <img 
                              src={cert.fileSrc} 
                              alt={cert.title} 
                              className="cert-thumb-img user-uploaded-img" 
                              loading="lazy"
                            />
                            <div className="cert-thumb-overlay">
                              <Maximize2 size={22} />
                              <span>View Uploaded Image</span>
                            </div>
                          </div>
                        )}

                        <div className="cert-card-actions">
                          <button 
                            type="button"
                            className="btn-cert-view"
                            onClick={() => setPreviewCertificate({ 
                              title: cert.title, 
                              src: cert.fileSrc, 
                              doctor: selectedApp, 
                              isPdf: isUserPdf,
                              isUserUpload: true 
                            })}
                          >
                            <Eye size={13} />
                            <span>{isUserPdf ? 'Open PDF' : 'View Fullscreen'}</span>
                          </button>
                          <button 
                            type="button"
                            className="btn-cert-download"
                            onClick={() => handleDownloadCertificate(cert.title, selectedApp, cert.fileSrc)}
                            title="Download official certificate copy"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedApp.rejection_reason && (
                <div className="detail-section rejection-box">
                  <h4>Rejection Feedback</h4>
                  <p>{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="detail-modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedApp(null)}>Close</button>
              {selectedApp.status === 'approved' ? (
                <div className="approved-badge-indicator">
                  <CheckCircle size={16} />
                  <span>Doctor Account Active & Verified</span>
                </div>
              ) : (
                <button 
                  className="btn-burgundy" 
                  onClick={() => handleApprove(selectedApp.id)}
                  disabled={actionLoadingId === selectedApp.id}
                >
                  {actionLoadingId === selectedApp.id ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Approving & Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={16} />
                      <span>Approve & Create Account</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN CERTIFICATE LIGHTBOX MODAL */}
      {previewCertificate && (
        <div className="cert-lightbox-overlay" onClick={() => setPreviewCertificate(null)}>
          <div className="cert-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="cert-lightbox-header">
              <div className="cert-lightbox-title-wrap">
                <FileCheck2 size={24} className="text-burgundy" />
                <div>
                  <h3>{previewCertificate.title}</h3>
                  <span className="cert-lightbox-sub">
                    {previewCertificate.doctor.full_name} • Reg No: {previewCertificate.doctor.registration_number || 'N/A'} • {previewCertificate.doctor.registration_authority || 'Medical Council'}
                    {previewCertificate.isUserUpload && ' • (Doctor Uploaded Document)'}
                  </span>
                </div>
              </div>
              <div className="cert-lightbox-actions">
                <button 
                  type="button"
                  className="btn-lightbox-download"
                  onClick={() => handleDownloadCertificate(previewCertificate.title, previewCertificate.doctor, previewCertificate.src)}
                >
                  <Download size={15} />
                  <span>Download {previewCertificate.isPdf ? 'PDF' : 'Certificate'}</span>
                </button>
                <button 
                  type="button"
                  className="cert-lightbox-close" 
                  onClick={() => setPreviewCertificate(null)}
                  aria-label="Close Preview"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="cert-lightbox-body">
              {previewCertificate.isPdf || (previewCertificate.src && previewCertificate.src.startsWith('data:application/pdf')) ? (
                <iframe 
                  src={previewCertificate.src} 
                  title={previewCertificate.title} 
                  className="cert-lightbox-pdf-frame" 
                  style={{ width: '100%', height: '70vh', border: 'none', background: '#FFFFFF', borderRadius: '6px' }}
                />
              ) : (
                <img 
                  src={previewCertificate.src} 
                  alt={previewCertificate.title} 
                  className="cert-lightbox-img" 
                />
              )}
            </div>
            <div className="cert-lightbox-footer">
              <span className="cert-lightbox-meta">
                Official Medical Verification System • {previewCertificate.isUserUpload ? 'Applicant Uploaded Document' : 'Digitally Signed & Sealed'}
              </span>
              <button 
                type="button"
                className="btn-cancel"
                onClick={() => setPreviewCertificate(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalApp && (
        <div className="admin-modal-overlay" onClick={() => setRejectModalApp(null)}>
          <div className="admin-reject-card" onClick={(e) => e.stopPropagation()}>
            <div className="reject-header">
              <XCircle size={26} color="#DC2626" />
              <h3>Reject Application</h3>
            </div>
            <p className="reject-sub">
              You are rejecting the medical verification application for <strong>{rejectModalApp.full_name}</strong> ({rejectModalApp.email}).
            </p>

            <div className="form-group">
              <label>Reason for Rejection / Council Feedback:</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why credentials could not be verified..."
                required
              />
            </div>

            <div className="reject-footer">
              <button className="btn-cancel" onClick={() => setRejectModalApp(null)}>Cancel</button>
              <button 
                className="btn-danger" 
                onClick={handleRejectConfirm} 
                disabled={actionLoadingId === rejectModalApp.id}
              >
                {actionLoadingId === rejectModalApp.id ? (
                  <>
                    <Loader2 size={15} className="spinner" style={{ display: 'inline', marginRight: 6 }} />
                    <span>Rejecting & Sending Email...</span>
                  </>
                ) : (
                  <span>Confirm Rejection & Dispatch Email</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-page-root {
          min-height: 100vh;
          background: #FDF9FA;
          color: var(--text-main);
          font-family: inherit;
        }

        .admin-navbar {
          background: #FFFFFF;
          border-bottom: 1px solid var(--burgundy-border);
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(133, 16, 54, 0.05);
        }

        .admin-nav-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-to-app-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          color: var(--burgundy-primary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .back-to-app-btn:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .admin-brand-divider {
          width: 1px;
          height: 28px;
          background: var(--burgundy-border);
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-shield-icon {
          width: 36px;
          height: 36px;
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-nav-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
        }

        .admin-nav-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: var(--pink-surface);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .admin-nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .admin-user-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .admin-user-role {
          font-size: 11px;
          color: var(--text-muted);
        }

        .admin-logout-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #E5E7EB;
          color: #DC2626;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-logout-btn:hover {
          background: #FEE2E2;
          border-color: #F87171;
        }

        .admin-main-container {
          padding: 24px 32px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Admin Login Screen */
        .admin-login-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 120px);
        }

        .admin-login-card {
          width: 100%;
          max-width: 440px;
          padding: 32px;
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid var(--burgundy-border);
          box-shadow: 0 10px 30px rgba(133, 16, 54, 0.1);
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 22px;
        }

        .admin-lock-badge {
          width: 56px;
          height: 56px;
          background: #FAF1F3;
          color: var(--burgundy-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px auto;
        }

        .admin-login-header h2 {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 4px 0;
        }

        .admin-login-header p {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin: 0;
        }

        .admin-error-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FEE2E2;
          color: #991B1B;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .admin-login-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .admin-login-form .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          display: block;
        }

        .admin-login-form .form-group input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid var(--burgundy-border);
          border-radius: 8px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--text-main);
          background: #FFFFFF;
          outline: none;
          transition: all 0.2s ease;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }

        .admin-login-form .form-group input:focus {
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 3px rgba(133, 16, 54, 0.12);
          background: #FFFFFF;
        }

        .admin-login-form .form-group input::placeholder {
          color: var(--text-light);
          font-size: 12.5px;
        }

        .admin-credentials-hint {
          background: #FAF1F3;
          border-left: 3px solid var(--burgundy-primary);
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          color: var(--text-main);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .admin-credentials-hint code {
          background: #FFFFFF;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
          color: var(--burgundy-primary);
          border: 1px solid var(--burgundy-border);
        }

        .admin-login-btn {
          margin-top: 6px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
        }

        /* Dashboard Styles */
        .admin-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-feedback-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          position: relative;
        }

        .admin-feedback-banner.success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }

        .admin-feedback-banner.error {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #F87171;
        }

        .admin-feedback-banner.info {
          background: #EFF6FF;
          color: #1E40AF;
          border: 1px solid #BFDBFE;
        }

        .feedback-dismiss {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: inherit;
        }

        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 900px) {
          .admin-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: 10px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .stat-card:hover,
        .stat-card.active {
          border-color: var(--burgundy-primary);
          box-shadow: 0 4px 14px rgba(133, 16, 54, 0.08);
          transform: translateY(-2px);
        }

        .stat-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-wrap.pending { background: #FFFBEB; color: #D97706; }
        .stat-icon-wrap.approved { background: #ECFDF5; color: #059669; }
        .stat-icon-wrap.rejected { background: #FEE2E2; color: #DC2626; }
        .stat-icon-wrap.total { background: #FAF1F3; color: var(--burgundy-primary); }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-val {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.1;
        }

        .stat-lbl {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .admin-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .admin-tab-group {
          display: flex;
          gap: 6px;
          background: #F3E4E8;
          padding: 3px;
          border-radius: 8px;
        }

        .admin-tab {
          border: none;
          background: transparent;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .admin-tab.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .admin-search-box {
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: 8px;
          padding: 6px 12px;
          width: 320px;
          gap: 8px;
        }

        .admin-search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 13px;
          font-family: inherit;
        }

        .admin-refresh-btn {
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          cursor: pointer;
          padding: 4px;
        }

        /* Table */
        .admin-table-card {
          padding: 0;
          overflow: hidden;
          background: #FFFFFF;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .admin-table th {
          text-align: left;
          padding: 14px 18px;
          background-color: #FAF1F3;
          color: var(--text-secondary);
          font-weight: 700;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .admin-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F6E2E7;
          vertical-align: middle;
        }

        .admin-row:hover {
          background-color: #FFF9FA;
        }

        .doctor-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .doc-name {
          font-weight: 700;
          color: var(--text-main);
          font-size: 14px;
        }

        .doc-meta {
          font-size: 11.5px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .council-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .reg-number-pill {
          font-family: monospace;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: var(--pink-surface);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 12px;
          display: inline-block;
          max-width: fit-content;
        }

        .council-name {
          font-size: 11.5px;
          color: var(--text-secondary);
        }

        .hospital-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 220px;
        }

        .hosp-name {
          font-weight: 600;
          color: var(--text-main);
        }

        .hosp-address {
          font-size: 11px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .degree-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .spec-tag {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .degree-text {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .exp-text {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .admin-status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .admin-status-badge.approved { background: #ECFDF5; color: #059669; }
        .admin-status-badge.pending { background: #FFFBEB; color: #D97706; }
        .admin-status-badge.rejected { background: #FEE2E2; color: #DC2626; }

        .admin-action-btn-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-action-view,
        .btn-action-approve,
        .btn-action-reject {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 5px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
        }

        .btn-action-view {
          background: #FAF1F3;
          color: var(--burgundy-primary);
        }

        .btn-action-approve {
          background: #059669;
          color: #FFFFFF;
        }

        .btn-action-reject {
          background: #FEE2E2;
          color: #DC2626;
        }

        .admin-empty-cell {
          text-align: center;
          padding: 48px 20px !important;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }

        .empty-sub {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Detail Modal */
        .admin-modal-overlay {
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

        .admin-detail-card {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .detail-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: #FAF1F3;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .header-badge-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-badge-title h3 {
          margin: 0 0 2px 0;
          font-size: 17px;
          font-weight: 800;
        }

        .detail-close-btn {
          background: transparent;
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: var(--text-muted);
        }

        .detail-modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-section h4 {
          margin: 0 0 10px 0;
          font-size: 13px;
          font-weight: 800;
          color: var(--burgundy-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px 16px;
          background: #FAF1F3;
          padding: 12px 16px;
          border-radius: 8px;
        }

        .detail-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-field label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .detail-field span {
          font-size: 13px;
          color: var(--text-main);
          font-weight: 600;
        }

        .val-highlight {
          color: var(--burgundy-primary) !important;
          font-family: monospace;
          font-weight: 800 !important;
        }

        /* Certificate Cards Grid */
        .cert-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .cert-count-pill {
          font-size: 11px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          padding: 3px 8px;
          border-radius: 12px;
        }

        .cert-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 14px;
        }

        .cert-card-item {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }

        .cert-card-item:hover {
          border-color: #DFA0AF;
          box-shadow: 0 4px 14px rgba(133, 16, 54, 0.08);
          transform: translateY(-2px);
        }

        .cert-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 6px;
        }

        .cert-card-header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .cert-category-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--burgundy-primary);
        }

        .cert-card-title {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cert-card-sub {
          margin: 0;
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cert-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .cert-badge.verified {
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
        }

        .cert-badge.uploaded {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #6EE7B7;
          font-weight: 800;
        }

        .cert-badge.not-avail {
          background: #F3F4F6;
          color: #6B7280;
          border: 1px solid #D1D5DB;
        }

        .cert-badge.neutral {
          background: #F3F4F6;
          color: #4B5563;
          border: 1px solid #E5E7EB;
        }

        .cert-card-item.not-avail-card {
          opacity: 0.85;
          background: #FAFAFA;
        }

        .cert-thumb-wrap {
          position: relative;
          width: 100%;
          height: 140px;
          border-radius: 6px;
          overflow: hidden;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          cursor: pointer;
        }

        .cert-thumb-not-avail {
          background: #F9FAFB !important;
          border: 1.5px dashed #D1D5DB !important;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default !important;
        }

        .not-avail-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          text-align: center;
        }

        .not-avail-icon {
          color: #9CA3AF;
        }

        .not-avail-title {
          font-size: 12px;
          font-weight: 700;
          color: #4B5563;
        }

        .not-avail-sub {
          font-size: 10.5px;
          color: #9CA3AF;
          line-height: 1.3;
        }

        .btn-cert-disabled {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 5px;
          font-size: 11.5px;
          font-weight: 600;
          background: #F3F4F6;
          color: #9CA3AF;
          border: 1px solid #E5E7EB;
          cursor: not-allowed;
        }

        .cert-pdf-thumb-wrap {
          background: #FAF5F6;
          border: 1.5px dashed var(--burgundy-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-thumb-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          text-align: center;
          width: 100%;
        }

        .pdf-thumb-icon {
          color: var(--burgundy-primary);
        }

        .pdf-thumb-badge {
          font-size: 10px;
          font-weight: 800;
          color: var(--burgundy-primary);
          background: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          padding: 2px 8px;
          border-radius: 10px;
          letter-spacing: 0.5px;
        }

        .pdf-thumb-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          max-width: 90%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cert-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .cert-thumb-wrap:hover .cert-thumb-img {
          transform: scale(1.05);
        }

        .cert-thumb-overlay {
          position: absolute;
          inset: 0;
          background: rgba(133, 16, 54, 0.75);
          backdrop-filter: blur(2px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .cert-thumb-wrap:hover .cert-thumb-overlay {
          opacity: 1;
        }

        .cert-card-actions {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 6px;
          margin-top: auto;
        }

        .btn-cert-view,
        .btn-cert-download {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 5px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cert-view {
          background: #FAF1F3;
          color: var(--burgundy-primary);
          border: 1px solid var(--burgundy-border);
        }

        .btn-cert-view:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .btn-cert-download {
          background: #F3F4F6;
          color: var(--text-main);
          border: 1px solid #D1D5DB;
        }

        .btn-cert-download:hover {
          background: #E5E7EB;
          color: #111827;
        }

        .approved-badge-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #059669;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 6px;
        }

        /* Lightbox Certificate Modal */
        .cert-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 5, 8, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 24px;
        }

        .cert-lightbox-card {
          background: #FFFFFF;
          border-radius: 14px;
          width: 100%;
          max-width: 960px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.5);
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popIn {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .cert-lightbox-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #FAF1F3;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .cert-lightbox-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cert-lightbox-title-wrap h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--burgundy-primary);
        }

        .cert-lightbox-sub {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .cert-lightbox-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-lightbox-download {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border: none;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .btn-lightbox-download:hover {
          background: #6B0D2B;
        }

        .cert-lightbox-close {
          background: transparent;
          border: none;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          color: var(--text-muted);
          padding: 0 4px;
        }

        .cert-lightbox-close:hover {
          color: var(--text-main);
        }

        .cert-lightbox-body {
          padding: 20px;
          background: #18181B;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          max-height: calc(92vh - 140px);
        }

        .cert-lightbox-img {
          max-width: 100%;
          max-height: 68vh;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        .cert-lightbox-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: #FFFFFF;
          border-top: 1px solid #E5E7EB;
        }

        .cert-lightbox-meta {
          font-size: 11.5px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .rejection-box {
          background: #FEE2E2;
          padding: 12px 16px;
          border-radius: 8px;
          color: #991B1B;
        }

        .rejection-box h4 {
          color: #991B1B;
        }

        .detail-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          border-top: 1px solid var(--burgundy-border);
          background: #FFFFFF;
        }

        /* Reject Card */
        .admin-reject-card {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .reject-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .reject-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #DC2626;
        }

        .reject-sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }

        .admin-reject-card textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--burgundy-border);
          border-radius: 6px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
        }

        .reject-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 6px;
        }

        .btn-burgundy {
          background-color: var(--burgundy-primary);
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-burgundy:hover:not(:disabled) {
          background-color: var(--burgundy-dark);
          box-shadow: 0 4px 12px rgba(133, 16, 54, 0.25);
        }

        .btn-burgundy:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: #F3F4F6;
          color: var(--text-main);
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: #E5E7EB;
          color: #111827;
        }

        .btn-danger {
          background: #DC2626;
          color: #FFFFFF;
          border: none;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-danger:hover:not(:disabled) {
          background: #B91C1C;
        }

        .btn-danger:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
