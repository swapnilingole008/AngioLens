import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function DashboardCard({ 
  icon: IconComponent, 
  title, 
  description, 
  onClick 
}) {
  return (
    <div className="dashboard-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="card-icon-container">
        <IconComponent size={24} className="card-icon" />
      </div>

      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{description}</p>
      </div>

      <button className="card-arrow-btn" aria-label={`Open ${title}`}>
        <ArrowRight size={18} />
      </button>

      <style>{`
        .dashboard-card {
          background-color: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          border-radius: var(--radius-lg);
          padding: 22px 24px;
          display: flex;
          align-items: flex-start;
          gap: 18px;
          position: relative;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--card-shadow);
          user-select: none;
        }

        .dashboard-card:hover {
          border-color: #E3A8B6;
          box-shadow: var(--card-shadow-hover);
          transform: translateY(-2px);
        }

        .card-icon-container {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background-color: var(--pink-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--burgundy-primary);
          transition: transform 0.2s ease;
        }

        .dashboard-card:hover .card-icon-container {
          transform: scale(1.05);
          background-color: var(--pink-surface-hover);
        }

        .card-icon {
          color: var(--burgundy-primary);
        }

        .card-content {
          flex: 1;
          padding-right: 28px;
        }

        .card-title {
          font-size: 16.5px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 6px;
          letter-spacing: -0.2px;
        }

        .card-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
          font-weight: 450;
        }

        .card-arrow-btn {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--pink-surface);
          border: none;
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dashboard-card:hover .card-arrow-btn {
          background-color: var(--burgundy-primary);
          color: #FFFFFF;
          transform: translateX(3px);
        }
      `}</style>
    </div>
  );
}
