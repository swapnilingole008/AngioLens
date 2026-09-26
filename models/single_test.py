from pathlib import Path
import argparse
import json

import numpy as np
import pandas as pd
import tensorflow as tf

from scipy.signal import butter, sosfiltfilt, find_peaks

FS = 360

DEFAULT_DURATION_SECONDS = 60
DEFAULT_SAMPLE_RATE_HZ = 10
DEFAULT_TARGET_PHASE_FRACTION = 0.75


def _peak_times_seconds(predicted_peaks, fs=FS):
    return np.asarray(predicted_peaks, dtype=np.float64) / fs


def _confidence_at_times(time_axis, centers, probabilities, fs=FS):
    centers = np.asarray(centers, dtype=np.int64)
    probabilities = np.asarray(probabilities, dtype=np.float64)

    sample_indices = np.round(time_axis * fs).astype(np.int64)

    right_positions = np.searchsorted(centers, sample_indices)
    right_positions = np.clip(right_positions, 0, len(centers) - 1)
    left_positions = np.clip(right_positions - 1, 0, len(centers) - 1)

    right_distance = np.abs(centers[right_positions] - sample_indices)
    left_distance = np.abs(sample_indices - centers[left_positions])

    use_left = left_distance < right_distance
    nearest_positions = np.where(use_left, left_positions, right_positions)

    return probabilities[nearest_positions]


def _rr_and_phase_at_times(time_axis, peak_times):
    n = len(time_axis)

    rr_interval_ms = np.full(n, np.nan, dtype=np.float64)
    target_phase = np.full(n, np.nan, dtype=np.float64)

    if len(peak_times) == 0:
        return rr_interval_ms, target_phase

    next_index = np.searchsorted(peak_times, time_axis, side="right")

    for i in range(n):
        t = time_axis[i]
        idx = next_index[i]

        prev_time = peak_times[idx - 1] if idx - 1 >= 0 else None
        next_time = peak_times[idx] if idx < len(peak_times) else None

        if prev_time is not None and next_time is not None:
            rr_seconds = next_time - prev_time
            rr = rr_seconds * 1000.0
            phase = (t - prev_time) / rr_seconds if rr_seconds > 0 else np.nan

        elif prev_time is not None and idx - 2 >= 0:
            prev_prev_time = peak_times[idx - 2]
            rr_seconds = prev_time - prev_prev_time
            rr = rr_seconds * 1000.0
            phase = (t - prev_time) / rr_seconds if rr_seconds > 0 else np.nan
            if not np.isnan(phase):
                phase = min(phase, 1.0)

        else:
            rr = np.nan
            phase = np.nan

        rr_interval_ms[i] = rr
        target_phase[i] = phase

    return rr_interval_ms, target_phase


def compute_dashboard_metrics(
    centers,
    probabilities,
    predicted_peaks,
    peak_confidences,
    fs=FS,
    duration_seconds=DEFAULT_DURATION_SECONDS,
    sample_rate_hz=DEFAULT_SAMPLE_RATE_HZ,
    target_phase_fraction=DEFAULT_TARGET_PHASE_FRACTION
):
    """
    Build dashboard-ready time series for ECG-gated imaging over a
    fixed-length window.

    Returns a dict of equal-length 1D numpy arrays, each with
    duration_seconds * sample_rate_hz points:

        time_s               seconds from the start of the window
        heart_rate_bpm        instantaneous heart rate (NaN where unknown)
        rr_interval_ms         RR interval backing that heart rate (NaN where unknown)
        r_peak_detected        1 where an R-peak landed in that time bin, else 0
        target_phase           cardiac cycle position in [0, 1) (NaN where unknown)
        confidence              calibrated R-peak probability at that moment
        trigger                 1 where target_phase crosses target_phase_fraction
        ideal_capture_moment    1 where this instant is the recommended moment
                                 to take the photo (alias of `trigger`, kept as
                                 its own field so downstream consumers don't
                                 have to know what "trigger" means)

    predicted_peaks / centers are sample indices at fs Hz (as produced
    by test.py's detect_peaks / create_windows). probabilities must be
    the same calibrated array test.py reports confidence from.

    `target_phase_fraction` (default 0.75) sets *where in the cardiac
    cycle* counts as the ideal photo moment. 0.75 means 75% of the way
    through the RR interval -- i.e. mid-to-late diastole, just before
    the next heartbeat's contraction. This is the standard "quiet
    phase" used for cardiac-gated imaging because the heart is moving
    the least there, minimizing motion blur in the photo/frame.
    """

    centers = np.asarray(centers, dtype=np.int64)
    probabilities = np.asarray(probabilities, dtype=np.float64)
    predicted_peaks = np.asarray(predicted_peaks, dtype=np.int64)

    n_points = int(round(duration_seconds * sample_rate_hz))
    time_axis = np.arange(n_points, dtype=np.float64) / sample_rate_hz

    peak_times = _peak_times_seconds(predicted_peaks, fs)
    peak_times = peak_times[peak_times < duration_seconds]

    rr_interval_ms, target_phase = _rr_and_phase_at_times(time_axis, peak_times)

    heart_rate_bpm = np.where(
        (~np.isnan(rr_interval_ms)) & (rr_interval_ms > 0),
        60000.0 / rr_interval_ms,
        np.nan
    )

    r_peak_detected = np.zeros(n_points, dtype=np.int8)

    if len(peak_times) > 0:
        bin_indices = np.round(peak_times * sample_rate_hz).astype(np.int64)
        bin_indices = np.clip(bin_indices, 0, n_points - 1)
        r_peak_detected[bin_indices] = 1

    confidence = _confidence_at_times(time_axis, centers, probabilities, fs)

    trigger = np.zeros(n_points, dtype=np.int8)
    valid_phase = ~np.isnan(target_phase)

    for i in range(1, n_points):
        if valid_phase[i] and valid_phase[i - 1]:
            if target_phase[i - 1] < target_phase_fraction <= target_phase[i]:
                trigger[i] = 1

    # Explicit "take the photo now" signal. Same values as `trigger`,
    # exposed under an unambiguous name for anything downstream that
    # only cares about "when do I fire the camera/scanner".
    ideal_capture_moment = trigger.copy()

    return {
        "time_s": time_axis,
        "heart_rate_bpm": heart_rate_bpm,
        "rr_interval_ms": rr_interval_ms,
        "r_peak_detected": r_peak_detected,
        "target_phase": target_phase,
        "confidence": confidence,
        "trigger": trigger,
        "ideal_capture_moment": ideal_capture_moment
    }


def get_ideal_capture_times(metrics):
    """
    Pull out the actual timestamps (seconds, from the start of the
    dashboard window) at which `compute_dashboard_metrics` says the
    heart is in its ideal position/phase to take a photo.

    This is the array the caller asked for: every entry is a moment
    that is safe/ideal to trigger image capture, in seconds.
    """

    time_axis = np.asarray(metrics["time_s"], dtype=np.float64)
    ideal_flags = np.asarray(metrics["ideal_capture_moment"], dtype=np.int8)

    return time_axis[ideal_flags == 1]


def metrics_to_json_serializable(metrics):
    """Convert a compute_dashboard_metrics() result into plain lists, with NaN -> None."""

    serializable = {}

    for key, values in metrics.items():
        values = np.asarray(values)

        if np.issubdtype(values.dtype, np.floating):
            serializable[key] = [
                None if np.isnan(v) else round(float(v), 4)
                for v in values
            ]
        else:
            serializable[key] = [int(v) for v in values]

    return serializable


def save_dashboard_json(metrics, path):
    payload = metrics_to_json_serializable(metrics)

    payload["ideal_capture_times_s"] = [
        round(float(t), 4)
        for t in get_ideal_capture_times(metrics)
    ]

    with open(path, "w") as f:
        json.dump(payload, f, indent=2)

    return Path(path)


WINDOW_SIZE = 90
HALF_WINDOW = WINDOW_SIZE // 2

DEFAULT_THRESHOLD = 0.50

MATCH_TOLERANCE_SECONDS = 0.075

MIN_PEAK_DISTANCE_SECONDS = 0.25

DEFAULT_TEMPERATURE = 1.0

SCRIPT_DIR = Path(__file__).resolve().parent

DEFAULT_MODEL = SCRIPT_DIR / "rpeak_model.keras"

DEFAULT_CSV = SCRIPT_DIR / "sample_ecg.csv"

DEFAULT_TEMPERATURE_PATH = SCRIPT_DIR / "models" / "temperature.json"

def bandpass_filter(signal, fs=FS):
    """Apply the same ECG bandpass filtering used during training."""

    sos = butter(
        3,
        [0.5, 40.0],
        btype="bandpass",
        fs=fs,
        output="sos"
    )

    return sosfiltfilt(sos, signal)

def normalize_signal(signal):
    """Apply z-score normalization."""

    mean = np.mean(signal)
    std = np.std(signal)

    if std < 1e-8:
        return signal - mean

    return (signal - mean) / std

def load_temperature(model_path, explicit_path=None):
    """
    Load the temperature-scaling value fit during training.

    Search order:
        1. --temperature-file, if explicitly given.
        2. A temperature.json next to the model file itself.
        3. The default models/temperature.json location.

    If none of these exist, calibration is skipped (temperature = 1.0),
    which reproduces the original, uncalibrated behavior.
    """

    candidates = []

    if explicit_path is not None:
        candidates.append(Path(explicit_path))

    model_path = Path(model_path)

    candidates.append(
        model_path.parent / "temperature.json"
    )

    candidates.append(
        DEFAULT_TEMPERATURE_PATH
    )

    for candidate in candidates:

        if candidate.exists():

            try:

                with open(candidate, "r") as f:
                    payload = json.load(f)

                temperature = float(
                    payload["temperature"]
                )

                print(
                    f"\nLoaded confidence calibration "
                    f"(temperature={temperature:.4f}) from:\n"
                    f"{candidate}"
                )

                return temperature

            except (
                json.JSONDecodeError,
                KeyError,
                ValueError
            ) as e:

                print(
                    f"\nCould not read temperature file "
                    f"{candidate}: {e}"
                )

    print(
        "\nNo temperature.json found. "
        "Confidence values will NOT be calibrated "
        "(temperature=1.0). Probabilities from this model "
        "can be overconfident, especially on clean or "
        "synthetic ECG. Re-run train.py to generate a "
        "calibration file."
    )

    return DEFAULT_TEMPERATURE

def apply_temperature_scaling(probabilities, temperature):
    """
    Rescale sigmoid probabilities by a temperature fit on held-out
    validation data.

    temperature == 1.0  -> no change (uncalibrated).
    temperature  > 1.0  -> probabilities pulled back toward 0.5
                           (softens overconfidence).
    temperature  < 1.0  -> probabilities pushed further from 0.5.

    This is a monotonic transform: it does not change which side of
    the 0.5 decision threshold any prediction falls on, so detected
    peaks and beat-level accuracy metrics are unaffected. It only
    changes how trustworthy the reported confidence values are.
    """

    if temperature == 1.0:
        return probabilities

    eps = 1e-7

    clipped = np.clip(
        probabilities,
        eps,
        1 - eps
    )

    logits = np.log(clipped / (1 - clipped))

    scaled_logits = logits / temperature

    return 1 / (1 + np.exp(-scaled_logits))

def load_csv(csv_path):
    """Load ECG CSV and automatically detect the ECG column."""

    csv_path = Path(csv_path)

    if not csv_path.exists():
        raise FileNotFoundError(
            f"CSV file not found:\n{csv_path}"
        )

    df = pd.read_csv(csv_path)

    if df.empty:
        raise ValueError("CSV file is empty.")

    possible_ecg_columns = [
        "ecg",
        "ECG",
        "signal",
        "Signal",
        "value",
        "Value",
        "ecg_signal",
        "ECG_signal",
        "lead_ii",
        "Lead_II",
        "lead2",
        "Lead2",
        "lead_2",
        "voltage",
        "Voltage",
        "raw",
        "Raw",
        "mv",
        "mV"
    ]

    ecg_column = None

    for column in possible_ecg_columns:

        if column in df.columns:
            ecg_column = column
            break

    if ecg_column is None:

        excluded = {
            "time",
            "time_sec",
            "timestamp",
            "r_peak",
            "label",
            "target",
            "r_peak_probability",
            "r_peak_probability_raw",
            "predicted_r_peak",
            "predicted_peak",
            "predicted_peaks"
        }

        numeric_columns = [
            column
            for column in df.columns
            if column not in excluded
            and pd.api.types.is_numeric_dtype(df[column])
        ]

        if not numeric_columns:
            raise ValueError(
                "Could not find an ECG column.\n"
                "Expected a column named 'ecg'."
            )

        ecg_column = numeric_columns[0]

    ecg = pd.to_numeric(
        df[ecg_column],
        errors="coerce"
    ).to_numpy(dtype=np.float32)

    valid = np.isfinite(ecg)

    if not np.all(valid):

        print(
            f"Removing {np.sum(~valid)} invalid ECG samples."
        )

        df = df.loc[valid].reset_index(drop=True)

        ecg = pd.to_numeric(
            df[ecg_column],
            errors="coerce"
        ).to_numpy(dtype=np.float32)

    print(f"\nECG column: {ecg_column}")
    print(f"Samples: {len(ecg)}")
    print(f"Duration: {len(ecg) / FS:.2f} seconds")

    return df, ecg

def create_windows(ecg):
    """
    Create a 90-sample window centered on every valid sample.

    The model outputs one probability for every window center.
    """

    if len(ecg) < WINDOW_SIZE:
        raise ValueError(
            f"ECG is too short. At least {WINDOW_SIZE} "
            f"samples are required."
        )

    centers = np.arange(
        HALF_WINDOW,
        len(ecg) - HALF_WINDOW
    )

    X = np.empty(
        (len(centers), WINDOW_SIZE),
        dtype=np.float32
    )

    for i, center in enumerate(centers):

        start = center - HALF_WINDOW
        end = center + HALF_WINDOW

        X[i] = ecg[start:end]

    X = X[..., np.newaxis]

    return X, centers

def detect_peaks(probabilities, centers, threshold):
    """
    Convert model probabilities into R-peak locations.

    A minimum-distance constraint prevents multiple detections
    around the same heartbeat.
    """

    distance = int(
        MIN_PEAK_DISTANCE_SECONDS * FS
    )

    peak_indices, properties = find_peaks(
        probabilities,
        height=threshold,
        distance=distance
    )

    detected_samples = centers[peak_indices]

    detected_probabilities = properties["peak_heights"]

    return (
        detected_samples,
        detected_probabilities
    )

def match_peaks(
    predicted,
    reference,
    tolerance_samples
):
    """
    Match predicted R-peaks with reference R-peaks.

    Each reference peak can be matched only once.
    """

    predicted = np.asarray(
        predicted,
        dtype=np.int64
    )

    reference = np.asarray(
        reference,
        dtype=np.int64
    )

    used_reference = set()

    true_positive = 0
    false_positive = 0

    errors = []

    for prediction in predicted:

        candidates = []

        for i, ref in enumerate(reference):

            if i in used_reference:
                continue

            error = abs(
                int(prediction) - int(ref)
            )

            if error <= tolerance_samples:
                candidates.append(
                    (error, i, ref)
                )

        if candidates:

            candidates.sort(
                key=lambda x: x[0]
            )

            error, index, ref = candidates[0]

            used_reference.add(index)

            true_positive += 1

            errors.append(
                error / FS * 1000
            )

        else:

            false_positive += 1

    false_negative = (
        len(reference) - len(used_reference)
    )

    return (
        true_positive,
        false_positive,
        false_negative,
        errors
    )

def get_reference_peaks(df):
    """
    Read reference R-peaks from the optional r_peak column.

    Expected:
        r_peak = 1 -> R peak
        r_peak = 0 -> non-R-peak
    """

    possible_columns = [
        "r_peak",
        "R_peak",
        "rpeak",
        "RPeak",
        "label",
        "target"
    ]

    column = None

    for candidate in possible_columns:

        if candidate in df.columns:
            column = candidate
            break

    if column is None:
        return None

    labels = pd.to_numeric(
        df[column],
        errors="coerce"
    ).fillna(0).to_numpy()

    reference = np.where(
        labels > 0
    )[0]

    return reference

def calculate_metrics(
    predicted,
    reference
):
    """Calculate beat-level detection metrics."""

    tolerance_samples = int(
        MATCH_TOLERANCE_SECONDS * FS
    )

    tp, fp, fn, errors = match_peaks(
        predicted,
        reference,
        tolerance_samples
    )

    precision = (
        tp / (tp + fp)
        if (tp + fp) > 0
        else 0.0
    )

    recall = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else 0.0
    )

    f1 = (
        2 * precision * recall /
        (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    sensitivity = recall

    mean_timing_error = (
        float(np.mean(errors))
        if errors
        else None
    )

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "sensitivity": sensitivity,
        "f1": f1,
        "mean_timing_error_ms": mean_timing_error
    }

def main():

    parser = argparse.ArgumentParser(
        description="Test CardioAI ECG R-peak model."
    )

    parser.add_argument(
        "csv_file",
        nargs="?",
        default=None,
        help="Path to ECG CSV file (positional argument or use --csv)."
    )

    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to ECG CSV."
    )

    parser.add_argument(
        "--model",
        type=str,
        default=str(DEFAULT_MODEL),
        help="Path to trained Keras model."
    )

    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help="R-peak probability threshold."
    )

    parser.add_argument(
        "--temperature-file",
        type=str,
        default=None,
        help=(
            "Path to a temperature.json produced by train.py. "
            "If omitted, test.py looks next to the model file "
            "and then in the default models/ directory."
        )
    )

    parser.add_argument(
        "--no-calibration",
        action="store_true",
        help=(
            "Disable temperature-scaling calibration and use "
            "the model's raw (potentially overconfident) "
            "probabilities."
        )
    )

    parser.add_argument(
        "--dashboard-duration",
        type=float,
        default=DEFAULT_DURATION_SECONDS,
        help="Length in seconds of the gating dashboard window."
    )

    parser.add_argument(
        "--dashboard-rate",
        type=float,
        default=DEFAULT_SAMPLE_RATE_HZ,
        help="Samples per second in the gating dashboard arrays."
    )

    parser.add_argument(
        "--target-phase",
        type=float,
        default=DEFAULT_TARGET_PHASE_FRACTION,
        help="Cardiac phase fraction (0-1) at which the gating trigger fires."
    )

    args = parser.parse_args()

    model_path = Path(args.model)
    csv_arg = args.csv_file or args.csv or str(DEFAULT_CSV)
    csv_path = Path(csv_arg)

    print("=" * 70)
    print("CardioAI - ECG R-Peak Model Testing")
    print("=" * 70)

    print(f"\nModel:")
    print(model_path)

    print(f"\nCSV:")
    print(csv_path)

    print(f"\nThreshold:")
    print(args.threshold)

    if not model_path.exists():
        search_roots = [
            SCRIPT_DIR,
            SCRIPT_DIR.parent,
            SCRIPT_DIR.parent.parent
        ]

        candidates = []

        for root in search_roots:
            candidates.extend(root.glob("rpeak_model.keras"))
            candidates.extend(root.glob("**/rpeak_model.keras"))

        candidates = list(dict.fromkeys(candidates))

        if candidates:
            model_path = candidates[0]
            print(f"Model automatically found at: {model_path}")
        else:
            raise FileNotFoundError(
                f"\nModel not found at:\n{model_path}\n"
                f"Searched from:\n{SCRIPT_DIR}"
            )

    print("\nLoading model...")

    model = tf.keras.models.load_model(
        model_path
    )

    print("Model loaded successfully.")

    if args.no_calibration:

        temperature = DEFAULT_TEMPERATURE

        print(
            "\nCalibration disabled (--no-calibration). "
            "Using raw model probabilities."
        )

    else:

        temperature = load_temperature(
            model_path,
            explicit_path=args.temperature_file
        )

    df, raw_ecg = load_csv(
        csv_path
    )

    print("\nPreprocessing ECG...")

    ecg = bandpass_filter(
        raw_ecg,
        FS
    )

    ecg = normalize_signal(
        ecg
    )

    print("Creating ECG windows...")

    X, centers = create_windows(
        ecg
    )

    print(
        f"Windows created: {len(X)}"
    )

    print("\nRunning model inference...")

    raw_probabilities = model.predict(
        X,
        batch_size=512,
        verbose=1
    ).flatten()

    probabilities = apply_temperature_scaling(
        raw_probabilities,
        temperature
    )

    if temperature != DEFAULT_TEMPERATURE:

        print(
            f"\nApplied temperature scaling "
            f"(temperature={temperature:.4f})."
        )

        print(
            f"Mean raw probability        : "
            f"{np.mean(raw_probabilities) * 100:.2f}%"
        )

        print(
            f"Mean calibrated probability : "
            f"{np.mean(probabilities) * 100:.2f}%"
        )

    predicted_peaks, peak_confidences = detect_peaks(
        probabilities,
        centers,
        args.threshold
    )

    print(
        f"\nDetected R-peaks: "
        f"{len(predicted_peaks)}"
    )

    dashboard_metrics = compute_dashboard_metrics(
        centers=centers,
        probabilities=probabilities,
        predicted_peaks=predicted_peaks,
        peak_confidences=peak_confidences,
        fs=FS,
        duration_seconds=args.dashboard_duration,
        sample_rate_hz=args.dashboard_rate,
        target_phase_fraction=args.target_phase
    )

    ideal_capture_times = get_ideal_capture_times(
        dashboard_metrics
    )

    if len(peak_confidences) > 0:

        mean_confidence = float(
            np.mean(peak_confidences)
        )

        max_confidence = float(
            np.max(peak_confidences)
        )

        min_confidence = float(
            np.min(peak_confidences)
        )

    else:

        mean_confidence = 0.0
        max_confidence = 0.0
        min_confidence = 0.0

    reference_peaks = get_reference_peaks(
        df
    )

    print("\n" + "=" * 70)
    print("RESULT")
    print("=" * 70)

    print(
        f"\nDetected R-peaks : "
        f"{len(predicted_peaks)}"
    )

    print(
        f"Mean confidence  : "
        f"{mean_confidence * 100:.2f}%"
    )

    print(
        f"Maximum confidence: "
        f"{max_confidence * 100:.2f}%"
    )

    print(
        f"Minimum confidence: "
        f"{min_confidence * 100:.2f}%"
    )

    if temperature == DEFAULT_TEMPERATURE:

        print(
            "\nNote: confidence values are UNCALIBRATED. "
            "They can read close to 100% even when the model "
            "is only moderately certain, especially on clean "
            "or synthetic ECG. Run train.py to generate a "
            "temperature.json calibration file."
        )

    if len(predicted_peaks) >= 2:

        rr_intervals = np.diff(
            predicted_peaks
        ) / FS

        median_rr = np.median(
            rr_intervals
        )

        heart_rate = (
            60.0 / median_rr
            if median_rr > 0
            else 0
        )

        print(
            f"\nEstimated heart rate: "
            f"{heart_rate:.1f} BPM"
        )

    else:

        heart_rate = None

        print(
            "\nEstimated heart rate: "
            "Insufficient detected peaks"
        )

    if reference_peaks is not None:

        print("\n" + "-" * 70)
        print("GROUND-TRUTH EVALUATION")
        print("-" * 70)

        print(
            f"Reference R-peaks : "
            f"{len(reference_peaks)}"
        )

        metrics = calculate_metrics(
            predicted_peaks,
            reference_peaks
        )

        print(
            f"\nTrue Positives     : "
            f"{metrics['tp']}"
        )

        print(
            f"False Positives    : "
            f"{metrics['fp']}"
        )

        print(
            f"False Negatives    : "
            f"{metrics['fn']}"
        )

        print(
            f"\nPrecision          : "
            f"{metrics['precision'] * 100:.2f}%"
        )

        print(
            f"Recall / Sensitivity: "
            f"{metrics['recall'] * 100:.2f}%"
        )

        print(
            f"F1 Score           : "
            f"{metrics['f1'] * 100:.2f}%"
        )

        if metrics["mean_timing_error_ms"] is not None:

            print(
                f"Mean timing error  : "
                f"{metrics['mean_timing_error_ms']:.2f} ms"
            )

        print(
            "\nR-peak detection accuracy "
            "(sensitivity): "
            f"{metrics['sensitivity'] * 100:.2f}%"
        )

    else:

        print("\n" + "-" * 70)
        print("GROUND-TRUTH EVALUATION")
        print("-" * 70)

        print(
            "\nNo 'r_peak' column found in the CSV."
        )

        print(
            "Accuracy cannot be calculated from "
            "an unlabeled ECG."
        )

        print(
            "Confidence and detected R-peaks "
            "are still available."
        )

    result_df = df.copy()

    probability_column = np.full(
        len(result_df),
        np.nan,
        dtype=np.float32
    )

    probability_column[centers] = probabilities

    result_df["r_peak_probability"] = (
        probability_column
    )

    raw_probability_column = np.full(
        len(result_df),
        np.nan,
        dtype=np.float32
    )

    raw_probability_column[centers] = raw_probabilities

    result_df["r_peak_probability_raw"] = (
        raw_probability_column
    )

    predicted_column = np.zeros(
        len(result_df),
        dtype=np.int8
    )

    predicted_column[
        predicted_peaks
    ] = 1

    result_df["predicted_r_peak"] = (
        predicted_column
    )

    output_path = (
        csv_path.parent /
        f"{csv_path.stem}_prediction.csv"
    )

    result_df.to_csv(
        output_path,
        index=False
    )

    print(
        f"\nPrediction CSV saved to:\n"
        f"{output_path}"
    )

    dashboard_output_path = (
        csv_path.parent /
        f"{csv_path.stem}_dashboard.json"
    )

    save_dashboard_json(
        dashboard_metrics,
        dashboard_output_path
    )

    print(
        f"\nGating dashboard JSON saved to:\n"
        f"{dashboard_output_path}"
    )

    latest_valid = np.where(
        ~np.isnan(dashboard_metrics["heart_rate_bpm"])
    )[0]

    print("\n" + "-" * 70)
    print("GATING DASHBOARD SNAPSHOT")
    print("-" * 70)

    if len(latest_valid) > 0:

        i = latest_valid[-1]

        print(
            f"\nAt t={dashboard_metrics['time_s'][i]:.1f}s:"
        )

        print(
            f"  Heart rate     : "
            f"{dashboard_metrics['heart_rate_bpm'][i]:.1f} BPM"
        )

        print(
            f"  RR interval    : "
            f"{dashboard_metrics['rr_interval_ms'][i]:.1f} ms"
        )

        print(
            f"  Target phase   : "
            f"{dashboard_metrics['target_phase'][i]:.2f}"
        )

        print(
            f"  Confidence     : "
            f"{dashboard_metrics['confidence'][i] * 100:.2f}%"
        )

    else:

        print(
            "\nNot enough R-peaks in the window to report "
            "heart rate / phase yet."
        )

    print(
        f"\nR-peaks in dashboard window : "
        f"{int(np.sum(dashboard_metrics['r_peak_detected']))}"
    )

    print(
        f"Trigger pulses in window    : "
        f"{int(np.sum(dashboard_metrics['trigger']))}"
    )

    print(
        "\nIdeal photo-capture times (seconds, from window start):"
    )

    if len(ideal_capture_times) == 0:

        print(
            "None found in this window (not enough clean R-peaks "
            "to establish cardiac phase)."
        )

    else:

        print(
            ", ".join(
                f"{t:.2f}s" for t in ideal_capture_times
            )
        )

    print("\nDetected R-peak details:")

    if len(predicted_peaks) == 0:

        print("No R-peaks detected.")

    else:

        print(
            f"{'Sample':>10} "
            f"{'Time(s)':>12} "
            f"{'Confidence':>15}"
        )

        print("-" * 42)

        for sample, confidence in zip(
            predicted_peaks,
            peak_confidences
        ):

            print(
                f"{sample:>10} "
                f"{sample / FS:>12.3f} "
                f"{confidence * 100:>14.2f}%"
            )

    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()