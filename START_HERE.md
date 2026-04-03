# START_HERE — WayVeda Warehouse System Codex Handoff

## Purpose

This is the **entry document** for Codex / Claude Code working on the WayVeda Warehouse System.

Read this first. It tells you:
- what this project is
- what files to read
- what is next
- what order to follow

---

## Project Summary

WayVeda Warehouse System is a production inventory management application (mini-ERP) being built to replace a Google Apps Script + Google Sheets workflow used by the WayVeda warehouse team.

WayVeda is a D2C personal care brand (wayveda.com) managed by MeDa Partners. They sell via Shopify and ship via Shiprocket. The warehouse tracks 13 SKUs across 3 movement types: Stock In, Dispatch, and RTO (Returns).

The replacement system is being built as:

- Self-hosted Supabase/PostgreSQL backend
- Express.js API layer
- React 19 + Vite 7 frontend
- Deployed on Hostinger VPS
- Served from `wh.wayveda.cloud`
- Supabase Studio at `db.wayveda.cloud`

---

## Current Status

The project has completed:

- Full project specification (architecture, schema, API design, screen specs)
- GitHub repo initialization
- Infrastructure setup guide
- Environment template

The project is now at:

## **Phase A — Infrastructure Setup**

followed by Phase B (Database), Phase C (Backend API), Phase D (Frontend), Phase E (Shiprocket), Phase F (Testing & Deploy).

---

## Authoritative Files — Read In This Order

1. **`WayVeda_Project_Spec.md`** — The complete project specification (1026 lines, 18 sections). This is the single source of truth for everything: business context, database schema, SQL views, API endpoints, frontend screens, Shiprocket integration, deployment config. Read this thoroughly.

2. **`INFRASTRUCTURE.md`** — Phase A infrastructure setup guide. Step-by-step instructions for VPS setup: Supabase, Caddy, PM2, Node.js, DNS, repo clone.

3. **`backend/.env.example`** — Environment variable template showing all required config values.

4. **`README.md`** — Project overview and tech stack summary.

---

## Reference System

This project mirrors the architecture and patterns of the GREST Warehouse System:
- GitHub: `https://github.com/sam9s/GREST-Warehouse-System.git`
- Same tech stack: React + Vite + Express + Supabase + Caddy + PM2
- Same deployment pattern: VPS + subdomain + reverse proxy
- Same development approach: database-first, SQL views for analytics

Key differences from GREST:
- GREST handles electronics (devices, IMEIs, barcodes) — complex domain
- WayVeda handles personal care products (13 SKUs, 3 movement types) — simpler domain
- WayVeda adds Shiprocket API integration (GREST does not have this)
- WayVeda has RTO classification (Right/Wrong/Fake) — unique to this system

Codex may reference the GREST repo for implementation patterns, file structure, and component architecture. Do not copy business logic — only structural patterns.

---

## Immediate Task Sequence

### Phase A — Infrastructure (current)
Execute `INFRASTRUCTURE.md` step by step:
1. System preparation (apt update, firewall)
2. Install Node.js LTS
3. Install PM2
4. Install Docker + Docker Compose
5. Deploy self-hosted Supabase
6. Install and configure Caddy
7. Verify DNS + SSL
8. Clone repo to `/root/apps/wayveda-warehouse-system/`
9. Create directory structure

### Phase B — Database Foundation
1. Create PostgreSQL tables from `WayVeda_Project_Spec.md` Section 5
2. Create all 5 SQL views from same section
3. Seed the 13 product SKUs
4. Import 11 historical movement rows from Google Sheet data
5. Verify v_inventory_ledger produces correct balances

### Phase C — Backend API
1. Express server setup (server.js, CORS, auth middleware)
2. Auth endpoints via Supabase Auth
3. Product CRUD endpoints
4. Movement entry endpoints (Stock In, Dispatch, RTO)
5. Inventory/analytics query endpoints (dashboard, ledger, analysis)
6. Health check endpoint

### Phase D — Frontend Build
1. App shell (React Router, Layout with Sidebar, Auth context)
2. Login page
3. Dashboard (stat cards + product health table)
4. Stock In form (preserve Google Script UX patterns)
5. Dispatch page (manual entry first)
6. RTO form (Right/Wrong/Fake classification)
7. Inventory Ledger page
8. Analysis pages (Dispatch, RTO, Inward)
9. Product Management page

### Phase E — Shiprocket Integration
1. Shiprocket auth + token management
2. Order pull service (dispatches)
3. Product name mapping
4. Auto-dispatch entry creation
5. Sync status UI + cron job

### Phase F — Testing & Deployment
1. End-to-end testing
2. Data verification against Google Sheets
3. Production deployment + PM2 + Caddy final config

---

## Do Not Re-Decide

These are already decided:
- Tech stack: React 19 + Vite 7 + Express + Supabase/PostgreSQL + Caddy + PM2
- Database: single `inventory_movements` table with movement_type discriminator
- Analytics: all computed via SQL views, not JavaScript
- Port: 4002 for the application
- Subdomains: `wh.wayveda.cloud` (app) + `db.wayveda.cloud` (Supabase Studio)
- CSS approach: CSS Modules (as in GREST)
- Shiprocket: read-only pull-based integration in Phase 1

---

## What Not To Build (Phase 1)

- Order creation in Shiprocket
- Customer management / CRM
- Payment or invoicing
- Shopify integration
- Multi-warehouse support
- Barcode scanning
- Role-based granular permissions (just admin for now)
- Email notifications
- Mobile native app
- Complex BI dashboards

---

## Developer Execution Posture

If there is a conflict between:
- Feature richness vs operational reliability → choose reliability
- Design polish vs functional completeness → choose functional completeness
- Cleverness vs simplicity → choose simplicity
- Manual entry vs broken automation → keep manual entry working always

This is a production system replacing a fragile Google Sheets workflow. The warehouse team must be able to use it daily. Operational clarity beats technical elegance.
