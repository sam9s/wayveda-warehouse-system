# WayVeda Project Plan

## Purpose

This file is the working execution plan for the WayVeda Warehouse System.
It is the planning baseline for delivery and should be kept in sync with `PROJECT_PROGRESS.md` and `PROJECT_DECISIONS.md`.

Current mode: planning only. No implementation phase is considered complete unless it is explicitly recorded in `PROJECT_PROGRESS.md`.

Documentation rule:

- All project-generated Markdown documents live under `Docs/`

## Canonical Inputs

Use the following sources in this precedence order when there is a conflict:

1. `ALICE_INSTRUCTIONS.md`
2. `Docs/WayVeda_Project_Spec.md`
3. `INFRASTRUCTURE.md`
4. `Docs/Wayveda Inventory Sheet.xlsx`
5. `Docs/Wayveda Inventory Database.xlsx`
6. `START_HERE.md`
7. `README.md`

## Current Baseline

- Canonical GitHub repo: `https://github.com/sam9s/wayveda-warehouse-system.git`
- Local workspace was attached to the existing `origin/main` git history on 2026-04-04.
- Dedicated VPS SSH access is verified using `C:\Users\hp\.ssh\wayveda_vps_ed25519`.
- VPS Phase A state on 2026-04-04:
  - `git`, `node`, `npm`, `pm2`, `docker`, `docker compose`, `caddy`, and `ufw` installed
  - `ufw` active with `22`, `80`, and `443` allowed
  - self-hosted Supabase is running via Docker
  - `/root/apps/wayveda-warehouse-system` exists and is synced from `main`
  - backend `.env` exists on the VPS and uses Supavisor session-mode credentials for host-side Node access
  - self-hosted GitHub Actions runner is installed and active
  - `db.wayveda.cloud` resolves publicly and responds over HTTPS
  - `wh.wayveda.cloud` resolves publicly and currently returns `502` until the app is started on `localhost:4002`
- VPS Phase B state on 2026-04-04:
  - versioned SQL migrations are in place under `backend/src/db/migrations`
  - 12 canonical products are seeded
  - 326 grouped historical submissions and 1693 movement rows are imported
  - ledger verification passes against the approved workbook targets
  - balance logic follows the owner-approved rule: `opening_stock + stock_in + rto_right - dispatched`

## Delivery Model

- Development flow: local workspace -> GitHub -> VPS deploy automation
- CI/CD model: GitHub Actions with a self-hosted runner installed on the same VPS that hosts the application
- App serving model: one Express process on port `4002` serving API routes and built frontend assets
- Infra entry points:
  - `wh.wayveda.cloud` -> app + API via Caddy -> `localhost:4002`
  - `db.wayveda.cloud` -> Supabase Studio via Caddy -> `localhost:8000`

## Phase Overview

| Phase | Objective | Key Outputs | Status |
|---|---|---|---|
| A | VPS infrastructure foundation | Ubuntu prepared, Node.js, PM2, Docker, Supabase, Caddy, DNS, SSL, repo path | Completed |
| A-CI | CI/CD foundation on same VPS | Self-hosted GitHub Actions runner, deploy workflow, PM2 reload flow, health checks | Completed |
| B | Database and historical data foundation | Tables, views, 12 seeded products, imported movement history, verified balances | Completed |
| C | Backend API | Express server, auth, product routes, movement routes, analytics routes, health endpoint | Planned |
| D | Frontend application | React app shell, auth, dashboard, entry forms, analytics, product management | Planned |
| E | Shiprocket integration | Auth, polling sync, mapping, auto dispatch creation, sync status UI | Planned |
| F | Testing, production hardening, handover | E2E verification, production deploy validation, rollback path, documentation | Planned |

## Phase Details

### Phase A - Infrastructure Foundation

Scope:

- System update and base packages
- Firewall configuration
- Node.js LTS installation
- PM2 installation
- Docker and Docker Compose installation
- Self-hosted Supabase deployment
- Caddy installation and reverse proxy setup
- DNS configuration for `wh` and `db`
- Repo clone path preparation under `/root/apps/wayveda-warehouse-system`

Exit criteria:

- `node`, `npm`, `pm2`, `docker`, `docker compose`, and `caddy` are installed and verified
- Supabase containers are healthy
- Caddy is active and enabled
- `wh.wayveda.cloud` and `db.wayveda.cloud` resolve to the VPS and return SSL-backed responses
- Repo exists on the VPS at the expected path

### Phase A-CI - CI/CD Foundation

Scope:

- Install GitHub Actions self-hosted runner on the same VPS
- Register runner against the WayVeda GitHub repo
- Create deployment workflow for the chosen deployment branch
- Define deploy steps: checkout, install, build, migrate if needed, restart/reload PM2, verify health
- Define failure handling and rollback posture

Planned deployment flow:

1. Developer pushes to GitHub
2. GitHub Actions workflow triggers
3. Self-hosted runner on the VPS executes the deploy job locally
4. PM2 reloads the app
5. Health endpoint is verified after deploy

Exit criteria:

- Runner is installed as a service and survives reboot
- Push to the deployment branch triggers the workflow automatically
- Workflow finishes with a verifiable deployment on the VPS

Current status:

- Completed on 2026-04-04 with runner name `wayveda-vps`
- Bootstrap workflow is in place at `.github/workflows/deploy-sync.yml`

### Phase B - Database, Seed, and Historical Import

Scope:

- Create all tables from the approved schema
- Create all SQL views
- Seed the 12 canonical products with approved opening stock values
- Import historical Stock In, Dispatch, and RTO data from `Docs/Wayveda Inventory Sheet.xlsx`
- Validate balances against the Ledger tab

Critical validation targets:

- Opening stock date: `2025-07-24`
- Product count: `12`
- Canonical product mapping from `ALICE_INSTRUCTIONS.md`
- Ledger balances must match the verification values in `ALICE_INSTRUCTIONS.md`

Exit criteria:

- `products` is seeded correctly
- `inventory_movements` contains verified historical data
- `v_inventory_ledger` matches the approved ledger totals

Current status:

- Completed on 2026-04-04
- Applied migrations `001` through `004`
- Imported 326 grouped submissions and 1693 movement rows from the live workbook
- Verified ledger balances against the approved targets

### Phase C - Backend API

Scope:

- Express app bootstrap
- Supabase auth integration
- Product CRUD
- Movement entry endpoints
- Analytics and ledger endpoints
- Health check

Exit criteria:

- All documented API groups are implemented and testable
- Auth and health checks work reliably
- Inventory queries read from SQL views, not duplicated JS calculations

### Phase D - Frontend Application

Scope:

- React app shell and protected routing
- Login
- Dashboard
- Stock In, Dispatch, and RTO entry screens
- Inventory ledger
- Analysis screens
- Product management

Exit criteria:

- Operators can log in and complete the core warehouse flows
- App works on desktop and mobile
- Form UX preserves the existing warehouse workflow patterns

### Phase E - Shiprocket Integration

Scope:

- Shiprocket authentication and token handling
- Periodic sync job
- Product name mapping
- Auto-generated dispatch entries with `source='shiprocket'`
- Sync status reporting

Exit criteria:

- Dispatch sync runs successfully with real credentials
- Manual dispatch remains available as fallback

### Phase F - Testing, Hardening, and Handover

Scope:

- Data verification against current business sheets
- Environment verification on VPS
- Deploy validation via CI/CD
- Basic rollback and operational runbook
- Handover notes

Exit criteria:

- Production deployment is repeatable
- Warehouse-critical flows are verified
- Operational documentation is ready for ongoing maintenance

## Cross-Phase Dependencies

- DNS A records for `wh` and `db`
- Supabase secrets generated during Phase A
- `max_level` values from client
- `qty_per_carton` values from client
- SKU codes from client if required later
- Shiprocket API credentials for Phase E

## Risk Watchlist

- The repo on GitHub and this local workspace are not identical yet
- `wh.wayveda.cloud` will return `502` until the app process exists on port `4002`
- CI/CD cannot be finalized until repo structure and app build commands are stable
- The owner-approved balance rule must remain explicit in future analytics and backend work to avoid drifting back to spreadsheet-era logic

## Immediate Next Steps

1. Start Phase C backend API implementation.
2. Use `Docs/PHASE_C_BACKEND_API.md` as the working checklist for backend work.
3. Expand the bootstrap workflow into the full deploy pipeline once backend/frontend build commands exist.
