from pathlib import Path
import json
import random

import numpy as np
import wfdb

from scipy.signal import butter, sosfiltfilt
from scipy.optimize import minimize_scalar

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    log_loss
)



SEED = 42

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

FS = 360

WINDOW_SIZE = 90

HALF_WINDOW = WINDOW_SIZE // 2

NEGATIVE_RATIO = 1

EPOCHS = 30
BATCH_SIZE = 256
LEARNING_RATE = 0.001

PREDICTION_THRESHOLD = 0.5






LABEL_SMOOTHING = 0.05




L2_WEIGHT = 1e-4



DROPOUT_RATE = 0.4

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "mitdb"

MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "rpeak_model.keras"

H5_MODEL_PATH = MODEL_DIR / "rpeak_model.h5"




TEMPERATURE_PATH = MODEL_DIR / "temperature.json"

RECORDS = [
    "100",
    "101",
    "102",
    "103",
    "104",
    "105",
    "106",
    "107",
    "108",
    "109",
    "111",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "119",
    "121",
    "122",
    "123",
    "124",
    "200",
    "201",
    "202",
    "203",
    "205",
    "207",
    "208",
    "209",
    "210",
    "212",
    "213",
    "214",
    "215",
    "217",
    "219",
    "220",
    "221",
    "222",
    "223",
    "228",
    "230",
    "231",
    "232",
    "233",
    "234"
]

TRAIN_RECORDS = [
    "100",
    "101",
    "102",
    "103",
    "104",
    "105",
    "106",
    "107",
    "108",
    "109",
    "111",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "118",
    "119",
    "121",
    "122",
    "123",
    "124",
    "200",
    "201",
    "202",
    "203",
    "205",
    "207",
    "208",
    "209",
    "210",
    "212"
]

VALIDATION_RECORDS = [
    "213",
    "214",
    "215",
    "217",
    "219",
    "220",
    "221"
]

TEST_RECORDS = [
    "222",
    "223",
    "228",
    "230",
    "231",
    "232",
    "233",
    "234"
]


print("=" * 70)
print("CardioAI - ECG R-Peak Detection Training")
print("=" * 70)

print(f"\nProject directory:")
print(BASE_DIR)

print(f"\nMIT-BIH dataset directory:")
print(DATA_DIR)

print(f"\nDataset directory exists:")
print(DATA_DIR.exists())

print(f"\nModel will be saved to:")
print(MODEL_PATH)

print("=" * 70)


def validate_dataset(records):

    print("\nChecking MIT-BIH dataset...")

    if not DATA_DIR.exists():
        raise RuntimeError(
            f"\nMIT-BIH dataset directory does not exist:\n"
            f"{DATA_DIR}\n\n"
            f"Expected structure:\n"
            f"{BASE_DIR}\\mitdb\\100.dat\n"
            f"{BASE_DIR}\\mitdb\\100.hea\n"
            f"{BASE_DIR}\\mitdb\\100.atr"
        )

    missing_records = []

    for record in records:

        dat_file = DATA_DIR / f"{record}.dat"
        hea_file = DATA_DIR / f"{record}.hea"
        atr_file = DATA_DIR / f"{record}.atr"

        missing = []

        if not dat_file.exists():
            missing.append(".dat")

        if not hea_file.exists():
            missing.append(".hea")

        if not atr_file.exists():
            missing.append(".atr")

        if missing:
            missing_records.append(
                f"{record} -> missing {', '.join(missing)}"
            )

    if missing_records:

        print("\nMissing dataset files:")

        for item in missing_records:
            print("  ", item)

        raise RuntimeError(
            "\nMIT-BIH dataset validation failed.\n"
            "Please check the missing files above."
        )

    print(
        f"Dataset validation successful. "
        f"{len(records)} records available."
    )

def bandpass_filter(signal, fs=FS):
    lowcut = 0.5
    highcut = 40.0

    sos = butter(
        3,
        [lowcut, highcut],
        btype="bandpass",
        fs=fs,
        output="sos"
    )

    filtered = sosfiltfilt(sos, signal)

    return filtered

def normalize_signal(signal):


    mean = np.mean(signal)
    std = np.std(signal)

    if std < 1e-8:
        return signal - mean

    return (signal - mean) / std

BEAT_SYMBOLS = {
    "N",
    "L",
    "R",
    "A",
    "a",
    "J",
    "S",
    "V",
    "F",
    "e",
    "j",
    "E",
    "/",
    "f",
    "Q"
}


def get_r_peak_annotations(annotation):

    r_peaks = []

    for sample, symbol in zip(
        annotation.sample,
        annotation.symbol
    ):

        if symbol in BEAT_SYMBOLS:
            r_peaks.append(sample)

    return np.array(
        r_peaks,
        dtype=np.int64
    )

def create_balanced_samples(
    ecg,
    r_peaks,
    fs=FS,
    negative_ratio=NEGATIVE_RATIO
):
    """
    Create positive and negative ECG windows.

    Positive:
        Window centered around an annotated heartbeat.

    Negative:
        Window centered away from known heartbeat positions.

    Output:
        X -> ECG windows
        y -> labels
    """

    half = WINDOW_SIZE // 2

    positive_samples = []
    negative_samples = []

    signal_length = len(ecg)

    valid_peaks = r_peaks[
        (r_peaks >= half) &
        (r_peaks < signal_length - half)
    ]

    if len(valid_peaks) == 0:
        return (
            np.empty((0, WINDOW_SIZE), dtype=np.float32),
            np.empty((0,), dtype=np.float32)
        )

    for peak in valid_peaks:

        start = peak - half
        end = peak + half

        window = ecg[start:end]

        if len(window) == WINDOW_SIZE:

            positive_samples.append(
                window.astype(np.float32)
            )

    exclusion_distance = int(0.08 * fs)

    peak_set = set(
        int(p)
        for p in valid_peaks
    )

    target_negative_count = (
        len(positive_samples) * negative_ratio
    )

    attempts = 0
    max_attempts = target_negative_count * 20 + 1000

    while (
        len(negative_samples) < target_negative_count
        and attempts < max_attempts
    ):

        attempts += 1

        center = random.randint(
            half,
            signal_length - half - 1
        )

        too_close = False

        for peak in valid_peaks:

            if abs(center - peak) < exclusion_distance:
                too_close = True
                break

        if too_close:
            continue

        start = center - half
        end = center + half

        window = ecg[start:end]

        if len(window) == WINDOW_SIZE:

            negative_samples.append(
                window.astype(np.float32)
            )

    X_positive = np.array(
        positive_samples,
        dtype=np.float32
    )

    X_negative = np.array(
        negative_samples,
        dtype=np.float32
    )

    y_positive = np.ones(
        len(X_positive),
        dtype=np.float32
    )

    y_negative = np.zeros(
        len(X_negative),
        dtype=np.float32
    )

    X = np.concatenate(
        [X_positive, X_negative],
        axis=0
    )

    y = np.concatenate(
        [y_positive, y_negative],
        axis=0
    )

    indices = np.arange(len(X))

    np.random.shuffle(indices)

    X = X[indices]
    y = y[indices]

    return X, y

def load_record(record_name):
    """
    Load one MIT-BIH ECG record.
    """

    print(f"\nProcessing record {record_name}")

    record_path = DATA_DIR / record_name

    dat_file = DATA_DIR / f"{record_name}.dat"
    hea_file = DATA_DIR / f"{record_name}.hea"
    atr_file = DATA_DIR / f"{record_name}.atr"

    print(f"  Path: {record_path}")

    if not dat_file.exists():
        raise FileNotFoundError(
            f"Missing file: {dat_file}"
        )

    if not hea_file.exists():
        raise FileNotFoundError(
            f"Missing file: {hea_file}"
        )

    if not atr_file.exists():
        raise FileNotFoundError(
            f"Missing file: {atr_file}"
        )





    record = wfdb.rdrecord(
        str(record_path)
    )





    annotation = wfdb.rdann(
        str(record_path),
        "atr"
    )





    ecg = record.p_signal[:, 0]


    sampling_frequency = record.fs





    ecg = bandpass_filter(
        ecg,
        sampling_frequency
    )





    ecg = normalize_signal(ecg)





    r_peaks = get_r_peak_annotations(
        annotation
    )

    print(
        f"  ECG samples: {len(ecg)}"
    )

    print(
        f"  Sampling frequency: "
        f"{sampling_frequency} Hz"
    )

    print(
        f"  Beat annotations: "
        f"{len(r_peaks)}"
    )





    X, y = create_balanced_samples(
        ecg,
        r_peaks,
        sampling_frequency
    )

    print(
        f"  Generated windows: {len(X)}"
    )

    print(
        f"  Positive samples: "
        f"{np.sum(y == 1)}"
    )

    print(
        f"  Negative samples: "
        f"{np.sum(y == 0)}"
    )

    return X, y






def build_dataset(records):
    """
    Build X and y from a list of ECG records.
    """

    all_X = []
    all_y = []

    for record_name in records:

        try:

            X, y = load_record(
                record_name
            )

            if len(X) == 0:
                print(
                    f"  WARNING: "
                    f"No samples generated for "
                    f"record {record_name}"
                )
                continue

            all_X.append(X)
            all_y.append(y)

        except Exception as e:

            print(
                f"Skipping {record_name}: {e}"
            )





    if not all_X:

        raise RuntimeError(
            "\nNo ECG records were loaded.\n\n"
            f"Expected MIT-BIH directory:\n"
            f"{DATA_DIR}\n\n"
            "Each record must contain:\n"
            "  .dat\n"
            "  .hea\n"
            "  .atr\n\n"
            "Example:\n"
            f"{DATA_DIR / '205.dat'}\n"
            f"{DATA_DIR / '205.hea'}\n"
            f"{DATA_DIR / '205.atr'}"
        )

    X = np.concatenate(
        all_X,
        axis=0
    )

    y = np.concatenate(
        all_y,
        axis=0
    )

    print("\n" + "=" * 70)
    print("DATASET CREATED")
    print("=" * 70)

    print(
        f"X shape: {X.shape}"
    )

    print(
        f"y shape: {y.shape}"
    )

    print(
        f"Positive samples: "
        f"{np.sum(y == 1)}"
    )

    print(
        f"Negative samples: "
        f"{np.sum(y == 0)}"
    )

    return X, y






def build_model():
    """
    Build a 1D CNN for ECG heartbeat/R-peak classification.

    Compared to the original architecture, this version adds a small
    L2 weight penalty on the convolutional/dense kernels and a higher
    dropout rate before the output layer. Neither changes what the
    network can learn, but both discourage it from relying on very
    large weights/activations to produce extremely saturated (near
    0 or 1) sigmoid outputs on inputs that are only slightly "easier"
    than the training distribution -- which is what produces
    overconfident predictions on clean/synthetic ECG at inference
    time.
    """

    regularizer = keras.regularizers.l2(L2_WEIGHT)

    model = keras.Sequential(
        [

            layers.Input(
                shape=(WINDOW_SIZE, 1)
            ),





            layers.Conv1D(
                filters=32,
                kernel_size=7,
                padding="same",
                activation="relu",
                kernel_regularizer=regularizer
            ),

            layers.BatchNormalization(),

            layers.MaxPooling1D(
                pool_size=2
            ),





            layers.Conv1D(
                filters=64,
                kernel_size=5,
                padding="same",
                activation="relu",
                kernel_regularizer=regularizer
            ),

            layers.BatchNormalization(),

            layers.MaxPooling1D(
                pool_size=2
            ),





            layers.Conv1D(
                filters=128,
                kernel_size=3,
                padding="same",
                activation="relu",
                kernel_regularizer=regularizer
            ),

            layers.BatchNormalization(),





            layers.GlobalAveragePooling1D(),





            layers.Dense(
                64,
                activation="relu",
                kernel_regularizer=regularizer
            ),

            layers.Dropout(
                DROPOUT_RATE
            ),





            layers.Dense(
                1,
                activation="sigmoid"
            )
        ]
    )

    optimizer = keras.optimizers.Adam(
        learning_rate=LEARNING_RATE
    )





    loss = keras.losses.BinaryCrossentropy(
        label_smoothing=LABEL_SMOOTHING
    )

    model.compile(
        optimizer=optimizer,
        loss=loss,
        metrics=[
            keras.metrics.BinaryAccuracy(
                name="accuracy"
            ),
            keras.metrics.Precision(
                name="precision"
            ),
            keras.metrics.Recall(
                name="recall"
            )
        ]
    )

    return model






def print_model_info(model):

    print("\n" + "=" * 70)
    print("MODEL ARCHITECTURE")
    print("=" * 70)

    model.summary()






def fit_temperature(model, X_val, y_val):
    """
    Fit a single scalar "temperature" that rescales the model's
    logits before the sigmoid, using the validation set.

    Temperature > 1 softens over-confident probabilities (pulls them
    back toward 0.5); temperature = 1 leaves them unchanged. The
    value is chosen to minimize log-loss (negative log likelihood)
    of the calibrated probabilities against the true validation
    labels, which is the standard temperature-scaling calibration
    procedure.

    This is a post-hoc calibration step: it does not change any
    weights in the network and cannot change which class is
    predicted at the default 0.5 threshold (raising the temperature
    is a monotonic transform), it only makes the reported
    probabilities a more honest reflection of accuracy.
    """

    print("\n" + "=" * 70)
    print("FITTING CONFIDENCE CALIBRATION (TEMPERATURE SCALING)")
    print("=" * 70)

    raw_probabilities = model.predict(
        X_val,
        batch_size=BATCH_SIZE,
        verbose=0
    ).flatten()

    eps = 1e-7

    clipped = np.clip(
        raw_probabilities,
        eps,
        1 - eps
    )

    logits = np.log(clipped / (1 - clipped))

    def negative_log_likelihood(temperature):

        if temperature <= 0:
            return np.inf

        scaled_logits = logits / temperature

        scaled_probabilities = 1 / (
            1 + np.exp(-scaled_logits)
        )

        return log_loss(
            y_val,
            scaled_probabilities,
            labels=[0, 1]
        )

    result = minimize_scalar(
        negative_log_likelihood,
        bounds=(0.05, 20.0),
        method="bounded"
    )

    temperature = float(result.x)

    baseline_nll = negative_log_likelihood(1.0)
    calibrated_nll = negative_log_likelihood(temperature)

    print(
        f"\nValidation NLL before calibration: "
        f"{baseline_nll:.4f}"
    )

    print(
        f"Validation NLL after calibration : "
        f"{calibrated_nll:.4f}"
    )

    print(
        f"\nFitted temperature: {temperature:.4f}"
    )

    return temperature


def save_temperature(temperature, path=TEMPERATURE_PATH):

    payload = {
        "temperature": temperature
    }

    with open(path, "w") as f:
        json.dump(payload, f, indent=2)

    print(
        f"\nTemperature saved to:\n{path}"
    )






def evaluate_model(
    model,
    X_test,
    y_test,
    temperature=1.0
):
    """
    Evaluate trained model on unseen ECG records.

    Metrics that depend on a 0.5 threshold (accuracy, precision,
    recall, confusion matrix) are unaffected by temperature, since
    temperature scaling is monotonic and does not change which side
    of 0.5 a prediction falls on. The reported probabilities
    themselves are shown both raw and temperature-calibrated so it's
    clear what changes.
    """

    print("\n" + "=" * 70)
    print("TESTING MODEL")
    print("=" * 70)

    loss, accuracy, precision, recall = model.evaluate(
        X_test,
        y_test,
        batch_size=BATCH_SIZE,
        verbose=1
    )

    print("\nKeras evaluation:")
    print(f"Loss      : {loss:.4f}")
    print(f"Accuracy  : {accuracy:.4f}")
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")





    raw_probabilities = model.predict(
        X_test,
        batch_size=BATCH_SIZE,
        verbose=1
    ).flatten()

    eps = 1e-7

    clipped = np.clip(
        raw_probabilities,
        eps,
        1 - eps
    )

    logits = np.log(clipped / (1 - clipped))

    calibrated_probabilities = 1 / (
        1 + np.exp(-(logits / temperature))
    )

    predictions = (
        calibrated_probabilities >= PREDICTION_THRESHOLD
    ).astype(int)





    precision_value = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall_value = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1_value = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    print("\nAdditional metrics:")
    print(
        f"Precision : {precision_value:.4f}"
    )

    print(
        f"Recall    : {recall_value:.4f}"
    )

    print(
        f"F1 Score  : {f1_value:.4f}"
    )

    print(
        f"\nMean raw probability        : "
        f"{np.mean(raw_probabilities):.4f}"
    )

    print(
        f"Mean calibrated probability : "
        f"{np.mean(calibrated_probabilities):.4f}"
    )





    cm = confusion_matrix(
        y_test,
        predictions
    )

    print("\nConfusion Matrix:")
    print(cm)





    print("\nClassification Report:")

    print(
        classification_report(
            y_test,
            predictions,
            target_names=[
                "Non-R-Peak",
                "R-Peak"
            ],
            zero_division=0
        )
    )

    return calibrated_probabilities, predictions






def main():





    print("\nTensorFlow version:")
    print(tf.__version__)





    gpus = tf.config.list_physical_devices(
        "GPU"
    )

    if gpus:

        print(
            f"\nGPU detected: {len(gpus)}"
        )

        for gpu in gpus:
            print(gpu)

    else:

        print(
            "\nNo GPU detected. "
            "Training will use CPU."
        )





    validate_dataset(
        RECORDS
    )





    print("\n")
    print("=" * 70)
    print("BUILDING TRAINING DATASET")
    print("=" * 70)

    X_train, y_train = build_dataset(
        TRAIN_RECORDS
    )





    print("\n")
    print("=" * 70)
    print("BUILDING VALIDATION DATASET")
    print("=" * 70)

    X_val, y_val = build_dataset(
        VALIDATION_RECORDS
    )





    print("\n")
    print("=" * 70)
    print("BUILDING TEST DATASET")
    print("=" * 70)

    X_test, y_test = build_dataset(
        TEST_RECORDS
    )





    X_train = X_train[..., np.newaxis]

    X_val = X_val[..., np.newaxis]

    X_test = X_test[..., np.newaxis]

    print("\nFinal tensor shapes:")

    print(
        f"X_train: {X_train.shape}"
    )

    print(
        f"X_val:   {X_val.shape}"
    )

    print(
        f"X_test:  {X_test.shape}"
    )





    model = build_model()

    print_model_info(
        model
    )





    callbacks = [

        keras.callbacks.ModelCheckpoint(
            filepath=str(MODEL_PATH),
            monitor="val_f1_score"
            if False
            else "val_recall",
            mode="max",
            save_best_only=True,
            verbose=1
        ),

        keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=7,
            restore_best_weights=True,
            verbose=1
        ),

        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1
        )
    ]





    print("\n" + "=" * 70)
    print("STARTING TRAINING")
    print("=" * 70)

    history = model.fit(
        X_train,
        y_train,

        validation_data=(
            X_val,
            y_val
        ),

        epochs=EPOCHS,

        batch_size=BATCH_SIZE,

        callbacks=callbacks,

        verbose=1
    )





    print("\n" + "=" * 70)
    print("SAVING MODEL")
    print("=" * 70)

    model.save(
        MODEL_PATH
    )

    print(
        f"\nModel saved to:\n{MODEL_PATH}"
    )





    try:

        model.save(
            H5_MODEL_PATH
        )

        print(
            f"H5 model saved to:\n"
            f"{H5_MODEL_PATH}"
        )

    except Exception as e:

        print(
            f"\nCould not save H5 model: {e}"
        )





    temperature = fit_temperature(
        model,
        X_val,
        y_val
    )

    save_temperature(
        temperature
    )





    evaluate_model(
        model,
        X_test,
        y_test,
        temperature=temperature
    )





    print("\n" + "=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)

    print(
        f"\nBest/final model:\n"
        f"{MODEL_PATH}"
    )

    print(
        f"\nCalibration temperature:\n"
        f"{temperature:.4f} "
        f"(saved to {TEMPERATURE_PATH})"
    )

    print(
        "\nThis model can now be integrated into "
        "the CardioAI ECG analysis pipeline."
    )






if __name__ == "__main__":
    main()