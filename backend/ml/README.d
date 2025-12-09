# SmartGrid Backend

This repository contains backend code for Smart Load Forecasting and Fault Detection in a small smart-grid simulation. Included files:
- main.py — FastAPI server with endpoints for forecasting and fault detection
- inference.py — helpers to load and run trained models
- training/generate_data.py — produce synthetic timeseries & waveform datasets
- training/train_models.py — train and serialize RF, LSTM, CNN models
- models.py — simple Nanogrid simulation models (placeholder; replace with your real models if available)
- requirements.txt — dependencies
- Dockerfile — container build
- README.md — this file

Quick start:

1. Create and activate a virtualenv:
```bash
python -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Generate data and train models (optional):
```bash
python training/generate_data.py
python training/train_models.py
```

4. Run the API server (development):
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API endpoints (examples):
- POST /api/ai/load-flow-predict/model
  - payload for RF: { "method":"rf", "features":{...} }
  - payload for LSTM: { "method":"lstm", "seq":[...last seq_len values...] }
- POST /api/ai/fault-predict/model
  - payload: { "waveform": [[ch1_samples], [ch2_samples], ...] } or flattened

Notes:
- Replace models.py with your actual simulation models if you already have them.
- Trained models saved in `trained_models/` by training script.
