import React, { useState } from 'react';
import { 
  BookOpen, 
  Activity, 
  Calculator, 
  Layers, 
  ExternalLink, 
  Heart, 
  Compass, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Sliders,
  FileCheck
} from 'lucide-react';

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('anatomy'); // 'anatomy' | 'calculator' | 'cadrads' | 'guidelines'
  const [selectedVessel, setSelectedVessel] = useState('LAD');

  // Real-time calculator state
  const [rvd, setRvd] = useState(3.2); // Reference Vessel Diameter (mm)
  const [mld, setMld] = useState(1.0); // Minimal Lumen Diameter (mm)

  // Calculate stenosis percentage
  const stenosisPercent = Math.max(0, Math.min(100, Math.round(((rvd - mld) / rvd) * 100)));

  // Calculate CAD-RADS grade
  const getCadRadsGrade = (percent) => {
    if (percent === 0) return { grade: 'CAD-RADS 0', label: 'Absence of CAD (0%)', severity: 'None', ffr: '> 0.95', rec: 'No further cardiac workup; risk factor modification.' };
    if (percent <= 24) return { grade: 'CAD-RADS 1', label: 'Minimal Non-Obstructive (1-24%)', severity: 'Minimal', ffr: '0.90 - 0.95', rec: 'Preventive medical therapy & lifestyle optimization.' };
    if (percent <= 49) return { grade: 'CAD-RADS 2', label: 'Mild Non-Obstructive (25-49%)', severity: 'Mild', ffr: '0.85 - 0.90', rec: 'Aggressive medical therapy; statins and antiplatelets as indicated.' };
    if (percent <= 69) return { grade: 'CAD-RADS 3', label: 'Moderate Stenosis (50-69%)', severity: 'Moderate', ffr: '0.75 - 0.82', rec: 'Physiologic assessment (FFR / iFR) or functional ischemia testing recommended.' };
    if (percent <= 99) return { grade: 'CAD-RADS 4', label: 'Severe Stenosis (70-99%)', severity: 'Severe', ffr: '< 0.75', rec: 'Invasive coronary angiography; consider percutaneous coronary intervention (PCI) or CABG.' };
    return { grade: 'CAD-RADS 5', label: 'Total Occlusion (100%)', severity: 'Occluded', ffr: '0.00', rec: 'Chronic total occlusion (CTO) protocol or urgent revascularization if acute.' };
  };

  const cadradsResult = getCadRadsGrade(stenosisPercent);

  // Vessel Database
  const vesselData = {
    LAD: {
      name: 'Left Anterior Descending Artery (LAD)',
      alias: 'Anterior Interventricular Artery ("The Widowmaker")',
      segments: [
        { code: 'Seg 6', name: 'Proximal LAD', normalCaliber: '3.5 - 4.5 mm', landmark: 'From LMCA bifurcation to 1st major septal perforator' },
        { code: 'Seg 7', name: 'Mid LAD', normalCaliber: '2.8 - 3.5 mm', landmark: 'From 1st septal to origin of 2nd diagonal branch' },
        { code: 'Seg 8', name: 'Distal LAD', normalCaliber: '2.0 - 2.8 mm', landmark: 'Beyond 2nd diagonal to apex and wrapping around apical notch' },
        { code: 'Seg 9/10', name: 'Diagonal Branches (D1, D2)', normalCaliber: '1.8 - 2.5 mm', landmark: 'Course along anterolateral wall of left ventricle' }
      ],
      territory: 'Anterolateral wall, apex of the heart, and anterior two-thirds of the interventricular septum (45-55% of LV myocardial mass).',
      hemodynamicRisk: 'Critical - Highest mortality impact if proximal occlusion occurs.',
      projectionAngles: [
        { view: 'RAO Cranial (30° / 30°)', desc: 'Best for Proximal & Mid LAD bifurcation and diagonal takeoffs' },
        { view: 'LAO Cranial (45° / 30°)', desc: 'Unravels Mid & Distal LAD free of diagonal overlap' },
        { view: 'AP Cranial (0° / 35°)', desc: 'Optimal overview of main LAD length and septal perforators' }
      ]
    },
    LCx: {
      name: 'Left Circumflex Artery (LCx)',
      alias: 'Circumflex Branch of Left Coronary Artery',
      segments: [
        { code: 'Seg 11', name: 'Proximal LCx', normalCaliber: '3.0 - 4.0 mm', landmark: 'From LMCA bifurcation to 1st obtuse marginal (OM1)' },
        { code: 'Seg 13', name: 'Mid & Distal LCx', normalCaliber: '2.2 - 3.0 mm', landmark: 'Courses in left atrioventricular groove towards crux' },
        { code: 'Seg 12/14', name: 'Obtuse Marginals (OM1, OM2)', normalCaliber: '2.0 - 2.8 mm', landmark: 'Supply the free lateral wall of the left ventricle' }
      ],
      territory: 'Posterolateral and lateral walls of the left ventricle, left atrium, and in left-dominant systems (10-15%), the inferior wall and AV node.',
      hemodynamicRisk: 'Moderate to High - Can present with subtle ECG changes ("silent" lateral ischemia).',
      projectionAngles: [
        { view: 'LAO Caudal / Spider (45° / 30°)', desc: 'Crucial for LMCA bifurcation and proximal LCx origin' },
        { view: 'RAO Caudal (30° / 30°)', desc: 'Profiles main LCx body and Obtuse Marginal branch takeoffs' }
      ]
    },
    RCA: {
      name: 'Right Coronary Artery (RCA)',
      alias: 'Right Main Coronary Artery',
      segments: [
        { code: 'Seg 1', name: 'Proximal RCA', normalCaliber: '3.5 - 4.5 mm', landmark: 'From right aortic sinus to first acute angle' },
        { code: 'Seg 2', name: 'Mid RCA', normalCaliber: '3.0 - 3.8 mm', landmark: 'Vertical segment in right atrioventricular sulcus' },
        { code: 'Seg 3', name: 'Distal RCA', normalCaliber: '2.8 - 3.5 mm', landmark: 'From acute margin to crux of the heart' },
        { code: 'Seg 4', name: 'PDA (Posterior Descending)', normalCaliber: '2.2 - 3.0 mm', landmark: 'Courses in posterior interventricular groove (90% right dominance)' }
      ],
      territory: 'Right ventricle, inferior wall of left ventricle, posterior 1/3 of interventricular septum, sinoatrial (SA) node (60%), and AV node (90%).',
      hemodynamicRisk: 'High - Often causes inferior STEMI, complete heart block, or bradyarrhythmias.',
      projectionAngles: [
        { view: 'LAO Straight (30° / 0°)', desc: 'Profiles the entire "C-shaped" course of the RCA' },
        { view: 'RAO Straight (30° / 0°)', desc: 'Separates the Mid RCA and Acute Marginal branch' },
        { view: 'AP Cranial (0° / 30°)', desc: 'Profiles the RCA bifurcation into PDA and PLB at the crux' }
      ]
    },
    LMCA: {
      name: 'Left Main Coronary Artery (LMCA)',
      alias: 'Main Trunk of Left Coronary System',
      segments: [
        { code: 'Seg 5', name: 'Ostium & Body of LMCA', normalCaliber: '4.5 - 5.5 mm', landmark: 'Arises from left aortic sinus to bifurcation into LAD & LCx' }
      ],
      territory: 'Entire left ventricular myocardium (approx. 75-80% of total cardiac perfusion).',
      hemodynamicRisk: 'Extremely Critical - >50% LMCA stenosis is a Class I indication for urgent CABG or high-risk PCI.',
      projectionAngles: [
        { view: 'LAO Caudal / Spider (45° / 30°)', desc: 'Standard gold standard for LMCA bifurcation and LAD/LCx ostia' },
        { view: 'AP Caudal (0° / 30°)', desc: 'Excellent for LMCA ostial and mid-body lesions' }
      ]
    }
  };

  const selectedData = vesselData[selectedVessel];

  return (
    <div className="resources-page-container">
      {/* Top Header */}
      <div className="resources-header">
        <div>
          <h1 className="resources-title">Real-Time Coronary Vessel Resources</h1>
          <p className="resources-sub">
            Interactive anatomical maps, live QCA stenosis calculator, and clinical decision guidelines
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="resources-tab-nav">
          <button 
            className={`res-tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`}
            onClick={() => setActiveTab('anatomy')}
          >
            <Compass size={16} />
            <span>Coronary Anatomy Map</span>
          </button>
          <button 
            className={`res-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            <Calculator size={16} />
            <span>Live Stenosis Calculator</span>
          </button>
          <button 
            className={`res-tab-btn ${activeTab === 'cadrads' ? 'active' : ''}`}
            onClick={() => setActiveTab('cadrads')}
          >
            <Activity size={16} />
            <span>CAD-RADS 2.0 Scale</span>
          </button>
          <button 
            className={`res-tab-btn ${activeTab === 'guidelines' ? 'active' : ''}`}
            onClick={() => setActiveTab('guidelines')}
          >
            <BookOpen size={16} />
            <span>Clinical Protocols</span>
          </button>
        </div>
      </div>

      {/* 1. Interactive Coronary Anatomy Explorer Tab */}
      {activeTab === 'anatomy' && (
        <div className="tab-content-wrapper">
          {/* Vessel Selector Pills */}
          <div className="vessel-selector-row">
            {Object.keys(vesselData).map((vKey) => (
              <button
                key={vKey}
                className={`vessel-pill-btn ${selectedVessel === vKey ? 'active' : ''}`}
                onClick={() => setSelectedVessel(vKey)}
              >
                <span className="vessel-code">{vKey}</span>
                <span className="vessel-short-name">
                  {vKey === 'LAD' ? 'Left Anterior Descending' : vKey === 'LCx' ? 'Left Circumflex' : vKey === 'RCA' ? 'Right Coronary' : 'Left Main Trunk'}
                </span>
              </button>
            ))}
          </div>

          {/* Selected Vessel Detailed Profile Card */}
          <div className="angio-card vessel-detail-card">
            <div className="vessel-header-row">
              <div className="vessel-title-wrap">
                <span className="badge-vessel-code">{selectedVessel}</span>
                <div>
                  <h2 className="vessel-full-title">{selectedData.name}</h2>
                  <p className="vessel-alias-text">{selectedData.alias}</p>
                </div>
              </div>
              <div className="vessel-risk-tag">
                <AlertTriangle size={15} />
                <span>{selectedData.hemodynamicRisk}</span>
              </div>
            </div>

            <div className="vessel-grid-details">
              {/* Segments & Normal Diameters */}
              <div className="detail-section">
                <h3 className="section-subtitle">
                  <Layers size={16} />
                  <span>AHA 16-Segment Anatomy & Standard Calibers</span>
                </h3>
                <div className="segment-list">
                  {selectedData.segments.map((seg, idx) => (
                    <div key={idx} className="segment-item">
                      <div className="seg-top">
                        <span className="seg-code">{seg.code}</span>
                        <span className="seg-name">{seg.name}</span>
                        <span className="seg-caliber">Norm: {seg.normalCaliber}</span>
                      </div>
                      <p className="seg-landmark">{seg.landmark}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Territory & Angiographic Projections */}
              <div className="detail-section right-col">
                <div className="territory-box">
                  <h4 className="box-title">
                    <Heart size={15} />
                    <span>Myocardial Territory Perfused</span>
                  </h4>
                  <p className="box-desc">{selectedData.territory}</p>
                </div>

                <div className="projections-box">
                  <h4 className="box-title">
                    <Compass size={15} />
                    <span>Recommended Cath Lab C-Arm Projections</span>
                  </h4>
                  <div className="projections-list">
                    {selectedData.projectionAngles.map((proj, idx) => (
                      <div key={idx} className="proj-item">
                        <span className="proj-view">{proj.view}</span>
                        <span className="proj-desc">{proj.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Real-Time Stenosis & CAD-RADS Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="tab-content-wrapper">
          <div className="calc-grid-layout">
            {/* Left: Input Controls */}
            <div className="angio-card calc-input-card">
              <div className="calc-card-header">
                <Sliders size={20} className="calc-icon" />
                <div>
                  <h3 className="calc-title">Quantitative Coronary Analysis (QCA) Sizing</h3>
                  <p className="calc-sub">Adjust lumen metrics in real-time to compute stenosis severity</p>
                </div>
              </div>

              <div className="calc-inputs-body">
                {/* RVD Slider */}
                <div className="calc-input-group">
                  <div className="input-label-row">
                    <label>Reference Vessel Diameter (RVD)</label>
                    <span className="input-val-badge">{rvd.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="5.5"
                    step="0.1"
                    value={rvd}
                    onChange={(e) => {
                      const newRvd = parseFloat(e.target.value);
                      setRvd(newRvd);
                      if (mld > newRvd) setMld(newRvd);
                    }}
                    className="calc-range-slider"
                  />
                  <span className="input-hint">Standard healthy reference vessel caliber adjacent to lesion</span>
                </div>

                {/* MLD Slider */}
                <div className="calc-input-group">
                  <div className="input-label-row">
                    <label>Minimal Lumen Diameter (MLD)</label>
                    <span className="input-val-badge">{mld.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max={rvd}
                    step="0.1"
                    value={mld}
                    onChange={(e) => setMld(parseFloat(e.target.value))}
                    className="calc-range-slider"
                  />
                  <span className="input-hint">Narrowest measured lumen diameter at focal stenosis site</span>
                </div>

                {/* Quick Presets */}
                <div className="preset-row">
                  <span className="preset-label">Quick Presets:</span>
                  <button className="preset-btn" onClick={() => { setRvd(3.2); setMld(1.0); }}>
                    68% LAD Lesion
                  </button>
                  <button className="preset-btn" onClick={() => { setRvd(3.5); setMld(0.5); }}>
                    86% Severe RCA
                  </button>
                  <button className="preset-btn" onClick={() => { setRvd(3.0); setMld(2.1); }}>
                    30% Mild LCx
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Real-time Calculated Outputs */}
            <div className="angio-card calc-result-card">
              <div className="result-header">
                <span className="result-header-title">Live QCA Calculation Results</span>
                <span className={`severity-indicator ${cadradsResult.severity.toLowerCase()}`}>
                  {cadradsResult.severity}
                </span>
              </div>

              {/* Big Metrics Display */}
              <div className="metrics-hero-row">
                <div className="metric-box">
                  <span className="metric-num-big">{stenosisPercent}%</span>
                  <span className="metric-sub-label">Diameter Stenosis</span>
                </div>
                <div className="metric-box">
                  <span className="metric-num-grade">{cadradsResult.grade}</span>
                  <span className="metric-sub-label">{cadradsResult.label}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-num-ffr">{cadradsResult.ffr}</span>
                  <span className="metric-sub-label">Estimated AI-FFR</span>
                </div>
              </div>

              {/* Clinical Recommendation Box */}
              <div className="recommendation-box">
                <div className="rec-header">
                  <FileCheck size={17} className="rec-icon" />
                  <strong>Clinical Action Recommendation:</strong>
                </div>
                <p className="rec-text">{cadradsResult.rec}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CAD-RADS 2.0 Reference Table Tab */}
      {activeTab === 'cadrads' && (
        <div className="angio-card reference-table-card">
          <div className="card-header-row">
            <BookOpen size={20} className="header-icon" />
            <div>
              <h2 className="card-title">CAD-RADS™ 2.0 Coronary Stenosis Grading Scale</h2>
              <p className="card-subtitle">Society of Cardiovascular Computed Tomography (SCCT) / ACC / ACR Standard</p>
            </div>
          </div>

          <table className="cadrads-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Max Diameter Stenosis</th>
                <th>Interpretation</th>
                <th>Clinical Recommendation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="code-pill">CAD-RADS 0</span></td>
                <td>0%</td>
                <td>Absence of CAD</td>
                <td>Reassurance; primary prevention risk factor modification</td>
              </tr>
              <tr>
                <td><span className="code-pill">CAD-RADS 1</span></td>
                <td>1% - 24%</td>
                <td>Minimal non-obstructive CAD</td>
                <td>Preventive medical therapy (statin / ASA as indicated)</td>
              </tr>
              <tr>
                <td><span className="code-pill">CAD-RADS 2</span></td>
                <td>25% - 49%</td>
                <td>Mild non-obstructive CAD</td>
                <td>Aggressive risk factor management; lifestyle therapy</td>
              </tr>
              <tr className="highlight-target">
                <td><span className="code-pill active">CAD-RADS 3</span></td>
                <td><strong>50% - 69%</strong></td>
                <td><strong>Moderate Stenosis (e.g. 68% in LAD)</strong></td>
                <td><strong>Physiologic assessment (FFR / iFR) or functional ischemia testing</strong></td>
              </tr>
              <tr>
                <td><span className="code-pill severe">CAD-RADS 4A</span></td>
                <td>70% - 99% (1-2 vessels)</td>
                <td>Severe Stenosis</td>
                <td>Invasive coronary angiography; evaluate for PCI</td>
              </tr>
              <tr>
                <td><span className="code-pill severe">CAD-RADS 4B</span></td>
                <td>&gt;50% LMCA or 3-vessel &gt;70%</td>
                <td>Critical Multi-vessel Disease</td>
                <td>Urgent invasive coronary angiography; evaluate for CABG vs. PCI</td>
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
      )}

      {/* 4. Clinical Protocols & Official Reference Documents Tab */}
      {activeTab === 'guidelines' && (
        <div className="tab-content-wrapper">
          <div className="official-docs-banner">
            <div className="official-banner-text">
              <h2 className="official-banner-title">Official Medical Guidelines & Literature Library</h2>
              <p className="official-banner-sub">
                Peer-reviewed consensus documents, ACC/AHA clinical practice guidelines, and QCA calibration manuals for interventional cardiologists
              </p>
            </div>
          </div>

          <div className="guides-grid">
            <div className="angio-card guide-card official-doc-card">
              <div className="doc-top-row">
                <span className="guide-category">ACC / AHA / SCAI Guideline</span>
                <span className="doc-badge-year">2021/2024 Update</span>
              </div>
              <h3 className="guide-title">ACC/AHA Guideline for Coronary Artery Revascularization</h3>
              <p className="guide-desc">
                Definitive clinical guidelines covering indications for PCI vs. CABG, hemodynamic assessment of intermediate stenosis (FFR / iFR), and left main revascularization strategies published in JACC and Circulation.
              </p>
              <div className="guide-footer">
                <span className="read-time">JACC / AHA Special Report</span>
                <a 
                  href="https://www.jacc.org/doi/10.1016/j.jacc.2021.09.006" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="read-doc-btn"
                >
                  <span>Read Official Guideline</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="angio-card guide-card official-doc-card">
              <div className="doc-top-row">
                <span className="guide-category">SCCT / ACC / ACR Standard</span>
                <span className="doc-badge-year">CAD-RADS™ 2.0</span>
              </div>
              <h3 className="guide-title">CAD-RADS™ 2.0 Expert Consensus Document</h3>
              <p className="guide-desc">
                Updated classification system for standardized coronary stenosis grading (0-5), plaque vulnerability features, ischemia modifiers, and patient management recommendations published by RSNA / SCCT.
              </p>
              <div className="guide-footer">
                <span className="read-time">Radiology / SCCT Consensus</span>
                <a 
                  href="https://pubs.rsna.org/doi/10.1148/radiol.220712" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="read-doc-btn"
                >
                  <span>Read Official Consensus</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="angio-card guide-card official-doc-card">
              <div className="doc-top-row">
                <span className="guide-category">European Society of Cardiology</span>
                <span className="doc-badge-year">ESC 2024</span>
              </div>
              <h3 className="guide-title">ESC Guidelines on Chronic Coronary Syndromes</h3>
              <p className="guide-desc">
                European standard for diagnostic evaluation, pre-test probability assessment, functional testing, and invasive coronary angiography protocols for suspected obstructive CAD.
              </p>
              <div className="guide-footer">
                <span className="read-time">European Heart Journal</span>
                <a 
                  href="https://academic.oup.com/eurheartj/article/45/36/3415/7738722" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="read-doc-btn"
                >
                  <span>Read Official Document</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="angio-card guide-card official-doc-card">
              <div className="doc-top-row">
                <span className="guide-category">American Heart Association</span>
                <span className="doc-badge-year">Circulation Standard</span>
              </div>
              <h3 className="guide-title">AHA Standardized 16-Segment Coronary Tree Model</h3>
              <p className="guide-desc">
                Foundational AHA anatomical vessel segmentation system establishing universal terminology and numbering for LAD, LCx, and RCA branch segments in angiographic reporting.
              </p>
              <div className="guide-footer">
                <span className="read-time">Circulation AHA (Seg 1-16)</span>
                <a 
                  href="https://www.ahajournals.org/doi/10.1161/01.CIR.51.4.5" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="read-doc-btn"
                >
                  <span>Read Anatomical Guide</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="angio-card guide-card official-doc-card">
              <div className="doc-top-row">
                <span className="guide-category">Imaging Calibration</span>
                <span className="doc-badge-year">NIH / PubMed</span>
              </div>
              <h3 className="guide-title">Quantitative Coronary Arteriography (QCA) Manual</h3>
              <p className="guide-desc">
                Technical standards for catheter edge-detection scaling, sub-millimeter lumen measurement, reference diameter determination, and automated percent diameter stenosis calculation.
              </p>
              <div className="guide-footer">
                <span className="read-time">NCBI / NLM Literature</span>
                <a 
                  href="https://pubmed.ncbi.nlm.nih.gov/11265431/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="read-doc-btn"
                >
                  <span>Read Calibration Manual</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="angio-card guide-card official-doc-card">
              <div className="doc-top-row">
                <span className="guide-category">SCAI Cath Lab Best Practice</span>
                <span className="doc-badge-year">SCAI Guidance</span>
              </div>
              <h3 className="guide-title">SCAI Best Practices in the Cardiac Cath Lab</h3>
              <p className="guide-desc">
                Society for Cardiovascular Angiography and Interventions clinical guidance on optimal C-arm angles, contrast minimization, hemodynamic monitoring, and lesion verification protocols.
              </p>
              <div className="guide-footer">
                <span className="read-time">SCAI Expert Guidance</span>
                <a 
                  href="https://scai.org/clinical-guidance/best-practices-cardiac-catheterization-laboratory" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="read-doc-btn"
                >
                  <span>Read SCAI Protocol</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .resources-page-container {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeIn 0.3s ease-out;
        }

        .resources-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
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

        .resources-tab-nav {
          display: flex;
          gap: 6px;
          background: #F8EDF0;
          padding: 4px;
          border-radius: var(--radius-pill);
          flex-wrap: wrap;
        }

        .res-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .res-tab-btn.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(133, 16, 54, 0.25);
        }

        .tab-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Vessel Selector */
        .vessel-selector-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .vessel-pill-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 14px 18px;
          background: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .vessel-pill-btn:hover {
          border-color: var(--burgundy-primary);
          background-color: var(--pink-surface);
        }

        .vessel-pill-btn.active {
          background: var(--burgundy-primary);
          border-color: var(--burgundy-primary);
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(133, 16, 54, 0.22);
        }

        .vessel-code {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.2px;
        }

        .vessel-short-name {
          font-size: 11.5px;
          opacity: 0.85;
          margin-top: 2px;
        }

        /* Vessel Detail Card */
        .vessel-detail-card {
          padding: 28px;
        }

        .vessel-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1.5px solid var(--burgundy-border);
          margin-bottom: 24px;
        }

        .vessel-title-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .badge-vessel-code {
          font-size: 20px;
          font-weight: 800;
          background: var(--pink-surface);
          color: var(--burgundy-primary);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--burgundy-border);
        }

        .vessel-full-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.3px;
        }

        .vessel-alias-text {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .vessel-risk-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 12.5px;
          font-weight: 700;
        }

        .vessel-grid-details {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 28px;
        }

        .section-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 16px;
        }

        .segment-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .segment-item {
          background: #FAF1F3;
          border: 1px solid #F2D5DC;
          border-radius: var(--radius-sm);
          padding: 12px 14px;
        }

        .seg-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .seg-code {
          font-size: 11px;
          font-weight: 700;
          background: var(--burgundy-primary);
          color: #FFFFFF;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .seg-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .seg-caliber {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--burgundy-primary);
        }

        .seg-landmark {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.35;
        }

        .right-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .territory-box, .projections-box {
          background: #FAFAFB;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 16px;
        }

        .box-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--burgundy-primary);
          margin-bottom: 8px;
        }

        .box-desc {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .projections-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .proj-item {
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .proj-view {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
        }

        .proj-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Calculator Styles */
        .calc-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .calc-input-card, .calc-result-card {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .calc-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .calc-icon {
          color: var(--burgundy-primary);
        }

        .calc-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
        }

        .calc-sub {
          font-size: 12px;
          color: var(--text-muted);
        }

        .calc-inputs-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .calc-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .input-val-badge {
          background: var(--pink-surface);
          color: var(--burgundy-primary);
          padding: 3px 10px;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 800;
        }

        .calc-range-slider {
          accent-color: var(--burgundy-primary);
          height: 8px;
          cursor: pointer;
        }

        .input-hint {
          font-size: 11px;
          color: var(--text-muted);
        }

        .preset-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
          padding-top: 14px;
          border-top: 1px solid #F2D5DC;
        }

        .preset-label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .preset-btn {
          background: #FAF1F3;
          border: 1px solid var(--burgundy-border);
          color: var(--burgundy-primary);
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .preset-btn:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        /* Result Card */
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-header-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }

        .severity-indicator {
          font-size: 11.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          text-transform: uppercase;
        }

        .severity-indicator.severe, .severity-indicator.occluded {
          background: #FEE2E2;
          color: #DC2626;
        }

        .severity-indicator.moderate {
          background: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .severity-indicator.mild, .severity-indicator.none, .severity-indicator.minimal {
          background: #ECFDF5;
          color: #059669;
        }

        .metrics-hero-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .metric-box {
          background: #FAF1F3;
          border: 1.5px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
        }

        .metric-num-big {
          font-size: 32px;
          font-weight: 800;
          color: var(--burgundy-primary);
          line-height: 1;
        }

        .metric-num-grade {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
        }

        .metric-num-ffr {
          font-size: 20px;
          font-weight: 800;
          color: #DC2626;
        }

        .metric-sub-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .recommendation-box {
          background: #FFF9FA;
          border: 1.5px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 16px;
        }

        .rec-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--burgundy-primary);
          margin-bottom: 6px;
        }

        .rec-text {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        /* Reference Table */
        .reference-table-card {
          padding: 28px;
        }

        .card-header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .header-icon {
          color: var(--burgundy-primary);
        }

        .card-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main);
        }

        .card-subtitle {
          font-size: 12px;
          color: var(--text-muted);
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

        /* Guides Grid */
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
          font-weight: 600;
        }

        .guide-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--burgundy-primary);
          background: var(--pink-surface);
          padding: 2px 8px;
          border-radius: 4px;
        }

        @media (max-width: 1024px) {
          .vessel-selector-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .vessel-grid-details {
            grid-template-columns: 1fr;
          }
          .calc-grid-layout {
            grid-template-columns: 1fr;
          }
          .guides-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
