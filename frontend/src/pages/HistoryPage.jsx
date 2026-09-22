import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, FileText, ChevronRight, Loader2 } from 'lucide-react';
import api from '../api';

export default function HistoryPage({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await api.getHistory();
        if (isMounted) {
          if (res?.records && Array.isArray(res.records)) {
            setRecords(res.records);
          } else {
            setRecords([]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch history from database:', err);
        if (isMounted) {
          setRecords([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, []);

  const filtered = records.filter((r) => {
    const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'severe') return matchesSearch && r.severity === 'Severe';
    if (filter === 'moderate') return matchesSearch && r.severity === 'Moderate';
    if (filter === 'verified') return matchesSearch && r.verified;
    return matchesSearch;
  });

  return (
    <div className="history-page-container">
      {/* Top Header */}
      <div className="history-header">
        <div>
          <h1 className="history-title">Analysis History</h1>
          <p className="history-sub">Review and audit previous angiogram evaluations and clinical verifications</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="history-controls">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or Patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-pill-group">
            {['all', 'severe', 'moderate', 'verified'].map((f) => (
              <button
                key={f}
                className={`filter-pill ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Table Card */}
      <div className="angio-card history-table-card">
        <table className="history-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Date & Time</th>
              <th>Culprit Vessel</th>
              <th>Stenosis / Severity</th>
              <th>AI Conf.</th>
              <th>Status</th>
              <th className="th-action">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="history-empty-cell">
                  <div className="history-loading-container">
                    <Loader2 size={26} className="history-spinner" />
                    <span className="history-loading-title">Loading patient records from database...</span>
                    <span className="history-loading-sub">Connecting to PostgreSQL and fetching analyses</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="history-empty-cell">
                  <div className="history-empty-container">
                    <FileText size={36} className="history-empty-icon" />
                    <span className="history-empty-title">No patient records found</span>
                    <span className="history-empty-sub">
                      {searchTerm || filter !== 'all'
                        ? 'No records match your search or filter criteria. Try clearing filters.'
                        : 'No angiogram analysis records exist in the database yet.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr 
                  key={item.id + (item.analysis_id || '')} 
                  className="history-row" 
                  onClick={() => {
                    if (item.analysis_id) api.setCurrentAnalysisId(item.analysis_id);
                    onNavigate('/results');
                  }}
                >
                  <td>
                    <span className="patient-code">{item.id}</span>
                  </td>
                  <td>
                    <div className="patient-name-cell">
                      <span className="name">{item.name}</span>
                      <span className="meta">{item.age} Y • {item.gender}</span>
                    </div>
                  </td>
                  <td>
                    <span className="date-text">{item.date}</span>
                  </td>
                  <td>
                    <span className="vessel-tag">{item.vessel}</span>
                  </td>
                  <td>
                    <div className="stenosis-cell">
                      <span className={`stenosis-val ${item.severity?.toLowerCase() || 'moderate'}`}>
                        {item.stenosis}
                      </span>
                      <span className={`severity-badge ${item.severity?.toLowerCase() || 'moderate'}`}>
                        {item.severity}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="confidence-pill">{item.confidence}</span>
                  </td>
                  <td>
                    {item.verified ? (
                      <span className="status-badge verified">Verified ✓</span>
                    ) : (
                      <span className="status-badge pending">Pending</span>
                    )}
                  </td>
                  <td className="td-action">
                    <button 
                      className="action-link-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.analysis_id) api.setCurrentAnalysisId(item.analysis_id);
                        onNavigate('/results');
                      }}
                    >
                      <span>View</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .history-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
        }

        .history-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .history-sub {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .history-controls {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          width: 260px;
        }

        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 13px;
          padding-left: 8px;
          font-family: inherit;
        }

        .search-icon {
          color: var(--text-muted);
        }

        .filter-pill-group {
          display: flex;
          gap: 6px;
          background: #F8EDF0;
          padding: 3px;
          border-radius: var(--radius-pill);
        }

        .filter-pill {
          border: none;
          background: transparent;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .filter-pill.active {
          background: var(--burgundy-primary);
          color: #FFFFFF;
        }

        .history-table-card {
          padding: 0;
          overflow: hidden;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .history-table th {
          text-align: left;
          padding: 14px 18px;
          background-color: #FAF1F3;
          color: var(--text-secondary);
          font-weight: 700;
          border-bottom: 1px solid var(--burgundy-border);
        }

        .history-row {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .history-row:hover {
          background-color: #FFF9FA;
        }

        .history-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #F6E2E7;
          color: var(--text-main);
          vertical-align: middle;
        }

        .patient-code {
          font-weight: 700;
          color: var(--burgundy-primary);
          background: var(--pink-surface);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .patient-name-cell {
          display: flex;
          flex-direction: column;
        }

        .patient-name-cell .name {
          font-weight: 600;
          color: var(--text-main);
        }

        .patient-name-cell .meta {
          font-size: 11px;
          color: var(--text-muted);
        }

        .date-text {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .vessel-tag {
          font-weight: 600;
          font-size: 12px;
        }

        .stenosis-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stenosis-val {
          font-weight: 700;
        }

        .stenosis-val.severe { color: #DC2626; }
        .stenosis-val.moderate { color: var(--burgundy-primary); }
        .stenosis-val.mild { color: #059669; }

        .severity-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .severity-badge.severe {
          background: #FEE2E2;
          color: #DC2626;
        }

        .severity-badge.moderate {
          background: var(--pink-surface);
          color: var(--burgundy-primary);
        }

        .severity-badge.mild {
          background: #ECFDF5;
          color: #059669;
        }

        .confidence-pill {
          font-weight: 600;
          color: var(--text-secondary);
        }

        .status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .status-badge.verified {
          background: #ECFDF5;
          color: #059669;
        }

        .status-badge.pending {
          background: #FFFBEB;
          color: #D97706;
        }

        .action-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: var(--burgundy-primary);
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }

        .action-link-btn:hover {
          text-decoration: underline;
        }

        .history-empty-cell {
          text-align: center;
          padding: 56px 20px !important;
          background: #FFFFFF;
        }

        .history-loading-container,
        .history-empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .history-spinner {
          color: var(--burgundy-primary);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .history-loading-title,
        .history-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
        }

        .history-loading-sub,
        .history-empty-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          max-width: 380px;
          line-height: 1.4;
        }

        .history-empty-icon {
          color: var(--burgundy-primary);
          opacity: 0.4;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
