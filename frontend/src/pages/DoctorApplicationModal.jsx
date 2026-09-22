import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  FileCheck2,
  Stethoscope
} from 'lucide-react';
import api from '../api';

export default function DoctorApplicationModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    dob: '',
    registration_number: '',
    registration_authority: '',
    medical_degree: '',
    specialization: '',
    hospital_name: '',
    experience_years: '',
    hospital_id_card: '',
    professional_address: '',
    registration_certificate_name: '',
    degree_certificate_name: '',
    specialization_certificate_name: '',
    hospital_id_doc_name: '',
    govt_id_doc_name: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleFakeFileUpload = (field, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file.name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.full_name.trim()) {
      setError('Please provide your Full Name with title (e.g. Dr. Rahul Sharma).');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid professional email address.');
      return;
    }
    if (!formData.mobile_number.trim()) {
      setError('Please enter your active mobile phone number.');
      return;
    }
    if (!formData.registration_number.trim()) {
      setError('Medical Council Registration Number is mandatory for clinical verification.');
      return;
    }
    if (!formData.registration_authority.trim()) {
      setError('Please enter the Issuing Medical Council/Authority (e.g. Maharashtra Medical Council).');
      return;
    }
    if (!formData.medical_degree.trim()) {
      setError('Please specify your Medical Degree (e.g. MBBS / MD / DM).');
      return;
    }
    if (!formData.specialization.trim()) {
      setError('Please enter your medical specialization (e.g. Interventional Cardiology).');
      return;
    }
    if (!formData.hospital_name.trim()) {
      setError('Please enter your primary affiliated Hospital or Clinical Institution.');
      return;
    }
    if (!formData.professional_address.trim()) {
      setError('Please provide your professional hospital/clinic address.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        registration_certificate: formData.registration_certificate_name || 'Medical_Registration_Certificate.pdf',
        degree_certificate: formData.degree_certificate_name || 'MBBS_Degree_Certificate.pdf',
        specialization_certificate: formData.specialization_certificate_name || 'Cardiology_Specialization.pdf',
        hospital_id_doc: formData.hospital_id_doc_name || 'Hospital_Employee_ID.pdf',
        govt_id_doc: formData.govt_id_doc_name || 'Government_Identity_Proof.pdf',
      };

      const res = await api.submitDoctorApplication(payload);
      if (res.success) {
        setSubmittedEmail(formData.email);
        setIsSuccess(true);
      } else {
        setError(res.message || 'Failed to submit application. Please check your inputs.');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred while submitting your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setError('');
    setFormData({
      full_name: '',
      email: '',
      mobile_number: '',
      dob: '',
      registration_number: '',
      registration_authority: '',
      medical_degree: '',
      specialization: '',
      hospital_name: '',
      experience_years: '',
      hospital_id_card: '',
      professional_address: '',
      registration_certificate_name: '',
      degree_certificate_name: '',
      specialization_certificate_name: '',
      hospital_id_doc_name: '',
      govt_id_doc_name: '',
    });
    onClose();
  };

  return (
    <div className="doc-modal-overlay">
      <div className="doc-modal-card">
        {/* Header */}
        <div className="doc-modal-header">
          <div className="header-left">
            <div className="header-icon-badge">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="doc-modal-title">Doctor Verification & Access Application</h2>
              <p className="doc-modal-sub">Submit your medical credentials for AngioLens Clinical Access</p>
            </div>
          </div>
          <button className="doc-close-btn" onClick={handleResetAndClose} title="Close application">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="doc-success-view">
            <div className="success-icon-wrap">
              <CheckCircle2 size={54} color="#059669" />
            </div>
            <h3 className="success-title">Application Submitted Successfully!</h3>
            <p className="success-desc">
              Your medical credential verification request has been forwarded to the <strong>AngioLens Medical Board</strong>.
            </p>
            
            <div className="success-box">
              <div className="success-row">
                <Mail size={16} className="text-burgundy" />
                <span>Confirmation email dispatched to: <strong>{submittedEmail}</strong></span>
              </div>
              <div className="success-row">
                <FileCheck2 size={16} className="text-burgundy" />
                <span>Status: <strong style={{ color: '#D97706' }}>Pending Medical Council Verification</strong></span>
              </div>
            </div>

            <div className="success-instructions">
              <h4>What happens next?</h4>
              <ol>
                <li>Our medical board validates your Medical Council Registration number and hospital association.</li>
                <li>Once approved, you will receive an approval email with your login details:
                  <ul>
                    <li><strong>Username:</strong> Your registered email ({submittedEmail})</li>
                    <li><strong>Initial Password:</strong> Your registered mobile number</li>
                  </ul>
                </li>
                <li>You can then log in immediately to analyze coronary angiograms.</li>
              </ol>
            </div>

            <button className="btn-burgundy success-done-btn" onClick={handleResetAndClose}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form className="doc-form" onSubmit={handleSubmit}>
            {error && (
              <div className="form-error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-section-banner">
              <User size={15} />
              <span>1. Personal & Contact Information</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Full Name (with Title) <span className="req">*</span></label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    name="full_name"
                    placeholder="e.g. Dr. Rahul Sharma"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Professional Email <span className="req">*</span></label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. rahul.sharma@hospital.org"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mobile Number <span className="req">*</span> <small>(Will be your initial password)</small></label>
                <input
                  type="text"
                  name="mobile_number"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date of Birth <span className="opt">(Optional)</span></label>
                <input
                  type="text"
                  name="dob"
                  placeholder="DD/MM/YYYY"
                  value={formData.dob}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-section-banner">
              <Award size={15} />
              <span>2. Medical Registration & Qualifications (Mandatory)</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Medical Registration Number <span className="req">*</span> <small>(Most Important)</small></label>
                <input
                  type="text"
                  name="registration_number"
                  placeholder="e.g. MMC-2011-094182"
                  value={formData.registration_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Issuing Medical Council / Authority <span className="req">*</span></label>
                <input
                  type="text"
                  name="registration_authority"
                  placeholder="e.g. Maharashtra Medical Council / MCI"
                  value={formData.registration_authority}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Medical Degree <span className="req">*</span></label>
                <input
                  type="text"
                  name="medical_degree"
                  placeholder="e.g. MBBS / MD / DM Cardiology"
                  value={formData.medical_degree}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Specialization <span className="req">*</span></label>
                <input
                  type="text"
                  name="specialization"
                  placeholder="e.g. Interventional Cardiology"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-section-banner">
              <Building2 size={15} />
              <span>3. Hospital & Clinical Affiliation</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Hospital / Institution Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="hospital_name"
                  placeholder="e.g. Ruby Hall Clinic & Heart Institute"
                  value={formData.hospital_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Years of Clinical Experience <span className="opt">(Optional)</span></label>
                <input
                  type="text"
                  name="experience_years"
                  placeholder="e.g. 8 years"
                  value={formData.experience_years}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Hospital ID / Employee ID <span className="opt">(Optional)</span></label>
                <input
                  type="text"
                  name="hospital_id_card"
                  placeholder="e.g. H12345 / RHC-CARD-082"
                  value={formData.hospital_id_card}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Professional Hospital Address <span className="req">*</span></label>
                <input
                  type="text"
                  name="professional_address"
                  placeholder="Hospital campus, department & city"
                  value={formData.professional_address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-section-banner">
              <FileCheck2 size={15} />
              <span>4. Verification Document Attachments</span>
            </div>

            <div className="docs-upload-grid">
              {/* Doc 1 */}
              <div className="doc-upload-item">
                <div className="doc-item-header">
                  <span className="doc-label">Medical Registration Certificate <span className="req">*</span></span>
                  <span className="doc-badge req-badge">Most Important</span>
                </div>
                <label className="file-drop-zone">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={(e) => handleFakeFileUpload('registration_certificate_name', e)}
                  />
                  <Upload size={16} />
                  <span>{formData.registration_certificate_name || 'Upload Registration Certificate (PDF/JPG)'}</span>
                </label>
              </div>

              {/* Doc 2 */}
              <div className="doc-upload-item">
                <div className="doc-item-header">
                  <span className="doc-label">Medical Degree Certificate (MBBS/MD)</span>
                  <span className="doc-badge">Required</span>
                </div>
                <label className="file-drop-zone">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={(e) => handleFakeFileUpload('degree_certificate_name', e)}
                  />
                  <Upload size={16} />
                  <span>{formData.degree_certificate_name || 'Upload Degree Certificate (PDF/JPG)'}</span>
                </label>
              </div>

              {/* Doc 3 */}
              <div className="doc-upload-item">
                <div className="doc-item-header">
                  <span className="doc-label">Specialization Certificate (DM/DNB)</span>
                  <span className="doc-badge opt-badge">If Applicable</span>
                </div>
                <label className="file-drop-zone">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={(e) => handleFakeFileUpload('specialization_certificate_name', e)}
                  />
                  <Upload size={16} />
                  <span>{formData.specialization_certificate_name || 'Upload Specialization Certificate'}</span>
                </label>
              </div>

              {/* Doc 4 */}
              <div className="doc-upload-item">
                <div className="doc-item-header">
                  <span className="doc-label">Hospital / Institution ID Card</span>
                  <span className="doc-badge opt-badge">Recommended</span>
                </div>
                <label className="file-drop-zone">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={(e) => handleFakeFileUpload('hospital_id_doc_name', e)}
                  />
                  <Upload size={16} />
                  <span>{formData.hospital_id_doc_name || 'Upload Hospital Staff ID Card'}</span>
                </label>
              </div>

              {/* Doc 5 */}
              <div className="doc-upload-item">
                <div className="doc-item-header">
                  <span className="doc-label">Government ID (Aadhaar/Passport)</span>
                  <span className="doc-badge opt-badge">Optional</span>
                </div>
                <label className="file-drop-zone">
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    onChange={(e) => handleFakeFileUpload('govt_id_doc_name', e)}
                  />
                  <Upload size={16} />
                  <span>{formData.govt_id_doc_name || 'Upload Government Photo ID'}</span>
                </label>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="doc-modal-footer">
              <button type="button" className="btn-cancel" onClick={handleResetAndClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-burgundy submit-app-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Submit Medical Verification Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .doc-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 10, 12, 0.65);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        .doc-modal-card {
          background: #FFFFFF;
          border-radius: 14px;
          max-width: 780px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(133, 16, 54, 0.2);
          border: 1px solid var(--burgundy-border);
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .doc-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: #FAF1F3;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .header-icon-badge {
          width: 44px;
          height: 44px;
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .doc-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--burgundy-primary);
          margin: 0;
        }

        .doc-modal-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin: 2px 0 0 0;
        }

        .doc-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .doc-close-btn:hover {
          background: rgba(133, 16, 54, 0.1);
          color: var(--burgundy-primary);
        }

        .doc-form {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FEE2E2;
          border: 1px solid #F87171;
          color: #991B1B;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .form-section-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: #FAF1F3;
          padding: 8px 14px;
          border-radius: 6px;
          border-left: 3px solid var(--burgundy-primary);
          margin-top: 6px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        @media (max-width: 640px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
        }

        .form-group label .req {
          color: #DC2626;
        }

        .form-group label .opt {
          color: var(--text-muted);
          font-weight: 400;
        }

        .form-group label small {
          font-weight: 400;
          color: var(--burgundy-primary);
          font-size: 11px;
        }

        .form-group input {
          padding: 9px 12px;
          border: 1px solid var(--burgundy-border);
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .form-group input:focus {
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 2px rgba(133, 16, 54, 0.1);
        }

        .docs-upload-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .doc-upload-item {
          background: #FCF8F9;
          border: 1px solid #F0D9DF;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .doc-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .doc-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
        }

        .doc-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: #E5E7EB;
          color: #4B5563;
        }

        .doc-badge.req-badge {
          background: #FEE2E2;
          color: #DC2626;
        }

        .doc-badge.opt-badge {
          background: #F3F4F6;
          color: #6B7280;
        }

        .file-drop-zone {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px dashed var(--burgundy-primary);
          border-radius: 6px;
          background: #FFFFFF;
          cursor: pointer;
          font-size: 12px;
          color: var(--burgundy-primary);
          font-weight: 600;
          transition: background 0.15s ease;
        }

        .file-drop-zone:hover {
          background: #FAF1F3;
        }

        .file-drop-zone input {
          display: none;
        }

        .doc-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 14px;
          border-top: 1px solid var(--burgundy-border);
          margin-top: 6px;
        }

        .btn-cancel {
          padding: 10px 18px;
          border: 1px solid var(--burgundy-border);
          background: #FFFFFF;
          color: var(--text-secondary);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .submit-app-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
        }

        /* Success View */
        .doc-success-view {
          padding: 36px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          overflow-y: auto;
        }

        .success-icon-wrap {
          margin-bottom: 14px;
        }

        .success-title {
          font-size: 22px;
          font-weight: 800;
          color: #059669;
          margin: 0 0 6px 0;
        }

        .success-desc {
          font-size: 14px;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 0 20px 0;
        }

        .success-box {
          background: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          border-radius: 8px;
          padding: 14px 20px;
          width: 100%;
          max-width: 540px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
          margin-bottom: 20px;
        }

        .success-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-main);
        }

        .success-instructions {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 16px 20px;
          width: 100%;
          max-width: 540px;
          text-align: left;
          margin-bottom: 24px;
        }

        .success-instructions h4 {
          margin: 0 0 8px 0;
          font-size: 13.5px;
          color: var(--burgundy-primary);
        }

        .success-instructions ol {
          margin: 0;
          padding-left: 18px;
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .success-instructions ul {
          margin: 4px 0;
          padding-left: 18px;
        }

        .success-done-btn {
          padding: 11px 32px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
