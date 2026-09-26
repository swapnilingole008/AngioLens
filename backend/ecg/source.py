"""
ECG Signal and R-Peak Source Abstraction
Separates the signal generation / acquisition and R-peak detection into a clean modular interface.

Architecture:
ECG Signal Source
       │
       ├── Dummy ECG Source       ← CURRENT (Demo / Simulation)
       │
       └── Model ECG Source       ← FUTURE (Pluggable AI Model)
"""

import math
import random

class BaseECGSource:
    """
    Abstract interface for ECG Signal Sources.
    Ensures that when a real trained AI model is integrated,
    none of the viewer, trigger engine, database, or UI code needs to change.
    """
    def __init__(self, sampling_rate=250, heart_rate=74, noise_level=0.02):
        self.sampling_rate = int(sampling_rate)
        self.heart_rate = float(heart_rate)
        self.noise_level = float(noise_level)
        self.source_type = "base"

    def get_signal_samples(self, duration_sec=10.0, start_time=0.0):
        raise NotImplementedError

    def detect_r_peaks(self, signal_samples):
        raise NotImplementedError

    def get_source_label(self):
        raise NotImplementedError


class DummyECGSource(BaseECGSource):
    """
    CURRENT: Simulation / Demo ECG Source.
    Continuously synthesizes realistic Lead-II ECG waveform morphology:
    - P wave (atrial depolarization)
    - QRS complex with sharp R-peak (ventricular depolarization)
    - T wave (ventricular repolarization)
    Supports configurable sampling rate, heart rate, and noise level.
    """

    def __init__(self, sampling_rate=250, heart_rate=74, noise_level=0.02):
        super().__init__(sampling_rate, heart_rate, noise_level)
        self.source_type = "dummy_simulation"

    def get_source_label(self):
        return {
            "source": "Demo Signal / Simulation Mode",
            "is_ai_model": False,
            "status": "Simulation Active",
            "disclaimer": "Demo / Simulation mode. AI R-peak model not yet loaded."
        }

    def get_signal_samples(self, duration_sec=10.0, start_time=0.0):
        """
        Generates realistic Lead-II continuous ECG waveform.
        """
        rr_sec = 60.0 / self.heart_rate
        total_points = int(duration_sec * self.sampling_rate)
        samples = []

        # Waveform Gaussian components: (time_offset_from_R, amplitude_mV, width_sec)
        p_wave = (-0.18, 0.18, 0.040)
        q_wave = (-0.05, -0.15, 0.015)
        r_wave = (0.00, 1.25, 0.020)
        s_wave = (0.05, -0.35, 0.025)
        t_wave = (0.24, 0.32, 0.070)
        components = [p_wave, q_wave, r_wave, s_wave, t_wave]

        for i in range(total_points):
            t = start_time + (i / self.sampling_rate)
            cycle_phase = (t % rr_sec)
            r_center = 0.35 * rr_sec
            dt_from_r = cycle_phase - r_center

            val = 0.0
            for offset, amp, width in components:
                dt = dt_from_r - offset
                val += amp * math.exp(-0.5 * (dt / width) ** 2)

            # Baseline wander (~0.2 Hz) and physiological noise
            wander = 0.04 * math.sin(2 * math.pi * 0.22 * t)
            noise = self.noise_level * (random.random() * 2 - 1)

            samples.append({
                "timestamp": round(t, 4),
                "ecg": round(val + wander + noise, 4)
            })

        return samples

    def detect_r_peaks(self, signal_samples):
        """
        Detects R-peaks from the generated or parsed ECG samples using
        a deterministic derivative/energy thresholding heuristic.
        Returns timestamps and clearly identified simulated confidence scores.
        """
        if not signal_samples or len(signal_samples) < 10:
            return []

        from .r_peak_detection import detect_r_peaks as heuristic_detector
        detected = heuristic_detector(signal_samples, sample_rate=self.sampling_rate)

        # Annotate clearly as simulation confidence
        for peak in detected:
            peak["is_simulated"] = True
            peak["confidence_source"] = "Simulation / Demo"

        return detected


class ModelECGSource(BaseECGSource):
    """
    FUTURE: Pluggable AI Model ECG Source.
    Interface ready for trained deep learning R-peak model (e.g. 1D-CNN or Transformer).
    When the actual model is provided, integrate its inference here.
    """

    def __init__(self, model_path=None, sampling_rate=250):
        super().__init__(sampling_rate=sampling_rate)
        self.source_type = "ai_model"
        self.model_path = model_path
        self.is_loaded = False

    def get_source_label(self):
        return {
            "source": "AI Model" if self.is_loaded else "AI Model (Pending Integration)",
            "is_ai_model": self.is_loaded,
            "status": "Ready for Model Weights"
        }

    def get_signal_samples(self, duration_sec=10.0, start_time=0.0):
        # Passes raw input stream or dataset
        raise NotImplementedError("AI Model ECG signal provider will be wired upon model integration.")

    def detect_r_peaks(self, signal_samples):
        """
        Future implementation:
        1. Convert signal_samples to tensor
        2. model.predict(tensor)
        3. return [{"timestamp": t, "confidence": conf}, ...]
        """
        raise NotImplementedError("AI Model inference pending integration.")


def get_ecg_source(source_type="dummy", sampling_rate=250, heart_rate=74, noise_level=0.02):
    """
    Factory to obtain current or future ECG source.
    """
    if source_type == "model":
        return ModelECGSource(sampling_rate=sampling_rate)
    return DummyECGSource(sampling_rate=sampling_rate, heart_rate=heart_rate, noise_level=noise_level)
