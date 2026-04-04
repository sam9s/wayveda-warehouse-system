# WayVeda Project Progress

## Status Snapshot

- Date: 2026-04-04
- Overall project state: Phase A complete, CI/CD bootstrap complete
- Active focus: infrastructure baseline is live; next work is application build phases

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
  - `wh.wayveda.cloud` does not resolve
  - `db.wayveda.cloud` does not resolve

## Repo Baseline

- Remote repo is live on GitHub and currently ahead/behind this local workspace in content shape.
- This local workspace contains planning inputs and source assets that are not yet present in the GitHub repo:
  - `ALICE_INSTRUCTIONS.md`
  - `Docs/`
  - `Images/`
  - `GWMS_repo/`
- Existing tracked files also differ from the current remote copy and will need an intentional commit sequence later.

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

- DNS records are not yet configured, which blocks Caddy SSL issuance.
- Historical Stock In dates contain ambiguous spreadsheet date formats.
- `max_level`, `qty_per_carton`, and SKU values are still pending from the client.
- `wh.wayveda.cloud` will continue to return unresolved DNS until Hostinger A records are created.
- `wh.wayveda.cloud` will return a 502 after DNS is fixed until the app process exists on port `4002`.

## Next Planned Actions

1. Create Hostinger DNS A records for `wh` and `db` pointing to `187.127.142.230`.
2. Begin Phase B database migration and historical import work.
3. Expand the bootstrap workflow into the full app deployment pipeline once backend/frontend build commands exist.
