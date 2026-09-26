import React, { useState } from 'react';
import { FileText, Download, BarChart2, Activity, Zap, Layers, Sparkles } from 'lucide-react';
import UploadBox from '../components/UploadBox';
import PatientDetails from '../components/PatientDetails';
import AngiogramViewer from '../components/AngiogramViewer';
import ECGGatingPanel from '../components/ECGGatingPanel';
import heartImg from '../assets/images/heart-illustration.png';
import api from '../api';

export default function UploadPage({ onNavigate }) {
  const [pipelineMode, setPipelineMode] = useState('ecg_gated'); // 'ecg_gated' | 'standard'
  const [selectedFile, setSelectedFile] = useState({ name: 'patient_001_angio.dcm' });
  const [videoSrc, setVideoSrc] = useState(null);
  const [gatedFrame, setGatedFrame] = useState(47);
  const [gatingTriggerData, setGatingTriggerData] = useState({
    trigger_time: 2.34,
    cardiac_phase: 70,
    rr_interval: 0.81,
    heart_rate: 74,
    confidence: 0.98,
    selected_frame: 47,
  });
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (file && file.type && file.type.startsWith('video/')) {
      try {
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
      } catch (e) {
        console.warn('Could not create object URL for video:', e);
      }
    }
  };

  const handleFrameSelectedByTrigger = (frame, triggerData) => {
    setGatedFrame(frame);
    if (triggerData) {
      setGatingTriggerData(triggerData);
    }
  };

  const handleRunAnalysis = async (patientData) => {
    try {
      const isGated = pipelineMode === 'ecg_gated';
      const fileName = selectedFile?.name || (isGated ? `coronary_cine_gated_frame_${gatedFrame}.dcm` : 'patient_001_angio.dcm');
      
      const payload = {
        patient_id: patientData?.patientId || 'PAT-00123',
        age: patientData?.age ? parseInt(patientData.age) : 56,
        gender: patientData?.gender || 'Male',
        uploaded_file_name: fileName,
        affected_vessel: 'LAD Proximal',
        severity: 68.0,
        confidence: 92.0,
        detected_region: isGated 
          ? `Proximal segment of LAD [Motion-Gated Frame #${gatedFrame} @ ${gatingTriggerData?.cardiac_phase || 70}% Phase]`
          : 'Proximal segment of LAD',
        model_version: 'v1.0.0-qca',
        gated_frame: isGated ? gatedFrame : undefined,
        cardiac_phase: isGated ? (gatingTriggerData?.cardiac_phase || 70) : undefined,
        trigger_time: isGated ? (gatingTriggerData?.trigger_time || 2.34) : undefined,
        rr_interval: isGated ? (gatingTriggerData?.rr_interval || 0.81) : undefined,
        heart_rate: isGated ? (gatingTriggerData?.heart_rate || 74) : undefined,
      };

      const res = await api.createAnalysis(payload);
      if (res.analysis_id) {
        api.setCurrentAnalysisId(res.analysis_id);
      }
    } catch (err) {
      console.error('Failed to create analysis:', err);
    }
    onNavigate('/results');
  };

  return (
    <div className="upload-page-container">
      {/* Top Page Header */}
      <div className="upload-page-header">
        <div className="header-titles">
          <h1 className="page-title">Coronary Angiogram Analysis</h1>
          <p className="page-subtitle">
            AI-powered coronary vessel and stenosis analysis with motion-synchronized ECG gating.
          </p>
        </div>

        {/* Right Decorative ECG + Script Quote + Subtle Heart */}
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

      {/* Mode Selector Tabs (Hackathon ECG-Gated vs Standard) */}
      <div className="pipeline-mode-selector-strip">
        <div className="mode-toggle-group">
          <button 
            type="button"
            className={`mode-btn ${pipelineMode === 'ecg_gated' ? 'active' : ''}`}
            onClick={() => setPipelineMode('ecg_gated')}
          >
            <Activity size={15} />
            <span>ECG-Gated Motion Trigger (Hackathon Pipeline)</span>
            <span className="mode-badge-pill">Synchronized AI</span>
          </button>
          <button 
            type="button"
            className={`mode-btn ${pipelineMode === 'standard' ? 'active' : ''}`}
            onClick={() => setPipelineMode('standard')}
          >
            <FileText size={15} />
            <span>Standard Static Angiogram</span>
          </button>
        </div>

        <div className="mode-info-tag">
          {pipelineMode === 'ecg_gated' ? (
            <span>
              ⚡ <strong>Motion-Gated Pipeline:</strong> ECG R-Peak → 70% Cardiac Phase → Virtual Trigger → Frame Selection → AI Analysis
            </span>
          ) : (
            <span>
              📄 <strong>Standard Flow:</strong> Image Upload → AI Vessel/Stenosis Analysis
            </span>
          )}
        </div>
      </div>

      {/* Dedicated ECG Gating Section (when ECG-Gated mode is active) */}
      {pipelineMode === 'ecg_gated' && (
        <ECGGatingPanel 
          onSelectFrame={handleFrameSelectedByTrigger}
          onGatingUpdate={setGatingTriggerData}
          onRunVesselAnalysisOnFrame={(frameNum) => handleRunAnalysis({ patientId: 'PAT-00123' })}
          externalPlaybackTime={currentPlaybackTime}
          totalFrames={120}
          fps={30}
          videoStatus={
            videoSrc 
              ? (selectedFile?.name || 'coronary_cine.mp4') 
              : (selectedFile?.name?.match(/\.(mp4|avi|mov|webm)$/i) ? selectedFile.name : 'Not provided')
          }
        />
      )}

      {/* Main 2-Column Section */}
      <div className="upload-grid-layout">
        {/* Left Column: Upload Angiogram & Patient Details */}
        <div className="angio-card upload-step-card">
          <div className="step-header">
            <div className="step-badge">1</div>
            <div className="step-title-group">
              <h2 className="step-title">
                {pipelineMode === 'ecg_gated' ? 'Angiography Cine Stream & Patient' : 'Upload Angiogram'}
              </h2>
              <p className="step-subtitle">
                {pipelineMode === 'ecg_gated'
                  ? 'Sequential coronary cine frames / video synchronized with virtual ECG trigger'
                  : 'Supported formats: DICOM, JPG, PNG, MP4 (max 200 MB)'}
              </p>
            </div>
          </div>

          <UploadBox onFileSelect={handleFileSelect} />

          <PatientDetails 
            onRunAnalysis={handleRunAnalysis} 
            submitButtonText={
              pipelineMode === 'ecg_gated' 
                ? `Analyze Gated Frame #${gatedFrame} →` 
                : 'Run AI Analysis →'
            }
          />
        </div>

        {/* Right Column: Analysis Results */}
        <div className="angio-card results-step-card">
          <div className="step-header-with-action">
            <div className="step-header">
              <div className="step-badge">2</div>
              <div className="step-title-group">
                <h2 className="step-title">
                  {pipelineMode === 'ecg_gated' ? 'Synchronized Angiogram Viewport' : 'Analysis Results'}
                </h2>
                <p className="step-subtitle">
                  {pipelineMode === 'ecg_gated' 
                    ? `Virtual trigger synchronized at Frame #${gatedFrame} (${gatingTriggerData?.cardiac_phase || 70}% Phase)` 
                    : 'AI has analyzed the angiogram and highlighted key findings.'}
                </p>
              </div>
            </div>

            <button 
              className="btn-outline-burgundy download-report-btn"
              onClick={() => onNavigate('/reports')}
            >
              <Download size={15} />
              <span>Download Report</span>
            </button>
          </div>

          {/* Angiogram Viewport and Metrics */}
          <AngiogramViewer 
            onOpenFullReport={() => onNavigate('/results')}
            selectedFrame={gatedFrame}
            virtualTrigger={gatingTriggerData}
            isGatedMode={pipelineMode === 'ecg_gated'}
            videoSrc={videoSrc}
            onPlaybackUpdate={(t) => setCurrentPlaybackTime(t)}
            totalFrames={120}
            fps={30}
          />

          {/* Bottom Area: AI Findings (Left) & AI Analysis Confidence (Right) */}
          <div className="findings-and-confidence-row">
            {/* AI Findings */}
            <div className="ai-findings-section">
              <div className="findings-header">
                <FileText size={17} className="findings-icon" />
                <h3 className="findings-title">AI Findings</h3>
              </div>
              <ul className="findings-list">
                {pipelineMode === 'ecg_gated' && (
                  <li className="gated-highlight-item">
                    <strong>Motion-Gated Acquisition:</strong> Trigger generated at {gatingTriggerData?.cardiac_phase || 70}% cardiac phase (Frame #{gatedFrame}).
                  </li>
                )}
                <li>Narrowing detected in proximal segment of LAD.</li>
                <li>Estimated severity: <strong>68%</strong>.</li>
                <li>Vessel structure highlighted.</li>
                <li>High confidence in detection ({pipelineMode === 'ecg_gated' ? '98% R-peak confidence' : '92%'}).</li>
                <li>Recommend clinical correlation.</li>
              </ul>
            </div>

            {/* AI Analysis Confidence Card */}
            <div className="confidence-summary-card">
              <div className="conf-icon-wrapper">
                <BarChart2 size={20} />
              </div>
              <h4 className="conf-title">AI Analysis Confidence</h4>
              <p className="conf-desc">
                {pipelineMode === 'ecg_gated'
                  ? 'Motion blur minimized via virtual cardiac cycle synchronization.'
                  : 'High accuracy in vessel detection and narrowing assessment.'}
              </p>
              <button 
                className="btn-burgundy view-detailed-report-btn"
                onClick={() => onNavigate('/results')}
              >
                <span>View Detailed Report</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .upload-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .upload-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px 4px 4px;
        }

        .header-titles {
          display: flex;
          flex-direction: column;
        }

        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.6px;
          line-height: 1.2;
        }

        .page-subtitle {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-top: 4px;
          font-weight: 500;
        }

        .header-decorative-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .header-ecg-svg {
          width: 110px;
          height: 32px;
        }

        .header-quote-script {
          font-family: var(--font-script);
          font-size: 23px;
          font-weight: 700;
          color: var(--burgundy-primary);
          white-space: nowrap;
        }

        .header-heart-thumb {
          width: 48px;
          height: 48px;
          opacity: 0.85;
        }

        .header-heart-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
        }

        /* Mode Selector Strip */
        .pipeline-mode-selector-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 8px 14px;
        }

        .mode-toggle-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 600;
          border: 1px solid transparent;
          background: #F8FAFC;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-btn:hover {
          background: #FFF2F5;
          color: var(--burgundy-primary);
        }

        .mode-btn.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border-color: var(--burgundy-primary);
          box-shadow: 0 2px 8px rgba(133, 16, 54, 0.2);
        }

        .mode-badge-pill {
          background: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .mode-btn:not(.active) .mode-badge-pill {
          background: #FCE7EB;
          color: var(--burgundy-primary);
        }

        .mode-info-tag {
          font-size: 11.5px;
          color: var(--text-secondary);
        }

        .mode-info-tag strong {
          color: var(--burgundy-primary);
        }

        /* 2-Column Grid Layout */
        .upload-grid-layout {
          display: grid;
          grid-template-columns: 430px 1fr;
          gap: 24px;
          align-items: start;
        }

        .upload-step-card, .results-step-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .step-header-with-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .step-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--burgundy-primary);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step-title-group {
          display: flex;
          flex-direction: column;
        }

        .step-title {
          font-size: 16.5px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.2px;
        }

        .step-subtitle {
          font-size: 11.5px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .download-report-btn {
          padding: 6px 14px;
          font-size: 12.5px;
        }

        /* Findings & Confidence Row */
        .findings-and-confidence-row {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 16px;
          margin-top: 4px;
        }

        .ai-findings-section {
          background-color: #FAFAFB;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 14px 18px;
        }

        .findings-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .findings-icon {
          color: var(--burgundy-primary);
        }

        .findings-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .findings-list {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .findings-list li {
          line-height: 1.35;
        }

        .gated-highlight-item {
          color: var(--burgundy-primary) !important;
          font-weight: 600;
        }

        .confidence-summary-card {
          background-color: #FDECEF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .conf-icon-wrapper {
          color: var(--burgundy-primary);
        }

        .conf-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .conf-desc {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.35;
        }

        .view-detailed-report-btn {
          margin-top: 6px;
          width: 100%;
          padding: 8px 12px;
          font-size: 12.5px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          background-color: var(--burgundy-primary) !important;
          color: #FFFFFF !important;
          opacity: 1 !important;
          visibility: visible !important;
          transition: all 0.2s ease;
        }

        .view-detailed-report-btn:hover {
          background-color: #6D0B2B !important;
          color: #FFFFFF !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        @media (max-width: 1200px) {
          .upload-grid-layout {
            grid-template-columns: 1fr;
          }
          .findings-and-confidence-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
