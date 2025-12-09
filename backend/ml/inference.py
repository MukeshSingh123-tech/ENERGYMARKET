"""inference.py

Helper functions to load and run models. Import from main.py and training scripts.
"""
import os
import pathlib
import joblib
import numpy as np

MODEL_DIR = pathlib.Path(os.path.join(os.path.dirname(__file__), "trained_models"))

RF_MODEL = None
RF_SCALER = None
LSTM_MODEL = None
CNN_MODEL = None
FEATURE_ORDER = None
SEQ_LEN = 24

def load_models():
    global RF_MODEL, RF_SCALER, LSTM_MODEL, CNN_MODEL, FEATURE_ORDER, SEQ_LEN
    try:
        if (MODEL_DIR / "rf_forecast.joblib").exists():
            RF_MODEL = joblib.load(MODEL_DIR / "rf_forecast.joblib")
            RF_SCALER = joblib.load(MODEL_DIR / "rf_scaler.joblib")
    except Exception:
        RF_MODEL, RF_SCALER = None, None

    # load feature order metadata if present
    try:
        meta_p = MODEL_DIR / "meta.json"
        if meta_p.exists():
            import json
            meta = json.loads(meta_p.read_text())
            FEATURE_ORDER = meta.get("features_order")
            SEQ_LEN = meta.get("seq_len", SEQ_LEN)
    except Exception:
        FEATURE_ORDER = None

    try:
        import tensorflow as tf
        lstm_dir = MODEL_DIR / "lstm_forecast"
        if lstm_dir.exists():
            LSTM_MODEL = tf.keras.models.load_model(str(lstm_dir))
    except Exception:
        LSTM_MODEL = None

    try:
        import torch
        ts_path = MODEL_DIR / "conv1d_fault.pt"
        if ts_path.exists():
            CNN_MODEL = torch.jit.load(str(ts_path), map_location="cpu")
            CNN_MODEL.eval()
    except Exception:
        CNN_MODEL = None

def predict_rf_from_features(features: dict):
    """Predict using RandomForest. features is a dict with keys matching FEATURE_ORDER or sorted keys.
    Returns float prediction or None.
    """
    if RF_MODEL is None or RF_SCALER is None:
        return None
    # ensure ordering
    if FEATURE_ORDER:
        X = [features[k] for k in FEATURE_ORDER]
    else:
        # fallback: sort keys alphabetically (must be consistent in client)
        X = [features[k] for k in sorted(features.keys())]
    Xs = RF_SCALER.transform([X])
    return float(RF_MODEL.predict(Xs)[0])

def predict_lstm_from_sequence(seq):
    """seq: list/np array of length SEQ_LEN (hourly values). Returns float or None."""
    if LSTM_MODEL is None:
        return None
    arr = np.array(seq, dtype=np.float32)
    arr = arr.reshape(1, arr.shape[0], 1)
    out = LSTM_MODEL.predict(arr)
    return float(out[0, 0])

def predict_fault_from_waveform(waveform):
    """waveform: numpy array shape (channels, samples) or (samples*channels,) flattened.
    Returns (pred_class_index, probabilities_list) or (None, None).
    """
    if CNN_MODEL is None:
        return None, None
    import torch
    import numpy as np
    arr = np.array(waveform, dtype=np.float32)
    if arr.ndim == 1:
        # assume 6 channels
        samples = arr.shape[0] // 6
        arr = arr.reshape(6, samples)
    tensor = torch.from_numpy(arr[None, :, :])  # (1, ch, samples)
    with torch.no_grad():
        out = CNN_MODEL(tensor)
        probs = torch.nn.functional.softmax(out, dim=1).cpu().numpy()[0]
        pred = int(probs.argmax())
    return pred, probs.tolist()
