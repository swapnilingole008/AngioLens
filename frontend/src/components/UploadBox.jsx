import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, X, Activity } from 'lucide-react';
import angiogramSample from '../assets/images/angiogram-sample.jpg';

export default function UploadBox({ onFileSelect }) {
  const [file, setFile] = useState({
    name: 'patient_001_angio.dcm',
    size: '12.4 MB',
    status: 'Uploaded successfully',
    preview: angiogramSample,
    isCsv: false,
  });
  const [isDragging, setIsDragging] = useState(false);

  const processSelectedFile = (selected) => {
    if (!selected) return;
    const isCsv = selected.name.toLowerCase().endsWith('.csv') || selected.name.toLowerCase().endsWith('.txt');
    const sizeStr = selected.size > 1024 * 1024
      ? `${(selected.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(selected.size / 1024).toFixed(1)} KB`;

    setFile({
      name: selected.name,
      size: sizeStr,
      status: isCsv ? 'ECG Recording Ready' : 'Uploaded successfully',
      isCsv,
      preview: isCsv ? null : angiogramSample,
      rawFile: selected,
    });
    if (onFileSelect) {
      onFileSelect(selected, { isEcgCsv: isCsv });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="upload-box-wrapper">
      {/* Dashed Drop Zone */}
      <label 
        className={`dashed-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processSelectedFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <input 
          type="file" 
          className="file-input-hidden" 
          accept=".dcm,.jpg,.jpeg,.png,.mp4,.csv,.txt" 
          onChange={handleFileChange}
        />
        <div className="upload-cloud-circle">
          <UploadCloud size={28} />
        </div>
        <p className="drop-title">Drag & drop your file here</p>
        <span className="drop-or">or</span>
        <button 
          type="button" 
          className="btn-burgundy choose-file-btn"
          onClick={(e) => {
            e.preventDefault();
            e.currentTarget.parentElement.querySelector('input').click();
          }}
        >
          <FileText size={16} />
          <span>Choose File</span>
        </button>
      </label>

      {/* Uploaded File Pill / Card */}
      {file && (
        <div className="uploaded-file-card">
          <div className={`file-thumbnail ${file.isCsv ? 'ecg-thumbnail' : ''}`}>
            {file.isCsv ? (
              <Activity size={24} className="ecg-thumb-icon" />
            ) : (
              <img src={file.preview} alt="Angiogram preview" />
            )}
          </div>

          <div className="file-metadata">
            <span className="filename">{file.name}</span>
            <span className="filesize">
              {file.size} • {file.status}
              {file.isCsv && <span className="csv-badge-pill">ECG Waveform</span>}
            </span>
          </div>

          <div className="file-actions">
            <CheckCircle2 size={22} className="check-success-icon" />
            <button className="remove-file-btn" onClick={removeFile} aria-label="Remove file">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .upload-box-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dashed-drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed var(--burgundy-border);
          border-radius: var(--radius-md);
          background-color: #FFF9FA;
          padding: 36px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .dashed-drop-zone:hover,
        .dashed-drop-zone.dragging {
          border-color: var(--burgundy-primary);
          background-color: #FFF2F5;
        }

        .file-input-hidden {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
        }

        .upload-cloud-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background-color: var(--pink-surface);
          color: var(--burgundy-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .drop-title {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 6px;
        }

        .drop-or {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .choose-file-btn {
          padding: 8px 18px;
          font-size: 13px;
          border-radius: 6px;
        }

        .uploaded-file-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          background-color: #FFFFFF;
          border: 1px solid var(--burgundy-border);
          border-radius: var(--radius-md);
          box-shadow: 0 1px 3px rgba(133, 16, 54, 0.04);
        }

        .file-thumbnail {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          overflow: hidden;
          background-color: #000000;
          flex-shrink: 0;
        }

        .file-thumbnail.ecg-thumbnail {
          background: linear-gradient(135deg, #851036 0%, #A31443 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
        }

        .ecg-thumb-icon {
          animation: pulse 2s infinite ease-in-out;
        }

        .csv-badge-pill {
          margin-left: 8px;
          padding: 2px 7px;
          background-color: rgba(133, 16, 54, 0.1);
          color: #851036;
          font-size: 11px;
          font-weight: 600;
          border-radius: 10px;
        }

        .file-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .file-metadata {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .filename {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        .filesize {
          font-size: 11.5px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .file-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .check-success-icon {
          color: #10B981;
          fill: #10B981;
          color: #FFFFFF;
        }

        .remove-file-btn {
          background: transparent;
          border: none;
          color: #98A2B3;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .remove-file-btn:hover {
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}
