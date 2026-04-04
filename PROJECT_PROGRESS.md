# WayVeda Project Progress

## Status Snapshot

- Date: 2026-04-04
- Overall project state: Planning
- Active focus: planning baseline, repo alignment, and execution sequencing

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

## VPS Baseline

Verified on 2026-04-04:

- Hostname: `srv1551201`
- OS: `Ubuntu 24.04.4 LTS`
- Access: `root` over SSH is working
- Installed:
  - `git`
  - `ufw` package
- Not installed:
  - `node`
  - `npm`
  - `pm2`
  - `docker`
  - `docker compose`
  - `caddy`
- Service state:
  - `ufw` inactive
  - no Caddy service
  - no app process
  - no Supabase containers
- Paths:
  - `/root/apps` exists
  - `/root/apps/wayveda-warehouse-system` missing
  - `/root/supabase` missing
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
| A - Infrastructure | Not started | VPS is still at clean baseline |
| A-CI - CI/CD | Not started | Same-VPS self-hosted runner is planned |
| B - Database + Import | Not started | Live inventory sheet validated for planning |
| C - Backend API | Not started | Waiting on implementation start |
| D - Frontend | Not started | Waiting on implementation start |
| E - Shiprocket | Not started | Credentials not needed yet |
| F - Testing + Handover | Not started | Depends on prior phases |

## Current Risks / Watch Items

- DNS records are not yet configured, which blocks Caddy SSL issuance.
- Historical Stock In dates contain ambiguous spreadsheet date formats.
- The deploy branch has not been explicitly confirmed in writing yet.
- `max_level`, `qty_per_carton`, and SKU values are still pending from the client.

## Next Planned Actions

1. Finalize planning documents and assumptions.
2. Confirm deployment branch and repo hygiene expectations.
3. Start Phase A infrastructure implementation on the VPS.
4. After Phase A, define the GitHub Actions runner and deployment workflow.
