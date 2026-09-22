import React, { useState } from 'react';
import { Play } from 'lucide-react';

export default function PatientDetails({ onRunAnalysis }) {
  const [patientId, setPatientId] = useState('PAT-00123');
  const [age, setAge] = useState('56');
  const [gender, setGender] = useState('Male');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onRunAnalysis) {
      onRunAnalysis({ patientId, age, gender, notes });
    }
  };

  return (
    <form className="patient-details-form" onSubmit={handleSubmit}>
      <h3 className="patient-details-title">Patient Details (Optional)</h3>

      {/* Row with Patient ID, Age, Gender */}
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Patient ID</label>
          <input
            type="text"
            className="form-input"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Age</label>
          <input
            type="number"
            className="form-input"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Gender</label>
          <div className="select-wrapper">
            <select
              className="form-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Add any relevant notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        ></textarea>
      </div>

      {/* Full Width Run Analysis CTA */}
      <button type="submit" className="btn-burgundy run-analysis-btn">
        <Play size={16} fill="currentColor" />
        <span>Run Analysis</span>
      </button>

      <style>{`
        .patient-details-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 14px;
        }

        .patient-details-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 2px;
          letter-spacing: -0.1px;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.65fr) minmax(0, 1.15fr);
          gap: 10px;
          width: 100%;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .form-input, .form-select, .form-textarea {
          background-color: #FAF2F4;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          background-color: #FFFFFF;
          border-color: var(--burgundy-primary);
          box-shadow: 0 0 0 3px rgba(133, 16, 54, 0.08);
        }

        .select-wrapper {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .form-select {
          width: 100%;
          cursor: pointer;
          appearance: auto;
          min-width: 0;
          box-sizing: border-box;
        }

        .form-textarea {
          resize: vertical;
          min-height: 64px;
        }

        .run-analysis-btn {
          width: 100%;
          padding: 12px;
          font-size: 15px;
          border-radius: var(--radius-sm);
          margin-top: 6px;
          background-color: var(--burgundy-primary);
          box-shadow: 0 4px 12px rgba(133, 16, 54, 0.25);
        }

        .run-analysis-btn:hover {
          background-color: var(--burgundy-dark);
        }
      `}</style>
    </form>
  );
}
