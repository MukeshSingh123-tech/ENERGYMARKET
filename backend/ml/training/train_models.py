# training/train_models.py
import os, sys
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

DATA_DIR = os.path.join(project_root, "data")
OUT_DIR = Path(project_root) / "trained_models"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# --- RandomForest baseline ---
df = pd.read_csv(os.path.join(DATA_DIR, "timeseries.csv"))
agg = df.groupby("timestamp").agg(total_load=("demand","sum"), total_solar=("solar","sum")).reset_index()
agg["hour"] = pd.to_datetime(agg["timestamp"]).dt.hour
for lag in [1,2,3,24,48]:
    agg[f"lag_{lag}"] = agg["total_load"].shift(lag)
agg.dropna(inplace=True)
feature_cols = ["total_solar","hour"] + [c for c in agg.columns if c.startswith("lag_")]
X = agg[feature_cols]
y = agg["total_load"]
scaler = StandardScaler()
Xs = scaler.fit_transform(X)
rf = RandomForestRegressor(n_estimators=200, random_state=0, n_jobs=-1)
rf.fit(Xs, y)
pred = rf.predict(Xs)
print("RF train MAE:", mean_absolute_error(y, pred))
joblib.dump(rf, OUT_DIR / "rf_forecast.joblib")
joblib.dump(scaler, OUT_DIR / "rf_scaler.joblib")
meta = {"features_order": feature_cols, "seq_len": 24}
import json
(OUT_DIR / "meta.json").write_text(json.dumps(meta))
print("Saved RF and metadata to", OUT_DIR)

# --- LSTM Forecast (TensorFlow SavedModel) ---
import tensorflow as tf
seq_len = 24
series = agg["total_load"].values
X_seq = []
y_seq = []
for i in range(len(series)-seq_len):
    X_seq.append(series[i:i+seq_len])
    y_seq.append(series[i+seq_len])
X_seq = np.array(X_seq)[...,None]
y_seq = np.array(y_seq)
split = int(0.8*len(X_seq))
Xtr, Xte = X_seq[:split], X_seq[split:]
ytr, yte = y_seq[:split], y_seq[split:]
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(seq_len,1)),
    tf.keras.layers.LSTM(64),
    tf.keras.layers.Dense(1)
])
model.compile(optimizer='adam', loss='mse', metrics=['mae'])
model.fit(Xtr, ytr, epochs=12, batch_size=32, validation_data=(Xte,yte))
model.save(OUT_DIR / "lstm_forecast")
print("Saved LSTM to", OUT_DIR / "lstm_forecast")

# --- CNN Fault Detector (PyTorch) ---
import torch
import torch.nn as nn
import torch.optim as optim
wave = np.load(os.path.join(DATA_DIR, "waveforms.npy"))
labels = np.load(os.path.join(DATA_DIR, "waveforms_labels.npy"))
idx = np.random.permutation(len(wave))
wave, labels = wave[idx], labels[idx]
X = torch.tensor(wave)
y = torch.tensor(labels).long()
split = int(0.8*len(X))
Xtr, Xte = X[:split], X[split:]
ytr, yte = y[:split], y[split:]

class Conv1DNet(nn.Module):
    def __init__(self, in_ch, n_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv1d(in_ch,32, kernel_size=9, padding=4),
            nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Conv1d(32,64, kernel_size=7, padding=3),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(64, n_classes)
        )
    def forward(self,x):
        return self.net(x)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
net = Conv1DNet(in_ch=X.shape[1], n_classes=int(y.max())+1).to(device)
opt = optim.Adam(net.parameters(), lr=1e-3)
loss_fn = nn.CrossEntropyLoss()
for epoch in range(6):
    net.train()
    perm = torch.randperm(len(Xtr))
    for i in range(0, len(Xtr), 64):
        b = perm[i:i+64]
        xb, yb = Xtr[b].to(device), ytr[b].to(device)
        opt.zero_grad()
        out = net(xb)
        loss = loss_fn(out, yb)
        loss.backward()
        opt.step()
    print(f"Epoch {epoch} loss {float(loss.item()):.4f}")

net.eval()
traced = torch.jit.trace(net.cpu(), Xte[:2])
torch.jit.save(traced, str(OUT_DIR / "conv1d_fault.pt"))
print("Saved TorchScript model to", OUT_DIR / "conv1d_fault.pt")
