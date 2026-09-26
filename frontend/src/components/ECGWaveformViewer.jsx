import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Activity, MousePointerClick } from 'lucide-react';

/**
 * ECGWaveformViewer
 * 
 * Interactive clinical ECG waveform canvas that:
 * 1. Renders the actual uploaded ECG signal on a calibrated clinical ECG grid
 * 2. Visualizes exact CardioAI model detected R-peaks (R1, R2, R3...)
 * 3. Shows R-peak timestamps (e.g. 1.24 s) and model confidence (e.g. 99.9%)
 * 4. Enables interactive clicking on R-peaks to trigger synchronized video frame display
 */
export default function ECGWaveformViewer({
  waveformSamples = [],
  rPeaks = [],
  selectedPeakIndex = 0,
  onSelectPeak,
  samplingRate = 360,
  duration = 10.0,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Time window view state for zooming and panning across the recording
  const [viewStart, setViewStart] = useState(0); // in seconds
  const [viewDuration, setViewDuration] = useState(duration > 0 ? Math.min(duration, 5.0) : 5.0); // display 5s by default
  const [hoveredPeakIndex, setHoveredPeakIndex] = useState(null);
  const [mousePos, setMousePos] = useState(null);

  // Determine total signal time
  const totalTime = useMemo(() => {
    if (duration && duration > 0) return duration;
    if (waveformSamples.length > 0) {
      return waveformSamples[waveformSamples.length - 1].time || (waveformSamples.length / samplingRate);
    }
    return 10.0;
  }, [duration, waveformSamples, samplingRate]);

  // Adjust view bounds safely
  useEffect(() => {
    if (totalTime < viewDuration) {
      setViewDuration(totalTime);
    }
  }, [totalTime]);

  // When selectedPeak changes from outside, scroll view if necessary to keep peak visible
  useEffect(() => {
    if (rPeaks && rPeaks[selectedPeakIndex]) {
      const peakTime = rPeaks[selectedPeakIndex].timestamp;
      if (peakTime < viewStart || peakTime > viewStart + viewDuration) {
        const newStart = Math.max(0, Math.min(totalTime - viewDuration, peakTime - viewDuration / 2));
        setViewStart(newStart);
      }
    }
  }, [selectedPeakIndex, rPeaks, viewDuration, totalTime]);

  // Compute min and max amplitude for vertical scaling
  const { minAmp, maxAmp } = useMemo(() => {
    if (!waveformSamples || waveformSamples.length === 0) {
      return { minAmp: -1.0, maxAmp: 2.0 };
    }
    let min = Infinity;
    let max = -Infinity;
    // Sample evenly across samples to get min/max
    const step = Math.max(1, Math.floor(waveformSamples.length / 500));
    for (let i = 0; i < waveformSamples.length; i += step) {
      const v = waveformSamples[i].amplitude;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === Infinity || max === -Infinity || max - min < 0.2) {
      min = -1.0;
      max = 2.0;
    }
    const padding = (max - min) * 0.25;
    return { minAmp: min - padding, maxAmp: max + padding };
  }, [waveformSamples]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw ECG Paper Background
    ctx.fillStyle = '#FFF8FA'; // Subtle warm medical tint
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Clinical ECG Grid Lines
    // Standard ECG: small square = 0.04s, large square = 0.2s
    const viewEnd = viewStart + viewDuration;
    const timeSpan = viewDuration;

    // Helper functions for mapping (time, amp) -> (x, y)
    const timeToX = (t) => ((t - viewStart) / timeSpan) * width;
    const ampToY = (a) => height - ((a - minAmp) / (maxAmp - minAmp)) * (height - 30) - 15;

    // Minor grid (every 0.04 sec)
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#FAD2DC';
    const minorStep = 0.04;
    const firstMinor = Math.floor(viewStart / minorStep) * minorStep;
    ctx.beginPath();
    for (let t = firstMinor; t <= viewEnd; t += minorStep) {
      const x = timeToX(t);
      if (x >= 0 && x <= width) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    }
    ctx.stroke();

    // Major grid (every 0.20 sec)
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#F4A7B9';
    const majorStep = 0.2;
    const firstMajor = Math.floor(viewStart / majorStep) * majorStep;
    ctx.beginPath();
    for (let t = firstMajor; t <= viewEnd; t += majorStep) {
      const x = timeToX(t);
      if (x >= 0 && x <= width) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    }
    // Horizontal grid lines
    const ySteps = 10;
    for (let i = 0; i <= ySteps; i++) {
      const y = (i / ySteps) * height;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Draw ECG Waveform
    if (waveformSamples.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#851036'; // AngioLens Primary Deep Burgundy
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let started = false;
      for (let i = 0; i < waveformSamples.length; i++) {
        const pt = waveformSamples[i];
        if (pt.time < viewStart - 0.1) continue;
        if (pt.time > viewEnd + 0.1) break;

        const x = timeToX(pt.time);
        const y = ampToY(pt.amplitude);

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // 4. Draw Detected R-Peaks
    rPeaks.forEach((peak, idx) => {
      if (peak.timestamp < viewStart - 0.2 || peak.timestamp > viewEnd + 0.2) return;

      const peakX = timeToX(peak.timestamp);
      // Interpolate amplitude from signal if not directly on peak
      let peakAmp = maxAmp * 0.7;
      if (waveformSamples.length > 0) {
        // Find closest sample
        const closest = waveformSamples.reduce((prev, curr) => 
          Math.abs(curr.time - peak.timestamp) < Math.abs(prev.time - peak.timestamp) ? curr : prev
        );
        peakAmp = closest.amplitude;
      }
      const peakY = ampToY(peakAmp);

      const isSelected = idx === selectedPeakIndex;
      const isHovered = idx === hoveredPeakIndex;

      // Vertical guide line down from peak
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = isSelected ? '#C92A54' : (isHovered ? '#851036' : 'rgba(133, 16, 54, 0.4)');
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX, height - 20);
      ctx.stroke();
      ctx.restore();

      // Pulsing outer halo for selected peak
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(peakX, peakY, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 42, 84, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(peakX, peakY, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(133, 16, 54, 0.4)';
        ctx.fill();
      }

      // Pin circle on peak
      ctx.beginPath();
      ctx.arc(peakX, peakY, isSelected ? 6.5 : (isHovered ? 5.5 : 4.5), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#C92A54' : (isHovered ? '#851036' : '#851036');
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Text Badge above R-peak: R1, R2...
      const badgeY = Math.max(24, peakY - (isSelected ? 26 : 20));
      const peakLabel = `R${peak.peak_num || (idx + 1)}`;
      ctx.font = isSelected ? 'bold 13px Inter, sans-serif' : 'bold 11px Inter, sans-serif';
      const textWidth = ctx.measureText(peakLabel).width;
      const badgeWidth = textWidth + 14;
      const badgeHeight = isSelected ? 20 : 17;

      // Badge pill background
      ctx.fillStyle = isSelected ? '#851036' : (isHovered ? '#C92A54' : '#FFFFFF');
      ctx.beginPath();
      ctx.roundRect(peakX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 8);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isSelected ? '#851036' : '#C92A54';
      ctx.stroke();

      // Badge label text
      ctx.fillStyle = isSelected ? '#FFFFFF' : (isHovered ? '#FFFFFF' : '#851036');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(peakLabel, peakX, badgeY);

      // Subtitle below badge: timestamp (e.g. 1.24s)
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = isSelected ? '#851036' : '#555555';
      const timeStr = `${peak.timestamp.toFixed(2)}s`;
      ctx.fillText(timeStr, peakX, badgeY + badgeHeight / 2 + 10);

      // Down arrow pointing from badge to pin
      ctx.beginPath();
      ctx.moveTo(peakX - 3, badgeY + badgeHeight / 2);
      ctx.lineTo(peakX + 3, badgeY + badgeHeight / 2);
      ctx.lineTo(peakX, badgeY + badgeHeight / 2 + 3);
      ctx.closePath();
      ctx.fillStyle = isSelected ? '#851036' : '#C92A54';
      ctx.fill();
    });

    // 5. Time axis bottom labels
    ctx.fillStyle = '#666666';
    ctx.font = '10.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let t = firstMajor; t <= viewEnd; t += majorStep * 2) {
      const x = timeToX(t);
      if (x >= 20 && x <= width - 20) {
        ctx.fillText(`${t.toFixed(1)}s`, x, height - 3);
      }
    }
  }, [
    waveformSamples,
    rPeaks,
    selectedPeakIndex,
    hoveredPeakIndex,
    viewStart,
    viewDuration,
    minAmp,
    maxAmp
  ]);

  // Handle canvas clicks to select closest R-peak
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !rPeaks || rPeaks.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickTime = viewStart + (clickX / width) * viewDuration;

    // Find nearest peak within click tolerance (~0.25 seconds or 40 pixels)
    let closestIdx = 0;
    let minDiff = Infinity;
    rPeaks.forEach((p, idx) => {
      const diff = Math.abs(p.timestamp - clickTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    if (onSelectPeak) {
      onSelectPeak(rPeaks[closestIdx], closestIdx);
    }
  };

  // Handle mouse move for hover detection
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !rPeaks || rPeaks.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;
    const mouseTime = viewStart + (mouseX / width) * viewDuration;

    let nearest = null;
    let minDiff = Infinity;
    rPeaks.forEach((p, idx) => {
      const diff = Math.abs(p.timestamp - mouseTime);
      if (diff < minDiff && diff < (0.2 * viewDuration) / 5) {
        minDiff = diff;
        nearest = idx;
      }
    });
    setHoveredPeakIndex(nearest);
  };

  const handleMouseLeave = () => {
    setHoveredPeakIndex(null);
  };

  // Navigation handlers
  const handleZoomIn = () => {
    setViewDuration((prev) => Math.max(1.5, prev * 0.75));
  };

  const handleZoomOut = () => {
    setViewDuration((prev) => Math.min(totalTime, prev * 1.33));
  };

  const handleResetView = () => {
    setViewStart(0);
    setViewDuration(Math.min(totalTime, 5.0));
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setViewStart(val);
  };

  const selectedPeak = rPeaks[selectedPeakIndex];

  return (
    <div className="ecg-waveform-viewer-container" ref={containerRef}>
      {/* Top Controls Bar */}
      <div className="ecg-viewer-header">
        <div className="ecg-header-left">
          <div className="ecg-title-badge">
            <Activity size={18} className="ecg-pulse-icon" />
            <span className="ecg-title-text">Lead II ECG Waveform & Exact Detected R-Peaks</span>
          </div>
          <span className="ecg-sampling-tag">
            Sampling: {samplingRate} Hz • CardioAI Model Inference
          </span>
        </div>

        <div className="ecg-header-right">
          <div className="ecg-zoom-controls">
            <button 
              type="button" 
              className="ecg-tool-btn" 
              onClick={handleZoomIn} 
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button 
              type="button" 
              className="ecg-tool-btn" 
              onClick={handleZoomOut} 
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button 
              type="button" 
              className="ecg-tool-btn" 
              onClick={handleResetView} 
              title="Reset View"
              aria-label="Reset View"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Waveform Canvas */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="ecg-canvas"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          title="Click on any R-peak marker to highlight and view its captured video frame"
        />
        
        {/* Floating Instruction Pill */}
        <div className="canvas-instruction-pill">
          <MousePointerClick size={14} />
          <span>Click any <strong>R-Peak marker</strong> to view synchronized angiography frame</span>
        </div>
      </div>

      {/* Time scrubber slider if duration > viewDuration */}
      {totalTime > viewDuration && (
        <div className="ecg-scrubber-bar">
          <span className="scrubber-label">Timeline: 0.0s</span>
          <input
            type="range"
            min="0"
            max={Math.max(0, totalTime - viewDuration)}
            step="0.05"
            value={viewStart}
            onChange={handleSliderChange}
            className="ecg-timeline-slider"
          />
          <span className="scrubber-label">{totalTime.toFixed(1)}s</span>
        </div>
      )}

      {/* Current Selected R-Peak Quick Summary Pill */}
      {selectedPeak && (
        <div className="selected-peak-quick-bar">
          <div className="quick-bar-item">
            <span className="item-label">Active R-Peak:</span>
            <span className="item-val highlight">R-Peak #{selectedPeak.peak_num || (selectedPeakIndex + 1)}</span>
          </div>
          <div className="quick-divider">•</div>
          <div className="quick-bar-item">
            <span className="item-label">ECG Timing:</span>
            <span className="item-val">{selectedPeak.timestamp?.toFixed(2)} sec</span>
          </div>
          <div className="quick-divider">•</div>
          <div className="quick-bar-item">
            <span className="item-label">Video Frame:</span>
            <span className="item-val">Frame #{selectedPeak.frame_number} (~{selectedPeak.frame_timestamp?.toFixed(2)}s)</span>
          </div>
          <div className="quick-divider">•</div>
          <div className="quick-bar-item">
            <span className="item-label">Model Confidence:</span>
            <span className="item-val">{(selectedPeak.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

      <style>{`
        .ecg-waveform-viewer-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          box-shadow: var(--shadow-sm);
        }

        .ecg-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ecg-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ecg-title-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14.5px;
          color: var(--burgundy-primary);
        }

        .ecg-pulse-icon {
          color: var(--burgundy-primary);
          animation: pulseIcon 1.5s infinite ease-in-out;
        }

        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }

        .ecg-sampling-tag {
          font-size: 12px;
          color: var(--text-muted);
          background: #FFF2F5;
          padding: 3px 9px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--burgundy-border);
          font-weight: 500;
        }

        .ecg-zoom-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ecg-tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #FFF9FA;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-sm);
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 600;
          color: var(--burgundy-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ecg-tool-btn:hover {
          background: var(--burgundy-primary);
          color: #FFFFFF;
          border-color: var(--burgundy-primary);
        }

        .canvas-wrapper {
          position: relative;
          width: 100%;
          height: 240px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid #F4A7B9;
          cursor: pointer;
        }

        .ecg-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .canvas-instruction-pill {
          position: absolute;
          top: 10px;
          right: 12px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(4px);
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-pill);
          padding: 4px 10px;
          font-size: 11px;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
          pointer-events: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .canvas-instruction-pill strong {
          color: var(--burgundy-primary);
        }

        .ecg-scrubber-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 6px;
        }

        .scrubber-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-muted);
          min-width: 35px;
        }

        .ecg-timeline-slider {
          flex: 1;
          accent-color: var(--burgundy-primary);
          cursor: pointer;
          height: 5px;
        }

        .selected-peak-quick-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FFF9FA;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          font-size: 12.5px;
          flex-wrap: wrap;
        }

        .quick-bar-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .item-label {
          color: var(--text-muted);
          font-weight: 500;
        }

        .item-val {
          color: var(--text-main);
          font-weight: 600;
        }

        .item-val.highlight {
          color: var(--burgundy-primary);
          font-weight: 700;
        }

        .quick-divider {
          color: #D1D5DB;
        }
      `}</style>
    </div>
  );
}
