# WayVeda Project Progress

## Status Snapshot

- Date: 2026-04-04
- Overall project state: Phase A complete, CI/CD operational, Phase B complete, Phase C complete
- Active focus: Phase D frontend planning and implementation

## Completed So Far

- Reviewed the main Markdown documentation set:
  - `START_HERE.md`
  - `README.md`
  - `INFRASTRUCTURE.md`
  - `Docs/WayVeda_Project_Spec.md`
- Reviewed `ALICE_INSTRUCTIONS.md` and cross-checked it against the live inventory workbook.
- Verified the live workbook structure and import hazards:
  - `Ledger`
  - `Daily Dispatch`
  - `RTO `
  - `Stock In`
- Verified canonical GitHub repo exists and is reachable:
  - `https://github.com/sam9s/wayveda-warehouse-system.git`
- Attached this local workspace to the existing git history at `origin/main` without overwriting local files.
- Verified dedicated SSH access to the VPS using the Wayveda-specific SSH key.
- Audited the VPS baseline in read-only mode.
- Created the initial planning baseline documents:
  - `PROJECT_PLAN.md`
  - `PROJECT_PROGRESS.md`
  - `PROJECT_DECISIONS.md`
- Completed Phase A infrastructure setup on the VPS:
  - system prep
  - firewall enablement
  - Node.js
  - PM2
  - Docker
  - Caddy
  - self-hosted Supabase
  - repo clone under `/root/apps/wayveda-warehouse-system`
- Created VPS-side backend `.env` with generated Supabase connection values.
- Installed the GitHub Actions self-hosted runner on the VPS as a systemd service.
- Added and verified the first workflow:
  - `.github/workflows/deploy-sync.yml`
- Verified the first Actions run completed successfully on `main`.
- Rebooted the VPS and confirmed services recovered automatically.
- Verified public DNS and HTTPS:
  - `wh.wayveda.cloud` resolves to the VPS and now proxies successfully to the backend on port `4002`
  - `db.wayveda.cloud` resolves to the VPS and returns `401`, confirming Caddy, TLS, and Supabase public routing are working
- Relocated project tracking documents under `Docs/` per project documentation rules.
- Completed Phase B database work:
  - added versioned migrations for schema and analytics views
  - added product seed and historical import tooling
  - seeded all 12 canonical products
  - imported 326 grouped historical submissions / 1693 movement rows
  - verified ledger balances against the approved targets
- Corrected VPS backend database access to use the self-hosted Supavisor session-mode username format required for host-side Node access.
- Captured a Phase B business-rule conflict and resolved it with owner confirmation:
  - the live Google Sheet ledger had a bug
  - the earlier written spec formula was also incorrect
  - the approved balance rule is now `Opening Stock + Stock In + RTO Right - Dispatched`
- Completed the Phase C backend foundation:
  - Express app bootstrap and PM2-ready runtime
  - Supabase-backed auth login, logout, and current-user routes
  - protected product, movement, inventory, and admin route groups
  - public health endpoint at `/api/health`
  - live backend process deployed on the VPS and reachable via `https://wh.wayveda.cloud/api/health`
- Expanded CI/CD from repo sync only to backend install, migrate, PM2 restart, and health verification on deploy.
- Added a reusable auth-flow verification script under `backend/src/scripts/verify-auth-flows.js` so protected backend routes can be smoke-tested without manual terminal work.
- Verified authenticated backend flows end to end on the live VPS:
  - temporary smoke-test auth user created and removed automatically
  - login, current-user, products, dashboard, ledger, movements, and admin users routes returned successfully
  - movement validation returned the expected `400` for an invalid dispatch payload
  - verification summary matched the imported foundation data: 12 products, 12 dashboard rows, 12 ledger rows, and 5 recent movements
- Verified the expanded GitHub Actions deploy workflow succeeds on `main` after the Phase C changes.

## VPS Baseline

Verified on 2026-04-04:

- Hostname: `srv1551201`
- OS: `Ubuntu 24.04.4 LTS`
- Kernel: `6.8.0-107-generic`
- Access: `root` over SSH is working
- Installed:
  - `git`
  - `node`
  - `npm`
  - `pm2`
  - `docker`
  - `docker compose`
  - `caddy`
  - `ufw`
- Service state:
  - `ufw` active
  - `docker` active
  - `caddy` active
  - `pm2-root` active
  - GitHub Actions runner active
  - Supabase containers healthy
- Paths:
  - `/root/apps` exists
  - `/root/apps/wayveda-warehouse-system` present
  - `/root/supabase/supabase/docker` present
- DNS:
  - `wh.wayveda.cloud` resolves to `187.127.142.230`
  - `db.wayveda.cloud` resolves to `187.127.142.230`
  - `wh.wayveda.cloud` currently proxies successfully to the backend on `localhost:4002`
  - `db.wayveda.cloud` currently returns `401`, which is expected for the Supabase public endpoint check

## Repo Baseline

- Remote repo is live on GitHub and includes the planning baseline, source docs, images, and CI bootstrap workflow.
- Project tracking documents now live under `Docs/` and the relocation has been pushed to `main`.
- Unrelated tracked file differences still exist and should be reviewed intentionally later:
  - `README.md`
  - `START_HERE.md`
  - `backend/.env.example`
  - `ecosystem.config.js`

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| A - Infrastructure | Completed | VPS stack is installed and verified, including reboot persistence |
| A-CI - CI/CD | Completed | Self-hosted runner deploys backend installs, migrations, PM2 restart, and health checks |
| B - Database + Import | Completed | Schema, seed, import, and ledger verification are complete on the VPS |
| C - Backend API | Completed | Backend is live and auth-backed routes passed the non-destructive smoke test |
| D - Frontend | Not started | Waiting on implementation start |
| E - Shiprocket | Not started | Credentials not needed yet |
| F - Testing + Handover | Not started | Depends on prior phases |

## Current Risks / Watch Items

- `max_level`, `qty_per_carton`, and SKU values are still pending from the client.
- Future disruptive infra actions should be explicitly confirmed before execution unless urgent recovery is required.
- Future backend and analytics work must preserve the owner-approved balance rule for ledger consistency.
- Successful write-path scenarios will get another pass during frontend integration, but the backend read/auth verification baseline is complete.

## Next Planned Actions

1. Create the frontend application scaffold and route shell for Phase D.
2. Build the first operator-facing screens: login, dashboard, and inventory views.
3. Use the live Phase C API as the contract for frontend integration.
