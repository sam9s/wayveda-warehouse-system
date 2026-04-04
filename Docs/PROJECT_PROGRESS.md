# WayVeda Project Progress

## Status Snapshot

- Date: 2026-04-04
- Overall project state: Phase A complete, CI/CD bootstrap complete
- Active focus: infrastructure baseline is live; next work is Phase B database and historical import setup

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
  - `wh.wayveda.cloud` resolves to the VPS and returns `502` because the app is not running yet
  - `db.wayveda.cloud` resolves to the VPS and returns `401`, confirming Caddy, TLS, and Supabase public routing are working
- Relocated project tracking documents under `Docs/` per project documentation rules.

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
  - `wh.wayveda.cloud` currently returns `502` until the app exists on port `4002`
  - `db.wayveda.cloud` currently returns `401`, which is expected for the Supabase public endpoint check

## Repo Baseline

- Remote repo is live on GitHub and includes the planning baseline, source docs, images, and CI bootstrap workflow.
- This local workspace currently has a small pending documentation relocation/update that is ready to push.
- Unrelated tracked file differences still exist and should be reviewed intentionally later:
  - `README.md`
  - `START_HERE.md`
  - `backend/.env.example`
  - `ecosystem.config.js`

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| A - Infrastructure | Completed | VPS stack is installed and verified, including reboot persistence |
| A-CI - CI/CD | Completed | Self-hosted runner and initial deploy-sync workflow are working |
| B - Database + Import | Not started | Live inventory sheet validated for planning |
| C - Backend API | Not started | Waiting on implementation start |
| D - Frontend | Not started | Waiting on implementation start |
| E - Shiprocket | Not started | Credentials not needed yet |
| F - Testing + Handover | Not started | Depends on prior phases |

## Current Risks / Watch Items

- Historical Stock In dates contain ambiguous spreadsheet date formats.
- `max_level`, `qty_per_carton`, and SKU values are still pending from the client.
- `wh.wayveda.cloud` will return a 502 after DNS is fixed until the app process exists on port `4002`.
- Future disruptive infra actions should be explicitly confirmed before execution unless urgent recovery is required.

## Next Planned Actions

1. Begin Phase B database migration and historical import work.
2. Use `Docs/PHASE_B_DATABASE_IMPORT.md` as the working checklist for Phase B execution.
3. Expand the bootstrap workflow into the full app deployment pipeline once backend/frontend build commands exist.
