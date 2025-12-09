<p align="center">
  <img src="assets/SMARTGRID.jpeg" alt="EnergyMarket Logo" width="180"/>
</p>

<h1 align="center">EnergyMarket: Decentralized Smart Grid System</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Blockchain-Solidity-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/AI-TensorFlow%20%2F%20PyTorch-FF6F00?style=flat-square&logo=tensorflow" alt="AI" />
</p>

<p align="center">
  <strong>A Next-Generation Peer-to-Peer Energy Trading Platform combining AI, IoT, and Blockchain.</strong>
</p>

---

## 📖 Project Overview & Problem Statement

### The Problem
Traditional power grids are centralized, relying on a one-way flow of electricity and information. This model struggles with:
1.  **Inefficiency:** High transmission losses and lack of real-time load balancing.
2.  **Renewable Integration:** Difficulty managing intermittent energy sources (Solar/Wind) from individual "prosumers."
3.  **Trust & Transparency:** Lack of transparent pricing and automated settlement for small-scale energy trading.

### The Solution: EnergyMarket
**EnergyMarket** is a Smart Grid solution that enables a decentralized energy market. It allows prosumers to sell excess energy directly to consumers securely and automatically.
- **AI-Driven:** Uses Machine Learning to forecast load demand and optimize grid stability.
- **Blockchain-Secured:** Smart contracts ensure immutable, trustless transactions without a middleman.
- **Real-Time Analysis:** Uses `pandapower` for backend load flow analysis to ensure grid physics are respected.

---

## 🏗 Technical Architecture

This project is a monorepo divided into three distinct layers, each serving a critical function:

### 1. 🎨 Frontend Layer (The Dashboard)
**Stack:** Vite, React, TypeScript, shadcn/ui, Tailwind CSS.

The user interface serves as the control center for Prosumers and Consumers.
- **Features:** Real-time visualization of energy usage, wallet integration for crypto payments, and market bidding interfaces.
- **Why this stack?** Vite ensures lightning-fast HMR (Hot Module Replacement), while TypeScript ensures type safety across the complex trading logic.

### 2. 🧠 Backend Layer (The Brain)
**Stack:** FastAPI (Python), Pandapower, TensorFlow/PyTorch, ONNX.

The backend acts as the bridge between the physical grid simulation and the user.
- **Grid Simulation:** Uses **Pandapower** to calculate load flow and short-circuit analysis to prevent grid overloads during trades.
- **AI/ML:** utilizes **TensorFlow/PyTorch** models to predict energy generation (e.g., solar output based on weather) and dynamic pricing.
- **API:** Fast, asynchronous endpoints manage user data and off-chain logic.

### 3. ⛓️ Blockchain Layer (The Trust Anchor)
**Stack:** Solidity, Truffle, Web3.js.

The settlement layer that handles the financial and contractual logic.
- **Smart Contracts:** Automatically execute trades when a bid matches an ask price.
- **Immutability:** Records every energy transaction permanently, preventing fraud.
- **Tokenization:** Represents energy credits as tokens for easy trading.

---

## 📂 Repository Structure
```bash
ENERGYMARKET/
└─ smartgrid/
     ├─ frontend/          # Vite + React + TypeScript application
     ├─ backend/           # FastAPI app + AI Models + Power Analysis
     └─ blockchain/        # Solidity contracts & Truffle config

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

