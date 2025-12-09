# training/generate_data.py
# Generates timeseries and waveform datasets using your simulation models.
import os, sys, random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

# Attempt to import your simulation models (adapt import path if different)
try:
    from simulation.models import Nanogrid
except Exception:
    # fallback: if models.py is in project root
    try:
        from models import Nanogrid
    except Exception:
        Nanogrid = None

DATA_DIR = os.path.join(project_root, "data")
os.makedirs(DATA_DIR, exist_ok=True)

def generate_timeseries(num_nanogrids=5, hours=24*30, seed=42):
    random.seed(seed)
    ngs = []
    for i in range(num_nanogrids):
        if Nanogrid:
            ngs.append(Nanogrid(i+1))
        else:
            ngs.append(None)

    rows = []
    base_time = datetime.utcnow() - timedelta(hours=hours)
    for h in range(hours):
        t = base_time + timedelta(hours=h)
        for ng_idx in range(num_nanogrids):
            if Nanogrid and ngs[ng_idx] is not None:
                ng = ngs[ng_idx]
                # call your Nanogrid update API if available
                solar = getattr(ng, "solar_panel", None)
                solar_out = 0.0
                try:
                    solar_out = ng.solar_panel.get_output(t.hour)
                except Exception:
                    solar_out = random.uniform(0, 5)
                demand = getattr(ng, "load_demand", 5.0) + random.uniform(-2.0, 2.0)
                # attempt to update
                try:
                    ng.load_demand = demand
                    ng.update_state(solar_out)
                    balance = float(getattr(ng, "current_power_balance", 0.0))
                    soc = float(getattr(ng.battery, "state_of_charge", 0.0))
                except Exception:
                    balance = 0.0
                    soc = 0.0
            else:
                solar_out = random.uniform(0, 5)
                demand = 5.0 + random.uniform(-2.0, 2.0)
                balance = solar_out - demand
                soc = random.uniform(0, 1)

            rows.append({
                "timestamp": t.isoformat(),
                "nanogrid_id": ng_idx + 1,
                "solar": float(round(solar_out, 3)),
                "demand": float(round(demand, 3)),
                "balance": float(round(balance, 3)),
                "battery_soc": float(round(soc, 3)),
                "hour": t.hour,
                "dayofweek": t.weekday(),
            })
    df = pd.DataFrame(rows)
    path = os.path.join(DATA_DIR, "timeseries.csv")
    df.to_csv(path, index=False)
    print("Saved timeseries to", path)

def generate_waveforms(num_examples=2000, sample_rate=2000, window_ms=200, seed=123):
    np.random.seed(seed)
    samples = int(sample_rate * window_ms / 1000)
    data = []
    labels = []
    times = np.arange(samples) / sample_rate
    f0 = 50.0
    for i in range(num_examples):
        cls = np.random.choice([0,0,0,1,2,3], p=[0.6,0.0,0.0,0.2,0.1,0.1])
        Ia = 10.0 * np.sin(2*np.pi*f0*times + 0) + 0.2*np.random.randn(samples)
        Ib = 10.0 * np.sin(2*np.pi*f0*times - 2*np.pi/3) + 0.2*np.random.randn(samples)
        Ic = 10.0 * np.sin(2*np.pi*f0*times + 2*np.pi/3) + 0.2*np.random.randn(samples)
        Va = 230.0 * np.sin(2*np.pi*f0*times + 0) + 0.5*np.random.randn(samples)
        Vb = 230.0 * np.sin(2*np.pi*f0*times - 2*np.pi/3) + 0.5*np.random.randn(samples)
        Vc = 230.0 * np.sin(2*np.pi*f0*times + 2*np.pi/3) + 0.5*np.random.randn(samples)
        if cls == 1:
            Ia += 30.0 * np.exp(-((times - times.mean())**2)/(0.0005))
        elif cls == 2:
            Ib *= 0.3
        elif cls == 3:
            Ia += 40*np.sign(np.sin(2*np.pi*100*times)) * np.exp(-((times - times.mean())**2)/(0.0002))
            Ib += Ia*0.8
            Ic += Ia*0.8
        arr = np.stack([Ia, Ib, Ic, Va, Vb, Vc], axis=0)
        data.append(arr.astype(np.float32))
        labels.append(int(cls))
    np.save(os.path.join(DATA_DIR, "waveforms.npy"), np.array(data))
    np.save(os.path.join(DATA_DIR, "waveforms_labels.npy"), np.array(labels))
    print("Saved waveforms to", DATA_DIR)

if __name__ == '__main__':
    generate_timeseries()
    generate_waveforms()
