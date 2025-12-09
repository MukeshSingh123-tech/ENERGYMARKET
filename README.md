<p align="center">
  <img src="assets/SMARTGRID.jpg" alt="EnergyMarket Logo" width="400"/>
</p>

<h1 align="center">EnergyMarket: Decentralized Smart Grid System</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Blockchain-Solidity-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/AI-TensorFlow%20%2F%20PyTorch-FF6F00?style=flat-square&logo=tensorflow" alt="AI" />
</p>

<p align="center">
  <strong>A Next-Generation Peer-to-Peer Energy Trading Platform combining AI, Cloud Computing, and Blockchain.</strong>
</p>

---

## 📖 Project Overview & Problem Statement

### The Problem
Traditional power grids are centralized and inefficient. They struggle with:
1.  **Inefficiency:** High transmission losses and lack of real-time load balancing.
2.  **Renewable Integration:** Difficulty managing intermittent energy sources (Solar/Wind) from individual "prosumers."
3.  **Data Silos:** Lack of real-time, transparent data access for grid participants.

### The Solution: EnergyMarket
**EnergyMarket** is a cloud-native Smart Grid solution that enables a decentralized energy market.
- **Hybrid Architecture:** Combines the speed of **Cloud (Supabase)** for user data with the security of **Blockchain** for settlements.
- **AI-Driven:** Uses Machine Learning to forecast load demand and optimize grid stability.
- **Real-Time:** Leverages Supabase Realtime to push live energy prices and grid status to the frontend.

---

## 🏗 Technical Architecture

This project is a monorepo divided into layers, integrating Cloud and Blockchain technologies:

### 1. ☁️ Cloud & Database Layer (Supabase)
**Stack:** Supabase (PostgreSQL, Auth, Realtime).

Supabase serves as the persistent data layer and authentication provider.
- **Authentication:** Secure user management (Prosumers, Consumers, Grid Operators).
- **Realtime Database:** Stores user profiles, historical energy data, and off-chain market activity.
- **Live Updates:** Pushes instant updates to the dashboard when energy prices change or bids are accepted.

### 2. 🧠 Backend Logic Layer (FastAPI)
**Stack:** FastAPI (Python), Pandapower, TensorFlow/PyTorch.

The computation engine that runs complex simulations not suitable for the database.
- **Grid Physics:** Uses **Pandapower** to run load flow analysis and ensure grid stability.
- **AI Models:** Runs **TensorFlow/PyTorch** models to predict generation output and detect anomalies.
- **Integration:** Fetches data from Supabase, processes it with AI, and writes results back or triggers Blockchain events.

### 3. 🎨 Frontend Layer (The Dashboard)
**Stack:** Vite, React, TypeScript, shadcn/ui.

The control center for users.
- **Hybrid Data Fetching:** Reads user data directly from **Supabase** for speed, and transaction data from the **Blockchain** for verification.
- **Visualization:** Graphs energy usage and market trends.

### 4. ⛓️ Blockchain Layer (The Trust Anchor)
**Stack:** Solidity, Truffle/Hardhat.

- **Smart Contracts:** Handles the actual "Energy Tokens" and financial settlement.
- **Trustless:** Ensures that once a trade is executed, the payment is irreversible and transparent.

---

## 📂 Repository Structure
```bash
ENERGYMARKET/
└─ smartgrid/
     ├─ frontend/          # Vite + React (Connects to Supabase & FastAPI)
     ├─ backend/           # FastAPI (AI & Power System Logic)
     └─ blockchain/        # Solidity Contracts
> Your actual folder names may vary slightly — adjust commands accordingly.

---

## 🚀 Quick Start

### ▶ Run Frontend (Vite + React)
```bash
cd ENERGYMARKET/smartgrid/frontend
npm ci
npm run dev     # start dev server
npm run build   # create production build
npm test        # if test script exists
npm run lint    # if lint script exists
```

---

### ▶ Run Backend (FastAPI)
```bash
cd ENERGYMARKET/smartgrid/backend

python -m venv .venv
source .venv/bin/activate       # Linux/macOS
.venv\Scripts\activate          # Windows

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest                          # run tests
```

---

### ▶ Smart Contracts (Solidity)
If using Hardhat:
```bash
cd ENERGYMARKET/smartgrid/blockchain
npm ci
truffle compile
truffle migrate reset --network
truffle test
truffle develop
```

---

## ⚙ GitHub Actions — CI Pipeline

A CI workflow file is included:
```
.github/workflows/ci.yml
```

It performs:
- Node setup → installs deps → runs `lint` and `test`
- Python setup → installs backend deps → runs backend tests

---

## 🔐 Dependency Snapshot (auto-generated)

### Frontend dependencies (from `package.json`)
*(excerpt — full list generated automatically)*  
You will see items such as:
- react  
- react-dom  
- @radix-ui/**  
- tailwindcss  
- typescript  
- vite  
… and others.

### Backend dependencies (from `requirements.txt`)
- fastapi  
- uvicorn[standard]  
- pandas  
- tensorflow>=2.12  
- torch  
- onnxruntime  
- pandapower  
- python-multipart  
…and more depending on the file.

---

## 🛡 How to Run Local Vulnerability Scans

### Node (frontend)
```bash
cd frontend/
npm ci
npm audit
```

### Python (backend)
```bash
pip install pip-audit
pip-audit
```

---

## ✔ Files Automatically Added by ChatGPT
- `README.md`
- `.gitignore`
- `.github/workflows/ci.yml`
- `scripts/list_and_Remove_build_artifacts.sh`
- `dependency_snapshot.txt`

---

## 📌 Notes
- The vulnerability scan included here is **static**, not a live security audit.  
- You should run `npm audit` and `pip-audit` locally or add them to CI for continuous scanning.

---

