import React from 'react';
import { BookOpen, ExternalLink, HelpCircle, ShieldAlert, Cpu } from 'lucide-react';

export default function ResourcesPage() {
  const guides = [
    {
      title: 'CAD-RADS™ 2.0 Clinical Reference',
      category: 'Diagnostic Standard',
      desc: 'Standardized classification guidelines for coronary stenosis grading, plaque burden, and clinical recommendations.',
      readTime: '6 min read'
    },
    {
      title: 'AHA 16-Segment Coronary Tree Anatomy',
      category: 'Anatomical Guide',
      desc: 'American Heart Association anatomical vessel segmentation map for LAD, LCx, and RCA branches.',
      readTime: '8 min read'
    },
    {
      title: 'DICOM Calibration & QCA Protocols',
      category: 'Imaging Quality',
      desc: 'Cath lab catheter pixel-spacing calibration guidelines for sub-millimeter lumen measurement accuracy.',
      readTime: '4 min read'
    },
    {
      title: 'AI Decision Support: The 4-Step Pipeline',
      category: 'AI Methodology',
      desc: 'Detect → Measure → Explain → Verify: Detailed walk-through of AngioLens multi-task deep neural network.',
      readTime: '10 min read'
    }
  ];

  return (
    <div className="resources-page-container">
      {/* Header */}
      <div className="resources-header">
        <h1 className="resources-title">Clinical & Technical Resources</h1>
        <p className="resources-sub">Cardiology guidelines, anatomical references, and AI interpretation protocols</p>
      </div>

      {/* Guide Cards Grid */}
      <div className="guides-grid">
        {guides.map((g, idx) => (
          <div key={idx} className="angio-card guide-card">
            <span className="guide-category">{g.category}</span>
            <h3 className="guide-title">{g.title}</h3>
            <p className="guide-desc">{g.desc}</p>
            <div className="guide-footer">
              <span className="read-time">{g.readTime}</span>
              <button className="read-btn">
                <span>Read Reference</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CAD-RADS Quick Reference Table Card */}
      <div className="angio-card reference-table-card">
        <div className="card-header-row">
          <BookOpen size={20} className="header-icon" />
          <h2 className="card-title">CAD-RADS Stenosis Severity Classification Scale</h2>
        </div>

        <table className="cadrads-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Max Stenosis</th>
              <th>Interpretation</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="code-pill">CAD-RADS 0</span></td>
              <td>0%</td>
              <td>Absence of CAD</td>
              <td>Reassurance; risk factor modification</td>
            </tr>
            <tr>
              <td><span className="code-pill">CAD-RADS 1</span></td>
              <td>1% - 24%</td>
              <td>Minimal non-obstructive CAD</td>
              <td>Preventive medical therapy</td>
            </tr>
            <tr>
              <td><span className="code-pill">CAD-RADS 2</span></td>
              <td>25% - 49%</td>
              <td>Mild non-obstructive CAD</td>
              <td>Aggressive risk factor management</td>
            </tr>
            <tr className="highlight-target">
              <td><span className="code-pill active">CAD-RADS 3</span></td>
              <td><strong>50% - 69%</strong></td>
              <td><strong>Moderate Stenosis (e.g. 68% in LAD)</strong></td>
              <td><strong>Physiologic assessment (FFR / iFR) or functional testing</strong></td>
            </tr>
            <tr>
              <td><span className="code-pill severe">CAD-RADS 4</span></td>
              <td>70% - 99%</td>
              <td>Severe Stenosis</td>
              <td>Invasive coronary angiography; consider revascularization</td>
            </tr>
            <tr>
              <td><span className="code-pill occluded">CAD-RADS 5</span></td>
              <td>100%</td>
              <td>Total Coronary Occlusion</td>
              <td>CTO evaluation or acute intervention protocol</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`
        .resources-page-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fadeIn 0.3s ease-out;
        }

        .resources-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .resources-sub {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .guides-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .guide-card {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .guide-category {
          font-size: 11px;
          font-weight: 700;
          color: var(--burgundy-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .guide-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
        }

        .guide-desc {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.45;
          flex: 1;
        }

        .guide-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #F6E2E7;
          margin-top: 8px;
        }

        .read-time {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .read-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
        }

        .reference-table-card {
          padding: 24px;
        }

        .card-header-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .header-icon {
          color: var(--burgundy-primary);
        }

        .cadrads-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .cadrads-table th {
          text-align: left;
          padding: 12px 14px;
          background-color: #FAF1F3;
          color: var(--text-secondary);
          font-weight: 700;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .cadrads-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F6E2E7;
        }

        .code-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          background: #EEF2F6;
          color: #334155;
        }

        .code-pill.active {
          background: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .code-pill.severe {
          background: #FEE2E2;
          color: #DC2626;
        }

        .code-pill.occluded {
          background: #181E29;
          color: #FFFFFF;
        }

        .highlight-target {
          background-color: #FFF8F9;
        }

        @media (max-width: 900px) {
          .guides-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
