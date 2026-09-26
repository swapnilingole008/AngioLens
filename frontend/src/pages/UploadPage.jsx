import React, { useState } from 'react';
import { 
  Activity, 
  Film, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Loader2, 
  Play, 
  Clock, 
  Heart, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import heartImg from '../assets/images/heart-illustration.png';
import api from '../api';

export default function UploadPage({ onNavigate }) {
  // Input files state
  const [ecgFile, setEcgFile] = useState(null);
  const [useSampleEcg, setUseSampleEcg] = useState(true); // Default to true so demo runs out-of-the-box
  const [videoFile, setVideoFile] = useState(null);
  const [useSampleVideo, setUseSampleVideo] = useState(true); // Default to true so demo runs out-of-the-box

  // Patient inputs
  const [patientId, setPatientId] = useState('PAT-00123');
  const [age, setAge] = useState('56');
  const [gender, setGender] = useState('Male');
  const [notes, setNotes] = useState('Diagnostic coronary catheterization. Motion-synchronized cine review.');

  // Processing state & multi-step progress loader
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // 0: idle, 1: upload, 2: ecg, 3: rpeaks, 4: matching, 5: capture, 6: done
  const [processingError, setProcessingError] = useState(null);

  // Drag states
  const [isDraggingEcg, setIsDraggingEcg] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  // Handle ECG file selection
  const handleEcgFile = (file) => {
    if (!file) return;
    setEcgFile(file);
    setUseSampleEcg(false);
  };

  // Handle Video file selection
  const handleVideoFile = (file) => {
    if (!file) return;
    setVideoFile(file);
    setUseSampleVideo(false);
  };

  // Submit and run backend ECG + Video processing
  const handleStartProcessing = async (e) => {
    if (e) e.preventDefault();
    if (isProcessing) return; // Prevent duplicate submissions

    setIsProcessing(true);
    setProcessingError(null);
    setProcessingStep(1); // Upload started

    try {
      const formData = new FormData();

      if (ecgFile && !useSampleEcg) {
        formData.append('ecg_file', ecgFile);
      }
      if (videoFile && !useSampleVideo) {
        formData.append('video_file', videoFile);
      }
      formData.append('patient_id', patientId || 'PAT-00123');
      formData.append('age', age || '56');
      formData.append('gender', gender || 'Male');
      formData.append('notes', notes || '');

      // Simulate visible progress step intervals during processing
      const stepTimer1 = setTimeout(() => setProcessingStep(2), 500);  // ECG loaded
      const stepTimer2 = setTimeout(() => setProcessingStep(3), 1100); // Detecting R-peaks
      const stepTimer3 = setTimeout(() => setProcessingStep(4), 1800); // Matching frames
      const stepTimer4 = setTimeout(() => setProcessingStep(5), 2400); // Capturing images

      const response = await api.processECGVideo(formData);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      if (response && (response.status === 'success' || response.r_peaks)) {
        setProcessingStep(6); // Processing completed

        // Store result for instant access on Results Page
        api.setLatestECGResult(response);
        if (response.analysis_id) {
          api.setCurrentAnalysisId(response.analysis_id);
        }

        // Brief delay for the user to see "Processing completed" before navigating
        setTimeout(() => {
          setIsProcessing(false);
          onNavigate('/results');
        }, 800);
      } else {
        throw new Error(response?.error || response?.message || 'Processing failed to return expected ECG data');
      }
    } catch (err) {
      console.error('ECG/Video Processing Error:', err);
      setIsProcessing(false);
      setProcessingError(err?.message || 'Failed to process ECG and video. Please verify server connection and try again.');
    }
  };

  return (
    <div className="upload-page-clean-container">
      {/* Top Page Header */}
      <div className="upload-page-header">
        <div className="header-titles">
          <h1 className="page-title">ECG-Gated Angiography Acquisition</h1>
          <p className="page-subtitle">
            Upload patient ECG signal and coronary cine stream. The integrated CardioAI model detects exact R-peaks and synchronizes imaging frames.
          </p>
        </div>

        {/* Right Decorative ECG + Script Quote */}
        <div className="header-decorative-right">
          <svg className="header-ecg-svg" viewBox="0 0 160 40" preserveAspectRatio="none">
            <path
              d="M 0,20 L 40,20 L 48,8 L 56,32 L 64,2 L 72,28 L 80,20 L 160,20"
              fill="none"
              stroke="#851036"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="header-quote-script">Better Insights. Healthier Hearts.</span>
          <div className="header-heart-thumb">
            <img src={heartImg} alt="Heart" />
          </div>
        </div>
      </div>

      {/* Main Upload & Input Grid */}
      <form onSubmit={handleStartProcessing} className="upload-inputs-grid">
        
        {/* Card 1: ECG Signal Upload */}
        <div className="angio-card input-card">
          <div className="card-top-header">
            <div className="card-icon-badge">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="card-section-title">1. Upload ECG Signal</h2>
              <p className="card-section-subtitle">Lead II CSV/TXT format (100–500 Hz)</p>
            </div>
          </div>

          {/* ECG Dropzone */}
          <label
            className={`file-dropzone ${isDraggingEcg ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingEcg(true); }}
            onDragLeave={() => setIsDraggingEcg(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingEcg(false);
              if (e.dataTransfer.files?.[0]) handleEcgFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden-file-input"
              onChange={(e) => {
                if (e.target.files?.[0]) handleEcgFile(e.target.files[0]);
              }}
            />
            <div className="upload-icon-circle">
              <Activity size={24} />
            </div>
            <p className="drop-main-text">Drag & drop ECG signal file</p>
            <span className="drop-or-text">or click to browse (.csv, .txt)</span>
          </label>

          {/* Active ECG File Status / Preloaded Switch */}
          <div className="file-selection-status-box">
            {useSampleEcg ? (
              <div className="selected-file-row sample-active">
                <div className="file-meta">
                  <CheckCircle2 size={18} className="success-icon" />
                  <span className="file-name">sample_ecg.csv (Preloaded 360 Hz Signal)</span>
                </div>
                <button
                  type="button"
                  className="switch-file-btn"
                  onClick={() => {
                    setUseSampleEcg(false);
                    setEcgFile(null);
                  }}
                  title="Upload your own file"
                >
                  Upload custom
                </button>
              </div>
            ) : ecgFile ? (
              <div className="selected-file-row">
                <div className="file-meta">
                  <CheckCircle2 size={18} className="success-icon" />
                  <span className="file-name">{ecgFile.name} ({(ecgFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => setEcgFile(null)}
                  title="Remove file"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="no-file-row">
                <span className="no-file-text">No custom ECG file selected</span>
                <button
                  type="button"
                  className="use-sample-btn"
                  onClick={() => setUseSampleEcg(true)}
                >
                  Use Preloaded sample_ecg.csv
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Coronary Cine Video Upload */}
        <div className="angio-card input-card">
          <div className="card-top-header">
            <div className="card-icon-badge">
              <Film size={20} />
            </div>
            <div>
              <h2 className="card-section-title">2. Upload Coronary Cine Video</h2>
              <p className="card-section-subtitle">Angiography cine stream (.mp4, .avi, .mov, .dcm)</p>
            </div>
          </div>

          {/* Video Dropzone */}
          <label
            className={`file-dropzone ${isDraggingVideo ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
            onDragLeave={() => setIsDraggingVideo(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingVideo(false);
              if (e.dataTransfer.files?.[0]) handleVideoFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept=".mp4,.avi,.mov,.webm,.dcm"
              className="hidden-file-input"
              onChange={(e) => {
                if (e.target.files?.[0]) handleVideoFile(e.target.files[0]);
              }}
            />
            <div className="upload-icon-circle">
              <Film size={24} />
            </div>
            <p className="drop-main-text">Drag & drop angiography cine video</p>
            <span className="drop-or-text">or click to browse (.mp4, .dcm)</span>
          </label>

          {/* Active Video File Status / Preloaded Switch */}
          <div className="file-selection-status-box">
            {useSampleVideo ? (
              <div className="selected-file-row sample-active">
                <div className="file-meta">
                  <CheckCircle2 size={18} className="success-icon" />
                  <span className="file-name">sample_cine.mp4 (Preloaded 30 FPS Stream)</span>
                </div>
                <button
                  type="button"
                  className="switch-file-btn"
                  onClick={() => {
                    setUseSampleVideo(false);
                    setVideoFile(null);
                  }}
                  title="Upload your own video"
                >
                  Upload custom
                </button>
              </div>
            ) : videoFile ? (
              <div className="selected-file-row">
                <div className="file-meta">
                  <CheckCircle2 size={18} className="success-icon" />
                  <span className="file-name">{videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                </div>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => setVideoFile(null)}
                  title="Remove video"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="no-file-row">
                <span className="no-file-text">No custom video selected</span>
                <button
                  type="button"
                  className="use-sample-btn"
                  onClick={() => setUseSampleVideo(true)}
                >
                  Use Preloaded sample_cine.mp4
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Patient & Procedure Details */}
        <div className="angio-card input-card full-width-card">
          <div className="card-top-header">
            <div className="card-icon-badge">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="card-section-title">3. Patient & Procedure Details</h2>
              <p className="card-section-subtitle">Clinical identification for cardiac timing correlation</p>
            </div>
          </div>

          <div className="patient-inputs-row">
            <div className="input-group">
              <label className="input-label">Patient ID</label>
              <input
                type="text"
                className="text-input"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. PAT-00123"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Age</label>
              <input
                type="number"
                className="text-input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 56"
                min="1"
                max="120"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Gender</label>
              <select
                className="select-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="input-group input-group-notes">
              <label className="input-label">Clinical Notes</label>
              <input
                type="text"
                className="text-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Angina, suspected LAD stenosis"
              />
            </div>
          </div>
        </div>

        {/* Error message banner if processing failed */}
        {processingError && (
          <div className="processing-error-banner">
            <AlertCircle size={20} className="error-icon" />
            <div className="error-text-content">
              <strong>Processing Failed:</strong> {processingError}
            </div>
            <button
              type="button"
              className="retry-btn"
              onClick={handleStartProcessing}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Start Analysis CTA Button */}
        <div className="cta-container">
          <button
            type="submit"
            className="btn-burgundy start-processing-btn"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="spinner-icon" />
                <span>Processing ECG & Video...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Start ECG-Gated Analysis →</span>
              </>
            )}
          </button>
          <p className="cta-caption">
            Runs integrated CardioAI R-peak detection model, computes exact timestamps, and captures synchronized video frames.
          </p>
        </div>
      </form>

      {/* Step-by-Step Processing Modal Overlay */}
      {isProcessing && (
        <div className="processing-modal-overlay">
          <div className="processing-modal-card">
            <div className="modal-header-icon">
              <Activity size={32} className="modal-pulse-icon" />
            </div>

            <h3 className="modal-title">Processing ECG and Video...</h3>
            <p className="modal-subtitle">
              Running integrated CardioAI 1D CNN model and frame-accurate timing synchronization.
            </p>

            {/* Checklist of exact states requested */}
            <div className="processing-steps-list">
              {/* Step 1: Upload completed */}
              <div className={`step-item ${processingStep >= 1 ? 'completed' : 'pending'}`}>
                {processingStep >= 1 ? (
                  <CheckCircle2 size={18} className="step-check" />
                ) : (
                  <span className="step-bullet">•</span>
                )}
                <span className="step-label">Upload completed</span>
              </div>

              {/* Step 2: ECG loaded */}
              <div className={`step-item ${processingStep >= 2 ? 'completed' : (processingStep === 1 ? 'active' : 'pending')}`}>
                {processingStep >= 2 ? (
                  <CheckCircle2 size={18} className="step-check" />
                ) : processingStep === 1 ? (
                  <Loader2 size={18} className="step-spinner" />
                ) : (
                  <span className="step-bullet">•</span>
                )}
                <span className="step-label">ECG loaded & calibrated</span>
              </div>

              {/* Step 3: Detecting R-peaks */}
              <div className={`step-item ${processingStep >= 3 ? (processingStep > 3 ? 'completed' : 'active') : 'pending'}`}>
                {processingStep > 3 ? (
                  <CheckCircle2 size={18} className="step-check" />
                ) : processingStep === 3 ? (
                  <Loader2 size={18} className="step-spinner" />
                ) : (
                  <span className="step-bullet">⏳</span>
                )}
                <span className="step-label">Detecting R-peaks with CardioAI model...</span>
              </div>

              {/* Step 4: Matching R-peaks with video frames */}
              <div className={`step-item ${processingStep >= 4 ? (processingStep > 4 ? 'completed' : 'active') : 'pending'}`}>
                {processingStep > 4 ? (
                  <CheckCircle2 size={18} className="step-check" />
                ) : processingStep === 4 ? (
                  <Loader2 size={18} className="step-spinner" />
                ) : (
                  <span className="step-bullet">⏳</span>
                )}
                <span className="step-label">Matching R-peaks with video frames...</span>
              </div>

              {/* Step 5: Capturing synchronized images */}
              <div className={`step-item ${processingStep >= 5 ? (processingStep >= 6 ? 'completed' : 'active') : 'pending'}`}>
                {processingStep >= 6 ? (
                  <CheckCircle2 size={18} className="step-check" />
                ) : processingStep === 5 ? (
                  <Loader2 size={18} className="step-spinner" />
                ) : (
                  <span className="step-bullet">⏳</span>
                )}
                <span className="step-label">Capturing synchronized images...</span>
              </div>
            </div>

            {/* Step 6: Completion message */}
            {processingStep >= 6 && (
              <div className="processing-completed-badge">
                <CheckCircle2 size={16} />
                <span>Processing completed! Preparing Results Page...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .upload-page-clean-container {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeIn 0.3s ease-out;
        }

        .upload-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .input-card {
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .full-width-card {
          grid-column: 1 / -1;
        }

        .card-top-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .card-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background-color: var(--pink-surface);
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 2px;
        }

        .card-section-subtitle {
          font-size: 12.5px;
          color: var(--text-muted);
        }

        .file-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed var(--burgundy-border);
          border-radius: var(--radius-md);
          background-color: #FFF9FA;
          padding: 30px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .file-dropzone:hover,
        .file-dropzone.dragging {
          border-color: var(--burgundy-primary);
          background-color: #FFF0F4;
        }

        .hidden-file-input {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
          pointer-events: none;
        }

        .upload-icon-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #FFFFFF;
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
          margin-bottom: 10px;
          border: 1px solid var(--burgundy-border);
        }

        .drop-main-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 3px;
        }

        .drop-or-text {
          font-size: 12px;
          color: var(--text-muted);
        }

        .file-selection-status-box {
          background: #FDFDFE;
          border: 1px solid #EBE4E7;
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }

        .selected-file-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .selected-file-row.sample-active {
          color: var(--burgundy-primary);
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .file-name {
          font-weight: 600;
        }

        .success-icon {
          color: #10B981;
          flex-shrink: 0;
        }

        .switch-file-btn {
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .remove-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
        }

        .remove-btn:hover {
          color: #EF4444;
        }

        .no-file-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
        }

        .no-file-text {
          color: var(--text-muted);
        }

        .use-sample-btn {
          background: #FFF2F5;
          border: 1px solid var(--burgundy-border);
          color: var(--burgundy-primary);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .use-sample-btn:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .patient-inputs-row {
          display: grid;
          grid-template-columns: 1fr 0.8fr 1fr 2fr;
          gap: 16px;
        }

        @media (max-width: 900px) {
          .upload-inputs-grid {
            grid-template-columns: 1fr;
          }
          .patient-inputs-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .text-input,
        .select-input {
          padding: 9px 12px;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-sm);
          font-size: 13.5px;
          color: var(--text-main);
          background: #FFFFFF;
          font-family: inherit;
        }

        .text-input:focus,
        .select-input:focus {
          outline: none;
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 2px rgba(133, 16, 54, 0.15);
        }

        .processing-error-banner {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #991B1B;
          border-radius: var(--radius-sm);
          padding: 12px 18px;
        }

        .error-text-content {
          flex: 1;
          font-size: 13.5px;
        }

        .retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #DC2626;
          color: #FFFFFF;
          border: none;
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .cta-container {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }

        .start-processing-btn {
          width: 100%;
          max-width: 420px;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 14px rgba(133, 16, 54, 0.25);
          cursor: pointer;
        }

        .start-processing-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .cta-caption {
          font-size: 12.5px;
          color: var(--text-muted);
          text-align: center;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Modal Overlay for Step-by-Step Processing */
        .processing-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        .processing-modal-card {
          background: #FFFFFF;
          border-radius: var(--radius-lg);
          padding: 36px 32px;
          width: 90%;
          max-width: 480px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .modal-header-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #FFF0F4;
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .modal-pulse-icon {
          animation: pulseIcon 1.2s infinite ease-in-out;
        }

        .modal-title {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 6px;
        }

        .modal-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 24px;
          line-height: 1.4;
        }

        .processing-steps-list {
          width: 100%;
          background: #FFF9FA;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text-muted);
          transition: all 0.2s ease;
        }

        .step-item.active {
          color: var(--burgundy-primary);
          font-weight: 600;
        }

        .step-item.completed {
          color: #065F46;
          font-weight: 600;
        }

        .step-check {
          color: #10B981;
          flex-shrink: 0;
        }

        .step-spinner {
          color: var(--burgundy-primary);
          animation: spin 1s linear infinite;
          flex-shrink: 0;
        }

        .step-bullet {
          width: 18px;
          text-align: center;
          font-size: 12px;
          flex-shrink: 0;
        }

        .processing-completed-badge {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          border-radius: var(--radius-pill);
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 600;
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
