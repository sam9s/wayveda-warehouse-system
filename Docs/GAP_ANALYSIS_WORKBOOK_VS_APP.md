# WayVeda Workbook vs App Gap Analysis

## Objective

This document records the current differences between the provided workbook and the live WayVeda application so business review does not rely on memory or chat history.

Workbook reviewed:

- `Docs/Wayveda_by_MeDa_v2_FINAL.xlsx`

## Key Clarification

`max_level` is not a blocker for ongoing product development, but it is a blocker for meaningful stock-health sign-off.

What still works without `max_level`:

- login and role testing
- Stock In, Dispatch, and RTO write flows
- ledger balance verification
- analysis screens and trends
- admin and product-management flows

What depends on `max_level`:

- stock percentage
- health status
- order quantity / reorder quantity
- dashboard health counts

Until real `max_level` values are loaded, the correct system response is `Set Max Level`.

## Formula Analysis

### 1. Approved Balance Formula

The live application uses the owner-approved balance rule:

- `balance = opening_stock + stock_in + rto_right - dispatch`

This is the approved production rule and must remain the source of truth.

### 2. Workbook Ledger Balance

The workbook `Ledger` tab still calculates balance with the older formula:

- `balance = opening_stock + stock_in + rto_right - rto_wrong_fake - dispatch`

That workbook formula is stale.

So:

- the workbook is useful for layout, reporting logic, and threshold intent
- the workbook is not fully canonical for balance math

### 3. Order Quantity Formula

Workbook formula:

- `IF(max_level = 0, "Set Max Level", MAX(0, max_level - balance))`

Meaning:

- this is an absolute replenishment quantity
- it tells the user how many units are needed to get back to target

### 4. Status Formula

Workbook formula:

- `IF(balance / max_level > 1, "Above Target", ... )`

Meaning:

- this is a relative stock-health band
- it tells the user how healthy the stock position is compared to target

The current app now follows these workbook status buckets:

- `Set Max Level`
- `Above Target`
- `On Track`
- `Watch`
- `Low Stock`
- `Critical`

## Current App Coverage by Workbook Tab

### Dashboard

Covered now:

- health-status model now follows Ankush's workbook thresholds
- active-product counts
- healthy / watch / critical / configuration grouping
- latest-entry visibility

Still missing or different:

- row-level `Order Qty` is not shown yet
- `Last Month Dispatch` is not shown yet
- `This Month (So Far)` is not shown yet
- workbook uses a more dispatch-oriented latest-entry presentation

### Ledger

Covered now:

- approved balance logic
- opening stock
- stock received
- dispatch
- `RTO Right`
- `RTO Wrong`
- `RTO Fake`
- balance
- stock percentage
- latest movement

Still missing or different:

- workbook-style `Max Level` column is not shown in the ledger UI
- workbook-style `RTO Wrong + Fake` combined lost column is not shown as a combined field
- workbook-style `Status` column is not shown in ledger UI
- workbook-style `Order Qty` is not shown in ledger UI
- workbook-style `Last Month Dispatch` is not shown in ledger UI

### Dispatch Analysis

Covered now:

- daily / weekly / monthly trend analysis
- date filtering
- product filtering
- rolling totals for today, last 7 days, last 30 days

Difference:

- workbook is a wide product-by-period matrix
- app is a filterable chart and table view

This is a presentation difference, not a logic failure.

### RTO Analysis

Covered now:

- `Right`, `Wrong`, and `Fake` tracking
- totals for today, last 7 days, last 30 days
- product filtering
- period toggles and charting

Still missing or different:

- workbook emphasizes warehouse-fault-style reporting more explicitly
- app computes warehouse-fault data in the ledger layer but does not yet surface it as a headline KPI in the RTO analysis screen

### Inward Analysis / Stock In Analysis

Covered now:

- quantity trends
- carton totals
- today / last 7 days / last 30 days
- product filtering

Difference:

- workbook is matrix-first
- app is filterable chart + table first

### Daily Dispatch / RTO Log / Stock In / Form Responses

These workbook tabs are raw operational sheets.

The live app intentionally does not mirror them as raw spreadsheet tabs because they are replaced by:

- structured movement forms
- the inventory ledger
- analysis screens
- recent-movement and audit views

This is an intentional product design difference, not an omission.

## Open Gaps Requiring Client Input

- real `max_level` values
- any approved `qty_per_carton` defaults
- confirmation on whether workbook-style dispatch summary fields should be surfaced in dashboard and ledger
- confirmation on whether warehouse fault percentage should be promoted in `RTO Analysis`

## Recommended Next Actions

1. Continue normal UAT for flows that do not depend on `max_level`.
2. Wait for Ankush to confirm real `max_level` values.
3. Load those values into products.
4. Then decide whether to add the workbook-parity fields below:
   - `Order Qty`
   - `Last Month Dispatch`
   - `This Month Dispatch`
   - `Warehouse Fault %`

## Conclusion

The application is not blocked by missing `max_level`, but stock-health and reorder views cannot be considered business-final until those values are supplied.

The workbook remains useful as a reporting reference, but its ledger balance formula should not be copied as-is because it still reflects the older rejected balance logic.
