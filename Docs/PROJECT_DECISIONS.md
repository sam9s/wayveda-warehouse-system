# WayVeda Project Decisions

## Confirmed Decisions

| Topic | Decision | Source | Notes |
|---|---|---|---|
| Canonical repo | `https://github.com/sam9s/wayveda-warehouse-system.git` | User confirmation on 2026-04-04 | Local workspace now linked to this remote history |
| App subdomains | Two subdomains only: `wh.wayveda.cloud` and `db.wayveda.cloud` | `ALICE_INSTRUCTIONS.md` | No separate `api` subdomain |
| App serving model | One Express process serves API and built frontend on port `4002` | `ALICE_INSTRUCTIONS.md` | Caddy proxies all app traffic to `localhost:4002` |
| Supabase Studio endpoint | `db.wayveda.cloud` -> `localhost:8000` | `INFRASTRUCTURE.md` and `ALICE_INSTRUCTIONS.md` | Admin-focused access |
| Product count | `12` canonical products | `ALICE_INSTRUCTIONS.md` | Drop `Cream` entirely |
| Opening stock date | `2025-07-24` | `ALICE_INSTRUCTIONS.md` | Historical imports are after this baseline |
| Canonical seed source | `Docs/Wayveda Inventory Sheet.xlsx` | `ALICE_INSTRUCTIONS.md` | Use Ledger tab values for opening stock verification |
| Canonical product naming | Use the normalized database names in the mapping table | `ALICE_INSTRUCTIONS.md` | Required for import scripts and later Shiprocket mapping |
| Core movement model | Single `inventory_movements` table with `movement_type` discriminator | `Docs/WayVeda_Project_Spec.md` | Do not split into separate transaction tables |
| Analytics model | SQL views compute balances and analytics | `Docs/WayVeda_Project_Spec.md` | Do not recreate spreadsheet logic in JS |
| Shiprocket scope in Phase 1 | Read-only pull integration | `Docs/WayVeda_Project_Spec.md` | Manual dispatch remains available |
| CSS approach | CSS Modules | `START_HERE.md` and spec | Match GREST pattern |
| Frontend UX continuity | Preserve the current Google Script movement UX patterns during Phase D | Astra note in `Docs/TEMP.txt` on 2026-04-04 plus spec Section 9 | Keep movement cards, numbered sections, multi-product add pattern, and movement color coding |
| Frontend libraries | Use React Router 7, Axios, Lucide React, and Chart.js in Phase D | Astra note in `Docs/TEMP.txt` on 2026-04-04 plus spec | Avoid drifting from the agreed frontend stack |
| CI/CD model | GitHub Actions self-hosted runner on the same VPS | User clarification on 2026-04-03 | Flow is local -> GitHub -> VPS runner deploy |
| App port | `4002` | Spec and infrastructure docs | Matches GREST convention |
| Project documentation location | Project-generated Markdown files live under `Docs/` | User clarification on 2026-04-04 | Avoid creating new project tracking files at repo root |
| Host-side DB connection | Use Supavisor session mode on `localhost:5432` with username `postgres.your-tenant-id` | Official Supabase self-hosting docs plus VPS verification on 2026-04-04 | Required for host-side Node `pg` access on this self-hosted stack |
| Ledger balance formula | `v_inventory_ledger.balance = opening_stock + total_received + total_rto_right - total_dispatched` | WayVeda owner confirmation relayed via Astra on 2026-04-04 | `RTO Wrong` and `RTO Fake` remain visible reporting metrics but do not reduce balance again |
| Analytics filter contract | Backend accepts `startDate`/`endDate`/`granularity` plus compatibility aliases `from`/`to`/`period` | Phase D implementation decision on 2026-04-04 | Lets the frontend use a shared filter model without breaking the existing API shape |
| PM2 deploy context | GitHub Actions deploys must set `HOME=/root` and `PM2_HOME=/root/.pm2`, and verify with retry-based health checks | Phase D deploy fix on 2026-04-04 | Prevents Actions from spawning a transient `/etc/.pm2` daemon and failing on normal restart timing |
| User access model | Credentials live in Supabase Auth, while `public.users` stores role, active state, and profile metadata | User access planning on 2026-04-04 | Raw passwords must never be stored in application tables |
| Top-level app role | `system_admin` sits above `admin` and is reserved for platform ownership | User access planning on 2026-04-04 | Normal admins cannot create `system_admin` users |
| First-login password policy | Bootstrap and reset passwords are temporary and must be changed on first login | User request on 2026-04-05 plus Phase D implementation | Enforced by `users.must_change_password` and the `/change-password` route |
| Frontend theming model | Theme selection is user-side, persisted locally, and applied through CSS variable sets | User request on 2026-04-05 plus Phase D implementation | Current themes are `teal`, `blue`, and `cream` |

## Resolved Document Conflicts

| Conflict | Resolution |
|---|---|
| `api.{domain}` appeared in older architecture text | Ignore it. Use only `wh` and `db` |
| Spec referenced 13 SKUs | Override to 12 canonical products |
| `Cream` appeared in older product lists | Drop it completely |
| `Power Roll Oil Ubtan` appeared in older text | Canonical product is `Power Roll Oil Unflavoured` |
| Older docs implied immediate coding as first task | Current execution starts with planning and then Phase A infrastructure |
| Written balance formula and live sheet ledger both differed from the approved business rule | Follow the owner-approved balance rule and re-verify the ledger targets |

## Working Assumptions

These are active unless explicitly changed:

- Deployment branch will be `main`
- The current public GitHub repo is the canonical remote
- Supabase secrets will be generated directly on the VPS and not committed to git
- Shiprocket credentials will only be needed in Phase E

## Pending Inputs From Client / PM

- `max_level` values
- `qty_per_carton` defaults
- SKU codes if they are needed beyond display/reference
- Shiprocket API credentials

## Operational Rules

- Never use any SSH keys other than `C:\Users\hp\.ssh\wayveda_vps_ed25519` for this project
- Do not commit live `.env` files
- Preserve manual dispatch capability even after Shiprocket sync is added
- Treat the Ledger verification values in `ALICE_INSTRUCTIONS.md` as the import validation target
- Confirm before future disruptive infra actions such as reboot unless required for immediate recovery or security work

## Executed Decisions

- `main` is now the active deployment branch in practice
- GitHub Actions self-hosted runner is installed on the same VPS and registered as `wayveda-vps`
- Initial CD workflow exists at `.github/workflows/deploy-sync.yml`
- Deployment target path on VPS is `/root/apps/wayveda-warehouse-system`
- Phase B schema, seed, import, and ledger verification are completed on the VPS
- Frontend build is now served through the backend at `https://wh.wayveda.cloud`
- Canonical user-access design is documented in `Docs/USER_ACCESS_CONTROL.md`
- End-user testing guide is documented in `Docs/USER_TEST_GUIDE.md`
