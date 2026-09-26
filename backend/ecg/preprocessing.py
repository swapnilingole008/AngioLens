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
    - timestamp,ecg (with or without headers)
    - time_sec,ecg,r_peak,...
    - ecg,time
    - semicolon or tab separated
    - single column ecg
    - handles quotes and Windows UTF-8 BOM
    Returns list of dicts: [{'timestamp': float, 'ecg': float}, ...]
    """
    if isinstance(csv_content, bytes):
        csv_content = csv_content.decode('utf-8-sig', errors='ignore')
    elif isinstance(csv_content, str) and csv_content.startswith('\ufeff'):
        csv_content = csv_content[1:]

    if not csv_content or not csv_content.strip():
        return []

    # Detect delimiter: comma, semicolon, tab
    first_few_lines = [l for l in csv_content.strip().splitlines() if l.strip()][:5]
    if not first_few_lines:
        return []

    sample_line = first_few_lines[0]
    delimiter = ','
    if ';' in sample_line and sample_line.count(';') > sample_line.count(','):
        delimiter = ';'
    elif '\t' in sample_line and sample_line.count('\t') > sample_line.count(','):
        delimiter = '\t'

    reader = csv.reader(io.StringIO(csv_content.strip()), delimiter=delimiter)
    rows = [r for r in reader if r and any(cell.strip() for cell in r)]
    if not rows:
        return []

    # Column identification
    time_names = {'time', 'time_sec', 'timestamp', 't', 'sec', 'seconds', 'time(s)', 'timesec'}
    ecg_names = {'ecg', 'signal', 'lead_ii', 'lead2', 'lead_2', 'voltage', 'val', 'value', 'raw', 'mv'}

    first_row = [c.strip().lower() for c in rows[0]]
    has_header = False

    time_idx = None
    ecg_idx = None

    for idx, col in enumerate(first_row):
        col_clean = col.replace('"', '').replace("'", "").strip()
        if col_clean in time_names and time_idx is None:
            time_idx = idx
            has_header = True
        elif col_clean in ecg_names and ecg_idx is None:
            ecg_idx = idx
            has_header = True

    if not has_header:
        # Check if first row contains non-numeric strings
        if not all(_is_float(c) for c in first_row if c.strip()):
            has_header = True

    start_idx = 1 if has_header else 0
    data_rows = rows[start_idx:]
    if not data_rows:
        return []

    # If column indices not found by explicit header name, inspect data
    first_data_cells = [c.strip() for c in data_rows[0] if c.strip()]
    num_cols = len(data_rows[0])

    if ecg_idx is None:
        if num_cols >= 2:
            if time_idx == 0:
                ecg_idx = 1
            elif time_idx == 1:
                ecg_idx = 0
            else:
                time_idx = 0
                ecg_idx = 1
        else:
            ecg_idx = 0

    data = []
    sample_rate_dt = 0.004 # 250 Hz default step

    for row_idx, row in enumerate(data_rows):
        if not row:
            continue
        try:
            # Extract ECG value
            if ecg_idx is not None and ecg_idx < len(row):
                raw_ecg_str = row[ecg_idx].strip()
                if not raw_ecg_str:
                    continue
                ecg_val = float(raw_ecg_str)
            else:
                continue

            # Extract Timestamp
            if time_idx is not None and time_idx < len(row):
                raw_time_str = row[time_idx].strip()
                t_val = float(raw_time_str) if raw_time_str else (row_idx * sample_rate_dt)
            else:
                t_val = row_idx * sample_rate_dt

            data.append({'timestamp': round(t_val, 4), 'ecg': ecg_val})
        except (ValueError, TypeError):
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
