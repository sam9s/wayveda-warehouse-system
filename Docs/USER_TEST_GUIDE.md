# User Guide and Test Guide

## Purpose

This guide explains how to use the current Phase D application and how to test it safely.

Important:

- this system is connected to live inventory data
- read-only checks are safe
- write actions like `Stock In`, `Dispatch`, and `RTO` create real movement records
- there is no delete or undo screen yet

Do not submit random warehouse entries just for testing.

## Login

### First Login

1. Open `https://wh.wayveda.cloud/login`
2. Enter the temporary email and password shared with you
3. On first login, the system will redirect you to `Change Password`
4. Enter:
   - current temporary password
   - your new password
   - confirm the new password
5. Save the new password
6. After that, you will be taken to the dashboard

### After First Login

- use your new password going forward
- you can change your password again from the `Password` button in the top-right header
- if you forget your password, use `Forgot password?` on the login screen to request a recovery link

## Theme Selector

The theme selector is in the left sidebar, just below `WayVeda Warehouse Operations`.

Available themes:

- `Teal`
  - default warehouse theme
- `Blue`
  - cooler operational theme
- `Cream`
  - softer off-white theme

What to test:

- changing theme updates sidebar, header, background, and cards
- theme stays selected after page refresh
- theme works on login screen and inside the app shell

## Safe Read-Only Test Flow

This is the best first pass because it does not alter live inventory.

### 1. Dashboard

Open `Dashboard`.

Verify:

- the page loads without errors
- all summary cards load
- quick-action cards render correctly
- product rows appear
- values look reasonable against the known inventory context

### 2. Inventory Ledger

Open `Inventory Ledger`.

Verify:

- ledger rows load
- product search works
- formula strip is visible
- balance values are present
- CSV export downloads successfully

### 3. Analysis Pages

Open:

- `Dispatch Analysis`
- `Inward Analysis`
- `RTO Analysis`

Verify:

- charts load
- date filters work
- period toggles work
- tables and summaries refresh when filters change

### 4. Settings

Open `Settings`.

Verify:

- current user details are correct
- role is correct
- password status is correct
- API and database health show `ok`
- theme name matches the selected theme

## Controlled Write Testing

Only do this after deciding the exact test case in advance.

Because this is live inventory-backed, a write test should be treated like a real warehouse transaction.

Before any write-path test:

1. choose one specific product
2. note the current ledger balance
3. use a very small agreed quantity
4. decide the reversal path before submitting

Recommended method:

- create one controlled test entry
- verify that it appears in recent movements and affects the right screens
- if reversal is needed, create the appropriate reverse business entry manually

Do not perform repeated trial-and-error submissions.

## Movement Screen Test Checklist

### Stock In

Open `Stock In`.

Check before submit:

- numbered sections are clear
- date and operator details render correctly
- `+ Add Product` works
- item count badge updates
- validation behaves correctly for empty or invalid fields

Expected behavior after a real submit:

- success message appears
- movement is saved
- ledger and dashboard reflect the change

### Dispatch

Open `Dispatch`.

Check:

- `Manual Entry` tab works
- `Shiprocket Synced` placeholder tab is visible
- multi-product flow works
- validation prevents empty submissions

Expected behavior after a real submit:

- movement is stored as dispatch
- ledger balance reduces accordingly

### RTO

Open `RTO`.

Check:

- Right / Wrong / Fake entry fields behave correctly
- multi-product flow works
- validation prevents invalid totals

Expected behavior after a real submit:

- `RTO Right` affects balance
- `RTO Wrong` and `RTO Fake` remain reporting values only
- RTO analysis reflects the entry

## Role Expectations

### `system_admin`

Should be able to:

- view everything
- use all movement entry screens
- access product management
- access settings

### `admin`

Should be able to:

- do normal warehouse operations
- access product management
- access settings

### `operator`

Should be able to:

- view dashboard, ledger, and analysis
- submit movement entries
- not access admin-only pages

### `viewer`

Should be able to:

- view dashboard, ledger, and analysis
- not submit movement entries
- not access admin-only pages

## What To Report Back

When you test, report findings in this format:

1. page or feature name
2. what you did
3. what you expected
4. what actually happened
5. screenshot if relevant

Example:

- `Inventory Ledger`
- searched for `Mulethi`
- expected filtered rows only
- actual result showed all rows

## Current Known Boundaries

- live login is working
- first-login password change is enforced
- theme selector is available
- forgot-password screens are live, but external recovery-email delivery still depends on final SMTP setup
- no delete/undo UI exists yet
- user-management UI is not built yet
- WayVeda operator/viewer user creation is still pending

## Recommended First Test Sequence

Follow this order:

1. login
2. change temporary password
3. switch themes and refresh once
4. review dashboard
5. review ledger and CSV export
6. review all three analysis screens
7. review settings
8. only then decide whether to do one controlled write-path test
