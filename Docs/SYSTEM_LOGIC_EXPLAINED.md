# System Logic Explained

## Purpose

This document explains the WayVeda system in plain English so business users can understand what the application is doing and how Shiprocket fits into it.

## The Three Sources

There are three separate things in this project:

1. The old Excel / Google Sheet system
2. The new WayVeda application
3. Shiprocket

They are connected, but they are not the same thing.

## 1. Old Excel / Google Sheet System

The workbook and legacy sheets were the old warehouse system.

They gave us:

- opening stock
- stock-in history
- dispatch history
- RTO history
- ledger formulas
- dashboard and analysis formulas

We used that data to build the new system foundation and to verify the historical numbers.

## 2. New WayVeda Application

The new application is now the warehouse system we are building.

It stores:

- products
- stock-in movements
- dispatch movements
- RTO movements
- dashboard status
- analysis data
- user access and audit trail

This application is where the real inventory logic lives.

## 3. Shiprocket

Shiprocket is not the warehouse system.

Shiprocket is the logistics / shipping data source.

Shiprocket gives us things like:

- order ID
- AWB
- shipment status
- product name as it appears in Shiprocket
- quantity

Shiprocket does **not** give us the full warehouse truth.

Shiprocket does **not** tell us:

- opening stock
- stock-in received
- real warehouse balance by itself
- whether an RTO is `Right`, `Wrong`, or `Fake`

That is why Shiprocket cannot replace the inventory system.

## Why Shiprocket Was Integrated

Shiprocket was integrated for one main reason:

- to reduce manual dispatch entry

Without Shiprocket:

- warehouse dispatch happens
- then someone manually enters the same dispatch again into our app

With Shiprocket:

- once an order reaches a dispatch-stage shipping status
- our system can pull it
- and create the dispatch movement automatically

So Shiprocket helps the `Dispatch` side only.

## The Core Inventory Formula

The approved production formula is:

`Balance = Opening Stock + Stock In + RTO Right - Dispatch`

This means:

- `Stock In` adds stock
- `Dispatch` reduces stock
- `RTO Right` adds stock back
- `RTO Wrong` does not add stock back
- `RTO Fake` does not add stock back

## Example

If current stock is `10`:

1. Dispatch `5`
2. Balance becomes `5`
3. If `RTO Right = 3`
4. Balance becomes `8`

If those returned items are `Wrong` or `Fake`, they do not go back into stock.

So in that case the balance stays `5`.

## Important Screen Logic

Not every screen means "current stock".

### Dashboard

Shows:

- stock health
- latest movement information
- balance-oriented operational visibility

### Inventory Ledger

Shows:

- the actual inventory math
- opening stock
- stock-in
- dispatch
- RTO components
- resulting balance

If you want to know "how much stock is left", this is the right place to look.

### Stock In Analysis

Shows:

- only inward stock received
- quantity received
- cartons received

This page does **not** show stock left after dispatch.

So dispatch does not reduce `Stock In Analysis`.

### Dispatch Analysis

Shows:

- outgoing dispatch quantity trends
- daily / weekly / monthly movement of dispatches

Shiprocket imports affect this screen because Shiprocket creates real dispatch rows.

### RTO Analysis

Shows:

- `Right`
- `Wrong`
- `Fake`
- total RTO trend

This screen depends on warehouse-side RTO classification, not on Shiprocket alone.

## How Shiprocket Affects the System Right Now

The current Phase E slice is live and working.

As of April 5, 2026:

- Shiprocket authentication is working
- dispatch sync is working
- imported Shiprocket rows are being written as real `dispatch` movements
- those imported rows already affect:
  - Dispatch Analysis
  - Inventory Ledger
  - Dashboard latest-entry visibility
  - live stock balance

They do **not** affect:

- Stock In Analysis

because that page only tracks incoming stock.

## Why `Dispatch Today` Can Still Be Zero

This is expected if the imported dispatch rows are dated before today.

For example:

- if Shiprocket sync imports rows dated `2026-04-04`
- then `Dispatch Today` on `2026-04-05` will still show `0`

That does **not** mean Shiprocket is broken.

It only means:

- the imported rows belong to April 4
- not April 5

Also:

- orders in Shiprocket with status `NEW` are not treated as dispatch-complete
- only dispatch-stage statuses should reduce inventory

## What Shiprocket Does Not Yet Do

Shiprocket currently does not classify RTO quality outcomes.

So it does not decide:

- `Right`
- `Wrong`
- `Fake`

That still needs warehouse inspection and manual RTO entry in our app.

## Why Some Shiprocket Orders Are Being Held Back

Shiprocket product names do not always match our internal product names exactly.

Example:

- our catalog says `Strawberry Power Roll-On`
- Shiprocket may say `Wayveda Power Roll-On For Men - 50ml Strawberry-Flavour`

That one is a safe match.

But some names are ambiguous, for example:

- `Wayveda Power Roll-On For Men - 50ml Male Enhancer`
- `3X Black Combo For men Roll on capsules shots`

If we guess wrong, we subtract stock from the wrong product.

That would corrupt inventory.

So the system does this deliberately:

- clear match -> import
- unclear match -> hold back and report for business confirmation

## One-Line Summary

The workbook gave us the historical warehouse foundation.

The new app is the inventory system.

Shiprocket is only the logistics dispatch feed that can automatically create dispatch rows inside that inventory system.
