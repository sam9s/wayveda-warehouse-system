# Phase D - Frontend Application

## Objective

Build the operator-facing React application on top of the completed Phase C backend.

## Scope

- Create the frontend app shell and protected routing
- Implement login and session handling against the Phase C auth API
- Build dashboard and inventory views
- Build Stock In, Dispatch, and RTO entry screens
- Build product-management and admin-facing utility screens
- Prepare the frontend for PM2/Caddy production serving through the existing backend entry point

## Canonical Inputs

Use these inputs in this order:

1. `ALICE_INSTRUCTIONS.md`
2. `Docs/WayVeda_Project_Spec.md`
3. `Docs/PROJECT_DECISIONS.md`
4. `Docs/PROJECT_PROGRESS.md`
5. `Docs/PHASE_C_BACKEND_API.md`
6. `GWMS_repo/` as a structural reference only, not as a visual or code-copy target

## Planned Work Items

1. Scaffold the React 19 + Vite frontend structure and route shell.
2. Define the frontend design tokens, layout system, and CSS Modules conventions.
3. Implement login and protected app-shell behavior.
4. Build dashboard, ledger, and analysis screens against the live backend endpoints.
5. Build Stock In, Dispatch, and RTO data-entry flows with mobile-first operator UX.
6. Build product-management and admin support screens.
7. Add production build and backend/static-serving integration.

## Exit Criteria

- Operators can log in successfully
- Core warehouse flows are usable on desktop and mobile
- Dashboard and ledger views read live data from the backend
- Frontend is deployable through the existing CI/CD and PM2 stack
