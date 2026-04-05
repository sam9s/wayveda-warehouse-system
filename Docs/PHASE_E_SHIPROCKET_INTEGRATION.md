# Phase E - Shiprocket Integration

## Objective

Implement the first Shiprocket integration slice as a logistics-side dispatch sync layer without disturbing the approved warehouse ledger foundation.

## Dependency Note

Phase E planning does not depend on `max_level`.

Why:

- `max_level` only affects stock-health, reorder quantity, and dashboard health signals
- Shiprocket affects dispatch-sync convenience and logistics visibility
- Shiprocket is not the inventory baseline source

So Phase E implementation can proceed while `max_level` is still pending.

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

## Current Phase E Status

Completed in the first Phase E slice:

- backend Shiprocket config loader
- Shiprocket auth wrapper
- dispatch sync service
- sync logging in `shiprocket_sync_log`
- product-alias mapping config
- `GET /api/shiprocket/status`
- `GET /api/shiprocket/dispatches`
- `POST /api/shiprocket/sync`
- CLI sync command: `npm run shiprocket:sync`
- live `Dispatch > Shiprocket Synced` tab with:
  - connection state
  - sync status
  - manual `Sync now` control for admins
  - read-only synced dispatch table
  - recent sync-log table

Still pending before Phase E can be called complete:

- real Shiprocket credentials
- first successful live auth + sync test
- mapping review against real Shiprocket catalog names
- final decision on periodic sync / cron timing
- webhook shell or webhook implementation

## Required Inputs Before First Live Sync

- Shiprocket API credentials
- product-name mapping confirmation from real Shiprocket payloads
- agreed sync cadence if we enable periodic sync after the first manual test

## Credential Placement

Tracked template:

- `backend/.env.example`

Live server env file:

- `/root/apps/wayveda-warehouse-system/backend/.env`

Shiprocket keys to add there:

```env
SHIPROCKET_EMAIL=your-shiprocket-api-email
SHIPROCKET_PASSWORD=your-shiprocket-api-password
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
```

Optional sync tuning keys:

```env
SHIPROCKET_SYNC_LOOKBACK_DAYS=30
SHIPROCKET_SYNC_MAX_PAGES=5
SHIPROCKET_SYNC_PAGE_SIZE=50
SHIPROCKET_TIMEOUT_MS=20000
```

## Proposed Phase E Data Rules

### 1. Inventory Safety

Shiprocket must never become the only dispatch path.

If Shiprocket is unavailable:

- users must still be able to create manual dispatch entries
- users can keep working without Shiprocket entirely

### 2. Dedupe

Every synced dispatch must be deduplicated by external order identity, not by timestamp guesswork.

Primary candidate:

- `shiprocket_order_id`

Operational warning:

- do not manually enter the same customer order and then sync that same order from Shiprocket
- the current Phase E slice deduplicates Shiprocket rows against prior Shiprocket imports, not against manually entered dispatches with no external order ID

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

1. Add live credentials to the VPS backend `.env`.
2. Run first admin-triggered sync from the Dispatch screen.
3. Review unmapped products and extend `shiprocket-product-map.js` as needed.
4. Confirm the synced table fields against WayVeda expectations.
5. Decide whether to enable periodic sync after the first live pass.
6. Decide whether webhook work stays reserved or moves into the next slice.

## Exit Criteria

- Shiprocket auth works with real credentials
- sync can be manually triggered
- synced rows are stored with `source = 'shiprocket'`
- duplicate sync runs do not duplicate dispatch rows
- unmapped products are surfaced clearly
- manual dispatch still works at all times
- operators can review synced rows without admin rights

## Risks

- product naming mismatch between Shiprocket and our catalog
- duplicate imports if external IDs are not handled cleanly
- accidental business dependence on Shiprocket if manual fallback is not preserved visibly

## Recommendation

Phase E has now started in a safe first slice.

The immediate next action is:

1. add the real Shiprocket credentials to `/root/apps/wayveda-warehouse-system/backend/.env`
2. trigger the first live sync from `Dispatch > Shiprocket Synced`
3. review mapping and sync results before enabling any scheduled job
