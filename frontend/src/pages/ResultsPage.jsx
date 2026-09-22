import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Layers, 
  FileText,
  Sliders
} from 'lucide-react';
import AngiogramViewer from '../components/AngiogramViewer';
import api from '../api';

export default function ResultsPage({ currentPath, onNavigate }) {
  const [activeTab, setActiveTab] = useState('segmented');
  const [verified, setVerified] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id') || params.get('taskId') || params.get('analysis_id');
        const id = urlId || api.getCurrentAnalysisId();
        if (urlId) {
          api.setCurrentAnalysisId(urlId);
        }
        const res = await api.getAnalysis(id);
        if (res?.data) {
          setAnalysisData(res.data);
          if (res.data.verified !== undefined) {
            setVerified(res.data.verified);
          }
        }
      } catch (err) {
        console.error('Failed to load analysis:', err);
      }
    };
    loadAnalysis();
  }, [currentPath]);

  const handleToggleVerify = async () => {
    const nextState = !verified;
    setVerified(nextState);
    const analysisId = analysisData?.analysis_id || api.getCurrentAnalysisId();
    if (analysisId) {
      try {
        await api.verifyAnalysis(analysisId, {
          verified: nextState,
          comments: nextState ? 'Physician verified' : 'Verification revoked'
        });
      } catch (err) {
        console.error('Failed to update verification status:', err);
      }
    }
  };

  const patientId = analysisData?.patient?.patient_id || 'PAT-00123';
  const patientAge = analysisData?.patient?.age || 56;
  const patientGender = analysisData?.patient?.gender || 'Male';
  const affectedVessel = analysisData?.result?.affected_vessel || 'LAD Proximal';
  const stenosisNum = analysisData?.result?.severity ? Math.round(analysisData.result.severity) : 68;
  const confidenceNum = analysisData?.result?.confidence ? Math.round(analysisData.result.confidence) : 92;

  const handleViewFullReport = () => {
    const analysisId = analysisData?.analysis_id || api.getCurrentAnalysisId() || 1;
    api.setCurrentAnalysisId(analysisId);
    try {
      localStorage.setItem('angiolens_open_report_detail', 'true');
    } catch {}
    onNavigate('/reports');
  };

  return (
    <div className="results-page-container">
      {/* Top Action Bar */}
      <div className="results-top-bar">
        <div className="top-bar-left">
          <button className="back-link-btn" onClick={() => onNavigate('/upload')}>
            <ArrowLeft size={16} />
            <span>Back to Upload</span>
          </button>
          <div className="patient-tag">
            <span className="patient-id-badge">{patientId}</span>
            <span className="patient-meta">{patientAge} Y/O • {patientGender} • Cath Lab Cranial 35°</span>
          </div>
        </div>

        <div className="top-bar-right">
          <button className="btn-outline-burgundy" onClick={handleViewFullReport}>
            <FileText size={16} />
            <span>View Full Report</span>
          </button>
          <button 
            className={`btn-burgundy ${verified ? 'verified-btn' : ''}`}
            onClick={handleToggleVerify}
          >
            <CheckCircle size={16} />
            <span>{verified ? 'Physician Verified ✓' : 'Verify Findings'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Viewer & Right Quantitative Diagnostics */}
      <div className="results-grid">
        {/* Left Card: Angiogram with layer toggles */}
        <div className="angio-card viewer-card">
          <div className="card-header-tabs">
            <div className="tab-title-group">
              <h2 className="card-title">Coronary Visualization</h2>
              <span className="card-subtitle">AI Multi-layer Segment Analysis</span>
            </div>
            <div className="layer-tabs">
              {['segmented', 'centerline', 'heatmap'].map((tab) => (
                <button
                  key={tab}
                  className={`layer-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <Layers size={13} />
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          <AngiogramViewer onOpenFullReport={handleViewFullReport} />
        </div>

        {/* Right Card: Vessel Metrics & Lesion Quantifications */}
        <div className="angio-card diagnostics-card">
          <div className="diagnostics-header">
            <Activity size={20} className="diag-icon" />
            <div>
              <h3 className="diag-title">Quantitative Coronary Analysis (QCA)</h3>
              <p className="diag-subtitle">Automated vessel caliber & stenosis assessment</p>
            </div>
          </div>

          {/* Critical Stenosis Summary Banner */}
          <div className="stenosis-alert-box">
            <AlertTriangle size={20} className="alert-icon" />
            <div className="alert-text">
              <strong>Significant Stenosis Detected: {affectedVessel}</strong>
              <p>Diameter stenosis of {stenosisNum}% exceeds critical clinical threshold (50%). Physiologic evaluation recommended.</p>
            </div>
          </div>

          {/* Segment Table */}
          <div className="table-wrapper">
            <table className="qca-table">
              <thead>
                <tr>
                  <th>Vessel Segment</th>
                  <th>Stenosis</th>
                  <th>Min Lumen</th>
                  <th>Ref Diam</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="highlight-row">
                  <td><strong>{affectedVessel}</strong></td>
                  <td><span className="stenosis-badge-danger">{stenosisNum}%</span></td>
                  <td>1.02 mm</td>
                  <td>3.18 mm</td>
                  <td><span className="badge-critical">Critical</span></td>
                </tr>
                <tr>
                  <td>LAD Mid</td>
                  <td>18%</td>
                  <td>2.45 mm</td>
                  <td>2.99 mm</td>
                  <td><span className="badge-normal">Normal</span></td>
                </tr>
                <tr>
                  <td>LCx (Circumflex)</td>
                  <td>14%</td>
                  <td>2.80 mm</td>
                  <td>3.25 mm</td>
                  <td><span className="badge-normal">Normal</span></td>
                </tr>
                <tr>
                  <td>RCA (Right Coronary)</td>
                  <td>16%</td>
                  <td>3.10 mm</td>
                  <td>3.68 mm</td>
                  <td><span className="badge-normal">Normal</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Hemodynamic AI Estimation */}
          <div className="hemodynamic-card">
            <div className="hemo-header">
              <span className="hemo-title">Estimated AI-FFR (Fractional Flow Reserve)</span>
              <span className="hemo-score">0.74</span>
            </div>
            <div className="hemo-bar-container">
              <div className="hemo-bar-fill" style={{ width: '74%' }}></div>
              <div className="hemo-threshold-line" title="Ischemia Threshold: 0.80"></div>
            </div>
            <div className="hemo-footer">
              <span className="hemo-status">&lt; 0.80 Hemodynamically Significant Ischemia</span>
              <span className="hemo-confidence">Confidence: {confidenceNum}%</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .results-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .results-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 12px 20px;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .back-link-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          font-family: inherit;
        }

        .back-link-btn:hover {
          text-decoration: underline;
        }

        .patient-tag {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 18px;
          border-left: 1px solid var(--burgundy-border);
        }

        .patient-id-badge {
          background-color: var(--pink-surface);
          color: var(--burgundy-primary);
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-size: 12.5px;
        }

        .patient-meta {
          font-size: 12.5px;
          color: var(--text-muted);
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .verified-btn {
          background-color: #10B981 !important;
        }

        .results-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .viewer-card, .diagnostics-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .card-header-tabs {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
        }

        .card-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .layer-tabs {
          display: flex;
          background: #FAF1F3;
          border-radius: var(--radius-sm);
          padding: 3px;
          gap: 4px;
        }

        .layer-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: transparent;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
        }

        .layer-tab-btn.active {
          background: #FFFFFF;
          color: var(--burgundy-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .diagnostics-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .diag-icon {
          color: var(--burgundy-primary);
        }

        .diag-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
        }

        .diag-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .stenosis-alert-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background-color: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: #991B1B;
        }

        .alert-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .alert-text strong {
          display: block;
          font-size: 13.5px;
          margin-bottom: 3px;
        }

        .alert-text p {
          font-size: 12px;
          line-height: 1.35;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .qca-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .qca-table th {
          text-align: left;
          padding: 10px 12px;
          background-color: #FAF1F3;
          color: var(--text-secondary);
          font-weight: 600;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .qca-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #F3E4E8;
          color: var(--text-main);
        }

        .highlight-row {
          background-color: #FFF8F9;
        }

        .stenosis-badge-danger {
          color: #DC2626;
          font-weight: 700;
        }

        .badge-critical {
          background-color: #FEE2E2;
          color: #DC2626;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 11px;
        }

        .badge-normal {
          background-color: #ECFDF5;
          color: #059669;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 11px;
        }

        .hemodynamic-card {
          background-color: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hemo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hemo-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .hemo-score {
          font-size: 18px;
          font-weight: 800;
          color: #DC2626;
        }

        .hemo-bar-container {
          position: relative;
          height: 10px;
          background: #E5E7EB;
          border-radius: 5px;
          overflow: visible;
        }

        .hemo-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #DC2626, #F59E0B);
          border-radius: 5px;
        }

        .hemo-threshold-line {
          position: absolute;
          left: 80%;
          top: -4px;
          bottom: -4px;
          width: 2px;
          background: #000000;
        }

        .hemo-footer {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted);
        }

        @media (max-width: 1100px) {
          .results-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
