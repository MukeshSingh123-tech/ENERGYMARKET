# Project: EnergyMarket / SmartGrid (Monorepo)

**High-level:**  
This repository contains:

- A **frontend** (Vite + React + TypeScript + shadcn UI)  
- A **backend** (FastAPI — Python)  
- A **blockchain module** (Solidity contracts + generated build artifacts)

This README provides installation, development workflow, project hygiene, CI, and security guidance.

---

## 📁 Repository Structure (auto-detected)
```
ENERGYMARKET/
└─ smartgrid/
     ├─ frontend/          # Vite + React + TypeScript app
     ├─ backend/           # FastAPI backend
     └─ blockchain/        # Solidity contracts & build artifacts
```

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
npx hardhat compile
npx hardhat test
```

---

## 🧹 Repo Hygiene (Before pushing to GitHub)

You **should NOT commit**:
- `node_modules/`
- `__pycache__/`
- `*.pyc`
- Solidity build artifacts (`build/contracts/*.json`)
- lockfiles you don’t intend to maintain (`package-lock.json`, `yarn.lock`)
- `.env` files

This repo now includes:
- `.gitignore` — cleans all of the above
- Cleanup script (`scripts/list_and_remove_build_artifacts.sh`) to list/remove unwanted build files

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

# 🎉 You're ready to push this project to GitHub!
