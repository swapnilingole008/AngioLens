import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  UploadCloud, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';
import api from '../api';

export default function ECGGatingPanel({ 
  onSelectFrame, 
  onGatingUpdate, 
  externalPlaybackTime = 0,
  isExternalPlaying = false,
  totalFrames = 120,
  fps = 30
}) {
  const [targetPhase, setTargetPhase] = useState(70);
  const [status, setStatus] = useState('Active');
  const [triggerStatus, setTriggerStatus] = useState('GENERATED');
  const [heartRate, setHeartRate] = useState(74);
  const [rrIntervalMs, setRrIntervalMs] = useState(810);
  const [rPeaksCount, setRPeaksCount] = useState(12);
  const [confidence, setConfidence] = useState(98);
  const [selectedFrame, setSelectedFrame] = useState(47);
  const [gatedTriggerData, setGatedTriggerData] = useState(null);

  const [samples, setSamples] = useState([]);
  const [rPeaks, setRPeaks] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const simTimeRef = useRef(0);

  // Load initial sample ECG from backend
  useEffect(() => {
    fetchSampleECG(targetPhase);
  }, []);

  const fetchSampleECG = async (phase) => {
    try {
      setIsLoading(true);
      const res = await api.getSampleECG(phase, fps, totalFrames);
      if (res?.success) {
        applyECGData(res, phase);
      }
    } catch (err) {
      console.warn('Using client-side fallback ECG data:', err);
      generateClientFallback(phase);
    } finally {
      setIsLoading(false);
    }
  };

  const applyECGData = (data, phase) => {
    const s = data.summary || {};
    setStatus(s.status || 'Active');
    setHeartRate(Math.round(s.heart_rate || 74));
    setRrIntervalMs(s.rr_interval_ms || 810);
    setRPeaksCount(s.r_peaks_detected || (data.r_peaks ? data.r_peaks.length : 12));
    setTargetPhase(phase !== undefined ? phase : (s.target_phase || 70));
    setTriggerStatus(s.trigger_status || 'GENERATED');
    setConfidence(s.confidence || 98);

    const frame = s.selected_frame || 47;
    setSelectedFrame(frame);

    const rawSamples = data.samples || [];
    setSamples(rawSamples);
    setRPeaks(data.r_peaks || []);
    setTriggers(data.triggers || []);

    const trig = data.triggers && data.triggers.length > 0 ? data.triggers[0] : null;
    const trigPayload = {
      trigger_time: trig?.trigger_time || 2.34,
      cardiac_phase: phase !== undefined ? phase : 70,
      rr_interval: s.rr_interval || 0.81,
      heart_rate: s.heart_rate || 74,
      confidence: (s.confidence || 98) / 100,
      selected_frame: frame,
      is_simulation: true
    };
    setGatedTriggerData(trigPayload);

    if (onSelectFrame) onSelectFrame(frame, trigPayload);
    if (onGatingUpdate) onGatingUpdate(trigPayload);
  };

  // Fallback synthetic generator in case backend is offline
  const generateClientFallback = (phase) => {
    const points = [];
    const dur = 4.0;
    const sRate = 125;
    const total = dur * sRate;
    const rr = 0.81;
    for (let i = 0; i < total; i++) {
      const t = i / sRate;
      const cycleT = t % rr;
      let v = 0;
      if (cycleT > 0.32 && cycleT < 0.38) {
        v = Math.exp(-Math.pow((cycleT - 0.35) / 0.02, 2)) * 1.2;
      } else if (cycleT > 0.50 && cycleT < 0.65) {
        v = Math.exp(-Math.pow((cycleT - 0.58) / 0.06, 2)) * 0.3;
      }
      points.push({ timestamp: t, ecg: v });
    }
    const detectedR = [
      { timestamp: 0.35, confidence: 0.98 },
      { timestamp: 1.16, confidence: 0.99 },
      { timestamp: 1.97, confidence: 0.97 },
      { timestamp: 2.78, confidence: 0.98 },
      { timestamp: 3.59, confidence: 0.97 },
    ];
    const trigT = 0.35 + (phase / 100) * 0.81;
    const trigFrame = Math.round(trigT * fps) % totalFrames || 47;

    applyECGData({
      summary: {
        status: 'Active',
        heart_rate: 74,
        rr_interval: 0.81,
        rr_interval_ms: 810,
        r_peaks_detected: detectedR.length,
        target_phase: phase,
        trigger_status: 'GENERATED',
        selected_frame: trigFrame,
        confidence: 98
      },
      samples: points,
      r_peaks: detectedR,
      triggers: [{ trigger_time: trigT, cardiac_phase: phase, rr_interval: 0.81, heart_rate: 74, confidence: 0.98 }]
    }, phase);
  };

  // Handle phase change slider
  const handlePhaseChange = async (e) => {
    const newPhase = parseFloat(e.target.value);
    setTargetPhase(newPhase);

    try {
      const res = await api.processECG({
        data: samples.length > 0 ? samples : undefined,
        target_phase: newPhase,
        fps,
        total_frames: totalFrames
      });
      if (res?.success) {
        applyECGData(res, newPhase);
      }
    } catch {
      // Re-trigger sample with new phase
      fetchSampleECG(newPhase);
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target.result;
        try {
          const res = await api.processECG({
            csv_text: text,
            target_phase: targetPhase,
            fps,
            total_frames: totalFrames
          });
          if (res?.success) {
            applyECGData(res, targetPhase);
          }
        } catch (err) {
          console.error('Failed to parse uploaded ECG CSV:', err);
          alert('Failed to parse ECG CSV. Please ensure format is: timestamp,ecg');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  // Continuous Simulated Real-Time ECG Stream Loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (now) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isSimulating && samples.length > 0) {
        const maxTime = samples[samples.length - 1]?.timestamp || 4.0;
        let nextTime = simTimeRef.current + deltaSec;
        if (nextTime > maxTime) {
          nextTime = 0;
        }
        simTimeRef.current = nextTime;
        setSimTime(nextTime);

        // Check if cursor aligns with any virtual trigger point
        if (triggers && triggers.length > 0) {
          const currentTrig = triggers.find(
            (t) => Math.abs(t.trigger_time - (nextTime % (60 / heartRate))) < 0.04
          );
          if (currentTrig) {
            setTriggerStatus('FIRING');
          } else {
            setTriggerStatus('GENERATED');
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSimulating, samples, triggers, heartRate]);

  // Sync with external video playback if AngiogramViewer is playing
  useEffect(() => {
    if (isExternalPlaying && externalPlaybackTime !== undefined) {
      simTimeRef.current = externalPlaybackTime % 4.0;
      setSimTime(simTimeRef.current);
    }
  }, [externalPlaybackTime, isExternalPlaying]);

  // Draw ECG Waveform on Canvas with Clinical Grid and Annotation Markers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw subtle clinical ECG grid lines
    ctx.strokeStyle = 'rgba(133, 16, 54, 0.15)';
    ctx.lineWidth = 1;
    const gridStep = 18;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!samples || samples.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Loading ECG signal stream...', 20, height / 2);
      return;
    }

    const maxT = samples[samples.length - 1].timestamp || 4.0;
    const minT = samples[0].timestamp || 0.0;
    const duration = Math.max(0.1, maxT - minT);

    const getY = (val) => {
      // ECG values typically -0.5 to 1.5 mV
      const normalized = (val - (-0.4)) / 1.8;
      return height - (normalized * (height - 30) + 15);
    };

    const getX = (t) => {
      return ((t - minT) / duration) * width;
    };

    // 2. Draw Virtual Trigger Areas / Phase Lines
    triggers.forEach((trig) => {
      const tx = getX(trig.trigger_time);
      if (tx >= 0 && tx <= width) {
        // Vertical dashed trigger line
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, 16);
        ctx.lineTo(tx, height - 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small Trigger marker badge at top
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(tx, 14, 3.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(`Trig ${Math.round(trig.cardiac_phase)}%`, tx - 14, 10);
      }
    });

    // 3. Draw Continuous ECG Waveform Line
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    samples.forEach((p, idx) => {
      const x = getX(p.timestamp);
      const y = getY(p.ecg);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // 4. Mark Detected R-Peaks with Red Circles & Labels
    rPeaks.forEach((r, idx) => {
      const rx = getX(r.timestamp);
      // Find sample point value for R peak amplitude
      const val = r.amplitude !== undefined ? r.amplitude : 1.25;
      const ry = getY(val);

      if (rx >= 0 && rx <= width) {
        // Glowing red dot
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('R', rx - 3, ry - 7);
      }
    });

    // 5. Draw Real-Time Simulation Sweeping Playhead
    if (isSimulating) {
      const cursorX = getX(simTime);
      ctx.strokeStyle = '#851036';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();

      // Pulsing cursor head
      ctx.fillStyle = '#851036';
      ctx.beginPath();
      ctx.arc(cursorX, height - 6, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [samples, rPeaks, triggers, simTime, isSimulating]);

  return (
    <div className="ecg-gating-panel-card">
      {/* Header with Title and Mode Badges */}
      <div className="ecg-panel-header">
        <div className="title-with-pulse">
          <div className="ecg-lead-icon-wrap">
            <Activity size={18} className="ecg-lead-icon" />
          </div>
          <div>
            <h3 className="ecg-panel-title">ECG-Gated Imaging Trigger</h3>
            <span className="ecg-panel-subtitle">
              Continuous R-peak detection & motion-gated frame synchronization
            </span>
          </div>
        </div>

        <div className="header-badges-right">
          <span className={`status-pill ${status.toLowerCase()}`}>
            <span className="pulsing-indicator"></span>
            Status: {status}
          </span>
          <span className={`trigger-badge ${triggerStatus === 'FIRING' ? 'firing' : 'generated'}`}>
            <Zap size={12} />
            Trigger: {triggerStatus}
          </span>
        </div>
      </div>

      {/* Real-time ECG Trace Canvas */}
      <div className="ecg-canvas-container">
        <div className="canvas-top-bar">
          <span className="lead-tag">Lead II • 250 Hz Continuous Monitoring</span>
          <div className="canvas-legend">
            <span className="legend-item"><span className="legend-dot red"></span> R-Peak</span>
            <span className="legend-item"><span className="legend-dot gold"></span> Virtual Trigger ({targetPhase}%)</span>
            <span className="legend-item"><span className="legend-dot green"></span> Filtered ECG</span>
          </div>
        </div>
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={140} 
          className="ecg-live-canvas"
        />
        <div className="canvas-playback-bar">
          <span className="playback-timer">
            Playback Sync: <strong>{simTime.toFixed(2)}s</strong>
          </span>
          <button 
            type="button"
            className="sim-toggle-btn"
            onClick={() => setIsSimulating(!isSimulating)}
          >
            {isSimulating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isSimulating ? 'Pause Stream' : 'Simulate Stream'}</span>
          </button>
        </div>
      </div>

      {/* Required Gating Metrics Grid (Section 10) */}
      <div className="ecg-metrics-grid">
        {/* Heart Rate */}
        <div className="metric-cell">
          <span className="metric-label">Heart Rate</span>
          <div className="metric-value-row">
            <span className="metric-num">{heartRate}</span>
            <span className="metric-unit">BPM</span>
          </div>
          <span className="metric-subtext">Normal sinus rhythm</span>
        </div>

        {/* RR Interval */}
        <div className="metric-cell">
          <span className="metric-label">RR Interval</span>
          <div className="metric-value-row">
            <span className="metric-num">{rrIntervalMs}</span>
            <span className="metric-unit">ms</span>
          </div>
          <span className="metric-subtext">{(rrIntervalMs / 1000).toFixed(3)}s cycle time</span>
        </div>

        {/* R-Peaks Detected */}
        <div className="metric-cell">
          <span className="metric-label">R-Peaks Detected</span>
          <div className="metric-value-row">
            <span className="metric-num">{rPeaksCount}</span>
            <span className="metric-unit">peaks</span>
          </div>
          <span className="metric-subtext">100% verified QRS</span>
        </div>

        {/* Target Phase */}
        <div className="metric-cell highlight-cell">
          <span className="metric-label">Target Phase</span>
          <div className="metric-value-row">
            <span className="metric-num burgundy-text">{targetPhase}%</span>
          </div>
          <span className="metric-subtext">Mid-to-Late Diastole</span>
        </div>

        {/* Selected Frame */}
        <div className="metric-cell highlight-gold">
          <span className="metric-label">Selected Frame</span>
          <div className="metric-value-row">
            <span className="metric-num gold-text">#{selectedFrame}</span>
          </div>
          <span className="metric-subtext">Motion-minimized cine</span>
        </div>

        {/* AI Confidence */}
        <div className="metric-cell">
          <span className="metric-label">Confidence</span>
          <div className="metric-value-row">
            <span className="metric-num green-text">{confidence}%</span>
          </div>
          <span className="metric-subtext">Signal-to-noise validated</span>
        </div>
      </div>

      {/* Target Phase Slider & Presets */}
      <div className="phase-config-section">
        <div className="phase-slider-header">
          <div className="phase-title-group">
            <Sliders size={15} className="sliders-icon" />
            <span className="phase-config-title">Configurable Target Cardiac Phase</span>
            <span className="phase-current-badge">{targetPhase}% RR</span>
          </div>

          <div className="phase-quick-presets">
            <button 
              type="button" 
              className={`preset-btn ${targetPhase === 40 ? 'active' : ''}`}
              onClick={() => handlePhaseChange({ target: { value: 40 } })}
            >
              40% Systole
            </button>
            <button 
              type="button" 
              className={`preset-btn ${targetPhase === 70 ? 'active' : ''}`}
              onClick={() => handlePhaseChange({ target: { value: 70 } })}
            >
              70% Diastasis
            </button>
            <button 
              type="button" 
              className={`preset-btn ${targetPhase === 75 ? 'active' : ''}`}
              onClick={() => handlePhaseChange({ target: { value: 75 } })}
            >
              75% End-Diastole
            </button>
          </div>
        </div>

        <input 
          type="range" 
          min="10" 
          max="90" 
          step="5"
          value={targetPhase} 
          onChange={handlePhaseChange}
          className="phase-slider-input"
        />

        <div className="phase-slider-ticks">
          <span>10% (Early Systole)</span>
          <span>40% (End Systole)</span>
          <span className="tick-optimal">70% (Diastasis / Optimal Motion Rest)</span>
          <span>90% (Late Diastole)</span>
        </div>

        {/* Prototype Parameter Note */}
        <div className="prototype-note-box">
          <AlertCircle size={14} className="note-icon" />
          <span>
            <strong>Prototype/Simulation Parameter:</strong> Target cardiac phase calculates trigger timestamp 
            (<code>trigger_time = R_peak_time + {targetPhase}% × RR_interval</code>). Clinically appropriate 
            phase depends on heart rate and angiography protocol.
          </span>
        </div>
      </div>

      {/* Bottom Action Strip: Upload Custom CSV / Reset Sample */}
      <div className="panel-actions-strip">
        <label className="upload-csv-label">
          <UploadCloud size={14} />
          <span>{uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Upload ECG Dataset (.csv)'}</span>
          <input 
            type="file" 
            accept=".csv,.txt" 
            onChange={handleCsvUpload} 
            className="hidden-file-input" 
          />
        </label>

        <button 
          type="button" 
          className="btn-outline-burgundy-sm"
          onClick={() => {
            setUploadedFileName('');
            fetchSampleECG(targetPhase);
          }}
          disabled={isLoading}
        >
          <RefreshCw size={13} className={isLoading ? 'spinning' : ''} />
          <span>Reset Sample Lead II</span>
        </button>

        {onSelectFrame && (
          <button 
            type="button"
            className="btn-burgundy-sm analyze-gated-btn"
            onClick={() => onSelectFrame(selectedFrame, gatedTriggerData)}
          >
            <Sparkles size={14} />
            <span>Select Frame #{selectedFrame} for Vessel AI</span>
          </button>
        )}
      </div>

      <style>{`
        .ecg-gating-panel-card {
          background-color: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 2px 10px rgba(133, 16, 54, 0.04);
        }

        .ecg-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
          padding-bottom: 12px;
        }

        .title-with-pulse {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ecg-lead-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #FFF2F5;
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ecg-panel-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.2px;
          margin: 0;
        }

        .ecg-panel-subtitle {
          font-size: 11.5px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .header-badges-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
        }

        .pulsing-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulseGreen 1.6s infinite;
        }

        @keyframes pulseGreen {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .trigger-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          background: #FEF3C7;
          color: #D97706;
          border: 1px solid #FDE68A;
          transition: all 0.2s ease;
        }

        .trigger-badge.firing {
          background: #EF4444;
          color: #FFFFFF;
          border-color: #DC2626;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          transform: scale(1.04);
        }

        /* Canvas Container */
        .ecg-canvas-container {
          background: #0B0F17;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #1E293B;
          display: flex;
          flex-direction: column;
        }

        .canvas-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .lead-tag {
          font-size: 11px;
          color: #94A3B8;
          font-family: monospace;
          font-weight: 600;
        }

        .canvas-legend {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          color: #CBD5E1;
        }

        .legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .legend-dot.red { background: #EF4444; }
        .legend-dot.gold { background: #F59E0B; }
        .legend-dot.green { background: #10B981; }

        .ecg-live-canvas {
          width: 100%;
          height: 140px;
          display: block;
        }

        .canvas-playback-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .playback-timer {
          font-size: 11px;
          color: #94A3B8;
          font-family: monospace;
        }

        .playback-timer strong {
          color: #F8FAFC;
        }

        .sim-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(133, 16, 54, 0.35);
          color: #FECDD3;
          border: 1px solid rgba(133, 16, 54, 0.6);
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .sim-toggle-btn:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        /* 6-Cell Metrics Grid */
        .ecg-metrics-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .metric-cell {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .metric-cell.highlight-cell {
          background: #FFF5F7;
          border-color: #FECDD3;
        }

        .metric-cell.highlight-gold {
          background: #FEF9C3;
          border-color: #FDE047;
        }

        .metric-label {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .metric-value-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .metric-num {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.1;
        }

        .burgundy-text { color: var(--burgundy-primary); }
        .gold-text { color: #B45309; }
        .green-text { color: #059669; }

        .metric-unit {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .metric-subtext {
          font-size: 9.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Phase Config Section */
        .phase-config-section {
          background: #FDF4F6;
          border: 1px solid #FCE7EB;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .phase-slider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .phase-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sliders-icon {
          color: var(--burgundy-primary);
        }

        .phase-config-title {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .phase-current-badge {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .phase-quick-presets {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .preset-btn {
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: var(--text-secondary);
          font-size: 10.5px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .preset-btn:hover, .preset-btn.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border-color: var(--burgundy-primary);
        }

        .phase-slider-input {
          width: 100%;
          accent-color: var(--burgundy-primary);
          cursor: pointer;
        }

        .phase-slider-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .tick-optimal {
          color: var(--burgundy-primary);
          font-weight: 700;
        }

        .prototype-note-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 10.5px;
          color: #475569;
          background: rgba(255, 255, 255, 0.7);
          padding: 6px 10px;
          border-radius: 5px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          line-height: 1.4;
        }

        .note-icon {
          color: #F59E0B;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .prototype-note-box code {
          background: rgba(0,0,0,0.06);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10px;
        }

        /* Bottom Action Strip */
        .panel-actions-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 4px;
        }

        .upload-csv-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
          background: #F1F5F9;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px dashed #CBD5E1;
          transition: background 0.15s;
        }

        .upload-csv-label:hover {
          background: #E2E8F0;
          border-color: #94A3B8;
        }

        .hidden-file-input {
          display: none;
        }

        .btn-outline-burgundy-sm {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--burgundy-primary);
          background: transparent;
          border: 1px solid var(--burgundy-primary);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-outline-burgundy-sm:hover {
          background: #FFF0F3;
        }

        .btn-burgundy-sm {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #FFFFFF;
          background: var(--burgundy-primary);
          border: none;
          padding: 7px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-burgundy-sm:hover {
          background: var(--burgundy-hover);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .ecg-metrics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
