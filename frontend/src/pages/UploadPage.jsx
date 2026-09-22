import React, { useState } from 'react';
import { FileText, Download, BarChart2 } from 'lucide-react';
import UploadBox from '../components/UploadBox';
import PatientDetails from '../components/PatientDetails';
import AngiogramViewer from '../components/AngiogramViewer';
import heartImg from '../assets/images/heart-illustration.png';
import api from '../api';

export default function UploadPage({ onNavigate }) {
  const [selectedFile, setSelectedFile] = useState({ name: 'patient_001_angio.dcm' });

  const handleRunAnalysis = async (patientData) => {
    try {
      const payload = {
        patient_id: patientData?.patientId || 'PAT-00123',
        age: patientData?.age ? parseInt(patientData.age) : 56,
        gender: patientData?.gender || 'Male',
        uploaded_file_name: selectedFile?.name || 'patient_001_angio.dcm',
        affected_vessel: 'LAD Proximal',
        severity: 68.0,
        confidence: 92.0,
        detected_region: 'Proximal segment of LAD',
        model_version: 'v1.0.0-qca'
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
          <h1 className="page-title">Upload Angiogram</h1>
          <p className="page-subtitle">
            Upload an angiogram image or video to get AI-powered analysis.
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

      {/* Main 2-Column Section */}
      <div className="upload-grid-layout">
        {/* Left Column: 1 Upload Angiogram & Patient Details */}
        <div className="angio-card upload-step-card">
          <div className="step-header">
            <div className="step-badge">1</div>
            <div className="step-title-group">
              <h2 className="step-title">Upload Angiogram</h2>
              <p className="step-subtitle">
                Supported formats: DICOM, JPG, PNG, MP4 (max 200 MB)
              </p>
            </div>
          </div>

          <UploadBox onFileSelect={setSelectedFile} />

          <PatientDetails onRunAnalysis={handleRunAnalysis} />
        </div>

        {/* Right Column: 2 Analysis Results */}
        <div className="angio-card results-step-card">
          <div className="step-header-with-action">
            <div className="step-header">
              <div className="step-badge">2</div>
              <div className="step-title-group">
                <h2 className="step-title">Analysis Results</h2>
                <p className="step-subtitle">
                  AI has analyzed the angiogram and highlighted key findings.
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
          <AngiogramViewer onOpenFullReport={() => onNavigate('/results')} />

          {/* Bottom Area: AI Findings (Left) & AI Analysis Confidence (Right) */}
          <div className="findings-and-confidence-row">
            {/* AI Findings */}
            <div className="ai-findings-section">
              <div className="findings-header">
                <FileText size={17} className="findings-icon" />
                <h3 className="findings-title">AI Findings</h3>
              </div>
              <ul className="findings-list">
                <li>Narrowing detected in proximal segment of LAD.</li>
                <li>Estimated severity: <strong>68%</strong>.</li>
                <li>Vessel structure highlighted.</li>
                <li>High confidence in detection.</li>
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
                High accuracy in vessel detection and narrowing assessment.
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
