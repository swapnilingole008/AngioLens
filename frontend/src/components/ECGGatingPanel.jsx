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
  Zap, 
  Film, 
  X, 
  Eye, 
  Settings2, 
  ChevronDown 
} from 'lucide-react';
import api from '../api';
import angiogramSample from '../assets/images/angiogram-sample.jpg';

// Default motion-gated images ensuring the modal always displays captured frames
const DEFAULT_CAPTURED_IMAGES = [
  {
    image_id: 'IMG-TRIG-001-default',
    frame_number: 25,
    trigger_timestamp: 0.83,
    target_phase: 70,
    heart_rate: 74,
    rr_interval_ms: 811,
    image_url: angiogramSample
  },
  {
    image_id: 'IMG-TRIG-002-default',
    frame_number: 47,
    trigger_timestamp: 1.57,
    target_phase: 70,
    heart_rate: 74,
    rr_interval_ms: 811,
    image_url: angiogramSample
  },
  {
    image_id: 'IMG-TRIG-003-default',
    frame_number: 72,
    trigger_timestamp: 2.40,
    target_phase: 70,
    heart_rate: 74,
    rr_interval_ms: 811,
    image_url: angiogramSample
  },
  {
    image_id: 'IMG-TRIG-004-default',
    frame_number: 94,
    trigger_timestamp: 3.13,
    target_phase: 70,
    heart_rate: 74,
    rr_interval_ms: 811,
    image_url: angiogramSample
  }
];

export default function ECGGatingPanel({ 
  onSelectFrame, 
  onGatingUpdate, 
  onRunVesselAnalysisOnFrame,
  externalPlaybackTime = 0,
  isExternalPlaying = false,
  totalFrames = 120,
  fps = 30,
  videoStatus = 'Not provided', // 'Not provided' | filename
}) {
  // Configurable Parameters (Section 2 & 6)
  const [samplingRate, setSamplingRate] = useState(250); // 250 Hz default
  const [heartRate, setHeartRate] = useState(74); // ~70-75 BPM default
  const [noiseLevel, setNoiseLevel] = useState(0.02); // Noise level
  const [targetPhase, setTargetPhase] = useState(70); // 70% default

  // Dynamic Monitoring State (Section 5)
  const [status, setStatus] = useState('Active');
  const [triggerStatus, setTriggerStatus] = useState('SYNCHRONIZED');
  const [rrIntervalMs, setRrIntervalMs] = useState(811);
  const [rPeaksCount, setRPeaksCount] = useState(12);
  const [selectedFrame, setSelectedFrame] = useState(47);
  const [gatedTriggerData, setGatedTriggerData] = useState(null);

  // Real-time scrolling state
  const [isLiveScrolling, setIsLiveScrolling] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedCsvPoints, setUploadedCsvPoints] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // View Captured Images Modal State (Section 11)
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [capturedImages, setCapturedImages] = useState(DEFAULT_CAPTURED_IMAGES);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const rollingBufferRef = useRef([]);
  const detectedPeaksRef = useRef([]);
  const activeTriggersRef = useRef([]);
  const lastRPeakTimeRef = useRef(0);
  const rPeakCounterRef = useRef(0);
  const triggerTimerRef = useRef(null);

  // Clean up any pending trigger timeout on unmount
  useEffect(() => {
    return () => {
      if (triggerTimerRef.current) clearTimeout(triggerTimerRef.current);
    };
  }, []);

  // Initialize rolling buffer with 1000 points (~4s of baseline signal at 250Hz)
  useEffect(() => {
    resetBuffer();
    fetchLatestCapturedImages();
  }, [samplingRate, heartRate, noiseLevel]);

  const resetBuffer = () => {
    const bufferSize = 1000;
    const buf = [];
    const rrSec = 60.0 / heartRate;
    timeRef.current = 0;
    rPeakCounterRef.current = 0;
    detectedPeaksRef.current = [];
    activeTriggersRef.current = [];
    lastRPeakTimeRef.current = 0;

    for (let i = 0; i < bufferSize; i++) {
      const t = (i - bufferSize) / samplingRate;
      const val = computeLeadIIEcg(t, rrSec, noiseLevel);
      buf.push({ t, val });
    }
    rollingBufferRef.current = buf;
  };

  const fetchLatestCapturedImages = async () => {
    try {
      setIsLoadingImages(true);
      const res = await api.getCapturedImages();
      if (res?.images && res.images.length > 0) {
        setCapturedImages(res.images);
      }
    } catch (err) {
      console.warn('Could not load captured images from API, retaining defaults:', err);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Mathematical Multi-Gaussian Lead-II Morphology (P-Q-R-S-T)
  const computeLeadIIEcg = (t, rrSec, noise) => {
    const cyclePhase = ((t % rrSec) + rrSec) % rrSec;
    const rCenter = 0.35 * rrSec;
    const dt = cyclePhase - rCenter;

    // Component Gaussians: [offset, amplitude, width]
    const pWave = [-0.18, 0.18, 0.040];
    const qWave = [-0.05, -0.15, 0.015];
    const rWave = [0.00, 1.25, 0.020];
    const sWave = [0.05, -0.35, 0.025];
    const tWave = [0.24, 0.32, 0.070];
    const waves = [pWave, qWave, rWave, sWave, tWave];

    let val = 0.0;
    for (let w = 0; w < waves.length; w++) {
      const [offset, amp, width] = waves[w];
      const d = dt - offset;
      val += amp * Math.exp(-0.5 * Math.pow(d / width, 2));
    }

    const baselineWander = 0.035 * Math.sin(2 * Math.PI * 0.22 * t);
    const randomNoise = noise > 0 ? (Math.random() * 2 - 1) * noise : 0;
    return val + baselineWander + randomNoise;
  };

  // Real-Time Hospital Monitor-Style Scrolling Animation Loop (Section 2)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now) => {
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (isLiveScrolling) {
        const rrSec = 60.0 / heartRate;
        const newSamplesCount = Math.max(1, Math.round(deltaSec * samplingRate));
        const buf = rollingBufferRef.current;

        for (let s = 0; s < newSamplesCount; s++) {
          timeRef.current += (1 / samplingRate);
          const t = timeRef.current;

          let val;
          if (uploadedCsvPoints && uploadedCsvPoints.length > 0) {
            const idx = Math.floor(t * samplingRate) % uploadedCsvPoints.length;
            val = uploadedCsvPoints[idx]?.ecg || 0;
          } else {
            val = computeLeadIIEcg(t, rrSec, noiseLevel);
          }

          buf.push({ t, val });
          if (buf.length > 1000) {
            buf.shift();
          }

          // Dynamic R-peak Detection Heuristic
          // R-peak occurs around 0.35 * rrSec in each cycle
          const cyclePhase = ((t % rrSec) + rrSec) % rrSec;
          const isAtRPeak = Math.abs(cyclePhase - (0.35 * rrSec)) < (1.5 / samplingRate);

          if (isAtRPeak && (t - lastRPeakTimeRef.current) > (rrSec * 0.7)) {
            const prevR = lastRPeakTimeRef.current;
            lastRPeakTimeRef.current = t;
            rPeakCounterRef.current += 1;
            setRPeaksCount(rPeakCounterRef.current);

            // Compute RR interval and instantaneous HR
            let currentRR = prevR > 0 ? (t - prevR) : rrSec;
            if (currentRR <= 0 || currentRR > 2.5) currentRR = rrSec;
            const currentRrMs = Math.round(currentRR * 1000);
            const currentHr = Math.round(60.0 / currentRR);
            setRrIntervalMs(currentRrMs);
            setHeartRate(currentHr);

            // Register R-peak marker
            detectedPeaksRef.current.push({ t, val: Math.max(1.1, val), id: rPeakCounterRef.current });
            if (detectedPeaksRef.current.length > 20) detectedPeaksRef.current.shift();

            // Calculate Virtual Trigger Timestamp at targetPhase (Section 6)
            // trigger_time = R_peak_time + target_phase * RR_interval
            const phaseRatio = targetPhase / 100.0;
            const trigT = t + (phaseRatio * currentRR);

            // Map to corresponding video frame (Section 8)
            const rawFrame = Math.round(trigT * fps);
            const gatedFrameNum = (rawFrame % totalFrames) + 1;
            setSelectedFrame(gatedFrameNum);

            const triggerEvent = {
              trigger_time: roundNum(trigT, 4),
              cardiac_phase: targetPhase,
              rr_interval: roundNum(currentRR, 3),
              heart_rate: currentHr,
              confidence: 0.99,
              confidence_label: 'Simulated / Demo Confidence',
              selected_frame: gatedFrameNum,
              r_peak_time: roundNum(t, 4),
              r_peak_id: rPeakCounterRef.current,
              is_simulation: true
            };
            setGatedTriggerData(triggerEvent);

            activeTriggersRef.current.push({
              t: trigT,
              phase: targetPhase,
              frame: gatedFrameNum,
              id: rPeakCounterRef.current
            });
            if (activeTriggersRef.current.length > 10) activeTriggersRef.current.shift();

            // Trigger status pulse: cleanly hold FIRING for 450ms then return to SYNCHRONIZED
            setTriggerStatus('FIRING');
            if (triggerTimerRef.current) clearTimeout(triggerTimerRef.current);
            triggerTimerRef.current = setTimeout(() => {
              setTriggerStatus('SYNCHRONIZED');
            }, 450);

            // Notify parent components
            if (onSelectFrame) onSelectFrame(gatedFrameNum, triggerEvent);
            if (onGatingUpdate) onGatingUpdate(triggerEvent);
          }
        }
      }

      drawMonitorCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isLiveScrolling, heartRate, samplingRate, noiseLevel, targetPhase, uploadedCsvPoints, fps, totalFrames]);

  // Render Real-Time Hospital Monitor-Style Scrolling Waveform
  const drawMonitorCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const buf = rollingBufferRef.current;

    // Monitor Background (Deep Clinical Dark)
    ctx.fillStyle = '#06090F';
    ctx.fillRect(0, 0, width, height);

    // Subtle Clinical ECG Grid
    ctx.strokeStyle = 'rgba(133, 16, 54, 0.14)';
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

    if (!buf || buf.length < 2) return;

    const minT = buf[0].t;
    const maxT = buf[buf.length - 1].t;
    const timeSpan = maxT - minT || 4.0;

    const getX = (t) => ((t - minT) / timeSpan) * width;
    const getY = (val) => {
      // Scale standard ECG -0.4 to 1.4 mV to canvas height
      const norm = (val - (-0.4)) / 1.8;
      return height - (norm * (height - 32) + 16);
    };

    // 1. Draw Virtual Trigger Markers Dynamically on Waveform
    activeTriggersRef.current.forEach((trig) => {
      const tx = getX(trig.t);
      if (tx >= 0 && tx <= width) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, 14);
        ctx.lineTo(tx, height - 8);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(tx, 12, 3.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText(`⚡ Trigger (${trig.phase}%)`, tx - 24, 10);
      }
    });

    // 2. Draw Scrolling Continuous ECG Waveform Line (Hospital Green Glow)
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let i = 0; i < buf.length; i++) {
      const px = getX(buf[i].t);
      const py = getY(buf[i].val);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Draw Detected R-Peaks with Labels & Indicators
    detectedPeaksRef.current.forEach((r) => {
      const rx = getX(r.t);
      const ry = getY(r.val);

      if (rx >= 0 && rx <= width) {
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
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

    // 4. Live Edge Sweep Dot on the Right
    const lastPt = buf[buf.length - 1];
    const edgeX = getX(lastPt.t);
    const edgeY = getY(lastPt.val);
    ctx.fillStyle = '#34D399';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(edgeX, edgeY, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const roundNum = (val, dec = 2) => {
    const factor = Math.pow(10, dec);
    return Math.round(val * factor) / factor;
  };

  // CSV Upload Handler with Flexible Column Detection (Section 1)
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
          // Process via backend parser
          const res = await api.processECG({
            csv_text: text,
            target_phase: targetPhase,
            fps,
            total_frames: totalFrames
          });

          if (res?.success && res.samples && res.samples.length > 0) {
            setUploadedCsvPoints(res.samples);
            setRPeaksCount(res.r_peaks ? res.r_peaks.length : 12);
            if (res.summary) {
              setHeartRate(Math.round(res.summary.heart_rate || 74));
              setRrIntervalMs(res.summary.rr_interval_ms || 811);
              setSelectedFrame(res.summary.selected_frame || 47);
            }
          }
        } catch (err) {
          console.error('Failed to parse ECG CSV:', err);
          alert('Could not parse ECG CSV. Please verify that it contains numeric time-series values.');
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

  // Reset to Demo ECG Signal
  const handleResetToDemoSignal = () => {
    setUploadedFileName('');
    setUploadedCsvPoints(null);
    resetBuffer();
  };

  // Start new ECG-Gated Session and Capture Frames (Section 9 & 10)
  const handleSaveAndCaptureSession = async () => {
    try {
      setIsLoading(true);
      const payload = {
        patient_id: 'PAT-00123',
        target_phase: targetPhase,
        sampling_rate: samplingRate,
        heart_rate: heartRate,
        noise_level: noiseLevel,
        fps,
        total_frames: totalFrames,
        video_file: videoStatus !== 'Not provided' ? videoStatus : null,
        ecg_file: uploadedFileName || 'demo_lead_ii_ecg.csv',
      };
      const res = await api.createECGSession(payload);
      if (res?.success) {
        if (res.captured_images) {
          setCapturedImages(res.captured_images);
        }
        setIsImagesModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to create ECG session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCapturedImage = (img) => {
    setSelectedFrame(img.frame_number);
    if (onSelectFrame) {
      onSelectFrame(img.frame_number, {
        trigger_time: img.trigger_timestamp,
        cardiac_phase: img.target_phase,
        selected_frame: img.frame_number,
        is_simulation: true
      });
    }
    setIsImagesModalOpen(false);
  };

  return (
    <div className="ecg-gating-panel-card">
      {/* Header with Title and Mode Badges */}
      <div className="ecg-panel-header">
        <div className="title-with-pulse">
          <div className="ecg-lead-icon-wrap">
            <Activity size={18} className="ecg-lead-icon" />
          </div>
          <div>
            <div className="title-row">
              <h3 className="ecg-panel-title">ECG-Gated Imaging Trigger</h3>
              <span className="source-abstraction-badge">
                ECG Source: Demo Signal / Simulation Mode
              </span>
            </div>
            <span className="ecg-panel-subtitle">
              Real-time scrolling waveform • P-QRS-T morphology • Virtual motion-gated synchronization
            </span>
          </div>
        </div>

        <div className="header-badges-right">
          <span className="status-pill active">
            <span className="pulsing-indicator"></span>
            Status: {status}
          </span>
          <span className={`trigger-badge ${triggerStatus === 'FIRING' ? 'firing' : 'generated'}`}>
            <Zap size={12} />
            Trigger: {triggerStatus}
          </span>
          <button 
            type="button" 
            className="view-images-btn-top"
            onClick={() => {
              fetchLatestCapturedImages();
              setIsImagesModalOpen(true);
            }}
          >
            <Film size={13} />
            <span>View Captured Images ({capturedImages.length})</span>
          </button>
        </div>
      </div>

      {/* Real-time Hospital Monitor-Style Scrolling Waveform Canvas (Section 2) */}
      <div className="ecg-canvas-container">
        <div className="canvas-top-bar">
          <div className="canvas-lead-group">
            <span className="lead-tag">Lead II Continuous Waveform</span>
            <span className="rate-tag">Sampling: {samplingRate} Hz</span>
            <span className="mode-tag">
              {uploadedFileName ? `File: ${uploadedFileName}` : 'Source: Multi-Gaussian Demo Signal'}
            </span>
          </div>
          <div className="canvas-legend">
            <span className="legend-item"><span className="legend-dot red"></span> Detected R-Peak</span>
            <span className="legend-item"><span className="legend-dot gold"></span> Virtual Trigger ({targetPhase}%)</span>
            <span className="legend-item"><span className="legend-dot green"></span> Live Trace</span>
          </div>
        </div>

        <canvas 
          ref={canvasRef} 
          width={640} 
          height={145} 
          className="ecg-live-canvas"
        />

        <div className="canvas-playback-bar">
          <span className="playback-timer">
            Scrolling Time: <strong>{timeRef.current.toFixed(2)}s</strong> • Video Status:{' '}
            <strong className={videoStatus !== 'Not provided' ? 'has-video' : 'no-video'}>
              {videoStatus}
            </strong>
          </span>

          <div className="canvas-ctrls-right">
            <button 
              type="button"
              className="sim-toggle-btn"
              onClick={() => setIsLiveScrolling(!isLiveScrolling)}
              title={isLiveScrolling ? 'Pause Live Monitor' : 'Resume Live Monitor'}
            >
              {isLiveScrolling ? <Pause size={13} /> : <Play size={13} />}
              <span>{isLiveScrolling ? 'Pause Monitor' : 'Resume Monitor'}</span>
            </button>
            <button 
              type="button"
              className="sim-reset-btn"
              onClick={handleResetToDemoSignal}
              title="Reset Signal to Default Demo"
            >
              <RefreshCw size={12} />
              <span>Reset Signal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Required Gating Metrics Cards (Section 5 & 13) */}
      <div className="ecg-metrics-grid">
        {/* Heart Rate */}
        <div className="metric-cell">
          <span className="metric-label">Heart Rate</span>
          <div className="metric-value-row">
            <span className="metric-num">{heartRate}</span>
            <span className="metric-unit">BPM</span>
          </div>
          <span className="metric-subtext">Dynamic RR calculation</span>
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
          <span className="metric-subtext">Dynamic peak tracking</span>
        </div>

        {/* Target Phase */}
        <div className="metric-cell highlight-cell">
          <span className="metric-label">Target Phase</span>
          <div className="metric-value-row">
            <span className="metric-num burgundy-text">{targetPhase}%</span>
          </div>
          <span className="metric-subtext">Motion quiescence target</span>
        </div>

        {/* Selected Frame */}
        <div className="metric-cell highlight-gold">
          <span className="metric-label">Selected Frame</span>
          <div className="metric-value-row">
            <span className="metric-num gold-text">#{selectedFrame}</span>
          </div>
          <span className="metric-subtext">Synchronized cine frame</span>
        </div>

        {/* Confidence (Explicitly Labeled as Simulated/Demo) */}
        <div className="metric-cell">
          <span className="metric-label">Simulated Conf.</span>
          <div className="metric-value-row">
            <span className="metric-num green-text">99%</span>
          </div>
          <span className="metric-subtext">Demo / Heuristic Mode</span>
        </div>
      </div>

      {/* Configurable Monitor Controls (Sampling rate, HR, Noise, Target Phase) */}
      <div className="config-grid-row">
        {/* Target Cardiac Phase Slider */}
        <div className="phase-config-subcard">
          <div className="subcard-header">
            <div className="subcard-title">
              <Sliders size={14} className="icon-burgundy" />
              <span>Target Cardiac Phase: <strong>{targetPhase}%</strong></span>
            </div>
            <div className="preset-buttons">
              <button 
                type="button" 
                className={`mini-preset ${targetPhase === 40 ? 'active' : ''}`}
                onClick={() => setTargetPhase(40)}
              >
                40% Systole
              </button>
              <button 
                type="button" 
                className={`mini-preset ${targetPhase === 70 ? 'active' : ''}`}
                onClick={() => setTargetPhase(70)}
              >
                70% Diastasis
              </button>
              <button 
                type="button" 
                className={`mini-preset ${targetPhase === 75 ? 'active' : ''}`}
                onClick={() => setTargetPhase(75)}
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
            onChange={(e) => setTargetPhase(parseInt(e.target.value))}
            className="styled-slider"
          />
          <div className="slider-labels">
            <span>10% (Early Systole)</span>
            <span className="optimal">70% (Diastasis - Minimal Motion)</span>
            <span>90% (Late Diastole)</span>
          </div>
        </div>

        {/* Signal Settings (Sampling rate, Heart rate, Noise) */}
        <div className="signal-config-subcard">
          <div className="subcard-header">
            <div className="subcard-title">
              <Settings2 size={14} className="icon-burgundy" />
              <span>Dummy Signal Generator Parameters</span>
            </div>
          </div>

          <div className="signal-inputs-row">
            <div className="input-group">
              <label>Sampling Rate</label>
              <select 
                value={samplingRate} 
                onChange={(e) => setSamplingRate(parseInt(e.target.value))}
                className="styled-select"
              >
                <option value={125}>125 Hz</option>
                <option value={250}>250 Hz (Default)</option>
                <option value={500}>500 Hz</option>
              </select>
            </div>

            <div className="input-group">
              <label>Heart Rate ({heartRate} BPM)</label>
              <div className="slider-control-box">
                <input 
                  type="range" 
                  min="60" 
                  max="105" 
                  step="1"
                  value={heartRate} 
                  onChange={(e) => setHeartRate(parseInt(e.target.value))}
                  className="styled-slider-mini"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Noise Level</label>
              <select 
                value={noiseLevel} 
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                className="styled-select"
              >
                <option value={0}>0% (Clean)</option>
                <option value={0.02}>2% (Physiological)</option>
                <option value={0.05}>5% (Artifact)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Model Abstraction & Prototype Disclaimer Note (Section 3 & 14) */}
      <div className="prototype-disclaimer-box">
        <AlertCircle size={15} className="disclaimer-icon" />
        <div className="disclaimer-text">
          <strong>Architecture Abstraction Notice:</strong> Current signal is generated via <code>DummyECGSource</code>. 
          The interface is structured (<code>BaseECGSource → ModelECGSource</code>) so that when you integrate your trained 
          deep-learning R-peak model, only the signal source will be swapped without modifying the ECG viewer, 
          trigger engine, database, or vessel analyzer.
        </div>
      </div>

      {/* Bottom Action Strip (Upload CSV, Trigger Capture, View Images) */}
      <div className="panel-actions-strip">
        <div className="actions-left-group">
          <label className="upload-csv-label" title="Upload custom ECG time series CSV">
            <UploadCloud size={14} />
            <span>{uploadedFileName ? `CSV: ${uploadedFileName}` : 'Upload ECG CSV'}</span>
            <input 
              type="file" 
              accept=".csv,.txt" 
              onChange={handleCsvUpload} 
              className="hidden-file-input" 
            />
          </label>
        </div>

        <div className="actions-right-group">
          <button 
            type="button" 
            className="btn-outline-burgundy-sm"
            onClick={handleSaveAndCaptureSession}
            disabled={isLoading}
          >
            <Zap size={13} />
            <span>Capture Gated Frames</span>
          </button>

          <button 
            type="button" 
            className="btn-outline-burgundy-sm"
            onClick={() => {
              fetchLatestCapturedImages();
              setIsImagesModalOpen(true);
            }}
          >
            <Film size={13} />
            <span>View Images ({capturedImages.length})</span>
          </button>

          {onSelectFrame && (
            <button 
              type="button"
              className="btn-burgundy-sm select-frame-cta-btn"
              onClick={() => onSelectFrame(selectedFrame, gatedTriggerData)}
            >
              <Sparkles size={14} />
              <span>Select Frame #{selectedFrame} for Vessel AI</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW CAPTURED IMAGES MODAL (Section 11) */}
      {isImagesModalOpen && (
        <div className="images-modal-backdrop" onClick={() => setIsImagesModalOpen(false)}>
          <div className="images-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Film size={20} className="icon-burgundy" />
                <div>
                  <h3 className="modal-title">ECG-Gated Captured Images</h3>
                  <span className="modal-subtitle">
                    Motion-synchronized angiography frames stored per virtual trigger event
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                className="close-modal-btn"
                onClick={() => setIsImagesModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {isLoadingImages ? (
                <div className="loading-state">Loading captured frames...</div>
              ) : capturedImages.length === 0 ? (
                <div className="empty-state">
                  <p>No captured frames found in current session.</p>
                  <button 
                    type="button" 
                    className="btn-burgundy-sm" 
                    onClick={handleSaveAndCaptureSession}
                  >
                    Generate Gated Frame Captures
                  </button>
                </div>
              ) : (
                <div className="captured-images-grid">
                  {capturedImages.map((img, idx) => (
                    <div key={img.image_id || idx} className="captured-image-card">
                      <div className="card-thumb-wrap">
                        <img 
                          src={img.image_url || angiogramSample} 
                          alt={`Trigger Frame #${img.frame_number}`}
                          onError={(e) => {
                            if (!e.currentTarget.dataset.retried && img.image_url && img.image_url.startsWith('/api')) {
                              e.currentTarget.dataset.retried = 'true';
                              e.currentTarget.src = `http://127.0.0.1:5000${img.image_url}`;
                            } else {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = angiogramSample;
                            }
                          }}
                        />
                        <span className="frame-num-badge">Frame #{img.frame_number}</span>
                      </div>

                      <div className="card-meta">
                        <div className="meta-line">
                          <span className="meta-tag">Image #{idx + 1}</span>
                          <span className="meta-time">{roundNum(img.trigger_timestamp || 0, 2)}s</span>
                        </div>
                        <div className="meta-specs">
                          <span>Phase: <strong>{img.target_phase || 70}%</strong></span>
                          <span>HR: <strong>74 BPM</strong></span>
                          <span>RR: <strong>811 ms</strong></span>
                        </div>

                        <div className="card-actions-row">
                          <button 
                            type="button" 
                            className="btn-outline-burgundy-mini"
                            onClick={() => handleSelectCapturedImage(img)}
                            title="Load in AngiogramViewer"
                          >
                            <Eye size={12} />
                            <span>View Image</span>
                          </button>

                          <button 
                            type="button" 
                            className="btn-burgundy-mini"
                            onClick={() => {
                              handleSelectCapturedImage(img);
                              if (onRunVesselAnalysisOnFrame) {
                                onRunVesselAnalysisOnFrame(img.frame_number);
                              }
                            }}
                            title="Send frame through existing AngioLens vessel & stenosis models"
                          >
                            <Sparkles size={12} />
                            <span>Analyze Vessel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <span className="modal-footer-note">
                ⚡ Click <strong>View Image</strong> to inspect in viewer or <strong>Analyze Vessel</strong> to feed frame into existing AI pipeline.
              </span>
              <button 
                type="button" 
                className="btn-outline-burgundy-sm"
                onClick={() => setIsImagesModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #FFF2F5;
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ecg-panel-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.2px;
          margin: 0;
        }

        .source-abstraction-badge {
          background: #FEF3C7;
          color: #B45309;
          border: 1px solid #FDE68A;
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
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
          flex-shrink: 0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
          min-width: 95px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .pulsing-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulseGreen 1.6s infinite;
          flex-shrink: 0;
        }

        @keyframes pulseGreen {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .trigger-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          background: #FEF3C7;
          color: #D97706;
          border: 1px solid #FDE68A;
          min-width: 145px;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .trigger-badge.firing {
          background: #EF4444;
          color: #FFFFFF;
          border-color: #DC2626;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          /* Transform scale removed to prevent badge fluttering and layout shifts */
        }

        .view-images-btn-top {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #FFF0F3;
          color: var(--burgundy-primary);
          border: 1px solid var(--burgundy-primary);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .view-images-btn-top:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        /* Canvas Container */
        .ecg-canvas-container {
          background: #06090F;
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

        .canvas-lead-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lead-tag {
          font-size: 11px;
          color: #38BDF8;
          font-family: monospace;
          font-weight: 700;
        }

        .rate-tag, .mode-tag {
          font-size: 10px;
          color: #94A3B8;
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
          height: 145px;
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

        .has-video { color: #10B981 !important; }
        .no-video { color: #94A3B8 !important; }

        .canvas-ctrls-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sim-toggle-btn, .sim-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
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

        .sim-toggle-btn:hover, .sim-reset-btn:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        /* Metrics Grid */
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
          font-size: 10px;
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
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .metric-subtext {
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Config Grid Row */
        .config-grid-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .phase-config-subcard, .signal-config-subcard {
          background: #FDF6F8;
          border: 1px solid #FCE7EB;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .subcard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .subcard-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .icon-burgundy {
          color: var(--burgundy-primary);
        }

        .preset-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .mini-preset {
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .mini-preset.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border-color: var(--burgundy-primary);
        }

        .styled-slider {
          width: 100%;
          accent-color: var(--burgundy-primary);
          cursor: pointer;
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: var(--text-muted);
        }

        .slider-labels .optimal {
          color: var(--burgundy-primary);
          font-weight: 700;
        }

        .signal-inputs-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          align-items: end;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .input-group label {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .styled-select {
          height: 36px;
          font-size: 11.5px;
          font-weight: 500;
          padding: 0 28px 0 10px;
          border: 1px solid var(--burgundy-border, #DFA0AF);
          border-radius: 6px;
          background-color: #FFFFFF;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23851036' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          appearance: none;
          -webkit-appearance: none;
          color: var(--text-main);
          cursor: pointer;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .styled-select:focus {
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 2px rgba(133, 16, 54, 0.1);
        }

        .slider-control-box {
          height: 36px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border, #DFA0AF);
          border-radius: 6px;
          box-sizing: border-box;
          width: 100%;
        }

        .styled-slider-mini {
          width: 100%;
          accent-color: var(--burgundy-primary);
          cursor: pointer;
        }

        /* Disclaimer Box */
        .prototype-disclaimer-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 11px;
          color: #475569;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 8px 12px;
          border-radius: 6px;
          line-height: 1.4;
        }

        .disclaimer-icon {
          color: #F59E0B;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .disclaimer-text code {
          background: #E2E8F0;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10.5px;
        }

        /* Bottom Actions Strip */
        .panel-actions-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .actions-left-group, .actions-right-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .upload-csv-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-main);
          background: #F1F5F9;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px dashed #CBD5E1;
          transition: background 0.15s;
        }

        .upload-csv-label:hover {
          background: #E2E8F0;
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
          color: #FFFFFF !important;
          background-color: var(--burgundy-primary, #851036) !important;
          border: none;
          padding: 7px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .btn-burgundy-sm:hover {
          background-color: #6D0B2B !important;
          color: #FFFFFF !important;
          opacity: 1 !important;
          visibility: visible !important;
          box-shadow: 0 2px 8px rgba(133, 16, 54, 0.25);
        }

        /* MODAL STYLES (Section 11) */
        .images-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fadeIn 0.2s ease-out;
        }

        .images-modal-content {
          background: #FFFFFF;
          border-radius: 12px;
          width: 90%;
          max-width: 860px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #E2E8F0;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .modal-subtitle {
          font-size: 12px;
          color: var(--text-muted);
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .captured-images-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .captured-image-card {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          overflow: hidden;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }

        .card-thumb-wrap {
          position: relative;
          width: 100%;
          height: 140px;
          background: #0B0F17;
        }

        .card-thumb-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .frame-num-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.75);
          color: #F59E0B;
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .card-meta {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .meta-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .meta-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--burgundy-primary);
        }

        .meta-time {
          font-size: 10px;
          color: var(--text-muted);
          font-family: monospace;
        }

        .meta-specs {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-secondary);
          background: #F8FAFC;
          padding: 4px 6px;
          border-radius: 4px;
        }

        .card-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 4px;
        }

        .btn-outline-burgundy-mini {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--burgundy-primary);
          background: #FFF5F7;
          border: 1px solid var(--burgundy-primary);
          padding: 5px 6px;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-burgundy-mini {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: #FFFFFF !important;
          background-color: var(--burgundy-primary, #851036) !important;
          border: none;
          padding: 5px 6px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .btn-burgundy-mini:hover {
          background-color: #6D0B2B !important;
          color: #FFFFFF !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        .modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #F8FAFC;
        }

        .modal-footer-note {
          font-size: 11.5px;
          color: var(--text-muted);
        }

        @media (max-width: 1024px) {
          .ecg-metrics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .config-grid-row {
            grid-template-columns: 1fr;
          }
          .captured-images-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
