import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Activity } from 'lucide-react';
import angiogramSample from '../assets/images/angiogram-sample.jpg';
import CircularGauge from './CircularGauge';

export default function AngiogramViewer({ onOpenFullReport }) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));
  const handleReset = () => setZoomLevel(1);

  return (
    <div className="angiogram-viewer-container">
      {/* Top Visualizer Area with Image & Metrics */}
      <div className="visualizer-row">
        {/* Main Angiogram Fluoroscopy Window */}
        <div className="image-viewport">
          <div 
            className="image-wrapper"
            style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease' }}
          >
            <img 
              src={angiogramSample} 
              alt="Coronary Angiogram with AI Overlay" 
              className="angiogram-img"
            />

            {/* SVG AI Vessel & Stenosis Annotation Overlay */}
            <svg className="annotation-overlay" viewBox="0 0 500 500" preserveAspectRatio="none">
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
          </div>

          {/* Floating Bottom-Right Controls */}
          <div className="viewer-controls">
            <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button className="ctrl-btn" onClick={handleReset} title="Reset View">
              <Maximize2 size={16} />
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
        }

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

        .legend-text {
          font-size: 11.5px;
          font-weight: 600;
          color: #1E293B;
        }

        .viewer-controls {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          padding: 4px 6px;
          border-radius: 6px;
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
          transition: background 0.15s;
        }

        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.2);
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
