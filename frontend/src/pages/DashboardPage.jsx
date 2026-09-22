import React from 'react';
import { 
  UploadCloud, 
  BarChart2, 
  FileText, 
  Clock, 
  BookOpen, 
  Users 
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import BottomStrip from '../components/BottomStrip';
import heartImg from '../assets/images/heart-illustration.png';

export default function DashboardPage({ onNavigate }) {
  const cards = [
    // Row 1
    {
      icon: UploadCloud,
      title: 'Upload Angiogram',
      description: 'Upload an angiogram image or video to begin analysis.',
      path: '/upload'
    },
    {
      icon: BarChart2,
      title: 'Results',
      description: 'AI detects vessels, identifies narrowing, and estimates severity.',
      path: '/results'
    },
    {
      icon: FileText,
      title: 'View Report',
      description: 'See highlighted vessels, narrowing regions, and detailed analysis report.',
      path: '/reports'
    },
    // Row 2
    {
      icon: Users,
      title: 'Manage Patients',
      description: 'View and manage patient clinical records and history.',
      path: '/history'
    },
    {
      icon: BookOpen,
      title: 'Resources',
      description: 'Explore guides, anatomical maps, FAQs and documentation.',
      path: '/resources'
    },
    {
      icon: Clock,
      title: 'History',
      description: 'Access and audit your previous angiogram evaluations anytime.',
      path: '/history'
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Top Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content-left">
          <h1 className="welcome-title">
            Welcome, <span className="burgundy-highlight">Doctor!</span>
          </h1>
          <p className="welcome-subtitle">
            Use AI to analyze coronary angiograms and get instant insights.
          </p>
          <div className="welcome-quote-wrapper">
            <span className="script-quote">"Better insights. Healthier hearts."</span>
            <div className="quote-underline"></div>
          </div>
        </div>

        {/* Center ECG & Heart Art */}
        <div className="welcome-banner-center">
          <svg className="banner-ecg-line" viewBox="0 0 320 60" preserveAspectRatio="none">
            <path
              d="M 0,30 L 70,30 L 80,15 L 90,45 L 100,5 L 110,40 L 120,30 L 170,30 M 230,30 L 260,30 L 270,12 L 280,48 L 290,10 L 300,38 L 310,30 L 320,30"
              fill="none"
              stroke="#E5B2BD"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          <div className="banner-heart-wrapper">
            <img src={heartImg} alt="Heart Illustration" className="banner-heart-img" />
          </div>
        </div>

        {/* Right Decorative Script Quote */}
        <div className="welcome-content-right">
          <div className="beat-matters-text">
            <span>Every</span>
            <span>Beat</span>
            <span>Matters</span>
          </div>
          <div className="beat-matters-underline"></div>
        </div>
      </div>

      {/* 3x2 Action Cards Grid */}
      <div className="action-cards-grid">
        {cards.map((card, idx) => (
          <DashboardCard
            key={idx}
            icon={card.icon}
            title={card.title}
            description={card.description}
            onClick={() => onNavigate(card.path)}
          />
        ))}
      </div>

      {/* Bottom Information Strip */}
      <BottomStrip />

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Welcome Banner */
        .welcome-banner {
          background-color: #FFFFFF;
          border: 1.5px solid var(--burgundy-border);
          border-radius: var(--radius-xl);
          padding: 28px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          box-shadow: var(--card-shadow);
          overflow: hidden;
        }

        .welcome-content-left {
          display: flex;
          flex-direction: column;
          z-index: 2;
          max-width: 480px;
        }

        .welcome-title {
          font-size: 34px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.8px;
          margin-bottom: 6px;
        }

        .burgundy-highlight {
          color: var(--burgundy-primary);
        }

        .welcome-subtitle {
          font-size: 14.5px;
          color: var(--text-secondary);
          margin-bottom: 18px;
          font-weight: 500;
        }

        .welcome-quote-wrapper {
          display: flex;
          flex-direction: column;
        }

        .welcome-banner-center {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 140px;
          margin: 0 20px;
        }

        .banner-ecg-line {
          position: absolute;
          width: 100%;
          height: 60px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          opacity: 0.85;
        }

        .banner-heart-wrapper {
          position: relative;
          z-index: 2;
          width: 130px;
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-heart-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 6px 16px rgba(133, 16, 54, 0.16));
        }

        .welcome-content-right {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          z-index: 2;
          min-width: 110px;
        }

        .beat-matters-text {
          display: flex;
          flex-direction: column;
          font-family: var(--font-script);
          font-size: 26px;
          font-weight: 700;
          color: var(--burgundy-primary);
          line-height: 1.05;
        }

        .beat-matters-underline {
          width: 38px;
          height: 2px;
          background-color: var(--burgundy-primary);
          border-radius: 2px;
          margin-top: 8px;
        }

        /* 3x2 Grid */
        .action-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        @media (max-width: 1200px) {
          .action-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .welcome-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 20px;
          }
          .welcome-banner-center {
            display: none;
          }
          .action-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
