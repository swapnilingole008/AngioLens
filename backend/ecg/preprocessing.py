"""
ECG Preprocessing Module
Handles parsing of time-series ECG data (CSV/JSON), baseline wander removal,
noise attenuation, and signal normalization.
"""

import io
import csv
import math

def parse_ecg_csv(csv_content):
    """
    Parses a CSV string or file-like object containing timestamp and ecg values.
    Supports formats:
    - timestamp,ecg
    - time,voltage
    - time,signal
    - or simply 2 numeric columns without headers
    Returns list of dicts: [{'timestamp': float, 'ecg': float}, ...]
    """
    if isinstance(csv_content, bytes):
        csv_content = csv_content.decode('utf-8', errors='ignore')

    lines = [line.strip() for line in csv_content.strip().splitlines() if line.strip()]
    if not lines:
        return []

    data = []
    has_header = False

    # Check first line for non-numeric column headers
    first_row = [col.strip().lower() for col in lines[0].split(',')]
    if any(col in ('timestamp', 'time', 't', 'ecg', 'signal', 'lead_ii', 'voltage', 'val') for col in first_row):
        has_header = True
    elif not all(_is_float(c) for c in first_row if c):
        has_header = True

    start_idx = 1 if has_header else 0

    for idx, line in enumerate(lines[start_idx:], start=start_idx):
        parts = [p.strip() for p in line.split(',') if p.strip()]
        if len(parts) >= 2:
            try:
                t = float(parts[0])
                val = float(parts[1])
                data.append({'timestamp': round(t, 4), 'ecg': val})
            except ValueError:
                continue
        elif len(parts) == 1:
            try:
                val = float(parts[0])
                # Impute timestamp at 250Hz default if only 1 column
                t = round((idx - start_idx) * 0.004, 4)
                data.append({'timestamp': t, 'ecg': val})
            except ValueError:
                continue

    return data

def _is_float(val):
    try:
        float(val)
        return True
    except (ValueError, TypeError):
        return False

def preprocess_ecg_signal(data_points, sample_rate=250.0):
    """
    Cleans ECG signal:
    1. Removes DC offset and baseline wandering via running window mean subtraction.
    2. Attenuates high-frequency noise with a lightweight smoothing filter.
    3. Normalizes amplitude to unit range for robust R-peak detection.
    """
    if not data_points:
        return []

    raw_values = [p['ecg'] for p in data_points]
    timestamps = [p['timestamp'] for p in data_points]
    n = len(raw_values)

    # 1. Baseline wander subtraction (moving window of ~0.4s to 0.6s)
    window_size = max(3, int(sample_rate * 0.4))
    if window_size % 2 == 0:
        window_size += 1
    half_w = window_size // 2

    baseline = []
    # Prefix cumulative sum for O(N) rolling mean
    cum = [0.0]
    for v in raw_values:
        cum.append(cum[-1] + v)

    for i in range(n):
        start = max(0, i - half_w)
        end = min(n, i + half_w + 1)
        mean_val = (cum[end] - cum[start]) / (end - start)
        baseline.append(mean_val)

    detrended = [raw_values[i] - baseline[i] for i in range(n)]

    # 2. 5-point smoothing filter for high frequency muscle artifact suppression
    smoothed = []
    smooth_w = 3
    for i in range(n):
        s_start = max(0, i - smooth_w)
        s_end = min(n, i + smooth_w + 1)
        smoothed.append(sum(detrended[s_start:s_end]) / (s_end - s_start))

    # 3. Peak-to-peak normalization
    min_v = min(smoothed) if smoothed else 0.0
    max_v = max(smoothed) if smoothed else 1.0
    rng = max_v - min_v if (max_v - min_v) > 1e-6 else 1.0

    normalized = [(v - min_v) / rng for v in smoothed]

    processed = []
    for i in range(n):
        processed.append({
            'timestamp': timestamps[i],
            'ecg': round(raw_values[i], 4),
            'filtered_ecg': round(normalized[i], 4)
        })

    return processed
