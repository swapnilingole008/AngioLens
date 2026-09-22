import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  Eye, 
  CheckCircle, 
  ArrowLeft, 
  Search, 
  FileText, 
  Calendar, 
  User, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Filter,
  Loader2
} from 'lucide-react';
import angiogramSample from '../assets/images/angiogram-sample.jpg';
import api from '../api';

export default function ReportsPage({ onNavigate }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Default sample/fallback reports
  const defaultReports = [
    {
      analysis_id: 1,
      report_num: 'REPORT #ANG-2026-0001',
      date: 'September 22, 2026',
      patient_id: 'PAT-00123',
      patient_name: 'Ramesh Patel',
      age: 56,
      gender: 'Male',
      referring_physician: 'Dr. Priya Sharma, MD, FACC',
      modality: 'X-Ray Angiography (DICOM)',
      projection_angle: 'LAO Cranial (35° / 20°)',
      indication: 'Unstable Angina, NSTEMI Rule-out',
      vessel: 'Left Anterior Descending (LAD)',
      stenosis: '68%',
      severity: 'Moderate',
      confidence: '92%',
      verified: true,
      doctor_name: 'Dr. Priya Sharma, MD, FACC'
    },
    {
      analysis_id: 2,
      report_num: 'REPORT #ANG-2026-0002',
      date: 'September 21, 2026',
      patient_id: 'PAT-00120',
      patient_name: 'Sunita Rao',
      age: 62,
      gender: 'Female',
      referring_physician: 'Dr. Priya Sharma, MD, FACC',
      modality: 'X-Ray Angiography (DICOM)',
      projection_angle: 'LAO Straight (30° / 0°)',
      indication: 'Exertional Dyspnea, Positive TMT',
      vessel: 'Right Coronary Artery (RCA)',
      stenosis: '85%',
      severity: 'Severe',
      confidence: '95%',
      verified: true,
      doctor_name: 'Dr. Priya Sharma, MD, FACC'
    },
    {
      analysis_id: 3,
      report_num: 'REPORT #ANG-2026-0003',
      date: 'September 19, 2026',
      patient_id: 'PAT-00118',
      patient_name: 'Anil Verma',
      age: 49,
      gender: 'Male',
      referring_physician: 'Dr. Priya Sharma, MD, FACC',
      modality: 'X-Ray Angiography (DICOM)',
      projection_angle: 'RAO Caudal (30° / 30°)',
      indication: 'Atypical Chest Pain',
      vessel: 'Left Circumflex (LCx Distal)',
      stenosis: '35%',
      severity: 'Mild',
      confidence: '88%',
      verified: false,
      doctor_name: 'Dr. Priya Sharma, MD, FACC'
    },
    {
      analysis_id: 4,
      report_num: 'REPORT #ANG-2026-0004',
      date: 'September 18, 2026',
      patient_id: 'PAT-00115',
      patient_name: 'Kavita Menon',
      age: 58,
      gender: 'Female',
      referring_physician: 'Dr. Priya Sharma, MD, FACC',
      modality: 'X-Ray Angiography (DICOM)',
      projection_angle: 'RAO Cranial (30° / 30°)',
      indication: 'Recurrent Angina post-PCI',
      vessel: 'Left Anterior Descending (LAD Mid)',
      stenosis: '72%',
      severity: 'Severe',
      confidence: '94%',
      verified: true,
      doctor_name: 'Dr. Priya Sharma, MD, FACC'
    },
    {
      analysis_id: 5,
      report_num: 'REPORT #ANG-2026-0005',
      date: 'September 16, 2026',
      patient_id: 'PAT-00112',
      patient_name: 'Vikram Singh',
      age: 67,
      gender: 'Male',
      referring_physician: 'Dr. Priya Sharma, MD, FACC',
      modality: 'X-Ray Angiography (DICOM)',
      projection_angle: 'Spider View (LAO 45° / Caudal 30°)',
      indication: 'High-risk NSTE-ACS',
      vessel: 'Left Main (LMCA Bifurcation)',
      stenosis: '45%',
      severity: 'Moderate',
      confidence: '90%',
      verified: false,
      doctor_name: 'Dr. Priya Sharma, MD, FACC'
    }
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchReports = async () => {
      setIsLoading(true);
      let list = [];
      try {
        const res = await api.getReports();
        if (isMounted) {
          if (res?.reports && Array.isArray(res.reports) && res.reports.length > 0) {
            list = res.reports;
            setReportsList(list);
          } else {
            setReportsList([]);
          }
        }
      } catch (err) {
        console.error('Failed to load reports from database:', err);
        if (isMounted) {
          setReportsList([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      // Check if user came from ResultsPage to view this specific patient's report
      const shouldOpenDirect = localStorage.getItem('angiolens_open_report_detail') === 'true';
      const currentAnalysisId = api.getCurrentAnalysisId();

      if (shouldOpenDirect && currentAnalysisId && isMounted) {
        try {
          localStorage.removeItem('angiolens_open_report_detail');
        } catch {}

        const matched = list.find(r => String(r.analysis_id) === String(currentAnalysisId));
        if (matched) {
          setSelectedReport(matched);
          setViewMode('detail');
        } else {
          try {
            const single = await api.getReport(currentAnalysisId);
            if (single?.report && isMounted) {
              setSelectedReport(single.report);
              setViewMode('detail');
            }
          } catch {}
        }
      }
    };
    fetchReports();
    return () => { isMounted = false; };
  }, []);

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadReport = (report) => {
    setSelectedReport(report);
    setViewMode('detail');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleViewSample = () => {
    const sample = defaultReports[0];
    setSelectedReport(sample);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentReport = selectedReport || defaultReports[0];

  const filteredReports = reportsList.filter((r) => {
    const matchesSearch = 
      (r.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.patient_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.report_num || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.vessel || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'verified') return matchesSearch && r.verified;
    if (filter === 'severe') return matchesSearch && r.severity === 'Severe';
    if (filter === 'moderate') return matchesSearch && r.severity === 'Moderate';
    return matchesSearch;
  });

  return (
    <div className="reports-page-container">
      {/* MODE 1: REPORTS LIST CATALOG */}
      {viewMode === 'list' && (
        <div className="reports-catalog-view">
          {/* Header */}
          <div className="catalog-header">
            <div>
              <h1 className="catalog-title">Doctor's Clinical Reports</h1>
              <p className="catalog-sub">
                Comprehensive archive of coronary angiogram analyses generated and verified by Dr. Priya Sharma
              </p>
            </div>

            {/* Search & Filter */}
            <div className="catalog-controls">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by Patient Name, ID, or Vessel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-pill-group">
                {['all', 'verified', 'severe', 'moderate'].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reports Table Card */}
          <div className="angio-card reports-table-card">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Report ID & Date</th>
                  <th>Patient Details</th>
                  <th>Culprit Vessel</th>
                  <th>Stenosis / Severity</th>
                  <th>Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="reports-empty-cell">
                      <div className="reports-loading-container">
                        <Loader2 size={26} className="reports-spinner" />
                        <span className="reports-loading-title">Loading clinical reports from database...</span>
                        <span className="reports-loading-sub">Fetching verified patient reports from PostgreSQL</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="reports-empty-cell">
                      <div className="reports-empty-container">
                        <FileText size={36} className="reports-empty-icon" />
                        <span className="reports-empty-title">No patient reports found</span>
                        <span className="reports-empty-sub">
                          {searchTerm || filter !== 'all'
                            ? 'No reports match your search query or filter. Try clearing filters.'
                            : 'No clinical reports exist in the database yet.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r, idx) => (
                    <tr key={idx} className="report-table-row">
                      <td>
                        <div className="report-id-cell">
                          <span className="report-code">{r.report_num}</span>
                          <span className="report-date-text">{r.date}</span>
                        </div>
                      </td>
                      <td>
                        <div className="patient-cell">
                          <span className="patient-name">{r.patient_name}</span>
                          <span className="patient-meta-badge">
                            <strong>{r.patient_id}</strong> • {r.age} Y / {r.gender}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="vessel-tag">{r.vessel}</span>
                      </td>
                      <td>
                        <div className="stenosis-badge-cell">
                          <span className={`stenosis-val ${r.severity?.toLowerCase() || 'moderate'}`}>
                            {r.stenosis}
                          </span>
                          <span className={`severity-tag ${r.severity?.toLowerCase() || 'moderate'}`}>
                            {r.severity || 'Moderate'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {r.verified ? (
                          <span className="status-tag verified">Verified ✓</span>
                        ) : (
                          <span className="status-tag pending">Pending</span>
                        )}
                      </td>
                      <td className="td-actions">
                        <div className="action-buttons-group">
                          <button 
                            className="btn-view-report" 
                            onClick={() => handleViewReport(r)}
                            title="View complete clinical report"
                          >
                            <Eye size={14} />
                            <span>View Report</span>
                          </button>
                          <button 
                            className="btn-download-report" 
                            onClick={() => handleDownloadReport(r)}
                            title="Download and print report PDF"
                          >
                            <Download size={14} />
                            <span>Download Report</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sample Report Preview Banner Card */}
          <div className="angio-card sample-report-banner">
            <div className="sample-banner-left">
              <div className="sample-icon-wrap">
                <Sparkles size={24} />
              </div>
              <div className="sample-text-wrap">
                <h3 className="sample-title">Official AngioLens Clinical Report Format</h3>
                <p className="sample-desc">
                  Preview how our standardized decision-support report presents annotated DICOM keyframes, sub-millimeter QCA calibers, AI-FFR hemodynamics, and physician verification stamps.
                </p>
              </div>
            </div>

            <div className="sample-banner-actions">
              <button className="btn-burgundy view-sample-btn" onClick={handleViewSample}>
                <FileText size={16} />
                <span>View Sample Report File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DETAILED OFFICIAL CLINICAL REPORT SHEET */}
      {viewMode === 'detail' && (
        <div className="report-detail-view">
          {/* Top Action Controls */}
          <div className="report-action-bar">
            <button className="back-btn" onClick={() => setViewMode('list')}>
              <ArrowLeft size={16} />
              <span>← Back to All Reports</span>
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
                <span className="report-num">{currentReport.report_num}</span>
                <span className="report-date">Date: {currentReport.date}</span>
              </div>
            </div>

            <hr className="report-divider" />

            {/* Patient Demographics Matrix */}
            <div className="demographics-grid">
              <div className="demo-item">
                <span className="demo-label">Patient Name:</span>
                <span className="demo-val highlight-name">{currentReport.patient_name}</span>
              </div>
              <div className="demo-item">
                <span className="demo-label">Patient ID:</span>
                <span className="demo-val">{currentReport.patient_id}</span>
              </div>
              <div className="demo-item">
                <span className="demo-label">Age / Gender:</span>
                <span className="demo-val">{currentReport.age} Y / {currentReport.gender}</span>
              </div>
              <div className="demo-item">
                <span className="demo-label">Referring Physician:</span>
                <span className="demo-val">{currentReport.referring_physician || currentReport.doctor_name}</span>
              </div>
              <div className="demo-item">
                <span className="demo-label">Modality:</span>
                <span className="demo-val">{currentReport.modality || 'X-Ray Angiography (DICOM)'}</span>
              </div>
              <div className="demo-item">
                <span className="demo-label">Projection Angle:</span>
                <span className="demo-val">{currentReport.projection_angle || 'LAO Cranial (35° / 20°)'}</span>
              </div>
              <div className="demo-item" style={{ gridColumn: 'span 3' }}>
                <span className="demo-label">Clinical Indication:</span>
                <span className="demo-val">{currentReport.indication || 'Suspected Coronary Artery Disease / Angina Evaluation'}</span>
              </div>
            </div>

            {/* Key Annotated Frame & Metrics */}
            <div className="report-visual-row">
              <div className="report-image-box">
                <img src={angiogramSample} alt="Keyframe Analysis" className="keyframe-img" />
                <div className="keyframe-caption">
                  Key Frame #42: {currentReport.vessel} ({currentReport.stenosis} Stenosis)
                </div>
              </div>

              <div className="report-key-metrics">
                <h3 className="section-title">Quantitative AI Findings</h3>
                <div className="metric-pill danger">
                  <span className="label">Culprit Vessel:</span>
                  <span className="val">{currentReport.vessel}</span>
                </div>
                <div className="metric-pill danger">
                  <span className="label">Lesion Location:</span>
                  <span className="val">Proximal / Mid Focal Segment</span>
                </div>
                <div className="metric-pill danger">
                  <span className="label">Diameter Stenosis:</span>
                  <span className="val">{currentReport.stenosis} ({currentReport.severity || 'Moderate-to-Severe'})</span>
                </div>
                <div className="metric-pill warning">
                  <span className="label">Estimated AI-FFR:</span>
                  <span className="val">0.74 (Physiologically Significant)</span>
                </div>
                <div className="metric-pill success">
                  <span className="label">Analysis Confidence:</span>
                  <span className="val">{currentReport.confidence} (High Reliability)</span>
                </div>
              </div>
            </div>

            {/* Findings Narrative */}
            <div className="narrative-section">
              <h3 className="section-title">Clinical Impression & Assessment</h3>
              <p className="narrative-p">
                Selective coronary angiography was performed via standard radial approach. Right coronary circulation and Left Main Coronary Artery (LMCA) are patent without critical flow-limiting lesions.
              </p>
              <p className="narrative-p">
                In the <strong>{currentReport.vessel}</strong>, automated QCA vessel segmentation detects a focal <strong>{currentReport.stenosis}</strong> narrowing. Hemodynamic simulation estimates a fractional flow reserve of 0.74, suggesting physiologically significant ischemia in the anterior myocardial territory.
              </p>
            </div>

            {/* Doctor Signature & Legal Notice */}
            <div className="signature-footer">
              <div className="legal-disclaimer">
                <strong>Clinical Decision Support Disclaimer:</strong> This report is generated with AngioLens AI assistance for clinical decision support. The attending cardiologist retains sole clinical authority and responsibility for diagnostic conclusions and procedural intervention decisions.
              </div>

              <div className="signature-block">
                <div className="sig-line">{currentReport.doctor_name || 'Dr. Priya Sharma, MD, FACC'}</div>
                <div className="sig-role">Attending Interventional Cardiologist</div>
                <div className="sig-badge">
                  <CheckCircle size={14} color={currentReport.verified ? "#10B981" : "#D97706"} />
                  <span>{currentReport.verified ? "Electronically Verified" : "Pending Verification"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reports-page-container {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeIn 0.3s ease-out;
        }

        /* Catalog View Styles */
        .catalog-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
        }

        .catalog-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .catalog-sub {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .catalog-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          width: 300px;
        }

        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 13px;
          padding-left: 8px;
          font-family: inherit;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .filter-pill-group {
          display: flex;
          gap: 6px;
          background: #F8EDF0;
          padding: 3px;
          border-radius: var(--radius-pill);
        }

        .filter-pill {
          border: none;
          background: transparent;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .filter-pill.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        /* Reports Table */
        .reports-table-card {
          padding: 0;
          overflow: hidden;
        }

        .reports-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .reports-table th {
          text-align: left;
          padding: 14px 18px;
          background-color: #FAF1F3;
          color: var(--text-secondary);
          font-weight: 700;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .reports-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F6E2E7;
          vertical-align: middle;
        }

        .reports-empty-cell {
          text-align: center;
          padding: 56px 20px !important;
          background: #FFFFFF;
        }

        .reports-loading-container,
        .reports-empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .reports-spinner {
          color: var(--burgundy-primary);
          animation: spinReports 1s linear infinite;
        }

        @keyframes spinReports {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .reports-loading-title,
        .reports-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }

        .reports-loading-sub,
        .reports-empty-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          max-width: 380px;
          line-height: 1.4;
        }

        .reports-empty-icon {
          color: var(--burgundy-primary);
          opacity: 0.4;
          margin-bottom: 4px;
        }

        .report-table-row:hover {
          background-color: #FFF9FA;
        }

        .report-id-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .report-code {
          font-weight: 700;
          color: var(--text-main);
          font-size: 13px;
        }

        .report-date-text {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .patient-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .patient-name {
          font-weight: 700;
          color: var(--text-main);
          font-size: 13.5px;
        }

        .patient-meta-badge {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .patient-meta-badge strong {
          color: var(--burgundy-primary);
        }

        .vessel-tag {
          font-weight: 600;
          font-size: 12.5px;
          color: var(--text-main);
        }

        .stenosis-badge-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stenosis-val {
          font-weight: 800;
          font-size: 13.5px;
        }

        .stenosis-val.severe { color: #DC2626; }
        .stenosis-val.moderate { color: var(--burgundy-primary); }
        .stenosis-val.mild { color: #059669; }

        .severity-tag {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .severity-tag.severe { background: #FEE2E2; color: #DC2626; }
        .severity-tag.moderate { background: var(--pink-surface); color: var(--burgundy-primary); }
        .severity-tag.mild { background: #ECFDF5; color: #059669; }

        .status-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .status-tag.verified { background: #ECFDF5; color: #059669; }
        .status-tag.pending { background: #FFFBEB; color: #D97706; }

        .th-actions {
          text-align: right;
        }

        .td-actions {
          text-align: right;
        }

        .action-buttons-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-view-report {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--pink-surface);
          border: 1px solid var(--burgundy-border);
          color: var(--burgundy-primary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .btn-view-report:hover {
          background-color: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .btn-download-report {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          border: 1px solid #D0D5DD;
          color: #344054;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .btn-download-report:hover {
          border-color: var(--burgundy-primary);
          color: var(--burgundy-primary);
        }

        /* Sample Report Banner */
        .sample-report-banner {
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #FFFFFF 0%, #FFF5F7 100%);
          border: 1.5px solid var(--burgundy-border);
        }

        .sample-banner-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sample-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--pink-surface);
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sample-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.2px;
        }

        .sample-desc {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 3px;
          max-width: 650px;
          line-height: 1.4;
        }

        .view-sample-btn {
          padding: 10px 18px;
          white-space: nowrap;
        }

        /* Detail View Styles */
        .report-detail-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
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
          font-weight: 700;
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

        .highlight-name {
          color: var(--burgundy-primary);
          font-size: 14px;
          font-weight: 700;
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

        @media (max-width: 960px) {
          .sample-report-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .demographics-grid {
            grid-template-columns: 1fr;
          }
          .report-visual-row {
            grid-template-columns: 1fr;
          }
          .action-buttons-group {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
