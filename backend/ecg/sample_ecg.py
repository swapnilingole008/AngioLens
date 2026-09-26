"""
Sample ECG Data Generator and Loader
Provides standard Lead-II clinical ECG time series for instant simulation and evaluation.
Generates realistic P-Q-R-S-T complexes at physiological heart rate (e.g. 74 BPM).
"""

import math
import os

def generate_synthetic_ecg(duration_sec=10.0, sample_rate=250.0, heart_rate_bpm=74.0):
    """
    Generates a realistic synthetic Lead-II ECG signal using a multi-Gaussian model
    representing standard P-wave, Q-wave, R-peak, S-wave, and T-wave.
    """
    total_samples = int(duration_sec * sample_rate)
    rr_sec = 60.0 / float(heart_rate_bpm)
    data = []

    # Wave component parameters (offset_ratio, amplitude_mV, width_sec)
    # Relative to R-peak at offset 0.0
    p_wave = (-0.18, 0.18, 0.040)
    q_wave = (-0.05, -0.15, 0.015)
    r_wave = (0.00, 1.25, 0.020)
    s_wave = (0.05, -0.35, 0.025)
    t_wave = (0.24, 0.32, 0.070)

    waves = [p_wave, q_wave, r_wave, s_wave, t_wave]

    # Baseline drift sinusoid (breathing artifact ~ 0.2 Hz)
    for i in range(total_samples):
        t = i / sample_rate
        # Cardiac cycle phase within current RR
        phase_t = (t % rr_sec)
        # Shift so R peak is at roughly 0.35 * rr_sec
        r_center = 0.35 * rr_sec
        cycle_dt = phase_t - r_center

        val = 0.0
        for offset, amp, width in waves:
            dt = cycle_dt - offset
            val += amp * math.exp(-0.5 * (dt / width) ** 2)

        # Baseline wander (~0.05 mV)
        wander = 0.04 * math.sin(2 * math.pi * 0.22 * t)
        # Low amplitude high freq noise
        noise = 0.01 * math.sin(2 * math.pi * 48.0 * t)

        ecg_val = round(val + wander + noise, 4)
        data.append({
            "timestamp": round(t, 4),
            "ecg": ecg_val
        })

    return data


def get_default_sample_ecg():
    """
    Returns pre-generated 10-second 250Hz sample ECG data.
    """
    return generate_synthetic_ecg(duration_sec=10.0, sample_rate=250.0, heart_rate_bpm=74.0)


def export_sample_ecg_csv(target_filepath):
    """
    Saves the default sample ECG to a CSV file.
    """
    os.makedirs(os.path.dirname(target_filepath), exist_ok=True)
    samples = get_default_sample_ecg()
    with open(target_filepath, 'w', encoding='utf-8') as f:
        f.write("timestamp,ecg\n")
        for p in samples:
            f.write(f"{p['timestamp']:.4f},{p['ecg']:.4f}\n")
    return target_filepath
