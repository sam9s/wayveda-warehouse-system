# Phase B - Database And Historical Import

## Status

Completed on 2026-04-04.

## Objective

Establish the production database foundation for WayVeda using the approved schema, seed the 12 canonical products, and import verified historical inventory movements from the live workbook.

## Scope

- Create database tables required for products, movements, and auth-linked application access
- Create SQL views for ledger, dashboard, and analysis queries
- Seed the 12 canonical products using the normalized product mapping
- Import historical `Stock In`, `Dispatch`, and `RTO` data from `Docs/Wayveda Inventory Sheet.xlsx`
- Validate imported balances against the `Ledger` sheet and the targets documented in `ALICE_INSTRUCTIONS.md`

## Canonical Inputs

Use these inputs in this order:

1. `ALICE_INSTRUCTIONS.md`
2. `Docs/WayVeda_Project_Spec.md`
3. `Docs/Wayveda Inventory Sheet.xlsx`
4. `Docs/Wayveda Inventory Database.xlsx`

## Execution Steps

1. Finalized the migration sequence and created versioned SQL migrations.
2. Implemented the schema, indexes, triggers, and analytics views.
3. Normalized and seeded the 12-product master list.
4. Built workbook import tooling for `Stock In`, `Dispatch`, and `RTO`.
5. Imported and verified the historical data against approved ledger totals.
6. Recorded and corrected the ledger formula after owner confirmation.

## Validation Targets

- Opening stock date: `2025-07-24`
- Product count: `12`
- Canonical source workbook: `Docs/Wayveda Inventory Sheet.xlsx`
- Balance validation source: `Ledger` sheet and `ALICE_INSTRUCTIONS.md`

## Known Import Risks

- Ambiguous stock-in dates were resolved with explicit overrides in the import tool
- Non-numeric dispatch cells were normalized to zero during import
- Sheet naming irregularity `RTO ` is handled explicitly in the import tool
- Spreadsheet name variants are normalized to the canonical 12-product catalog

## Exit Criteria

- Schema is created and versioned
- SQL views are created and queryable
- Product seed data is correct for all 12 products
- Historical movements are imported successfully
- Verified balances match the owner-approved ledger targets

## Outputs

- Migrations created: `001` through `005`
- Products seeded: `12`
- Historical grouped submissions imported: `326`
- Historical movement rows imported: `1693`
- Ledger verification: passed

## Phase B Notes

- Host-side Node database access on this self-hosted Supabase stack required the Supavisor session-mode username format `postgres.your-tenant-id`.
- The live Google Sheet ledger had a balance bug and the earlier written spec formula was also incorrect.
- Final approved balance rule: `Opening Stock + Stock In + RTO Right - Dispatched`.
