
# Monorepo migration & structure (recommended)

This file describes a recommended monorepo layout and step-by-step migration plan for the `ENERGYMARKET/smartgrid` project.
The goal: make the repository easy to develop, test, and CI across multiple packages (frontend, backend, blockchain).

## Recommended folder structure (monorepo)
```
/                         # repo root
├─ package.json           # root package.json (workspaces)
├─ pnpm-lock.yaml         # single lockfile (optional)
├─ .github/               # CI configs (workflows, dependabot)
├─ frontend/              # workspace: frontend app (Vite, React, TS)
│   ├─ package.json
│   └─ src/
├─ backend/               # workspace: FastAPI backend (Python)
│   ├─ requirements.txt
│   └─ app/
└─ blockchain/            # workspace: contracts/tests/scripts
    ├─ package.json
    └─ contracts/
```

> Note: we detect the current layout under `ENERGYMARKET/smartgrid/*`. When pushing to GitHub you can map those folders to the above names or keep the subfolder. For CI and local workspace tooling it's easier to have `frontend/`, `backend/`, `blockchain/` at the repository root.

---
## Benefits
- Single source of truth for workspace tooling (easier commands).
- Centralized dependency management (faster CI, single lockfile with pnpm/yarn workspaces).
- Simpler CI pipeline targeting workspaces instead of deep nested paths.

---
## Migration steps (safe, reversible)
1. **Create root `package.json` with `workspaces`** that point to your existing subfolders (or move subfolders to root if preferred).
2. **Choose package manager:** I recommend `pnpm` for monorepos (fast, disk efficient). Alternatively use Yarn v3 or npm workspaces.
3. **Install root dependencies & generate a single lockfile.**
   - With pnpm: `pnpm install` (creates `pnpm-lock.yaml`).
4. **Update CI workflows** to run workspace scripts (examples added under `.github/workflows/`).
5. **Add tooling:** root-level lint, format, test scripts that orchestrate workspace scripts.
6. **Run tests & audit** locally and in CI. Fix issues gradually.
7. **Optional:** move `blockchain/` and other subprojects to `packages/` if you expect many packages.

---
## Example root package.json (created automatically)
See `package.json` at repo root for a working example that references detected subprojects.
