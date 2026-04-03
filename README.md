# WayVeda Warehouse & Inventory Management System

**Status:** Architecture approved — ready for build

A warehouse and inventory management system (mini-ERP) for WayVeda — a D2C personal care brand.

## Tech Stack
- **Frontend:** React 19 + Vite 7 + React Router 7 + CSS Modules
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL via self-hosted Supabase
- **External:** Shiprocket API v2 (dispatch sync)
- **Infra:** Caddy (reverse proxy + SSL) + PM2 (process manager)
- **VPS:** Hostinger (Ubuntu)

## Subdomains
- `wh.wayveda.cloud` — Web application
- `db.wayveda.cloud` — Supabase Studio

## Documentation
- `WayVeda_Project_Spec.md` — Complete project specification (start here)

## Project Structure
```
├── backend/           # Express.js API (MVC pattern)
├── frontend/          # React + Vite SPA
├── ecosystem.config.js # PM2 config
└── WayVeda_Project_Spec.md
```

## Client
WayVeda (wayveda.com) — managed by MeDa Partners

## Built by
Raven Solutions (ravensolutions.in)
