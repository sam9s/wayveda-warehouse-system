# Alice Instructions — Architecture Answers + Data Seeding Guide

**From:** Astra (Solution Architect)
**Date:** 2026-04-03
**Status:** Definitive — follow these instructions

---

## Part 1 — Answers to Alice's Questions

### Q1: Subdomain Architecture

**Answer: Two subdomains only. No separate api.wayveda.cloud.**

- wh.wayveda.cloud -> localhost:4002 (Frontend + API, same Express process)
- db.wayveda.cloud -> localhost:8000 (Supabase Studio)

Express on port 4002 serves both built React static files (from frontend/dist/) and API routes under /api/*. Caddy proxies everything to localhost:4002. Caddyfile has only two server blocks. This mirrors the GREST pattern exactly (wh.sam9scloud.in -> localhost:4002). No CORS complications. No third subdomain.

### Q2: Canonical Product List

**Answer: 12 products. Not 13.**

"Cream" (#13 in the old Product-Name tab of Wayveda_Inventory_Database.xlsx) was a test entry by the WayVeda dev — confirmed by the project manager. Drop it entirely. The real inventory sheet (Wayveda_Inventory_Sheet.xlsx, Ledger tab) shows exactly 12 active products.

---

## Part 2 — Product Seed Data

Source: `data/Wayveda_Inventory_Sheet.xlsx` -> Ledger tab
Opening stock date: **24 July 2025**

### Seed SQL (use this exactly)

```sql
INSERT INTO products (name, category, opening_stock, is_active) VALUES
('Bum Plumping Cream - 50g',           'Intimate Care',   1057, true),
('Intimate Whitening Roll-On - 50ml',  'Intimate Care',    957, true),
('Chocolate Power Roll-On',            'Male Wellness',    477, true),
('Strawberry Power Roll-On',           'Male Wellness',    544, true),
('Bhasam Power Capsule',               'Male Wellness',    494, true),
('Power Shots Sachet',                 'Male Wellness',    472, true),
('Hairfall Control Serum - 50ml',      'Hair Care',        366, true),
('Hairfall Control Shampoo - 200ml',   'Hair Care',        448, true),
('Hairfall Control Tablets - 60N',     'Hair Care',        399, true),
('Anti-Hairfall Kit',                  'Hair Care',        408, true),
('Power Roll Oil Unflavoured',         'Male Wellness',      0, true),
('Power Shot Oil',                     'Male Wellness',     49, true);
```

### Notes on product data
- max_level: pending from WayVeda team. Leave as NULL. Dashboard will show "Set Max Level" (same as current sheet).
- qty_per_carton: pending from client. Leave as NULL.
- sku: not provided yet. Leave as NULL.
- opening_stock date is 24 July 2025. All movements in the sheet are AFTER this date.

---

## Part 3 — Product Name Mapping

The spreadsheet uses slightly different product names across different tabs. Alice MUST map these when importing historical data.

| Spreadsheet Name (as found in sheet headers) | Database Name (canonical) |
|---|---|
| Bum Plumping Cream - 50g | Bum Plumping Cream - 50g |
| Intimate Whitening Roll-On – 50 ml | Intimate Whitening Roll-On - 50ml |
| Chocolate Power Roll-On | Chocolate Power Roll-On |
| Strawberry Power Roll-On | Strawberry Power Roll-On |
| Bhasam Power Capsule | Bhasam Power Capsule |
| Power Shots sachet | Power Shots Sachet |
| Power Shots- Sachet | Power Shots Sachet |
| Power Shots -sachet | Power Shots Sachet |
| Hairfall Control Serum-50ml | Hairfall Control Serum - 50ml |
| Hairfall Control Shampoo-200ml | Hairfall Control Shampoo - 200ml |
| Hairfall Control Tablets-60N | Hairfall Control Tablets - 60N |
| Anti-Hairfall Kit | Anti-Hairfall Kit |
| POWER ROLL OIL UNFLAVOURED | Power Roll Oil Unflavoured |
| Power Shot Oil | Power Shot Oil |

Key differences to watch: dashes with/without spaces, capitalization, en-dash (–) vs hyphen (-) in "50 ml" vs "50ml", inconsistent "Power Shots" naming across tabs. Normalize ALL to the Database Name column during import.

---

## Part 4 — Historical Data Import Guide

The file `data/Wayveda_Inventory_Sheet.xlsx` contains 4 tabs with real operational data spanning Aug 2025 to Apr 2026. This data must be imported into the `inventory_movements` table after products are seeded.

### Tab 1: Ledger (VERIFICATION ONLY — do NOT import as movements)

- Row 0: column headers (Sr. No., Product Name, Stock as on 24/07/25, Stock In, RTO columns, Dispatch, Balance)
- Rows 2-13: summary totals per product
- Final approved balance rule:

```
Balance = Opening Stock + Stock In + RTO Right - Dispatch
```

`RTO Wrong` and `RTO Fake` remain reporting metrics but do not reduce balance again because dispatch has already reduced stock.

- This is the VERIFICATION TARGET. After importing all movements from the other 3 tabs, query `v_inventory_ledger` and the Balance column must match these values:

```
Bum Plumping Cream - 50g:           874
Intimate Whitening Roll-On - 50ml: 1138
Chocolate Power Roll-On:           3205
Strawberry Power Roll-On:           988
Bhasam Power Capsule:               897
Power Shots Sachet:                 379
Hairfall Control Serum - 50ml:      343
Hairfall Control Shampoo - 200ml:   392
Hairfall Control Tablets - 60N:     282
Anti-Hairfall Kit:                  393
Power Roll Oil Unflavoured:         624
Power Shot Oil:                      27
```

Also verify the movement totals from the Ledger:
```
Product                              | Stock In | Dispatch | RTO Right | RTO Wrong | RTO Fake
Bum Plumping Cream - 50g            |        0 |      220 |        37 |         0 |        7
Intimate Whitening Roll-On - 50ml   |      926 |      815 |        70 |         0 |        3
Chocolate Power Roll-On             |     4260 |     1859 |       327 |         9 |       35
Strawberry Power Roll-On            |     5548 |     6338 |      1234 |         0 |      109
Bhasam Power Capsule                |     2488 |     2290 |       205 |         0 |        6
Power Shots Sachet                  |     3198 |     3784 |       493 |         0 |        4
Hairfall Control Serum - 50ml       |        0 |       26 |         3 |         0 |        1
Hairfall Control Shampoo - 200ml    |        0 |       66 |        10 |         0 |        4
Hairfall Control Tablets - 60N      |        0 |      118 |         1 |         0 |        0
Anti-Hairfall Kit                   |        0 |       15 |         0 |         0 |        0
Power Roll Oil Unflavoured          |     4740 |     5386 |      1270 |         0 |       71
Power Shot Oil                      |        0 |       26 |         4 |         0 |        0
```

Note: Power Shot Oil shows Stock In = NaN in the Ledger, treat as 0.

---

### Tab 2: Daily Dispatch

**Structure:** Date in column 0 (row index 0 = header row), then one column per product with daily dispatch quantities. Last column is "Sales Growth" (daily total).

**movement_type:** `dispatch`

**Data:** ~247 rows of actual data from 2025-08-01 to 2026-04-02. Rows after that are empty future placeholder dates.

**Parsing gotchas (CRITICAL):**
1. Row 0 has product name headers — use the mapping table from Part 3
2. Text values appear in quantity cells: "sunday", "SUNDAY", "meeting schedule in hisar taking off" — treat ALL non-numeric values as 0/skip
3. A single dot "." appears in at least one cell (Nov 2 data) — treat as 0
4. NaN means 0 (no dispatch for that product on that day)
5. Empty future dates (all NaN) — stop importing when you hit consecutive empty rows
6. Last column is "Sales Growth" / total per day — do NOT import this as a product column
7. Column headers are truncated product names — map using Part 3 table

**Import logic:**
For each date row where the date is valid:
  For each product column (not the Sales Growth column):
    If value is a valid number > 0:
      Create one `inventory_movements` record:
        - movement_type = 'dispatch'
        - entry_date = the date from column 0
        - quantity = the cell value
        - product_id = lookup from products table using mapped name
        - source = 'import'
        - submitted_by = 'historical_import'
        - submission_id = 'IMP-YYYYMMDD-XXXX' (XXXX = sequential counter)

---

### Tab 3: RTO

**Structure:** Date in column 0. For EACH product, there are 3 consecutive sub-columns: Right | Wrong | Fake. So 12 products x 3 = 36 data columns.

**movement_type:** `rto`

**Data:** ~248 rows from 2025-07-30 to 2026-04-02.

**Parsing gotchas (CRITICAL):**
1. Row 0: contains the TOTAL summary values per product (Right/Wrong/Fake totals since inception) — SKIP this row, do not import as a movement
2. Row 1: sub-column headers (the words "Right", "Wrong", "Fake" repeated for each product)
3. Data starts at row 2
4. Each product occupies 3 consecutive columns: [Right, Wrong, Fake]
5. NaN means 0
6. Empty strings — treat as 0
7. Product names in column headers are the spreadsheet variants — use mapping table from Part 3

**Import logic:**
For each date row (starting row 2) where date is valid:
  For each product (reading 3 columns at a time):
    right_val = column[product_right] or 0
    wrong_val = column[product_wrong] or 0
    fake_val = column[product_fake] or 0
    If any of (right_val, wrong_val, fake_val) > 0:
      Create one `inventory_movements` record:
        - movement_type = 'rto'
        - entry_date = the date from column 0
        - rto_right = right_val
        - rto_wrong = wrong_val
        - rto_fake = fake_val
        - quantity = NULL (rto uses the right/wrong/fake fields, not quantity)
        - product_id = lookup from products table using mapped name
        - source = 'import'
        - submitted_by = 'historical_import'
        - submission_id = 'IMP-YYYYMMDD-XXXX'

---

### Tab 4: Stock In

**Structure:** Sr. No | Total Ctn | Date | then for EACH product: 3 sub-columns (Ctn, Qty/Ctn, Total). So 12 products x 3 = 36 data columns.

**movement_type:** `stock_in`

**Data:** 24 actual stock-in events (roughly rows 2-25 in the data). Rest are empty placeholder rows.

**Parsing gotchas (CRITICAL — this tab is the messiest):**
1. Row 0: contains the total Stock In values per product — SKIP this row
2. Row 1: sub-column headers (Ctn, Qty, Total repeated for each product)
3. Date formats are WILDLY INCONSISTENT:
   - "31-07-25" = 31 July 2025 (DD-MM-YY)
   - "18-09-25" = 18 Sep 2025 (DD-MM-YY)
   - "15-11-25" = 15 Nov 2025 (DD-MM-YY)
   - "2025-01-12 00:00:00" = likely 12 Jan 2025 or 1 Dec 2025 — AMBIGUOUS
   - "2025-06-12 00:00:00" = likely 12 Jun 2025 or 6 Dec 2025 — AMBIGUOUS
   - "2025-09-12 00:00:00" = likely 12 Sep 2025
   - "2025-12-12 00:00:00" = 12 Dec 2025
   - "2026-09-12 00:00:00" = likely 12 Sep 2026 BUT operations are 2025-2026, so this might be 12 Sep 2025 misread
   - "2026-12-03 00:00:00" = likely 3 Dec 2026 BUT could be a parse error
   - "24-02-26" = 24 Feb 2026 (DD-MM-YY)
   - "27-02-26" = 27 Feb 2026 (DD-MM-YY)
4. BEST APPROACH: Parse all dates, sort chronologically, sanity check that they fall between Jul 2025 and Apr 2026. Flag any outliers for manual review.
5. The "Total" sub-column per product is the QUANTITY to import (it equals Cartons x Qty/Ctn)
6. The "Ctn" sub-column is the cartons count — import this into the cartons field
7. NaN or 0 in Total means no stock-in for that product in that entry — skip
8. Some rows have #REF! errors in the "Total Ctn" column (rows 195+) — these are empty placeholder rows with broken formulas. Ignore them entirely.

**Import logic:**
For each stock-in row where Date is valid AND at least one product has Total > 0:
  For each product where Total > 0:
    Create one `inventory_movements` record:
      - movement_type = 'stock_in'
      - entry_date = parsed date
      - quantity = Total value
      - cartons = Ctn value (if available, else NULL)
      - product_id = lookup from products table using mapped name
      - source = 'import'
      - submitted_by = 'historical_import'
      - submission_id = 'IMP-YYYYMMDD-XXXX'

---

## Part 5 — Import Execution Sequence

Execute in this exact order:

1. Create all database tables (from WayVeda_Project_Spec.md Section 5)
2. Create all SQL views (from WayVeda_Project_Spec.md Section 5)
3. Run the product seed SQL from Part 2 above (12 products)
4. Write import script for Stock In (Tab 4) — creates stock_in movement records
5. Write import script for Daily Dispatch (Tab 2) — creates dispatch movement records
6. Write import script for RTO (Tab 3) — creates rto movement records
7. Run all import scripts
8. VERIFY: `SELECT product_name, balance FROM v_inventory_ledger ORDER BY product_name;`
9. Compare against Ledger verification values in Part 4
10. If balances match — data import is verified, proceed to Phase C
11. If balances don't match — check product name mapping and date parsing FIRST, then check for duplicate imports

### Submission ID format for imports
Use: `IMP-YYYYMMDD-XXXX` where YYYYMMDD is the entry_date, XXXX is sequential.
This distinguishes imported historical data from new manual entries (which use INV- prefix).

### submitted_by for imports
Use: `historical_import` for all imported records.

---

## Part 6 — Phase Execution Summary

### Phase A — Infrastructure (start immediately, no data needed)
Follow INFRASTRUCTURE.md step by step.
Deliverable: VPS running Supabase + Caddy + PM2 + Node.js with SSL working.

### Phase B — Database + Seed + Import
1. Create tables and views
2. Seed 12 products with opening stock values
3. Import ~250 days of historical movements from 3 tabs
4. Verify balances match Ledger
Deliverable: Populated database with verified historical data.

### Phase C — Backend API
Follow WayVeda_Project_Spec.md Section 6.
Deliverable: Working Express API endpoints.

### Phase D — Frontend
Follow WayVeda_Project_Spec.md Section 8.
Deliverable: Working React frontend with all 11 screens.

### Phase E — Shiprocket Integration
Follow WayVeda_Project_Spec.md Section 7.
Credentials will be provided by PM via .env on the VPS.
Deliverable: Auto-dispatch sync from Shiprocket.

### Phase F — Testing and Deployment
Deliverable: Production-ready system at wh.wayveda.cloud.

---

## Part 7 — Decisions Already Made (Do Not Re-Ask)

1. Two subdomains only (wh + db), no api subdomain
2. 12 products, not 13 ("Cream" is dropped)
3. Opening stock date is 24 July 2025
4. Product names: use canonical Database Name from Part 3 mapping table
5. All imports use source='import' to distinguish from manual/shiprocket entries
6. max_level values are pending from client — leave NULL
7. Shiprocket API credentials are secured but only needed in Phase E
8. Phase A needs zero business data — can start immediately
9. Port 4002 for the application (matching GREST convention)
10. CSS Modules for styling (matching GREST pattern)
11. Single inventory_movements table with movement_type discriminator
12. All analytics computed via SQL views, not JavaScript
