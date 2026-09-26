# CardioAI

CardioAI is an AI-assisted cardiac analysis platform evolved from the initial AngioLens implementation. The project combines the existing clinical analysis workflow with a new ECG-Gated Imaging Trigger feature for ECG signal analysis.

## Project Overview

CardioAI provides a web-based backend and dashboard for patient and physician workflows, clinical analysis records, and AI-assisted results.

The initial implementation includes:

- Doctor registration and credential verification
- Doctor login and profile management
- Password reset with OTP
- Admin portal for doctor application review
- Patient management
- Clinical analysis record management
- AI result storage
- Physician review and verification
- Email notifications through SMTP
- PostgreSQL database integration

The new feature adds an ECG-Gated Imaging Trigger prototype.

### ECG-Gated Imaging Trigger

The ECG module accepts an ECG CSV recording and processes it to:

1. Load and validate the ECG signal
2. Preprocess the signal
3. Detect ECG R-peaks
4. Calculate RR intervals
5. Estimate heart rate
6. Determine cardiac-cycle timing
7. Generate a configurable virtual imaging trigger
8. Display the ECG waveform with R-peaks and trigger markers

The virtual trigger is a software signal for research/demo purposes. It is not intended to directly control clinical imaging equipment.

---

## Core Workflow

### Existing CardioAI Workflow

```text
Doctor
  |
  v
Authentication
  |
  v
Patient
  |
  v
Clinical Analysis
  |
  v
AI Result
  |
  v
Doctor Review
  |
  v
Verified Analysis
```

### New ECG Workflow

```text
ECG CSV
   |
   v
Flask API
   |
   v
CSV Validation
   |
   v
ECG Preprocessing
   |
   v
R-Peak Detection
   |
   v
RR Interval Calculation
   |
   v
Heart Rate
   |
   v
Cardiac Cycle Phase
   |
   v
Virtual Imaging Trigger
   |
   v
Database + Dashboard
```

---

## ECG-Gated Imaging Trigger

The purpose of the ECG feature is to synchronize a virtual imaging event with a selected point in the cardiac cycle.

For the MVP, the trigger is generated after each detected R-peak using a configurable delay.

Default:

```text
Trigger delay = 100 ms
```

Conceptually:

```text
R-peak
   |
   |---- 100 ms ----|
                    |
                    v
             Virtual Trigger
```

The system does not communicate with or control a real CT, MRI, angiography, or other imaging system.

---

## Dataset

The initial ECG model can be trained using the:

**MIT-BIH Arrhythmia Database**

Source:

https://physionet.org/content/mitdb/1.0.0/

The database provides ECG recordings together with expert beat annotations.

Typical files include:

```text
100.dat
100.hea
100.atr

101.dat
101.hea
101.atr
...
```

Where:

- `.dat` = ECG waveform data
- `.hea` = recording metadata
- `.atr` = expert annotations

The annotations can be used as ground truth for R-peak/beat detection.

---

## ECG Model

The initial model architecture uses a lightweight 1D CNN.

```text
ECG Window
    |
    v
Conv1D
    |
    v
Batch Normalization
    |
    v
Max Pooling
    |
    v
Conv1D
    |
    v
Batch Normalization
    |
    v
Max Pooling
    |
    v
Conv1D
    |
    v
Global Average Pooling
    |
    v
Dense
    |
    v
Sigmoid
    |
    v
R-Peak Probability
```

The trained model is saved as:

```text
rpeak_model.keras
```

A post-processing stage should be used after model inference to avoid detecting multiple peaks around the same heartbeat.

---

## Suggested Project Structure

```text
CardioAI/
│
├── app.py
│
├── models/
│   └── rpeak_model.keras
│
├── services/
│   └── ecg_processor.py
│
├── templates/
│   ├── ...
│   └── ecg_analysis.html
│
├── static/
│   ├── css/
│   └── js/
│       └── ecg_analysis.js
│
├── data/
│   └── ecg_uploads/
│
├── train_rpeak_model.py
├── download_dataset.py
├── requirements.txt
├── .env
└── README.md
```

The exact structure should follow the existing CardioAI/AngioLens repository architecture rather than unnecessarily duplicating directories.

---

## Backend

The backend is built with Flask.

Existing functionality includes database models for:

- Users
- Doctor applications
- Password reset OTPs
- Patients
- Analyses
- Analysis results
- Doctor reviews

The database uses PostgreSQL through SQLAlchemy.

### Existing API Areas

Examples of existing API functionality include:

```text
/api/health
/api/db-test

/api/signup
/api/login
/api/profile

/api/auth/change-password
/api/auth/forgot-password
/api/auth/reset-password

/api/doctor-applications

/api/admin/login
/api/admin/applications

/api/patients
/api/patients/<patient_id>

/api/analyses
/api/analyze
/api/analyses/<analysis_id>
/api/analyses/latest

/api/analyses/<analysis_id>/review
```

The existing coronary/clinical analysis functionality should remain compatible with the ECG feature.

---

# New ECG API

## Analyze ECG

```http
POST /api/ecg/analyze
```

Content type:

```text
multipart/form-data
```

Fields:

```text
file
patient_id
sampling_rate
trigger_delay_ms
```

Example:

```text
file = ecg_record.csv
patient_id = PAT-001
sampling_rate = 360
trigger_delay_ms = 100
```

---

## ECG Analysis Response

A successful response can contain:

```json
{
  "success": true,
  "analysis_id": 123,

  "ecg": {
    "sampling_rate": 360,
    "duration_seconds": 30.2,
    "sample_count": 10872
  },

  "r_peaks": {
    "count": 35,
    "indices": [],
    "times": []
  },

  "heart_rate": {
    "average_bpm": 69.8,
    "min_bpm": 62.1,
    "max_bpm": 77.4
  },

  "rr_intervals": [],

  "triggers": {
    "delay_ms": 100,
    "indices": [],
    "times": []
  },

  "model": {
    "type": "ECG R-Peak Detector",
    "version": "ecg-mvp-1.0"
  }
}
```

Large ECG recordings should be processed at full resolution on the backend while avoiding unnecessarily large JSON responses to the browser.

---

# ECG CSV Format

The preferred input format is:

```csv
timestamp,ecg
0.000,0.12
0.003,0.14
0.006,0.13
0.008,0.18
...
```

Other reasonable column names may be supported, such as:

```csv
time,voltage
```

or:

```csv
sample,signal
```

The backend should validate the signal column and reject malformed or empty files.

---

# ECG Processing

The initial processing pipeline is:

```text
Raw ECG
   |
   v
Remove invalid samples
   |
   v
Bandpass filtering
   |
   v
Normalization
   |
   v
Model inference
   |
   v
R-peak candidates
   |
   v
Peak post-processing
   |
   v
Final R-peaks
```

A typical ECG bandpass range for the prototype is approximately:

```text
0.5 Hz - 40 Hz
```

The actual implementation should remain configurable where appropriate.

---

# R-Peak Detection

The model predicts whether a short ECG window corresponds to an R-peak.

The output is a probability:

```text
0.0 → unlikely R-peak
1.0 → likely R-peak
```

A post-processing step converts these probabilities into final R-peak positions.

The post-processing should enforce a physiological minimum distance between consecutive detections.

---

# Heart Rate

After R-peaks are detected:

```text
RR interval = R(i+1) - R(i)
```

Heart rate can then be estimated using:

```text
Heart Rate = 60 / RR interval
```

when RR is expressed in seconds.

The system can report:

- Average BPM
- Minimum BPM
- Maximum BPM
- Individual RR intervals

---

# Cardiac Cycle Phase

Between two consecutive R-peaks, the normalized cardiac-cycle phase can be represented as:

```text
0.0 → immediately after R-peak
1.0 → immediately before next R-peak
```

This provides a simple representation of the current position within each heartbeat.

---

# Virtual Imaging Trigger

For the MVP:

```text
Trigger Time = R-Peak Time + Trigger Delay
```

Default:

```text
100 ms
```

Example:

```text
R-peak = 1.250 s

Trigger delay = 0.100 s

Virtual trigger = 1.350 s
```

The trigger is only a software event in this prototype.

---

# Frontend

The ECG analysis dashboard should provide:

- Patient ID input
- CSV upload
- Sampling-rate input
- Trigger-delay input
- Analyze button
- Processing status
- ECG waveform
- R-peak markers
- Virtual trigger markers
- Average heart rate
- RR interval information
- Recording duration
- Number of detected R-peaks

Plotly.js can be used for interactive ECG visualization.

Example visualization:

```text
Amplitude
   |
   |        /\                 /\
   |       /  \       /\      /  \
   |______/____\_____/__\____/____\____ Time
           R       R       R
           |       |       |
           T       T       T

R = R-peak
T = Virtual imaging trigger
```

---

# Training the ECG Model

Install dependencies:

```bash
pip install wfdb numpy scipy pandas scikit-learn tensorflow matplotlib
```

Download the MIT-BIH dataset:

```bash
python download_dataset.py
```

Train:

```bash
python train_rpeak_model.py
```

The trained model should be generated as:

```text
rpeak_model.keras
```

Move/copy it into:

```text
models/rpeak_model.keras
```

---

# Recommended Training Strategy

R-peak samples are much less frequent than ordinary ECG samples.

Therefore, the training dataset should be balanced.

Recommended:

```text
Positive samples:
R-peak windows

Negative samples:
Non-R-peak windows sufficiently far from annotated peaks
```

A roughly balanced dataset is preferable to training on every ECG sample without addressing class imbalance.

The MIT-BIH annotations should be treated as the ground-truth labels for the initial experiment.

---

# Running CardioAI

Create and configure the `.env` file according to the existing project configuration.

Example database variables:

```env
DATABASE_URL=postgresql://username:password@host/database
SECRET_KEY=your-secret-key
```

Then install dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask server:

```bash
python app.py
```

Open the application in a browser using the host/port configured by the project.

---

# Testing the ECG Feature

1. Start CardioAI.
2. Open the ECG analysis page.
3. Select or enter a patient ID.
4. Upload an ECG CSV.
5. Enter the sampling rate if it is not included in the file.
6. Set the trigger delay.
7. Click **Analyze ECG**.
8. Wait for processing.
9. Inspect the ECG waveform.
10. Verify R-peak markers.
11. Verify virtual trigger markers.
12. Check calculated heart rate and RR intervals.
13. Verify that the analysis is stored and can be retrieved.

---

# Validation

The ECG model should not be evaluated using accuracy alone.

Recommended metrics include:

- Precision
- Recall/Sensitivity
- F1-score
- R-peak detection error
- Mean absolute timing error
- False positives per minute
- Missed beats

For ECG trigger applications, timing accuracy of detected R-peaks is particularly important.

---

# Future Scope

Potential future extensions include:

- Real-time ECG streaming
- WebSocket-based live ECG processing
- Hardware ECG acquisition
- Improved R-peak detection models
- 1D CNN + LSTM architectures
- Transformer-based ECG models
- Multi-lead ECG support
- Arrhythmia detection
- Adaptive trigger timing
- Cardiac-phase-specific image acquisition
- DICOM integration
- Imaging-system integration through appropriate interfaces
- Real-time trigger monitoring
- Model confidence visualization
- ECG quality assessment
- Patient-specific calibration
- Clinical validation

---

# Safety and Scope

CardioAI is a prototype/research software project.

The ECG-Gated Imaging Trigger is a virtual software trigger and must not be treated as a clinically validated cardiac synchronization device.

The prototype must not be connected directly to clinical imaging equipment without appropriate hardware isolation, validation, regulatory review, and safety controls.

AI predictions and ECG-derived measurements should be reviewed and validated by appropriately qualified professionals before any clinical use.

---

# Technology Stack

## Backend

- Python
- Flask
- SQLAlchemy
- PostgreSQL

## ECG / AI

- NumPy
- Pandas
- SciPy
- WFDB
- TensorFlow / Keras
- Scikit-learn

## Frontend

- HTML
- CSS
- JavaScript
- Plotly.js

## Data

- MIT-BIH Arrhythmia Database
- ECG CSV recordings

---

# Development Roadmap

## Phase 1 — Existing Platform

- Authentication
- Doctor verification
- Patient management
- Analysis management
- Physician review
- PostgreSQL integration

## Phase 2 — ECG MVP

- ECG CSV upload
- CSV validation
- ECG preprocessing
- R-peak detection
- RR interval calculation
- Heart-rate calculation
- Virtual trigger generation
- ECG visualization

## Phase 3 — AI R-Peak Model

- MIT-BIH dataset preparation
- Balanced training samples
- 1D CNN training
- Model evaluation
- Model export
- Flask model inference

## Phase 4 — Real-Time Prototype

- ECG streaming
- Real-time R-peak detection
- Real-time cardiac-cycle tracking
- Real-time virtual trigger generation

## Phase 5 — Research Expansion

- Multi-lead ECG
- Better temporal models
- Trigger timing optimization
- ECG quality monitoring
- DICOM/imaging workflow research
- Formal validation

---

# Project Name

**CardioAI**

AI-assisted cardiac analysis and ECG-gated imaging trigger research platform.
