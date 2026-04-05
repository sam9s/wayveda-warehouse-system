# Phase D - Frontend Application

## Objective

Build the operator-facing React application on top of the completed Phase C backend.

## Status

In progress on 2026-04-04.

## Scope

- Create the frontend app shell and protected routing
- Implement login and session handling against the Phase C auth API
- Build dashboard and inventory views
- Build Stock In, Dispatch, and RTO entry screens
- Build product-management and admin-facing utility screens
- Prepare the frontend for PM2/Caddy production serving through the existing backend entry point
- Preserve the current Google Script UX patterns so operators can transition without retraining

## Canonical Inputs

Use these inputs in this order:

1. `ALICE_INSTRUCTIONS.md`
2. `Docs/WayVeda_Project_Spec.md`
3. `Docs/PROJECT_DECISIONS.md`
4. `Docs/PROJECT_PROGRESS.md`
5. `Docs/PHASE_C_BACKEND_API.md`
6. `GWMS_repo/` as a structural reference only, not as a visual or code-copy target

## Locked Frontend Decisions

- Preserve the current warehouse interaction model from the Google Script UI:
  - card-based movement type selection
  - numbered section flow
  - multi-product `+ Add Product` pattern
  - visible item-count badge
  - green / blue / coral movement color coding
- Dispatch page ships with two tabs now:
  - `Shiprocket Synced` placeholder shell
  - `Manual Entry` form
- Library choices are pinned for Phase D:
  - React Router 7
  - Axios
  - Lucide React
  - Chart.js
- Analysis screens must share reusable date-range and period controls.
- Inventory Ledger includes CSV export in Phase 1.
- The approved balance rule remains the backend source of truth:
  - `Opening Stock + Stock In + RTO Right - Dispatch`
- Frontend query parameters may use `startDate`, `endDate`, and `granularity`.
  - Backend also accepts compatibility aliases `from`, `to`, and `period` for analytics filters.

## Planned Work Items

1. Scaffold the React 19 + Vite frontend structure and route shell.
2. Define the frontend design tokens, layout system, and CSS Modules conventions.
3. Implement login and protected app-shell behavior.
4. Build dashboard, ledger, and analysis screens against the live backend endpoints.
5. Build Stock In, Dispatch, and RTO data-entry flows with mobile-first operator UX.
6. Build product-management and admin support screens.
7. Add production build and backend/static-serving integration.

## Current Notes

- `frontend/` is now scaffolded and builds locally.
- The route shell, auth state, layout, and shared component layer are in place.
- Core Phase D screens are implemented locally:
  - login
  - dashboard
  - inventory ledger with CSV export
  - Stock In, Dispatch, and RTO entry screens
  - dispatch, inward, and RTO analysis screens
  - product management
  - user management
  - settings
- Dispatch already includes both the manual-entry flow and the Shiprocket placeholder tab.
- The backend analytics contract was extended so all three analysis screens can share the same date-range and period controls.
- The built frontend is now served publicly through the backend at `https://wh.wayveda.cloud`.
- GitHub Actions deploy run `#16` verified the expanded deploy workflow after fixing PM2 runner context and restart-check timing.
- The first permanent `system_admin` account has been created and verified against the live API.
- The live app now includes:
  - theme switching in the sidebar
  - first-login forced password change
  - a reusable self-service password-change screen
  - a public forgot-password and reset-password flow
  - a dedicated admin-side user-management screen for creating users and assigning roles
  - expanded product management with add, deactivate, and reactivate flows
  - a `system_admin`-only delete-readiness and permanent-delete path for eligible no-history products
  - a shared type-to-search product selector for movement forms, analysis filters, and permanent delete
  - rolling analysis KPI cards for today, last 7 days, and last 30 days
  - testing guidance in `Docs/USER_TEST_GUIDE.md`
- First-round live UI polish is also applied:
  - sidebar scrolling is independent from page scrolling again
  - theme selection is now a compact inline control instead of a large card
  - the workspace content area now reflects the selected theme more clearly
  - login hero typography has been reduced so the auth screen sits more cleanly on one page
  - product search now scales beyond the original 12-SKU catalog by searching name, SKU, and category instead of relying on long dropdown scrolling
  - permanent delete is now isolated in its own full-width danger card with an explicit product selector, separate from the normal edit form
  - `Inward Analysis` is now labeled `Stock In Analysis` to match warehouse language already used elsewhere in the product
  - analysis screens now separate rolling KPI totals from the date-range trend graph so users can read both current windows and historical trends without confusion
- Two real WayVeda business-admin accounts have been provisioned and flagged for first-login password change.
- Remaining work in this slice:
  - test the browser login, forgot-password, and operator screens with the new guide and real accounts
  - run real operator-path checks for dashboard, ledger, Stock In, Dispatch, and RTO
  - replace placeholder SMTP with a real outbound provider so recovery emails are actually deliverable
  - add user deactivate/reactivate and future role-edit flows
  - define the future guided-cleanup workflow for products that have historical movements and therefore cannot be deleted directly
  - refine UI/UX issues found in the first live user pass

## Exit Criteria

- Operators can log in successfully
- Password recovery can be initiated and completed through the public auth screens
- Core warehouse flows are usable on desktop and mobile
- Dashboard and ledger views read live data from the backend
- Analysis screens use a shared filter pattern
- Dispatch includes both manual-entry and Shiprocket-shell tabs
- Frontend is deployable through the existing CI/CD and PM2 stack
