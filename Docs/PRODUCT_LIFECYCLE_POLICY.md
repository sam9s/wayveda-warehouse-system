# Product Lifecycle Policy

## Objective

Define how products should be managed in WayVeda so the system remains auditable and safe as the warehouse tool grows into a broader ERP foundation.

This document is the canonical explanation for:

- add product
- edit product
- deactivate product
- reactivate product
- permanent delete readiness
- future guided cleanup rules

## Current Product Actions

### Add Product

Use this when a genuinely new SKU needs to enter the system.

What it does:

- creates a new row in `products`
- makes the SKU available in active warehouse entry flows
- defaults `opening_stock_date` to the current day for new products

What it does not do:

- it does not create any inventory movement
- it does not import historical data automatically

### Edit Product

Use this for normal master-data maintenance:

- name correction
- SKU correction
- max-level update
- qty-per-carton update
- display-order update

This does not alter historical movement records.

### Deactivate Product

Use this when a SKU should stop being used operationally but its history must remain preserved.

What it does:

- sets `products.is_active = false`
- removes the SKU from active product selectors such as `Stock In`, `Dispatch`, and `RTO`
- removes the SKU from active operational ledger/dashboard views that only show active products

What it does not do:

- it does not change inventory movement rows
- it does not change the underlying balance calculation
- it does not erase history

Important nuance:

- deactivation is not a stock adjustment
- it is an operational-visibility change
- if a deactivated product is reactivated, it becomes visible again in active flows

### Reactivate Product

Use this when a deactivated SKU needs to return to the active warehouse workflow.

What it does:

- sets `products.is_active = true`
- restores the SKU to active selectors and views

What it does not do:

- it does not create or reverse any movement rows

## Why Hard Delete Is Dangerous

A product can become part of:

- warehouse movement history
- ledger math
- dashboard views
- audit history
- future ERP references

Because of that, permanent delete must never be a casual admin action.

If a product has already been used in real operations, deleting it can break the audit trail and create ambiguity about what happened historically.

## Current Permanent Delete Rule

Permanent delete is reserved for `system_admin` only.

It is not a normal business-admin action.

Before permanent delete, the system runs a delete-readiness check.

## Delete Readiness Check

The readiness check evaluates three core rules:

1. The product must be inactive.
2. The current balance must be zero.
3. The product must have no movement history.

Current UI flow:

1. open `Product Management`
2. select the product from the list
3. if you are logged in as `system_admin`, open the permanent-delete panel for that selected product
4. run the readiness check
5. review status, reasons, and next steps
6. only if the status is `Ready for delete`, use the permanent delete action and confirm the popup

Normal admins do not see the permanent-delete workflow.

### Readiness Statuses

#### `Ready for delete`

Meaning:

- inactive
- zero balance
- zero movement history

Action:

- permanent delete is allowed directly

#### `Blocked`

Meaning:

- one or more blocking conditions still exist

Common reasons:

- product is still active
- balance is not zero

Action:

- fix the blocking condition first

#### `Guided cleanup required`

Meaning:

- product is inactive
- balance is zero
- movement history still exists

Action:

- direct permanent delete is not allowed
- a guided cleanup workflow is required

## Guided Cleanup Principle

If a product has history, we should not silently rewrite or erase that history.

The correct approach is:

- preserve the audit trail
- retire the SKU cleanly
- create a supervised cleanup or migration workflow only when truly necessary

In most real business cases, a retired SKU should be:

- deactivated, not deleted

If stock needs to move to a replacement SKU, that should happen through a supervised inventory adjustment or transfer workflow, not by reassigning old history.

## Recommended Operating Rule

Use this decision order:

1. If the SKU is still valid: edit it.
2. If the SKU should stop being used but history matters: deactivate it.
3. If the SKU was deactivated by mistake: reactivate it.
4. If the SKU was created in error and has no history: run readiness and permanently delete it.
5. If the SKU has history: do not directly delete it; use guided cleanup policy instead.

## Safe Test Path For Permanent Delete

The safest current test is:

1. Create a temporary product with zero opening stock.
2. Save it.
3. Deactivate it.
4. Run delete readiness.
5. Confirm the status is `Ready for delete`.
6. Permanently delete it.

This tests the full guarded path without affecting real inventory history.
