# WayVeda Go-Live Cutover

## Objective

This document explains how WayVeda should move from the current Google Sheet workflow into the WayVeda Warehouse System without carrying stale or test inventory into live operations.

## Core Principle

The numbers currently in the application are valid for development and user testing only.

By go-live, real warehouse stock and movement values will have changed. Because of that, production go-live must use a final cutover import from the last approved live workbook at the exact cutover moment.

Do not assume the current application dataset will still be correct on launch day.

## Recommended Go-Live Model

Use a controlled cutover:

1. keep using the current Google Sheet until the agreed cutover window
2. freeze sheet updates at the cutover time
3. export the final live workbook
4. back up the application database
5. import the final workbook into the application
6. reconcile balances product by product
7. get business sign-off
8. switch warehouse operations into the application

This is the safest and most defensible way to ensure the application reflects the exact inventory position at go-live.

## Why This Matters

The application is currently being refined and tested.

That means:

- the historical workbook imported during Phase B is now old
- test activity during UAT may not represent real production movement
- production opening values and balances must be refreshed at cutover

If go-live is done without a final reconciliation step, the system risks starting from the wrong baseline.

## Business Roles During Cutover

### WayVeda Operations Owner

Responsible for:

- confirming the final sheet freeze time
- confirming that no more Google Sheet entries are made after freeze
- approving the final reconciliation result

### System Admin

Responsible for:

- coordinating the go-live window
- confirming user access is ready
- confirming the approved admin, operator, and viewer accounts

### Technical Execution

Responsible for:

- database backup
- final import execution
- verification
- rollback if a mismatch is found

## Pre-Cutover Checklist

Before go-live day:

- confirm the final cutover date and time
- confirm who is allowed to enter data during the freeze window
- confirm all required user accounts are created
- confirm all users know the login URL
- confirm the latest production workbook path and naming convention
- confirm the final live workbook is the only approved source for cutover import
- confirm rollback ownership and sign-off contacts

## Cutover-Day Sequence

### Step 1. Freeze The Old Process

At the agreed time:

- stop new entries in the Google Sheet
- stop any parallel warehouse logging outside the agreed source
- announce that the sheet is frozen

### Step 2. Capture The Final Source Workbook

- export the final Google Sheet workbook immediately after freeze
- confirm that the workbook contains the latest real values
- confirm no further edits are made after export

### Step 3. Protect The Current System State

Before import:

- take a database backup on the VPS
- keep a copy of the exact cutover workbook
- keep the current deployed app version unchanged during the cutover window

### Step 4. Rebuild The Production Inventory Baseline

Preferred method:

- clear or rebuild production inventory movement data so UAT and test activity do not remain in the live baseline
- run the product seed and final historical import against the cutover workbook

Important note:

- the current import tooling is idempotent for imported workbook rows
- it does not automatically remove unrelated UAT or manual test entries
- because of that, first go-live should be treated as a clean production baseline reset, not just an overlay import

### Step 5. Verify The Imported Result

Verify:

- all 12 canonical products exist
- ledger totals match the cutover workbook
- dashboard balances match expectations
- recent movement history reflects the imported workbook correctly
- the approved formula is still in effect:
  `Opening Stock + Stock In + RTO Right - Dispatch`

### Step 6. Business Reconciliation

WayVeda should review:

- each product balance
- key stock-in totals
- key dispatch totals
- key RTO totals

Go-live should only proceed after business sign-off.

### Step 7. Start Live Usage

After sign-off:

- stop using the Google Sheet for warehouse operations
- start entering all new movements directly in the application
- treat the app as the operational source of truth from that moment forward

## Rollback Rule

If any material mismatch is found during cutover:

- do not continue into live usage
- keep the old process active temporarily
- restore from the backup if needed
- fix the mismatch
- repeat the verification before relaunch

## What Will Be Prepared Technically

Before actual go-live execution, the technical side should have:

- one backup step
- one final import step
- one reconciliation checklist
- one rollback path

This makes cutover repeatable and controlled instead of manual or improvised.

## Final Recommendation

Treat the current environment as UAT until the final cutover workbook is imported and approved.

The go-live numbers must come from the last frozen live workbook, not from the current testing state of the app.
