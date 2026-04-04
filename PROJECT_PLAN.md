# WayVeda Project Plan

## Purpose

This file is the working execution plan for the WayVeda Warehouse System.
It is the planning baseline for delivery and should be kept in sync with `PROJECT_PROGRESS.md` and `PROJECT_DECISIONS.md`.

Current mode: planning only. No implementation phase is considered complete unless it is explicitly recorded in `PROJECT_PROGRESS.md`.

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
- VPS is still at a clean pre-Phase-A state:
  - `git` installed
  - `node`, `npm`, `pm2`, `docker`, `docker compose`, `caddy` not installed
  - `ufw` installed but inactive
  - `/root/apps` exists but is empty
  - `/root/supabase` does not exist
  - `wh.wayveda.cloud` and `db.wayveda.cloud` do not resolve yet

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
| A | VPS infrastructure foundation | Ubuntu prepared, Node.js, PM2, Docker, Supabase, Caddy, DNS, SSL, repo path | Planned |
| A-CI | CI/CD foundation on same VPS | Self-hosted GitHub Actions runner, deploy workflow, PM2 reload flow, health checks | Planned |
| B | Database and historical data foundation | Tables, views, 12 seeded products, imported movement history, verified balances | Planned |
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

- Historical stock-in dates contain ambiguous formats and will need explicit sanity checking during import
- The repo on GitHub and this local workspace are not identical yet
- DNS is not configured, so SSL validation cannot begin until Hostinger records are created
- CI/CD cannot be finalized until repo structure and app build commands are stable

## Immediate Next Steps

1. Approve these planning documents as the working baseline.
2. Confirm the deployment branch. Working assumption: `main`.
3. Decide which local reference assets should live in the GitHub repo versus remain local-only.
4. Start Phase A implementation from `INFRASTRUCTURE.md`.
