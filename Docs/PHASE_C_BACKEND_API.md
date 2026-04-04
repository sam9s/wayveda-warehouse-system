# Phase C - Backend API

## Objective

Build the production Express API layer on top of the verified Phase B database foundation.

## Scope

- Create the backend app bootstrap and runtime structure
- Add environment loading, database access, and health checks
- Implement auth integration with self-hosted Supabase
- Implement product endpoints
- Implement movement entry endpoints for `stock_in`, `dispatch`, and `rto`
- Implement inventory and analytics read endpoints backed by SQL views
- Prepare PM2-ready backend startup flow for later full deployment automation

## Canonical Inputs

Use these inputs in this order:

1. `ALICE_INSTRUCTIONS.md`
2. `Docs/WayVeda_Project_Spec.md`
3. `Docs/PROJECT_DECISIONS.md`
4. `Docs/PROJECT_PROGRESS.md`
5. `Docs/PHASE_B_DATABASE_IMPORT.md`

## Planned Work Items

1. Create the Express app structure and shared config layer.
2. Implement database access and service boundaries around the Phase B schema.
3. Add auth middleware and user-context handling with Supabase.
4. Build product CRUD routes.
5. Build movement creation routes with validation by movement type.
6. Build dashboard, ledger, and analysis read routes from SQL views.
7. Add a health endpoint and deployment-safe startup command.

## Exit Criteria

- Express app starts reliably on the VPS
- Health endpoint responds successfully
- Product routes work against the seeded catalog
- Movement entry routes enforce the correct business constraints
- Inventory and analytics endpoints read from SQL views, not duplicated logic
- Backend is ready to be wired into the full deploy workflow and frontend work
