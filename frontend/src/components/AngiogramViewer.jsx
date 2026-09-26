import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Activity, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Zap, 
  Film 
} from 'lucide-react';
import angiogramSample from '../assets/images/angiogram-sample.jpg';
import CircularGauge from './CircularGauge';

export default function AngiogramViewer({ 
  onOpenFullReport,
  selectedFrame = 47,
  totalFrames = 120,
  fps = 30,
  virtualTrigger = null,
  isGatedMode = true,
  videoSrc = null,
  onPlaybackUpdate = null,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(selectedFrame || 47);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTriggerFlash, setShowTriggerFlash] = useState(false);

  const videoRef = useRef(null);
  const playbackTimerRef = useRef(null);

  // Sync selectedFrame from parent if it changes
  useEffect(() => {
    if (selectedFrame) {
      setCurrentFrame(selectedFrame);
    }
  }, [selectedFrame]);

  // Flash trigger highlight when frame matches gated trigger frame
  useEffect(() => {
    if (currentFrame === selectedFrame) {
      setShowTriggerFlash(true);
      const timer = setTimeout(() => setShowTriggerFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [currentFrame, selectedFrame]);

  // Frame sequence playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const intervalMs = Math.round(1000 / fps);
    playbackTimerRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev % totalFrames) + 1;
        const currentPlaybackTime = (next / fps);
        if (onPlaybackUpdate) {
          onPlaybackUpdate(currentPlaybackTime, next);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, fps, totalFrames, onPlaybackUpdate]);

  // Video element time sync if videoSrc is provided
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoSrc]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));
  const handleReset = () => setZoomLevel(1);

  const handleTogglePlay = () => setIsPlaying(prev => !prev);
  const handlePrevFrame = () => {
    setIsPlaying(false);
    setCurrentFrame(prev => (prev > 1 ? prev - 1 : totalFrames));
  };
  const handleNextFrame = () => {
    setIsPlaying(false);
    setCurrentFrame(prev => (prev < totalFrames ? prev + 1 : 1));
  };
  const handleJumpToGatedFrame = () => {
    setIsPlaying(false);
    setCurrentFrame(selectedFrame);
  };

  const currentTimeSec = ((currentFrame - 1) / fps).toFixed(2);
  const isAtGatedFrame = currentFrame === selectedFrame;

  // Realistic coronary cardiac pulsation motion simulation
  // At 70% phase (diastasis), vessel motion velocity is lowest
  const cardiacPhaseRatio = ((currentFrame % 30) / 30);
  const motionDisplacement = (currentFrame === selectedFrame) 
    ? 0 
    : Math.sin(cardiacPhaseRatio * 2 * Math.PI) * 2.2;

  return (
    <div className="angiogram-viewer-container">
      {/* Top Visualizer Area with Image & Metrics */}
      <div className="visualizer-row">
        {/* Main Angiogram Fluoroscopy Window */}
        <div className={`image-viewport ${isAtGatedFrame ? 'gated-frame-active' : ''}`}>
          <div 
            className="image-wrapper"
            style={{ 
              transform: `scale(${zoomLevel}) translate(0px, ${motionDisplacement}px)`, 
              transition: isPlaying ? 'none' : 'transform 0.2s ease' 
            }}
          >
            {videoSrc ? (
              <video 
                ref={videoRef}
                src={videoSrc}
                className="angiogram-img"
                loop
                muted
                playsInline
              />
            ) : (
              <img 
                src={angiogramSample} 
                alt="Coronary Angiogram with AI Overlay" 
                className="angiogram-img"
              />
            )}

            {/* SVG AI Vessel & Stenosis Annotation Overlay (Active on motion-gated frame or pause) */}
            <svg 
              className={`annotation-overlay ${(!isPlaying || isAtGatedFrame) ? 'visible' : 'dimmed'}`} 
              viewBox="0 0 500 500" 
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Main detected vessel branches (Green) */}
              <path
                d="M 230,150 Q 240,170 250,195 T 260,225"
                fill="none"
                stroke="#10B981"
                strokeWidth="4.5"
                strokeLinecap="round"
                filter="url(#greenGlow)"
              />
              
              {/* Critical Narrowing Segment on Proximal LAD (Red) */}
              <path
                d="M 260,225 Q 275,245 295,260"
                fill="none"
                stroke="#EF4444"
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#redGlow)"
              />

              {/* Distal LAD and Branches (Green) */}
              <path
                d="M 295,260 Q 320,300 340,360 T 355,440"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#greenGlow)"
              />
              <path
                d="M 315,290 Q 345,320 375,340 T 405,370"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="4 2"
                filter="url(#greenGlow)"
              />
              <path
                d="M 240,170 Q 200,210 180,260 T 170,360"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#greenGlow)"
              />
            </svg>
          </div>

          {/* Floating Top-Left: Frame Number & Playback Time Overlay */}
          <div className="viewer-frame-meta">
            <div className="frame-meta-item">
              <Film size={12} className="meta-icon" />
              <span>Frame: <strong>#{currentFrame}</strong> / {totalFrames}</span>
            </div>
            <div className="frame-meta-item">
              <span>Time: <strong>{currentTimeSec}s</strong></span>
            </div>
          </div>

          {/* Floating Center/Top Virtual Trigger Event Banner */}
          {isAtGatedFrame && (
            <div className={`virtual-trigger-banner ${showTriggerFlash ? 'flash' : ''}`}>
              <Zap size={14} className="zap-trigger-icon" />
              <span>
                VIRTUAL TRIGGER: MOTION-GATED FRAME #{selectedFrame} (
                {virtualTrigger?.cardiac_phase || 70}% PHASE)
              </span>
            </div>
          )}

          {/* Floating Top-Right Overlay Legend */}
          <div className="viewer-legend">
            <div className="legend-item">
              <span className="legend-indicator red"></span>
              <span className="legend-text">Narrowing detected</span>
            </div>
            <div className="legend-item">
              <span className="legend-indicator green"></span>
              <span className="legend-text">Detected vessel</span>
            </div>
            {isAtGatedFrame && (
              <div className="legend-item">
                <span className="legend-indicator gold"></span>
                <span className="legend-text">Motion-Gated Frame</span>
              </div>
            )}
          </div>

          {/* Floating Bottom-Right Controls (Playback + Zoom) */}
          <div className="viewer-controls">
            {/* Play / Pause */}
            <button 
              className={`ctrl-btn ${isPlaying ? 'active' : ''}`} 
              onClick={handleTogglePlay} 
              title={isPlaying ? 'Pause Playback' : 'Play Sequence'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>

            {/* Frame Step Back */}
            <button className="ctrl-btn" onClick={handlePrevFrame} title="Previous Frame">
              <SkipBack size={14} />
            </button>

            {/* Frame Step Forward */}
            <button className="ctrl-btn" onClick={handleNextFrame} title="Next Frame">
              <SkipForward size={14} />
            </button>

            {/* Snap to Gated Frame */}
            <button 
              className={`ctrl-btn gated-snap-btn ${isAtGatedFrame ? 'gated-active' : ''}`} 
              onClick={handleJumpToGatedFrame} 
              title={`Snap to Gated Frame #${selectedFrame}`}
            >
              <Zap size={14} />
            </button>

            <span className="ctrl-divider"></span>

            {/* Zoom In */}
            <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={15} />
            </button>

            {/* Zoom Out */}
            <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={15} />
            </button>

            {/* Reset Zoom */}
            <button className="ctrl-btn" onClick={handleReset} title="Reset View">
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* Right Metrics Panel */}
        <div className="metrics-column">
          {/* Severity Gauge */}
          <CircularGauge 
            label="Severity" 
            value={68} 
            statusText="Moderate" 
            color="#851036" 
            trackColor="#FCECEF" 
          />

          {/* Confidence Gauge */}
          <CircularGauge 
            label="Confidence" 
            value={92} 
            statusText="High" 
            color="#10B981" 
            textColor="#10B981" 
            trackColor="#E1F9EE" 
          />

          {/* Affected Vessel Card */}
          <div className="affected-vessel-card">
            <span className="vessel-label">Affected Vessel</span>
            <div className="vessel-title-row">
              <span className="vessel-indicator-icon">
                <Activity size={18} />
              </span>
              <span className="vessel-abbr">LAD</span>
            </div>
            <span className="vessel-full-name">(Left Anterior Descending)</span>
          </div>
        </div>
      </div>

      <style>{`
        .angiogram-viewer-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .visualizer-row {
          display: grid;
          grid-template-columns: 1fr 140px;
          gap: 16px;
        }

        .image-viewport {
          position: relative;
          background-color: #0A0D12;
          border-radius: var(--radius-md);
          overflow: hidden;
          height: 340px;
          border: 1px solid #E2E8F0;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .image-viewport.gated-frame-active {
          border-color: #F59E0B;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(0,0,0,0.5);
        }

        .image-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-origin: center center;
        }

        .angiogram-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .annotation-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        .annotation-overlay.visible {
          opacity: 1;
        }

        .annotation-overlay.dimmed {
          opacity: 0.35;
        }

        /* Floating Top-Left Frame Info */
        .viewer-frame-meta {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(11, 15, 23, 0.82);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10;
        }

        .frame-meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #94A3B8;
          font-family: monospace;
        }

        .frame-meta-item strong {
          color: #F8FAFC;
        }

        .meta-icon {
          color: var(--burgundy-primary);
        }

        /* Virtual Trigger Banner */
        .virtual-trigger-banner {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, rgba(133, 16, 54, 0.95), rgba(180, 83, 9, 0.95));
          color: #FFFFFF;
          border: 1px solid #F59E0B;
          border-radius: 20px;
          padding: 5px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.3px;
          box-shadow: 0 4px 12px rgba(180, 83, 9, 0.4);
          z-index: 12;
          animation: triggerBounce 0.4s ease-out;
        }

        .virtual-trigger-banner.flash {
          animation: triggerFlashAnim 0.8s ease-out;
        }

        @keyframes triggerFlashAnim {
          0% { transform: translateX(-50%) scale(1.1); box-shadow: 0 0 20px #F59E0B; }
          100% { transform: translateX(-50%) scale(1.0); }
        }

        @keyframes triggerBounce {
          0% { transform: translateX(-50%) translateY(-10px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .zap-trigger-icon {
          color: #FDE047;
          animation: spinPulse 1.2s infinite ease-in-out;
        }

        @keyframes spinPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        /* Floating Top-Right Overlay Legend */
        .viewer-legend {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(4px);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-indicator {
          width: 14px;
          height: 5px;
          border-radius: 3px;
        }

        .legend-indicator.red {
          background-color: #EF4444;
        }

        .legend-indicator.green {
          background-color: #10B981;
        }

        .legend-indicator.gold {
          background-color: #F59E0B;
        }

        .legend-text {
          font-size: 11.5px;
          font-weight: 600;
          color: #1E293B;
        }

        /* Bottom Controls */
        .viewer-controls {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 10;
        }

        .ctrl-btn {
          background: transparent;
          border: none;
          color: #FFFFFF;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .ctrl-btn.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .gated-snap-btn {
          color: #FDE047;
        }

        .gated-snap-btn.gated-active {
          background: #B45309;
          color: #FFFFFF;
        }

        .ctrl-divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 4px;
        }

        .metrics-column {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px 0;
          gap: 16px;
        }

        .affected-vessel-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 2px;
        }

        .vessel-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .vessel-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }

        .vessel-indicator-icon {
          color: var(--burgundy-primary);
          display: flex;
        }

        .vessel-abbr {
          font-size: 17px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.2px;
        }

        .vessel-full-name {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .visualizer-row {
            grid-template-columns: 1fr;
          }
          .metrics-column {
            flex-direction: row;
            justify-content: space-around;
          }
        }
      `}</style>
    </div>
  );
}
