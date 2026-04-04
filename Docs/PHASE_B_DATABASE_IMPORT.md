# Phase B - Database And Historical Import

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

1. Finalize the Phase B implementation checklist and migration sequence.
2. Define the exact SQL schema and views to be created first.
3. Normalize the 12-product master list and seed values.
4. Build import scripts for `Stock In`, `Dispatch`, and `RTO`.
5. Run import validation against approved ledger totals.
6. Record mismatches and corrections before moving to backend API work.

## Validation Targets

- Opening stock date: `2025-07-24`
- Product count: `12`
- Canonical source workbook: `Docs/Wayveda Inventory Sheet.xlsx`
- Balance validation source: `Ledger` sheet and `ALICE_INSTRUCTIONS.md`

## Known Import Risks

- Ambiguous date formats in historical stock-in records
- Non-numeric cells inside dispatch data
- Sheet naming irregularity: `RTO ` contains a trailing space
- Possible naming mismatches between spreadsheet labels and normalized product names

## Exit Criteria

- Schema is created and versioned
- SQL views are created and queryable
- Product seed data is correct for all 12 products
- Historical movements are imported successfully
- Verified balances match the approved ledger targets
