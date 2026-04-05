# Phase E - Shiprocket Integration

## Objective

Plan the Shiprocket integration as a logistics-side dispatch sync layer without disturbing the approved warehouse ledger foundation.

## Dependency Note

Phase E planning does not depend on `max_level`.

Why:

- `max_level` only affects stock-health, reorder quantity, and dashboard health signals
- Shiprocket affects dispatch-sync convenience and logistics visibility
- Shiprocket is not the inventory baseline source

So Phase E planning can proceed while `max_level` is still pending.

## Canonical Role of Shiprocket

Shiprocket is a logistics data source.

It is not:

- the opening inventory source
- the stock-in source
- the warehouse balance source

Inventory baseline still comes from the cutover workbook and later from the application itself.

Shiprocket should only help with:

- dispatch sync
- shipment visibility
- order / AWB reference
- logistics-side status tracking

## Locked Principles

- Phase 1 is read-only pull integration.
- Manual dispatch remains available even if Shiprocket is down.
- Shiprocket data is additive, not mandatory for warehouse operation.
- Inventory balances must keep following the approved ledger rule:
  - `Opening Stock + Stock In + RTO Right - Dispatch`

## Phase E Scope

### Backend

- Shiprocket auth wrapper
- token caching / refresh handling
- sync service for latest dispatches
- sync logging to `shiprocket_sync_log`
- dedupe logic using `shiprocket_order_id`
- product-name mapping layer
- manual sync trigger endpoint
- sync-status endpoint
- optional webhook receiver shell if Phase 1 still wants it reserved

### Frontend

- replace the Dispatch `Shiprocket Synced` placeholder with a real synced table
- show sync status, last sync time, and errors
- show imported rows as read-only logistics records
- keep `Manual Entry` fully usable in parallel

## Required Inputs Before Implementation

- Shiprocket API credentials
- agreed sync cadence
- product-name mapping rules
- status fields WayVeda actually wants visible in the synced table
- whether webhook handling is in Phase E initial build or only reserved

## Proposed Phase E Data Rules

### 1. Inventory Safety

Shiprocket must never become the only dispatch path.

If Shiprocket is unavailable:

- users must still be able to create manual dispatch entries

### 2. Dedupe

Every synced dispatch must be deduplicated by external order identity, not by timestamp guesswork.

Primary candidate:

- `shiprocket_order_id`

### 3. Source Flagging

Auto-created dispatch entries must be clearly marked:

- `source = 'shiprocket'`

Manual entries remain:

- `source = 'manual'`

Historical imports remain:

- `source = 'import'`

### 4. Mapping Safety

If a Shiprocket product name cannot be matched confidently:

- do not silently invent a product match
- log it as unmapped
- surface it in sync status for admin review

## Suggested Phase E Work Breakdown

1. Confirm credentials and mapping assumptions.
2. Build backend Shiprocket config and auth service.
3. Build sync log service and status endpoint.
4. Build dispatch pull sync with dedupe.
5. Build unmapped-product reporting.
6. Replace Dispatch page placeholder with synced read-only table.
7. Verify manual fallback still works.

## Exit Criteria

- Shiprocket auth works with real credentials
- sync can be manually triggered
- synced rows are stored with `source = 'shiprocket'`
- duplicate sync runs do not duplicate dispatch rows
- unmapped products are surfaced clearly
- manual dispatch still works at all times

## Risks

- product naming mismatch between Shiprocket and our catalog
- duplicate imports if external IDs are not handled cleanly
- accidental business dependence on Shiprocket if manual fallback is not preserved visibly

## Recommendation

Phase E planning should proceed now.

Actual Phase E implementation should wait until:

- credentials are available
- mapping expectations are confirmed
- WayVeda agrees what the synced Dispatch tab must show
