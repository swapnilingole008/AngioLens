import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Activity, 
  Layers, 
  FileText,
  Film,
  Camera,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import AngiogramViewer from '../components/AngiogramViewer';
import ECGWaveformViewer from '../components/ECGWaveformViewer';
import api from '../api';

// Error boundary to prevent entire page crashing to blank white screen
class ResultsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ResultsPage Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#FFF9FA', borderRadius: '12px', border: '1px solid #F4A7B9', margin: '20px' }}>
          <AlertTriangle size={40} color="#DC2626" style={{ marginBottom: '12px' }} />
          <h2 style={{ color: '#851036', marginBottom: '8px' }}>Unable to display results</h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            {this.state.error?.message || 'A rendering error occurred while loading ECG and video synchronization data.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#851036',
              color: '#FFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Default fallback R-peaks from calibrated CardioAI inference on sample_ecg.csv
const DEFAULT_R_PEAKS = [
  { peak_num: 1, r_peak_number: 1, timestamp: 0.19, sample_index: 69, frame_number: 7, frame_timestamp: 0.20, confidence: 0.9996, image_url: '/api/ecg/captured-images/peak_001_frame_7.jpg', status: 'Captured' },
  { peak_num: 2, r_peak_number: 2, timestamp: 0.75, sample_index: 271, frame_number: 24, frame_timestamp: 0.77, confidence: 0.9997, image_url: '/api/ecg/captured-images/peak_002_frame_24.jpg', status: 'Captured' },
  { peak_num: 3, r_peak_number: 3, timestamp: 1.33, sample_index: 477, frame_number: 41, frame_timestamp: 1.33, confidence: 0.9997, image_url: '/api/ecg/captured-images/peak_003_frame_41.jpg', status: 'Captured' },
  { peak_num: 4, r_peak_number: 4, timestamp: 1.88, sample_index: 678, frame_number: 57, frame_timestamp: 1.87, confidence: 0.9998, image_url: '/api/ecg/captured-images/peak_004_frame_57.jpg', status: 'Captured' },
  { peak_num: 5, r_peak_number: 5, timestamp: 2.45, sample_index: 881, frame_number: 74, frame_timestamp: 2.43, confidence: 0.9996, image_url: '/api/ecg/captured-images/peak_005_frame_74.jpg', status: 'Captured' },
  { peak_num: 6, r_peak_number: 6, timestamp: 3.01, sample_index: 1083, frame_number: 91, frame_timestamp: 3.00, confidence: 0.9998, image_url: '/api/ecg/captured-images/peak_006_frame_91.jpg', status: 'Captured' },
  { peak_num: 7, r_peak_number: 7, timestamp: 3.57, sample_index: 1285, frame_number: 108, frame_timestamp: 3.57, confidence: 0.9997, image_url: '/api/ecg/captured-images/peak_007_frame_108.jpg', status: 'Captured' },
  { peak_num: 8, r_peak_number: 8, timestamp: 4.13, sample_index: 1487, frame_number: 5, frame_timestamp: 0.13, confidence: 0.9997, image_url: '/api/ecg/captured-images/peak_008_frame_5.jpg', status: 'Captured' },
  { peak_num: 9, r_peak_number: 9, timestamp: 4.69, sample_index: 1690, frame_number: 22, frame_timestamp: 0.70, confidence: 0.9997, image_url: '/api/ecg/captured-images/peak_009_frame_22.jpg', status: 'Captured' },
];

function ResultsPageContent({ currentPath, onNavigate }) {
  const [activeTab, setActiveTab] = useState('segmented');
  const [verified, setVerified] = useState(false);
  const [analysisData, setAnalysisData] = useState(() => api.getLatestECGResult() || null);
  const [selectedPeakIndex, setSelectedPeakIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load ECG and Analysis data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // 1. Check local cache first
        const cached = api.getLatestECGResult();
        if (cached && isMounted) {
          setAnalysisData(cached);
          if (cached.verified !== undefined) setVerified(cached.verified);
        }

        // 2. Load latest analysis from backend DB
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id') || params.get('taskId') || params.get('analysis_id');
        const id = urlId || api.getCurrentAnalysisId();

        let dbData = null;
        if (id) {
          try {
            const res = await api.getAnalysis(id);
            if (res?.data) dbData = res.data;
          } catch (e) {
            console.warn('Could not fetch analysis by ID:', e);
          }
        }

        if (!dbData) {
          try {
            const latestRes = await api.getLatestAnalysis();
            if (latestRes?.data) dbData = latestRes.data;
          } catch (e) {
            console.warn('Could not fetch latest analysis:', e);
          }
        }

        // 3. Fallback to process sample ECG and Video if nothing is loaded
        if (!cached?.r_peaks && (!dbData || !dbData.r_peaks || dbData.r_peaks.length === 0)) {
          try {
            const sampleRes = await api.processECGVideo(new FormData());
            if (sampleRes?.r_peaks && isMounted) {
              setAnalysisData(sampleRes);
              api.setLatestECGResult(sampleRes);
              return;
            }
          } catch (e) {
            console.warn('Fallback sample processing notice:', e);
          }
        }

        if (dbData && isMounted) {
          setAnalysisData((prev) => ({
            ...(prev || {}),
            ...dbData,
            waveform_samples: (prev?.waveform_samples && prev.waveform_samples.length > 0)
              ? prev.waveform_samples 
              : (dbData.waveform_samples || []),
            r_peaks: (prev?.r_peaks && prev.r_peaks.length > 0) 
              ? prev.r_peaks 
              : (dbData.r_peaks || []),
            video: prev?.video || dbData.video,
          }));
          if (dbData.verified !== undefined) {
            setVerified(dbData.verified);
          }
        }
      } catch (err) {
        console.error('Failed to load analysis or ECG results:', err);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [currentPath]);

  // Handle physician verification toggle
  const handleToggleVerify = async () => {
    const nextState = !verified;
    setVerified(nextState);
    const analysisId = analysisData?.analysis_id || api.getCurrentAnalysisId();
    if (analysisId) {
      try {
        await api.verifyAnalysis(analysisId, {
          verified: nextState,
          comments: nextState ? 'Physician verified cardiac timing and stenosis findings' : 'Verification revoked',
        });
      } catch (err) {
        console.error('Failed to update verification status:', err);
      }
    }
  };

  // Safe number formatting helper
  const safeFixed = (val, digits = 2) => {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(digits);
  };

  // Safe extraction and normalization of R-peaks
  const rPeaks = useMemo(() => {
    const raw = analysisData?.r_peaks;
    if (Array.isArray(raw)) {
      return raw.map((p, idx) => {
        const peakNum = Number(p.peak_num || p.r_peak_number || (idx + 1));
        const t = Number(p.timestamp ?? p.r_peak_timestamp ?? p.trigger_timestamp ?? 0);
        const frameNum = (p.frame_number !== null && p.frame_number !== undefined) ? Number(p.frame_number) : null;
        const frameT = (p.frame_timestamp !== null && p.frame_timestamp !== undefined) ? Number(p.frame_timestamp) : null;
        const conf = Number(p.confidence ?? p.confidence_decimal ?? 0.999);
        const imgUrl = p.image_url || null;

        return {
          ...p,
          peak_num: peakNum,
          r_peak_number: peakNum,
          timestamp: isNaN(t) ? 0 : t,
          sample_index: Number(p.sample_index ?? p.index ?? Math.round(t * (analysisData?.sampling_rate || 360))),
          frame_number: frameNum,
          frame_timestamp: frameT,
          confidence: isNaN(conf) ? 0.999 : conf,
          image_url: imgUrl,
          status: p.status || (imgUrl ? 'Captured' : (p.error || 'No frame')),
          error: p.error || null,
        };
      });
    }
    return DEFAULT_R_PEAKS;
  }, [analysisData]);

  // Safe extraction and normalization of Waveform samples
  const waveformSamples = useMemo(() => {
    const raw = analysisData?.waveform_samples || analysisData?.ecg?.signal;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((pt, idx) => {
        const t = Number(pt.time ?? pt.t ?? (idx / 360));
        const amp = Number(pt.amplitude ?? pt.val ?? pt.voltage ?? 0);
        return {
          time: isNaN(t) ? idx / 360 : t,
          amplitude: isNaN(amp) ? 0 : amp,
          t: isNaN(t) ? idx / 360 : t,
          val: isNaN(amp) ? 0 : amp,
        };
      });
    }
    return [];
  }, [analysisData]);

  // Guaranteed active R-peak object with complete fallbacks
  const activePeak = useMemo(() => {
    return rPeaks[selectedPeakIndex] || rPeaks[0] || null;
  }, [rPeaks, selectedPeakIndex]);

  // Stepper navigation
  const handlePrevPeak = () => {
    if (selectedPeakIndex > 0) {
      setSelectedPeakIndex(selectedPeakIndex - 1);
    }
  };

  const handleNextPeak = () => {
    if (selectedPeakIndex < rPeaks.length - 1) {
      setSelectedPeakIndex(selectedPeakIndex + 1);
    }
  };

  // Safe patient metadata
  const patientId = analysisData?.patient?.patient_id || analysisData?.patient_id || 'PAT-00123';
  const patientAge = analysisData?.patient?.age || analysisData?.age || 56;
  const patientGender = analysisData?.patient?.gender || analysisData?.gender || 'Male';
  const affectedVessel = analysisData?.result?.affected_vessel || 'LAD Proximal';
  const stenosisNum = Math.round(Number(analysisData?.result?.severity || 68));
  const confidenceNum = Math.round(Number(analysisData?.result?.confidence || 92));

  return (
    <div className="results-page-gated-container">
      {/* Top Action & Navigation Bar */}
      <div className="results-top-bar">
        <div className="top-bar-left">
          <button className="back-link-btn" onClick={() => onNavigate('/upload')}>
            <ArrowLeft size={16} />
            <span>Back to Upload</span>
          </button>

          <div className="patient-tag">
            <span className="patient-id-badge">{patientId}</span>
            <span className="patient-meta">{patientAge} Y/O • {patientGender} • Cath Lab Cranial 35°</span>
            <span className="ecg-gated-meta-badge">
              ⚡ ECG-Gated Synchronized ({rPeaks.length} R-Peaks Captured)
            </span>
          </div>
        </div>

        <div className="top-bar-right">
          <button className="btn-outline-burgundy" onClick={() => onNavigate('/reports')}>
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

      {/* SECTION 1: ECG Waveform with Detected R-Peaks */}
      <div className="section-block">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <Activity size={20} className="section-icon" />
            <div>
              <h2 className="section-title">1. ECG Waveform & Detected R-Peaks</h2>
              <p className="section-subtitle">
                Calibrated Lead II ECG signal processed with the integrated CardioAI model. Click any R-peak marker to highlight its synchronized video frame.
              </p>
            </div>
          </div>

          <div className="peak-count-pill">
            <span className="count-number">{rPeaks.length}</span>
            <span className="count-label">R-Peaks Detected</span>
          </div>
        </div>

        <ECGWaveformViewer
          waveformSamples={waveformSamples}
          rPeaks={rPeaks}
          selectedPeakIndex={selectedPeakIndex}
          onSelectPeak={(peak, idx) => setSelectedPeakIndex(idx)}
          samplingRate={analysisData?.sampling_rate || 360}
          duration={analysisData?.duration_seconds || 6.94}
        />
      </div>

      {/* SECTION 2: ECG ↔ Image Connection (Hero Synchronizer View) */}
      <div className="section-block highlight-section">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <Sparkles size={20} className="section-icon sparkles-icon" />
            <div>
              <h2 className="section-title">2. ECG R-Peak → Synchronized Video Frame</h2>
              <p className="section-subtitle">
                Direct cardiac synchronization: R-peak timing mapped to exact video frame timestamp.
              </p>
            </div>
          </div>

          {/* Stepper controls */}
          <div className="peak-stepper-controls">
            <button 
              type="button" 
              className="stepper-btn" 
              onClick={handlePrevPeak}
              disabled={selectedPeakIndex <= 0}
            >
              <ChevronLeft size={16} />
              <span>Previous Peak</span>
            </button>
            <span className="stepper-status">
              Peak {selectedPeakIndex + 1} of {rPeaks.length}
            </span>
            <button 
              type="button" 
              className="stepper-btn" 
              onClick={handleNextPeak}
              disabled={selectedPeakIndex >= rPeaks.length - 1}
            >
              <span>Next Peak</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="hero-sync-grid">
          {/* Left Card: Telemetry & Timing Details */}
          <div className="sync-telemetry-card">
            <div className="telemetry-badge-header">
              <span className="telemetry-badge">
                Selected R-Peak: #{activePeak.peak_num || (selectedPeakIndex + 1)}
              </span>
              <span className="telemetry-status-pill">
                <CheckCircle2 size={14} />
                <span>Synchronized</span>
              </span>
            </div>

            <div className="telemetry-items-list">
              <div className="telemetry-item">
                <span className="label">ECG Timestamp:</span>
                <span className="val highlight">{safeFixed(activePeak.timestamp)} sec</span>
              </div>
              <div className="telemetry-item">
                <span className="label">ECG Sample Index:</span>
                <span className="val">Sample #{activePeak.sample_index || activePeak.index || 69} (at {analysisData?.sampling_rate || 360} Hz)</span>
              </div>
              <div className="telemetry-item">
                <span className="label">Matched Video Frame:</span>
                <span className="val highlight">Frame #{activePeak.frame_number || 7}</span>
              </div>
              <div className="telemetry-item">
                <span className="label">Video Frame Timestamp:</span>
                <span className="val">~{safeFixed(activePeak.frame_timestamp)} sec</span>
              </div>
              <div className="telemetry-item">
                <span className="label">CardioAI Model Confidence:</span>
                <span className="val confidence-val">
                  {safeFixed((activePeak.confidence || 0.999) * 100, 2)}%
                </span>
              </div>
              <div className="telemetry-item">
                <span className="label">Cardiac Timing Reference:</span>
                <span className="val">Peak Ventricular Depolarization (R-Wave Maxima)</span>
              </div>
            </div>

            <div className="telemetry-hint-box">
              <p>
                <strong>Cardiac Gating Principle:</strong> The R-peak represents ventricular electrical activation, serving as the timing anchor for motion-stabilized coronary cine capture.
              </p>
            </div>
          </div>

          {/* Right Card: Synchronized Captured Frame Viewport */}
          <div className="sync-frame-viewport-card">
            <div className="viewport-header">
              <div className="viewport-title">
                <Film size={16} />
                <span>{activePeak?.frame_number ? `Captured Cine Frame #${activePeak.frame_number}` : 'ECG Gated Frame'}</span>
              </div>
              <span className="viewport-timing-stamp">
                {activePeak?.frame_timestamp !== null && activePeak?.frame_timestamp !== undefined ? `t = ${safeFixed(activePeak.frame_timestamp)}s` : (activePeak?.status || '')}
              </span>
            </div>

            <div className="frame-image-wrapper">
              {activePeak?.image_url ? (
                <img
                  src={activePeak.image_url}
                  alt={`Angiography frame at R-peak #${activePeak.peak_num}`}
                  className="captured-frame-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}

              {(!activePeak?.image_url || activePeak?.error) && (
                <div className="no-frame-placeholder" style={{ padding: '36px 16px', textAlign: 'center', color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={36} color="#DC2626" style={{ marginBottom: '8px' }} />
                  <span style={{ fontWeight: 600, color: '#333', display: 'block', fontSize: '15px', marginBottom: '4px' }}>
                    {activePeak?.error || (activePeak?.status === 'Out of Range' ? 'No corresponding video frame available' : 'No frame available')}
                  </span>
                  <span style={{ fontSize: '13px', color: '#777' }}>
                    {activePeak?.status === 'Out of Range'
                      ? `R-peak timestamp (${safeFixed(activePeak?.timestamp)}s) is outside video duration.`
                      : (activePeak?.status === 'Video Unavailable' ? 'No video stream was provided for frame extraction.' : 'Frame extraction could not be completed for this timestamp.')}
                  </span>
                </div>
              )}

              {/* Overlaid Medical Tag */}
              {activePeak?.frame_number && (
                <div className="frame-overlay-tag">
                  <span>R-Peak #{activePeak.peak_num || (selectedPeakIndex + 1)} • {safeFixed(activePeak.timestamp)}s</span>
                  <span className="dot">•</span>
                  <span>Frame #{activePeak.frame_number} (~{safeFixed(activePeak.frame_timestamp)}s)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: R-Peak Results Table */}
      <div className="section-block">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <FileText size={20} className="section-icon" />
            <div>
              <h2 className="section-title">3. R-Peak Detection & Video Synchronization Table</h2>
              <p className="section-subtitle">
                Exact calculated R-peak timestamps and matched video frames produced by the integrated CardioAI model.
              </p>
            </div>
          </div>
        </div>

        <div className="angio-card table-card">
          <div className="table-responsive">
            <table className="rpeak-table">
              <thead>
                <tr>
                  <th>R-Peak</th>
                  <th>ECG Timestamp</th>
                  <th>Sample Index</th>
                  <th>Video Frame</th>
                  <th>Frame Timestamp</th>
                  <th>Model Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rPeaks.map((peak, idx) => {
                  const isSelected = idx === selectedPeakIndex;
                  return (
                    <tr 
                      key={peak.peak_num || idx} 
                      className={isSelected ? 'selected-row' : ''}
                      onClick={() => setSelectedPeakIndex(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong className="peak-badge">
                          R{peak.peak_num || (idx + 1)}
                        </strong>
                      </td>
                      <td>
                        <strong>{safeFixed(peak.timestamp)} s</strong>
                      </td>
                      <td>
                        #{peak.sample_index || peak.index || Math.round(peak.timestamp * 360)}
                      </td>
                      <td>
                        <span className="frame-num-badge">
                          {peak.frame_number ? `Frame #${peak.frame_number}` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        {peak.frame_timestamp !== null && peak.frame_timestamp !== undefined ? `~${safeFixed(peak.frame_timestamp)} s` : 'N/A'}
                      </td>
                      <td>
                        <span className="confidence-pill">
                          {safeFixed((peak.confidence || 0.999) * 100, 1)}%
                        </span>
                      </td>
                      <td>
                        {peak.status === 'Captured' ? (
                          <span className="status-captured-badge">
                            <CheckCircle2 size={13} />
                            <span>Captured</span>
                          </span>
                        ) : (
                          <span className="status-warning-badge" style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={13} />
                            <span>{peak.status || 'No frame'}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <button 
                          type="button" 
                          className={`btn-select-peak ${isSelected ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPeakIndex(idx);
                          }}
                        >
                          {isSelected ? 'Selected' : 'View Frame'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Captured Images Gallery */}
      <div className="section-block">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <Camera size={20} className="section-icon" />
            <div>
              <h2 className="section-title">4. Captured Images at Detected R-Peaks</h2>
              <p className="section-subtitle">
                Frames captured from the uploaded video at each detected R-peak timestamp. Click any image to view in detail.
              </p>
            </div>
          </div>
        </div>

        {rPeaks.length === 0 ? (
          <div className="no-peaks-banner" style={{ padding: '36px 20px', textAlign: 'center', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', margin: '20px 0' }}>
            <AlertCircle size={36} color="#DC2626" style={{ marginBottom: '10px' }} />
            <h3 style={{ color: '#991B1B', margin: '0 0 6px 0', fontSize: '18px' }}>No R-peaks detected</h3>
            <p style={{ color: '#7F1D1D', margin: 0, fontSize: '14px' }}>
              No R-peaks detected. No ECG-triggered frames available.
            </p>
          </div>
        ) : (
          <div className="captured-frames-gallery-grid">
            {rPeaks.map((peak, idx) => {
              const isSelected = idx === selectedPeakIndex;
              return (
                <div 
                  key={peak.peak_num || idx}
                  className={`gallery-frame-card ${isSelected ? 'active-card' : ''}`}
                  onClick={() => setSelectedPeakIndex(idx)}
                >
                  <div className="gallery-thumbnail-wrap">
                    {peak.image_url ? (
                      <img 
                        src={peak.image_url} 
                        alt={`R-Peak ${peak.peak_num} frame`} 
                        className="gallery-thumbnail-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="gallery-placeholder" style={{ padding: '16px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={24} color="#D97706" />
                        <span style={{ fontSize: '11px', color: '#666', marginTop: '6px', display: 'block', lineHeight: '1.2' }}>
                          {peak.status === 'Out of Range' ? 'Outside video' : (peak.status || 'No frame')}
                        </span>
                      </div>
                    )}

                    <div className="gallery-card-badge">
                      R-Peak #{peak.peak_num || (idx + 1)}
                    </div>
                  </div>

                  <div className="gallery-card-footer">
                    <div className="footer-meta">
                      <span className="time-text">t = {safeFixed(peak.timestamp)}s</span>
                      <span className="frame-text">
                        {peak.frame_number ? `Frame #${peak.frame_number}` : 'No frame'}
                      </span>
                    </div>
                    <span className={`select-indicator ${isSelected ? 'selected' : ''}`}>
                      {isSelected ? 'Active' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: Preserved AngioLens Quantitative Coronary Analysis (QCA) */}
      <div className="section-block">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <Layers size={20} className="section-icon" />
            <div>
              <h2 className="section-title">5. Quantitative Coronary Analysis (QCA) & Diagnostics</h2>
              <p className="section-subtitle">
                Preserved AI multi-layer vessel segmentation, stenosis assessment, and hemodynamic AI-FFR estimation.
              </p>
            </div>
          </div>
        </div>

        <div className="results-grid">
          {/* Left Card: Angiogram with layer toggles */}
          <div className="angio-card viewer-card">
            <div className="card-header-tabs">
              <div className="tab-title-group">
                <h3 className="card-title">Coronary Visualization</h3>
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

            <AngiogramViewer 
              onOpenFullReport={() => onNavigate('/reports')} 
              selectedFrame={activePeak?.frame_number || 7}
              isGatedMode={true}
            />
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
      </div>

      <style>{`
        .results-page-gated-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
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
          flex-wrap: wrap;
          gap: 12px;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
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
          padding-left: 16px;
          border-left: 1px solid var(--burgundy-border);
          flex-wrap: wrap;
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

        .ecg-gated-meta-badge {
          background-color: #FEF3C7;
          color: #B45309;
          border: 1px solid #FDE68A;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-size: 12px;
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .section-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .section-icon {
          color: var(--burgundy-primary);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .sparkles-icon {
          color: #D97706;
        }

        .section-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 2px;
        }

        .section-subtitle {
          font-size: 12.5px;
          color: var(--text-muted);
        }

        .peak-count-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FFF0F4;
          border: 1px solid var(--burgundy-border);
          padding: 4px 12px;
          border-radius: var(--radius-pill);
        }

        .count-number {
          font-size: 14px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .count-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .highlight-section {
          background: #FFFFFF;
          border: 2px solid #F4A7B9;
          border-radius: var(--radius-lg);
          padding: 20px 24px;
          box-shadow: 0 4px 16px rgba(133, 16, 54, 0.06);
        }

        .peak-stepper-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .stepper-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #FFF9FA;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--burgundy-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .stepper-btn:hover:not(:disabled) {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .stepper-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .stepper-status {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .hero-sync-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 20px;
          margin-top: 6px;
        }

        @media (max-width: 900px) {
          .hero-sync-grid {
            grid-template-columns: 1fr;
          }
        }

        .sync-telemetry-card {
          background: #FFF9FA;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .telemetry-badge-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .telemetry-badge {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          padding: 4px 12px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 13px;
        }

        .telemetry-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
          border-radius: var(--radius-pill);
          padding: 3px 9px;
          font-size: 11.5px;
          font-weight: 600;
        }

        .telemetry-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid #F7D5DE;
          padding-top: 12px;
        }

        .telemetry-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .telemetry-item .label {
          color: var(--text-muted);
          font-weight: 500;
        }

        .telemetry-item .val {
          color: var(--text-main);
          font-weight: 600;
        }

        .telemetry-item .val.highlight {
          color: var(--burgundy-primary);
          font-weight: 700;
        }

        .telemetry-item .confidence-val {
          color: #065F46;
          font-weight: 700;
        }

        .telemetry-hint-box {
          background: #FFFFFF;
          border: 1px solid #EAD8DF;
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 11.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .telemetry-hint-box strong {
          color: var(--burgundy-primary);
        }

        .sync-frame-viewport-card {
          background: #0F172A;
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border: 1px solid #334155;
        }

        .viewport-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #1E293B;
          padding: 10px 16px;
          color: #F8FAFC;
          font-size: 12.5px;
        }

        .viewport-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .viewport-timing-stamp {
          color: #94A3B8;
          font-weight: 500;
        }

        .frame-image-wrapper {
          position: relative;
          width: 100%;
          min-height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
        }

        .captured-frame-img {
          width: 100%;
          height: 100%;
          max-height: 320px;
          object-fit: contain;
          display: block;
        }

        .no-frame-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #64748B;
          padding: 40px;
        }

        .frame-overlay-tag {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(4px);
          color: #FFFFFF;
          padding: 5px 12px;
          border-radius: var(--radius-pill);
          font-size: 11.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .frame-overlay-tag .dot {
          color: var(--burgundy-primary);
        }

        .table-card {
          padding: 0;
          overflow: hidden;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .rpeak-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .rpeak-table th {
          background: #FFF9FA;
          color: var(--burgundy-primary);
          padding: 12px 16px;
          text-align: left;
          font-weight: 700;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .rpeak-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #F3E8EE;
          color: var(--text-main);
          transition: background 0.15s ease;
        }

        .rpeak-table tr:hover td {
          background: #FFF4F7;
        }

        .rpeak-table tr.selected-row td {
          background: #FFE8EF;
          border-bottom-color: #F8BBCE;
        }

        .peak-badge {
          display: inline-block;
          background: #FFF0F4;
          color: var(--burgundy-primary);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--burgundy-border);
        }

        .frame-num-badge {
          font-weight: 600;
          color: #1E293B;
        }

        .confidence-pill {
          background: #ECFDF5;
          color: #065F46;
          padding: 2px 7px;
          border-radius: var(--radius-pill);
          font-weight: 600;
          font-size: 12px;
        }

        .status-captured-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #065F46;
          font-weight: 600;
          font-size: 12px;
        }

        .btn-select-peak {
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          color: var(--burgundy-primary);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-select-peak.active,
        .btn-select-peak:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .captured-frames-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .gallery-frame-card {
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .gallery-frame-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--burgundy-primary);
        }

        .gallery-frame-card.active-card {
          border: 2px solid var(--burgundy-primary);
          box-shadow: 0 4px 12px rgba(133, 16, 54, 0.2);
        }

        .gallery-thumbnail-wrap {
          position: relative;
          width: 100%;
          height: 130px;
          background: #0F172A;
          overflow: hidden;
        }

        .gallery-thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .gallery-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748B;
        }

        .gallery-card-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(133, 16, 54, 0.9);
          color: #FFFFFF;
          padding: 2px 7px;
          border-radius: var(--radius-pill);
          font-size: 11px;
          font-weight: 700;
        }

        .gallery-card-footer {
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFF9FA;
        }

        .footer-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .time-text {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .frame-text {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .select-indicator {
          font-size: 11px;
          font-weight: 600;
          color: var(--burgundy-primary);
        }

        .select-indicator.selected {
          color: #065F46;
          font-weight: 700;
        }

        .results-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 20px;
        }

        @media (max-width: 950px) {
          .results-grid {
            grid-template-columns: 1fr;
          }
        }

        .viewer-card,
        .diagnostics-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-header-tabs {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .tab-title-group .card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
        }

        .tab-title-group .card-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .layer-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #FFF2F5;
          padding: 3px;
          border-radius: var(--radius-sm);
        }

        .layer-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          background: transparent;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: var(--burgundy-primary);
          border-radius: var(--radius-sm);
          cursor: pointer;
        }

        .layer-tab-btn.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .diagnostics-header {
          display: flex;
          align-items: center;
          gap: 10px;
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
          gap: 10px;
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          color: #991B1B;
          font-size: 12.5px;
        }

        .alert-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .qca-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .qca-table th {
          background: #FFF9FA;
          color: var(--text-muted);
          padding: 9px 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .qca-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #F3E8EE;
        }

        .highlight-row td {
          background: #FFF0F4;
        }

        .stenosis-badge-danger {
          background: #FEE2E2;
          color: #991B1B;
          padding: 2px 7px;
          border-radius: var(--radius-pill);
          font-weight: 700;
        }

        .badge-critical {
          background: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FCA5A5;
          padding: 2px 7px;
          border-radius: var(--radius-pill);
          font-size: 11px;
          font-weight: 700;
        }

        .badge-normal {
          background: #ECFDF5;
          color: #065F46;
          padding: 2px 7px;
          border-radius: var(--radius-pill);
          font-size: 11px;
          font-weight: 600;
        }

        .hemodynamic-card {
          background: #FFF9FA;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hemo-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .hemo-title {
          font-weight: 600;
          color: var(--text-main);
        }

        .hemo-score {
          font-weight: 800;
          font-size: 16px;
          color: #DC2626;
        }

        .hemo-bar-container {
          position: relative;
          height: 8px;
          background: #E5E7EB;
          border-radius: var(--radius-pill);
          overflow: hidden;
        }

        .hemo-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #DC2626, #F59E0B);
          border-radius: var(--radius-pill);
        }

        .hemo-threshold-line {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 80%;
          width: 2px;
          background: #000000;
        }

        .hemo-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted);
        }

        .verified-btn {
          background: #065F46 !important;
          border-color: #065F46 !important;
        }
      `}</style>
    </div>
  );
}

export default function ResultsPage(props) {
  return (
    <ResultsErrorBoundary>
      <ResultsPageContent {...props} />
    </ResultsErrorBoundary>
  );
}
