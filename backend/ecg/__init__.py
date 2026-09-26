"""
ECG Processing and Motion-Gated Imaging Trigger Module for AngioLens
Prototype implementation for hackathon problem statement:
'ECG-Gated Imaging Trigger: AI that continuously detects ECG R-peaks
and generates a virtual trigger signal synchronized to the cardiac cycle
for motion-gated imaging.'
"""

from .preprocessing import preprocess_ecg_signal, parse_ecg_csv
from .r_peak_detection import RPeakDetector, detect_r_peaks
from .cardiac_phase import calculate_rr_intervals, calculate_cardiac_phase, calculate_trigger_time
from .trigger import generate_virtual_triggers, synchronize_frame_with_trigger
from .sample_ecg import get_default_sample_ecg, generate_synthetic_ecg

__all__ = [
    'preprocess_ecg_signal',
    'parse_ecg_csv',
    'RPeakDetector',
    'detect_r_peaks',
    'calculate_rr_intervals',
    'calculate_cardiac_phase',
    'calculate_trigger_time',
    'generate_virtual_triggers',
    'synchronize_frame_with_trigger',
    'get_default_sample_ecg',
    'generate_synthetic_ecg',
]
