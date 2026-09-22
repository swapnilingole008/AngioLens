import React, { useState, useEffect } from 'react';
import { Printer, Download, Share2, CheckCircle, ArrowLeft } from 'lucide-react';
import angiogramSample from '../assets/images/angiogram-sample.jpg';
import api from '../api';

export default function ReportsPage({ onNavigate }) {
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const id = api.getCurrentAnalysisId();
        const res = await api.getReport(id);
        if (res?.report) {
          setReportData(res.report);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      }
    };
    loadReport();
  }, []);

  const reportNum = reportData?.report_num || 'REPORT #ANG-2026-0984';
  const reportDate = reportData?.date ? `Date: ${reportData.date}` : 'Date: September 21, 2026';
  const patientId = reportData?.patient_id || 'PAT-00123';
  const ageGender = `${reportData?.age || 56} Y / ${reportData?.gender || 'Male'}`;
  const physician = reportData?.referring_physician || 'Dr. Sharma, MD';
  const culpritVessel = reportData?.vessel || 'Left Anterior Descending (LAD)';
  const stenosis = reportData?.stenosis || '68%';
  const confidence = reportData?.confidence || '92%';
  const verified = reportData?.verified !== undefined ? reportData.verified : true;
  const doctorName = reportData?.doctor_name || 'Dr. Sharma, MD, FACC';

  return (
    <div className="reports-page-container">
      {/* Top Action Controls */}
      <div className="report-action-bar">
        <button className="back-btn" onClick={() => onNavigate('/dashboard')}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="report-btn-group">
          <button className="btn-outline-burgundy" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Print Report</span>
          </button>
          <button className="btn-burgundy" onClick={() => window.print()}>
            <Download size={15} />
            <span>Download Official PDF</span>
          </button>
        </div>
      </div>

      {/* Official Clinical Report Paper */}
      <div className="official-report-sheet">
        {/* Hospital & Lab Header */}
        <div className="report-sheet-header">
          <div className="header-clinic-meta">
            <h1 className="clinic-title">ANGIOLENS CARDIOLOGY CENTER</h1>
            <p className="clinic-sub">AI-Assisted Coronary Angiogram Analysis Report</p>
            <p className="clinic-loc">Department of Interventional Cardiology • Cath Lab 2</p>
          </div>
          <div className="report-id-box">
            <span className="report-num">{reportNum}</span>
            <span className="report-date">{reportDate}</span>
          </div>
        </div>

        <hr className="report-divider" />

        {/* Patient Demographics Matrix */}
        <div className="demographics-grid">
          <div className="demo-item">
            <span className="demo-label">Patient ID:</span>
            <span className="demo-val">{patientId}</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Age / Gender:</span>
            <span className="demo-val">{ageGender}</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Referring Physician:</span>
            <span className="demo-val">{physician}</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Modality:</span>
            <span className="demo-val">X-Ray Angiography (DICOM)</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Projection Angle:</span>
            <span className="demo-val">LAO Cranial (35° / 20°)</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Indication:</span>
            <span className="demo-val">Unstable Angina, NSTEMI Rule-out</span>
          </div>
        </div>

        {/* Key Annotated Frame & Metrics */}
        <div className="report-visual-row">
          <div className="report-image-box">
            <img src={angiogramSample} alt="Keyframe Analysis" className="keyframe-img" />
            <div className="keyframe-caption">
              Key Frame #42: Proximal LAD Stenosis (68%) Identified
            </div>
          </div>

          <div className="report-key-metrics">
            <h3 className="section-title">Quantitative AI Findings</h3>
            <div className="metric-pill danger">
              <span className="label">Culprit Vessel:</span>
              <span className="val">{culpritVessel}</span>
            </div>
            <div className="metric-pill danger">
              <span className="label">Lesion Location:</span>
              <span className="val">Proximal Segment</span>
            </div>
            <div className="metric-pill danger">
              <span className="label">Diameter Stenosis:</span>
              <span className="val">{stenosis} (Moderate-to-Severe)</span>
            </div>
            <div className="metric-pill warning">
              <span className="label">Estimated AI-FFR:</span>
              <span className="val">0.74 (Physiologically Significant)</span>
            </div>
            <div className="metric-pill success">
              <span className="label">Analysis Confidence:</span>
              <span className="val">{confidence} (High Reliability)</span>
            </div>
          </div>
        </div>

        {/* Findings Narrative */}
        <div className="narrative-section">
          <h3 className="section-title">Clinical Impression & Assessment</h3>
          <p className="narrative-p">
            Selective coronary angiography demonstrates dominant right coronary circulation. The Left Main Coronary Artery (LMCA) is widely patent without critical narrowing.
          </p>
          <p className="narrative-p">
            In the <strong>proximal segment of the Left Anterior Descending (LAD)</strong>, computer-assisted QCA analysis reveals a focal {stenosis} eccentric luminal narrowing. Hemodynamic simulation estimates a fractional flow reserve of 0.74, suggesting ischemia in the anterior myocardial territory. Left Circumflex (LCx) and Right Coronary Artery (RCA) show minimal non-obstructive disease (&lt;20%).
          </p>
        </div>

        {/* Doctor Signature & Legal Notice */}
        <div className="signature-footer">
          <div className="legal-disclaimer">
            <strong>Clinical Decision Support Disclaimer:</strong> This report is generated with AngioLens AI assistance for clinical decision support. The attending cardiologist retains sole clinical authority and responsibility for diagnostic conclusions and procedural intervention decisions.
          </div>

          <div className="signature-block">
            <div className="sig-line">{doctorName}</div>
            <div className="sig-role">Attending Interventional Cardiologist</div>
            <div className="sig-badge">
              <CheckCircle size={14} color={verified ? "#10B981" : "#D97706"} />
              <span>{verified ? "Electronically Verified" : "Pending Verification"}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .reports-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
          animation: fadeIn 0.3s ease-out;
        }

        .report-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }

        .report-btn-group {
          display: flex;
          gap: 12px;
        }

        .official-report-sheet {
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-lg);
          padding: 40px;
          box-shadow: var(--card-shadow);
        }

        .report-sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .clinic-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--burgundy-primary);
          letter-spacing: -0.3px;
        }

        .clinic-sub {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        .clinic-loc {
          font-size: 12px;
          color: var(--text-muted);
        }

        .report-id-box {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .report-num {
          font-weight: 700;
          color: var(--text-main);
          font-size: 13.5px;
        }

        .report-date {
          font-size: 12px;
          color: var(--text-muted);
        }

        .report-divider {
          border: none;
          border-top: 1.5px solid var(--burgundy-border);
          margin: 20px 0;
        }

        .demographics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px 20px;
          background: #FAF1F3;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .demo-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .demo-label {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-muted);
        }

        .demo-val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }

        .report-visual-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .report-image-box {
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: #000000;
        }

        .keyframe-img {
          width: 100%;
          height: 240px;
          object-fit: cover;
          display: block;
        }

        .keyframe-caption {
          background: #FAF1F3;
          padding: 8px 12px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--burgundy-primary);
          text-align: center;
        }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 12px;
        }

        .report-key-metrics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric-pill {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12.5px;
          background: #FAF1F3;
        }

        .metric-pill.danger {
          background: #FEF2F2;
          color: #991B1B;
        }

        .metric-pill.warning {
          background: #FFFBEB;
          color: #92400E;
        }

        .metric-pill.success {
          background: #ECFDF5;
          color: #065F46;
        }

        .metric-pill .val {
          font-weight: 700;
        }

        .narrative-section {
          margin-bottom: 28px;
        }

        .narrative-p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .signature-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
          gap: 40px;
        }

        .legal-disclaimer {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
          max-width: 540px;
        }

        .signature-block {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sig-line {
          font-family: var(--font-script);
          font-size: 26px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .sig-role {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .sig-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
          font-size: 11px;
          color: #10B981;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
