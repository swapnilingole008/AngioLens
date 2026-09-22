import React from 'react';

export default function CircularGauge({ 
  label, 
  value = 68, 
  statusText = 'Moderate', 
  color = '#851036', 
  trackColor = '#FDECEF',
  textColor = 'inherit'
}) {
  const size = 80;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="gauge-card">
      <span className="gauge-label">{label}</span>
      <div className="gauge-circle-container">
        <svg width={size} height={size} className="gauge-svg">
          {/* Background Track Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Colored Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <span className="gauge-value">{value}%</span>
      </div>
      <span className="gauge-status" style={{ color: textColor || color }}>
        {statusText}
      </span>

      <style>{`
        .gauge-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .gauge-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .gauge-circle-container {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px 0;
        }

        .gauge-svg {
          transform: rotate(0deg);
        }

        .gauge-value {
          position: absolute;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }

        .gauge-status {
          font-size: 12.5px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
