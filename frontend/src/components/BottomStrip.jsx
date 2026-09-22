import React from 'react';
import { Target, Users, Heart } from 'lucide-react';

export default function BottomStrip() {
  return (
    <div className="bottom-dashboard-strip">
      <div className="strip-pillars">
        {/* Pillar 1: Accurate Analysis */}
        <div className="pillar-item">
          <div className="pillar-icon">
            <Target size={28} />
          </div>
          <div className="pillar-text">
            <span>Accurate</span>
            <span>Analysis</span>
          </div>
        </div>

        <div className="pillar-divider"></div>

        {/* Pillar 2: Supports Clinical Decisions */}
        <div className="pillar-item">
          <div className="pillar-icon">
            <Users size={28} />
          </div>
          <div className="pillar-text">
            <span>Supports</span>
            <span>Clinical Decisions</span>
          </div>
        </div>

        <div className="pillar-divider"></div>

        {/* Pillar 3: Better Patient Outcomes */}
        <div className="pillar-item">
          <div className="pillar-icon">
            <Heart size={28} fill="currentColor" />
          </div>
          <div className="pillar-text">
            <span>Better</span>
            <span>Patient Outcomes</span>
          </div>
        </div>
      </div>

      {/* Decorative Right Tagline */}
      <div className="strip-quote-container">
        <div className="strip-script-text">
          <span>AI Today</span>
          <span>Healthier Tomorrows</span>
        </div>
        <div className="strip-underline"></div>
      </div>

      <style>{`
        .bottom-dashboard-strip {
          background-color: #FDF1F3;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-lg);
          padding: 18px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 24px;
        }

        .strip-pillars {
          display: flex;
          align-items: center;
          gap: 36px;
        }

        .pillar-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .pillar-icon {
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pillar-text {
          display: flex;
          flex-direction: column;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.25;
          letter-spacing: -0.2px;
        }

        .pillar-divider {
          width: 1px;
          height: 38px;
          background-color: #F0CFD7;
        }

        .strip-quote-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .strip-script-text {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-family: var(--font-script);
          font-size: 24px;
          font-weight: 700;
          color: var(--burgundy-primary);
          line-height: 1.05;
        }

        .strip-underline {
          width: 44px;
          height: 2px;
          background-color: var(--burgundy-primary);
          border-radius: 2px;
          margin-top: 4px;
        }

        @media (max-width: 1024px) {
          .bottom-dashboard-strip {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }
          .strip-pillars {
            flex-wrap: wrap;
            gap: 20px;
          }
          .strip-divider {
            display: none;
          }
          .strip-quote-container {
            align-items: flex-start;
          }
          .strip-script-text {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
