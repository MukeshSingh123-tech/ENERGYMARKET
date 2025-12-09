# main.py
# FastAPI server integrated with simulation models and inference helpers.

import os
import sys
import pathlib
import logging
import threading
import time
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.append(project_root)

# import local models (simulation)
try:
    from models import Nanogrid
except Exception:
    Nanogrid = None

# import inference helpers
from inference import load_models, predict_rf_from_features, predict_lstm_from_sequence, predict_fault_from_waveform

app = FastAPI(title="SmartGrid Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
NANOGRIDS = {}
SIM_THREAD = None
SIM_RUNNING = False

def init_nanogrids(n=3):
    global NANOGRIDS
    for i in range(n):
        if Nanogrid:
            ng = Nanogrid(i+1)
        else:
            ng = None
        NANOGRIDS[i+1] = {
            "model": ng,
            "history": [],  # recent loads for seq inputs
            "last_prediction": None,
            "last_fault": None
        }

@app.on_event("startup")
def startup_event():
    logging.info("Loading models...")
    load_models()
    logging.info("Initializing nanogrids...")
    init_nanogrids(n=3)
    start_simulation()

@app.on_event("shutdown")
def shutdown_event():
    stop_simulation()

def simulation_loop(poll_interval=1.0):
    global SIM_RUNNING
    SIM_RUNNING = True
    while SIM_RUNNING:
        for ng_id, entry in NANOGRIDS.items():
            model = entry.get("model")
            # simple synthetic update if no model available
            if model:
                hour = int(time.strftime('%H'))
                solar = model.solar_panel.get_output(hour)
                # random demand variation
                demand = max(0.1, model.load_demand + np.random.uniform(-1.0, 1.0))
                model.load_demand = demand
                model.update_state(solar, hours=1.0)
                # append to history
                entry["history"].append(demand)
                if len(entry["history"]) > 48:
                    entry["history"] = entry["history"][-48:]
                # forecasting: use RF if available
                features = {
                    "total_solar": solar,
                    "hour": hour,
                    "lag_1": entry["history"][-1] if len(entry["history"])>=1 else demand,
                    "lag_2": entry["history"][-2] if len(entry["history"])>=2 else demand,
                    "lag_3": entry["history"][-3] if len(entry["history"])>=3 else demand,
                    "lag_24": entry["history"][-24] if len(entry["history"])>=24 else demand,
                    "lag_48": entry["history"][-48] if len(entry["history"])>=48 else demand,
                }
                try:
                    pred = predict_rf_from_features(features)
                except Exception:
                    pred = None
                if pred is None:
                    # fallback: naive persistence
                    pred = entry["history"][-1] if entry["history"] else demand
                entry["last_prediction"] = float(pred)
                # generate a dummy waveform and run fault detector rarely
                if np.random.rand() < 0.05:
                    # generate synthetic waveform similar to training generator
                    samples = 400
                    times = np.arange(samples)/2000.0
                    Ia = 10.0 * np.sin(2*np.pi*50*times) + 0.2*np.random.randn(samples)
                    Ib = 10.0 * np.sin(2*np.pi*50*times - 2*np.pi/3) + 0.2*np.random.randn(samples)
                    Ic = 10.0 * np.sin(2*np.pi*50*times + 2*np.pi/3) + 0.2*np.random.randn(samples)
                    Va = 230.0 * np.sin(2*np.pi*50*times) + 0.5*np.random.randn(samples)
                    Vb = 230.0 * np.sin(2*np.pi*50*times - 2*np.pi/3) + 0.5*np.random.randn(samples)
                    Vc = 230.0 * np.sin(2*np.pi*50*times + 2*np.pi/3) + 0.5*np.random.randn(samples)
                    waveform = np.stack([Ia, Ib, Ic, Va, Vb, Vc], axis=0)
                    pred_cls, probs = predict_fault_from_waveform(waveform)
                    entry["last_fault"] = {"class": pred_cls, "probs": probs}
        time.sleep(poll_interval)

def start_simulation():
    global SIM_THREAD, SIM_RUNNING
    if SIM_THREAD and SIM_THREAD.is_alive():
        return
    SIM_THREAD = threading.Thread(target=simulation_loop, args=(1.0,), daemon=True)
    SIM_THREAD.start()
    SIM_RUNNING = True

def stop_simulation():
    global SIM_RUNNING
    SIM_RUNNING = False

# API endpoints
@app.get("/status")
def status():
    return {"status":"ok","nanogrids": len(NANOGRIDS)}

@app.get("/nanogrids")
def list_nanogrids():
    return {nid: {"last_prediction": entry["last_prediction"], "last_fault": entry["last_fault"]} for nid,entry in NANOGRIDS.items()}

@app.post("/api/ai/load-flow-predict/model")
def predict_load_model(payload: dict = Body(...)):
    method = payload.get("method", "rf")
    if method == "rf":
        features = payload.get("features")
        if features:
            pred = predict_rf_from_features(features)
            if pred is not None:
                return {"method":"rf","prediction": float(pred)}
    if method == "lstm":
        seq = payload.get("seq")
        if seq:
            pred = predict_lstm_from_sequence(seq)
            if pred is not None:
                return {"method":"lstm","prediction": float(pred)}
    return {"error":"model not available or bad payload"}

@app.post("/api/ai/fault-predict/model")
def predict_fault_model(payload: dict = Body(...)):
    wave = payload.get("waveform")
    if wave is None:
        return {"error":"waveform missing"}
    pred_cls, probs = predict_fault_from_waveform(wave)
    if pred_cls is None:
        return {"error":"model not available"}
    classes = {0: "no_fault", 1: "SLG", 2: "LL", 3: "3ph"}
    return {"predicted_class": classes.get(pred_cls, str(pred_cls)), "probabilities": probs}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
