# WayVeda Warehouse & Inventory Management System — Project Specification

**Client:** WayVeda (wayveda.com) — D2C Personal Care Brand  
**Builder:** Raven Solutions (ravensolutions.in)  
**Project Manager:** Sammy  
**Solution Architect:** Astra  
**Developer:** Claude Code / Codex (VS Code)  
**Date:** 2026-04-03  
**Status:** Architecture approved — ready for build  

---

## 1. What This Project Is

A **warehouse and inventory management system** (mini-ERP, Phase 1) for WayVeda — a direct-to-consumer personal care brand that sells through their Shopify storefront and via marketplaces.

WayVeda currently tracks all warehouse operations through a **Google Apps Script web app** that writes to **Google Sheets**. The system works but is fragile, unscalable, and entirely disconnected from their shipping provider (Shiprocket).

This project replaces that system with a proper database-backed web application while preserving the operational simplicity the warehouse team relies on.

### What it replaces
- Google Apps Script frontend (3 forms: Dispatch, Stock In, RTO)
- Two Google Sheets ("Wayveda Inventory Database" + "Wayveda by MeDa v2 FINAL")
- Manual dispatch logging (double data entry — Shiprocket + Google form)
- Formula-driven analytics across 9 Google Sheets tabs

### What it introduces
- Real database (PostgreSQL via Supabase)
- Proper web application (React + Express)
- Shiprocket API integration for automated dispatch tracking
- SQL-computed analytics (replacing fragile spreadsheet formulas)
- User authentication and audit trail

---

## 2. Business Context

### The Brand
WayVeda is a personal care brand offering products for hair care, intimate care, and male wellness. They sell primarily through their Shopify store and ship via Shiprocket. The brand is managed by MeDa Partners.

### Product Catalog (13 SKUs)

| # | Product Name | Category |
|---|---|---|
| 1 | Bum Plumping Cream - 50g | Intimate Care |
| 2 | Intimate Whitening Roll-On - 50ml | Intimate Care |
| 3 | Chocolate Power Roll-On | Male Wellness |
| 4 | Strawberry Power Roll-On | Male Wellness |
| 5 | Bhasam Power Capsule | Male Wellness |
| 6 | Power Shots Sachet | Male Wellness |
| 7 | Hairfall Control Serum - 50ml | Hair Care |
| 8 | Hairfall Control Shampoo - 200ml | Hair Care |
| 9 | Hairfall Control Tablets - 60N | Hair Care |
| 10 | Anti-Hairfall Kit | Hair Care |
| 11 | Power Roll Oil Ubtan | Male Wellness |
| 12 | Power Shot Oil | Male Wellness |
| 13 | (Reserved for future SKUs) | — |

The product catalog is small and stable. New SKUs are added infrequently. The system should support dynamic product management but does not need to handle thousands of SKUs.

### Warehouse Operations
The warehouse handles three types of stock movements:

**1. Stock In** — Incoming goods from suppliers/manufacturers
- Operator receives physical stock
- Records: product name, number of cartons, quantity per carton (or total quantity)
- Submits entry with date, operator name, and optional notes

**2. Dispatch** — Outgoing shipments to customers
- Orders are fulfilled via Shiprocket
- Currently: operator manually logs dispatched quantities in the Google form
- Target: automate via Shiprocket API — pull dispatch data instead of manual entry
- Records: product name, quantity dispatched

**3. RTO (Return to Origin)** — Returned orders
- Returned packages arrive at warehouse
- Operator inspects each return and classifies:
  - **Right** = Product returned in good condition → goes back into available inventory (recovered stock)
  - **Wrong** = Warehouse error (wrong item shipped, packing mistake) → product returned but it's the warehouse's fault
  - **Fake** = Customer fraud or damaged beyond use → permanently lost inventory
- Records: product name, right count, wrong count, fake count

### The Core Inventory Formula
```
Balance = Opening Stock + Total Stock Received + RTO Right − Total Dispatched
```

This formula drives the entire ledger. RTO Right adds back to inventory; RTO Wrong and Fake remain reporting classifications and do not reduce balance again because dispatch has already reduced stock.

### Additional Metrics
- **Stock %** = Balance ÷ Max Level (configured per product)
- **Reorder Qty** = Max Level − Balance
- **RTO Rate %** = Total RTO ÷ Total Dispatched
- **Warehouse Fault %** = (Wrong + Fake) ÷ Total RTO
- **Monthly Dispatch** = Sum of dispatched quantity per product per month
- **Latest Entry** = Most recent movement date + quantity per product

---

## 3. Current System Architecture (As-Is)

### Frontend
Google Apps Script deployed as a web app. Three movement types selected via card-based UI. Each type reveals a different product entry form. The form supports adding multiple products per submission. Data writes directly to a Google Sheet.

### Data Store 1 — Wayveda Inventory Database (Google Sheet)
Raw transaction log. Every form submission creates one row per product per entry.

**Schema:**
| Field | Type | Notes |
|---|---|---|
| Submission ID | String | Format: INV-YYYYMMDD-XXXX |
| Timestamp | DateTime | Auto-generated |
| Entry Date | Date | User-selected |
| Submitted By | String | Operator name (free text) |
| Entry Type | String | "Dispatch", "Stock In", or "RTO" |
| Product Name | String | From dropdown |
| Quantity | Number | For Dispatch and Stock In |
| Cartons | Number | For Stock In only |
| Right | Number | For RTO only |
| Wrong | Number | For RTO only |
| Fake | Number | For RTO only |
| Notes | String | Optional |

### Data Store 2 — WayVeda by MeDa v2 FINAL (Google Sheet)
Master analytics workbook with 9 tabs, driven by formulas that reference the Inventory Database sheet.

**Tabs:**
1. **Dashboard** — Stock health overview (balance, reorder alerts, status per product)
2. **Ledger** — Full inventory ledger with 4 sections: Stock Movement, Targets & Health, Monthly Dispatch, RTO Quality
3. **Dispatch Analysis** — Daily/weekly/monthly dispatch breakdowns by product
4. **RTO Analysis** — Monthly RTO breakdown (Right/Wrong/Fake per product) + RTO Rate + Warehouse Fault %
5. **Inward Analysis** — Daily/weekly/monthly stock-in breakdowns by product
6. **Daily Dispatch** — Raw daily dispatch data (auto-filled from form, vendor entry only)
7. **RTO Log** — Raw daily RTO data with Right/Wrong/Fake per product per date
8. **Stock In** — Raw inbound data with Cartons/Qty per Carton/Total per product per date
9. **Form Responses** — Auto-filled from Google Form submissions (timestamp, date, operator, entry type, data, notes)

---

## 4. Target System Architecture (To-Be)

### Tech Stack (Proven — mirrors GREST Warehouse System)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Vite 7 + React Router 7 | SPA with CSS Modules |
| UI Libraries | Lucide React (icons) + Chart.js | Minimal dependency surface |
| HTTP Client | Axios | API communication |
| Backend | Express.js (Node.js) | REST API layer |
| Database | PostgreSQL (via Supabase) | Self-hosted on VPS |
| ORM/Client | @supabase/supabase-js + pg (native) | Dual access pattern |
| File Handling | Multer | Future: bulk imports |
| Process Manager | PM2 | Production process management |
| Reverse Proxy | Caddy | Auto-SSL + reverse proxy |
| VPS | Hostinger VPS | Ubuntu, root access |
| External API | Shiprocket API v2 | Dispatch sync + tracking |
| Version Control | GitHub | sam9s organization |

### Infrastructure Layout

```
Hostinger VPS (Ubuntu)
├── Caddy (reverse proxy + auto-SSL)
│   ├── wh.{domain} → localhost:4002 (React frontend - built static)
│   ├── api.{domain} → localhost:4002 (Express API - same process serves both)
│   └── db.{domain} → localhost:8000 (Supabase Studio)
├── Supabase (self-hosted Docker)
│   ├── PostgreSQL (port 5432)
│   └── Kong Gateway (port 8000)
├── PM2
│   └── wayveda-warehouse (backend/server.js on port 4002)
└── Node.js runtime
```

### Backend Architecture (Express.js — MVC Pattern)

```
backend/
├── server.js                    # Express entry point
├── package.json
├── .env
├── src/
│   ├── config/
│   │   ├── database.js          # Supabase + pg connection
│   │   └── shiprocket.js        # Shiprocket API config
│   ├── auth/
│   │   ├── middleware.js         # JWT verification via Supabase Auth
│   │   └── supabaseClient.js    # Supabase admin client
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.routes.js       # Login/logout
│   │   ├── products.routes.js   # Product CRUD
│   │   ├── movements.routes.js  # Stock In / Dispatch / RTO entries
│   │   ├── inventory.routes.js  # Ledger, dashboard, analytics
│   │   ├── shiprocket.routes.js # Shiprocket sync + webhooks
│   │   └── admin.routes.js      # User management, settings
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── products.controller.js
│   │   ├── movements.controller.js
│   │   ├── inventory.controller.js
│   │   ├── shiprocket.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── inventory.service.js  # Balance calculation logic
│   │   ├── shiprocket.service.js # Shiprocket API wrapper
│   │   └── analytics.service.js  # Aggregation queries
│   ├── db/
│   │   ├── migrations/           # SQL migration files
│   │   └── views/                # SQL view definitions
│   └── utils/
│       ├── logger.js
│       └── helpers.js
└── ecosystem.config.js           # PM2 config
```

### Frontend Architecture (React + Vite)

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.ico
└── src/
    ├── main.jsx                  # Entry point
    ├── App.jsx                   # Router + layout
    ├── App.css                   # Global styles
    ├── auth/
    │   ├── AuthContext.jsx        # Supabase Auth context
    │   └── ProtectedRoute.jsx    # Route guard
    ├── components/
    │   ├── Layout/
    │   │   ├── Sidebar.jsx       # Navigation sidebar
    │   │   ├── Header.jsx        # Top bar with user info
    │   │   └── Layout.module.css
    │   ├── common/
    │   │   ├── DataTable.jsx     # Reusable table component
    │   │   ├── StatCard.jsx      # Dashboard stat cards
    │   │   ├── ProductSelector.jsx # Product dropdown
    │   │   ├── DateRangePicker.jsx
    │   │   └── LoadingSpinner.jsx
    │   └── forms/
    │       ├── StockInForm.jsx   # Stock In entry
    │       ├── DispatchForm.jsx  # Manual dispatch entry
    │       └── RTOForm.jsx       # RTO classification entry
    ├── pages/
    │   ├── Login.jsx
    │   ├── Dashboard.jsx         # Stock health overview
    │   ├── InventoryLedger.jsx   # Master ledger view
    │   ├── StockIn.jsx           # Stock In page
    │   ├── Dispatch.jsx          # Dispatch page (Shiprocket-synced)
    │   ├── RTO.jsx               # RTO entry + analysis
    │   ├── DispatchAnalysis.jsx  # Dispatch trends
    │   ├── RTOAnalysis.jsx       # RTO trends + fault %
    │   ├── InwardAnalysis.jsx    # Stock-in trends
    │   ├── ProductManagement.jsx # Manage SKUs + max levels
    │   └── Settings.jsx          # Admin/user settings
    ├── styles/
    │   └── variables.css         # Theme variables
    └── utils/
        ├── api.js                # Axios instance
        └── formatters.js         # Date/number formatters
```

---

## 5. Database Schema

### Core Tables

#### `products`
The product catalog. Small, stable, admin-managed.

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),           -- 'Hair Care', 'Intimate Care', 'Male Wellness'
    sku VARCHAR(50),                  -- optional SKU code
    unit VARCHAR(50) DEFAULT 'pcs',   -- unit of measurement
    opening_stock INTEGER DEFAULT 0,  -- initial stock when system goes live
    max_level INTEGER,                -- max stock level for reorder calculation
    qty_per_carton INTEGER,           -- default qty per carton (for Stock In)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `inventory_movements`
The central transaction log. Every stock movement (in, out, return) is a row here. This replaces the "Wayveda Inventory Database" Google Sheet.

```sql
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR(50) NOT NULL,  -- Format: INV-YYYYMMDD-XXXX
    entry_date DATE NOT NULL,
    submitted_by VARCHAR(100) NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('stock_in', 'dispatch', 'rto')),
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Stock In fields
    quantity INTEGER,                     -- total quantity (for stock_in and dispatch)
    cartons INTEGER,                      -- number of cartons (stock_in only)
    
    -- RTO fields
    rto_right INTEGER DEFAULT 0,          -- recovered, goes back to inventory
    rto_wrong INTEGER DEFAULT 0,          -- warehouse fault
    rto_fake INTEGER DEFAULT 0,           -- customer fraud / damaged / lost
    
    -- Metadata
    notes TEXT,
    source VARCHAR(50) DEFAULT 'manual',  -- 'manual', 'shiprocket', 'import'
    shiprocket_order_id VARCHAR(100),     -- if sourced from Shiprocket
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_date ON inventory_movements(entry_date);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_submission ON inventory_movements(submission_id);
```

#### `shiprocket_sync_log`
Tracks Shiprocket API synchronization state.

```sql
CREATE TABLE shiprocket_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL,       -- 'orders', 'returns', 'tracking'
    status VARCHAR(20) NOT NULL,          -- 'success', 'failed', 'partial'
    records_synced INTEGER DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `users`
Simple user management via Supabase Auth. This table extends Supabase's auth.users.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'operator', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `audit_log`
Track all data modifications for accountability.

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,          -- 'create', 'update', 'delete'
    entity_type VARCHAR(50) NOT NULL,     -- 'movement', 'product', etc.
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### SQL Views (Replace Spreadsheet Formulas)

#### `v_inventory_ledger` — The Master Ledger
```sql
CREATE OR REPLACE VIEW v_inventory_ledger AS
WITH stock_in AS (
    SELECT product_id, COALESCE(SUM(quantity), 0) AS total_received
    FROM inventory_movements WHERE movement_type = 'stock_in'
    GROUP BY product_id
),
dispatched AS (
    SELECT product_id, COALESCE(SUM(quantity), 0) AS total_dispatched
    FROM inventory_movements WHERE movement_type = 'dispatch'
    GROUP BY product_id
),
rto AS (
    SELECT product_id,
        COALESCE(SUM(rto_right), 0) AS total_rto_right,
        COALESCE(SUM(rto_wrong), 0) AS total_rto_wrong,
        COALESCE(SUM(rto_fake), 0) AS total_rto_fake
    FROM inventory_movements WHERE movement_type = 'rto'
    GROUP BY product_id
),
latest_entry AS (
    SELECT DISTINCT ON (product_id)
        product_id, entry_date, quantity,
        rto_right, rto_wrong, rto_fake, movement_type
    FROM inventory_movements
    ORDER BY product_id, entry_date DESC, created_at DESC
)
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.category,
    p.opening_stock,
    COALESCE(si.total_received, 0) AS total_received,
    COALESCE(d.total_dispatched, 0) AS total_dispatched,
    COALESCE(r.total_rto_right, 0) AS total_rto_right,
    COALESCE(r.total_rto_wrong, 0) AS total_rto_wrong,
    COALESCE(r.total_rto_fake, 0) AS total_rto_fake,
    
    -- THE CORE FORMULA
    (p.opening_stock 
     + COALESCE(si.total_received, 0) 
     + COALESCE(r.total_rto_right, 0) 
     - COALESCE(d.total_dispatched, 0)
    ) AS balance,
    
    p.max_level,
    
    -- Stock health
    CASE 
        WHEN p.max_level IS NULL OR p.max_level = 0 THEN NULL
        ELSE ROUND(
            (p.opening_stock + COALESCE(si.total_received, 0) + COALESCE(r.total_rto_right, 0) 
             - COALESCE(d.total_dispatched, 0))::NUMERIC 
            / p.max_level * 100, 1
        )
    END AS stock_percentage,
    
    -- Reorder quantity
    CASE 
        WHEN p.max_level IS NULL THEN NULL
        ELSE GREATEST(0, p.max_level - (
            p.opening_stock + COALESCE(si.total_received, 0) + COALESCE(r.total_rto_right, 0)
            - COALESCE(d.total_dispatched, 0)
        ))
    END AS reorder_qty,
    
    -- RTO metrics
    CASE 
        WHEN COALESCE(d.total_dispatched, 0) = 0 THEN NULL
        ELSE ROUND(
            (COALESCE(r.total_rto_right, 0) + COALESCE(r.total_rto_wrong, 0) + COALESCE(r.total_rto_fake, 0))::NUMERIC 
            / d.total_dispatched * 100, 1
        )
    END AS rto_rate_pct,
    
    CASE 
        WHEN (COALESCE(r.total_rto_right, 0) + COALESCE(r.total_rto_wrong, 0) + COALESCE(r.total_rto_fake, 0)) = 0 THEN NULL
        ELSE ROUND(
            (COALESCE(r.total_rto_wrong, 0) + COALESCE(r.total_rto_fake, 0))::NUMERIC 
            / (COALESCE(r.total_rto_right, 0) + COALESCE(r.total_rto_wrong, 0) + COALESCE(r.total_rto_fake, 0)) * 100, 1
        )
    END AS warehouse_fault_pct,
    
    -- Latest entry info
    le.entry_date AS latest_entry_date,
    le.movement_type AS latest_entry_type,
    
    p.is_active
    
FROM products p
LEFT JOIN stock_in si ON si.product_id = p.id
LEFT JOIN dispatched d ON d.product_id = p.id
LEFT JOIN rto r ON r.product_id = p.id
LEFT JOIN latest_entry le ON le.product_id = p.id
WHERE p.is_active = true
ORDER BY p.name;
```

#### `v_dashboard_summary` — Dashboard Overview
```sql
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    product_name, category, balance, max_level, stock_percentage, reorder_qty,
    latest_entry_date, latest_entry_type, rto_rate_pct, warehouse_fault_pct,
    CASE
        WHEN max_level IS NULL THEN 'Set Max Level'
        WHEN balance <= 0 THEN 'Out of Stock'
        WHEN stock_percentage < 20 THEN 'Critical'
        WHEN stock_percentage < 50 THEN 'Low'
        ELSE 'Healthy'
    END AS status,
    CASE
        WHEN max_level IS NULL THEN 'Configure'
        WHEN balance <= 0 THEN 'URGENT'
        WHEN stock_percentage < 20 THEN 'Reorder Now'
        WHEN stock_percentage < 50 THEN 'Plan Reorder'
        ELSE 'OK'
    END AS alert
FROM v_inventory_ledger;
```

#### `v_dispatch_daily` — Daily Dispatch Analysis
```sql
CREATE OR REPLACE VIEW v_dispatch_daily AS
SELECT 
    m.entry_date,
    p.name AS product_name,
    SUM(m.quantity) AS qty_dispatched
FROM inventory_movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'dispatch'
GROUP BY m.entry_date, p.name
ORDER BY m.entry_date DESC, p.name;
```

#### `v_rto_monthly` — Monthly RTO Analysis
```sql
CREATE OR REPLACE VIEW v_rto_monthly AS
SELECT 
    TO_CHAR(m.entry_date, 'YYYY-MM') AS month,
    p.name AS product_name,
    SUM(m.rto_right) AS total_right,
    SUM(m.rto_wrong) AS total_wrong,
    SUM(m.rto_fake) AS total_fake,
    SUM(m.rto_right) + SUM(m.rto_wrong) + SUM(m.rto_fake) AS total_rto
FROM inventory_movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'rto'
GROUP BY TO_CHAR(m.entry_date, 'YYYY-MM'), p.name
ORDER BY month DESC, p.name;
```

#### `v_inward_daily` — Daily Stock In Analysis
```sql
CREATE OR REPLACE VIEW v_inward_daily AS
SELECT 
    m.entry_date,
    p.name AS product_name,
    SUM(m.quantity) AS qty_received,
    SUM(m.cartons) AS cartons_received
FROM inventory_movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'stock_in'
GROUP BY m.entry_date, p.name
ORDER BY m.entry_date DESC, p.name;
```

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (Supabase Auth) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user info |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List all active products |
| GET | `/api/products/:id` | Get product detail |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/:id` | Update product (name, max_level, etc.) |
| DELETE | `/api/products/:id` | Soft delete (set is_active = false) |

### Inventory Movements
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/movements/stock-in` | Record stock in entry |
| POST | `/api/movements/dispatch` | Record dispatch entry |
| POST | `/api/movements/rto` | Record RTO entry |
| GET | `/api/movements` | List movements (filtered by type, date, product) |
| GET | `/api/movements/:id` | Get single movement detail |

### Inventory / Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory/dashboard` | Dashboard summary (v_dashboard_summary) |
| GET | `/api/inventory/ledger` | Full inventory ledger (v_inventory_ledger) |
| GET | `/api/inventory/dispatch-analysis` | Dispatch analysis (daily/weekly/monthly) |
| GET | `/api/inventory/rto-analysis` | RTO analysis (monthly) |
| GET | `/api/inventory/inward-analysis` | Inward analysis (daily/weekly/monthly) |

### Shiprocket
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/shiprocket/sync` | Manual trigger: pull latest dispatches from Shiprocket |
| POST | `/api/shiprocket/webhook` | Webhook receiver for Shiprocket status updates |
| GET | `/api/shiprocket/status` | Last sync status |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| GET | `/api/admin/audit-log` | View audit trail |
| GET | `/api/health` | Server health check |

---

## 7. Shiprocket Integration (Phase 1)

### Scope
Phase 1 is **read-only, pull-based**. We do not create orders in Shiprocket from our system. We only pull data from Shiprocket to auto-populate dispatch records.

### Authentication
- Shiprocket uses JWT-based auth (email + password → token)
- Token is valid for 10 days (240 hours)
- Token must be refreshed/regenerated after expiry
- Base URL: `https://apiv2.shiprocket.in/v1/external/`

### Integration Points

**1. Pull Dispatched Orders**
- Endpoint: `GET /orders` (with date filters)
- We periodically poll for new orders with status "SHIPPED" or "DELIVERED"
- For each shipped order, we extract: order items (product + quantity), ship date, AWB number
- We match Shiprocket product names to our products table
- We auto-create `dispatch` entries in inventory_movements with source = 'shiprocket'

**2. Pull RTO / Return Orders**
- Endpoint: `GET /orders/processing/return` or status-based filtering
- For orders with RTO status, we flag them for the operator to classify (Right/Wrong/Fake)
- The operator still does the physical inspection — we just pre-populate the RTO entry

**3. Webhook (Future Enhancement)**
- Shiprocket supports shipment webhooks
- We can receive real-time status updates instead of polling
- Endpoint: `POST /api/shiprocket/webhook` on our side

### Product Name Mapping
Shiprocket product names may not exactly match our database product names. We need a mapping table or fuzzy matching approach. For Phase 1, we use a simple mapping config:

```javascript
// shiprocket_product_map.js
const PRODUCT_MAP = {
    "Bum Plumping Cream 50g": "Bum Plumping Cream - 50g",
    "Power Capsule Bhasam": "Bhasam Power Capsule",
    // ... populated during setup
};
```

### Sync Frequency
- Automated: Every 4 hours via a cron job (node-cron or PM2 cron)
- Manual: Admin can trigger sync from the UI
- Each sync logs to `shiprocket_sync_log`

---

## 8. Frontend Screens Specification

### Screen 1: Login
- Simple email/password login via Supabase Auth
- Brand styling (WayVeda green theme — consistent with current Google Script UI)
- Redirect to Dashboard on success

### Screen 2: Dashboard (Home)
Replaces the "Dashboard" tab from the Google Sheet.

**Content:**
- Summary stat cards: Total SKUs, Total Balance, Products Below Reorder, RTO Rate
- Product health table: Product Name | Balance | Last/This Month Dispatch | Reorder Qty | Status | Alert
- Color-coded status: Green (Healthy), Yellow (Low), Red (Critical), Gray (Set Max Level)
- Quick links to Stock In, Dispatch, RTO entry forms

### Screen 3: Inventory Ledger
Replaces the "Ledger" tab. The most comprehensive view.

**Content:**
- Full table with all ledger columns from v_inventory_ledger
- Sections: Stock Movement, Targets & Health, Monthly Dispatch, RTO Quality, Reorder
- Filterable and sortable
- Export to CSV option

### Screen 4: Stock In
Entry form for recording incoming stock.

**UI (similar to current Google Script form):**
- Entry Date (date picker, defaults to today)
- Submitted By (text input)
- Product selector (dropdown from products table)
- Cartons (number input)
- Quantity (number input — auto-calculated if qty_per_carton is set)
- "+ Add Product" button to add multiple products per submission
- Notes (textarea, optional)
- "Submit Stock In" button (green, prominent)
- Shows item count badge
- Success confirmation with submission ID

### Screen 5: Dispatch
**Two modes:**
1. **Auto-synced view** — Table of dispatches pulled from Shiprocket (read-only)
2. **Manual entry** — Form similar to Stock In but for dispatch (Product + Quantity only, no cartons)

**UI:**
- Toggle between "Shiprocket Synced" and "Manual Entry"
- Shiprocket tab shows: Date | Order ID | AWB | Product | Qty | Status
- Manual tab shows the entry form
- Last sync timestamp + "Sync Now" button

### Screen 6: RTO
Entry form for recording returns.

**UI (similar to current Google Script form):**
- Entry Date + Submitted By
- Product selector
- Three number inputs: Right | Wrong | Fake
- "+ Add Product" for multiple products
- Notes (optional)
- "Submit RTO" button (red/coral themed)

### Screen 7: Dispatch Analysis
Replaces the "Dispatch Analysis" tab.

**Content:**
- Date range selector
- Pivot table: Rows = dates, Columns = products, Values = quantities
- Aggregation toggles: Daily | Weekly | Monthly
- Total column
- Optional: bar chart visualization

### Screen 8: RTO Analysis
Replaces the "RTO Analysis" tab.

**Content:**
- Monthly view: Month | Product Right | Product Wrong | Product Fake (for each product)
- Summary columns: Total Right | Total Wrong+Fake | Total RTO | Dispatch Total | RTO Rate % | Warehouse Fault %

### Screen 9: Inward Analysis
Replaces the "Inward Analysis" tab.

**Content:**
- Same structure as Dispatch Analysis but for Stock In entries
- Shows cartons and quantities received

### Screen 10: Product Management
Admin screen for managing the product catalog.

**Content:**
- Product list with: Name | Category | SKU | Max Level | Qty/Carton | Opening Stock | Status
- Add/Edit product modal
- Set/update Max Level (critical for reorder calculations)
- Toggle active/inactive

### Screen 11: Settings
- User management (Phase 2 — for now, just display current user info)
- Shiprocket connection settings
- System info / server health

---

## 9. UI/UX Design Direction

### Theme
The current Google Script UI uses a clean green (#00BFA6 family) with white cards and subtle borders. We should adopt a similar clean, operational aesthetic — not flashy, but professional and easy to scan.

**Reference:** The three uploaded screenshots (stock_in.png, dispatch.png, rto.png) show the current UX. Key elements to preserve:
- Card-based movement type selection (Dispatch / Stock In / RTO with icons)
- Numbered section flow (1. Basic Info → 2. Entry Type → 3. Products → 4. Remarks)
- Green accent for Stock In, Blue for Dispatch, Red/Coral for RTO
- Clean form fields with labels
- "+ Add Product" pattern for multi-product entries
- Item count badge

### Mobile Consideration
The warehouse operators use mobile devices. The frontend must be responsive and usable on phones — forms especially.

---

## 10. Data Migration Plan

### Step 1: Seed Products
Import the 13 SKUs from the "Product-Name" tab of the Inventory Database sheet. Set max_levels from the Ledger tab (currently all show "Set Max Level" — need from WayVeda team).

### Step 2: Import Historical Movements
Import the 11 existing rows from the "Database" tab of the Inventory Database sheet into inventory_movements. These represent the test entries made so far.

### Step 3: Set Opening Stock
Once historical data is imported and verified, work with WayVeda to set accurate opening_stock values for each product. This is critical — it's the baseline for the balance formula.

### Step 4: Verify
Run v_inventory_ledger and compare against the current Google Sheet ledger numbers. They must match.

---

## 11. Development Phases

### Phase A — Infrastructure Setup
1. Deploy Supabase on Hostinger VPS (Docker)
2. Install and configure Caddy
3. Set up PM2
4. Configure domain/subdomain DNS
5. Verify SSL certificates

### Phase B — Database Foundation
1. Create PostgreSQL schema (tables + indexes + constraints)
2. Create SQL views
3. Seed product catalog
4. Import historical movement data
5. Verify ledger calculations match Google Sheet

### Phase C — Backend API
1. Express server setup with CORS, auth middleware
2. Auth endpoints (Supabase Auth)
3. Product CRUD endpoints
4. Movement entry endpoints (Stock In, Dispatch, RTO)
5. Inventory/analytics query endpoints
6. Health check endpoint
7. Test all endpoints

### Phase D — Frontend Build
1. App shell (React Router, Layout, Sidebar, Auth)
2. Login page
3. Dashboard (stat cards + product health table)
4. Stock In form
5. Dispatch page (manual entry first)
6. RTO form
7. Inventory Ledger page
8. Dispatch Analysis page
9. RTO Analysis page
10. Inward Analysis page
11. Product Management page

### Phase E — Shiprocket Integration
1. Shiprocket auth + token management
2. Order pull service
3. Product name mapping
4. Auto-dispatch entry creation
5. Sync status UI
6. Cron job for periodic sync

### Phase F — Testing & Deployment
1. End-to-end testing with WayVeda team
2. Data verification against Google Sheets
3. Production deployment
4. PM2 + Caddy final configuration
5. Handover documentation

---

## 12. Deployment Configuration

### Caddyfile Template
```
wh.{domain} {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
    reverse_proxy localhost:4002
    @static {
        path *.js *.css *.png *.jpg *.ico *.svg *.woff *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
}

db.{domain} {
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
    }
    reverse_proxy localhost:8000
}
```

### PM2 Ecosystem Config
```javascript
module.exports = {
    apps: [
        {
            name: 'wayveda-warehouse',
            cwd: '/root/apps/wayveda-warehouse-system/backend',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            error_file: '../logs/err.log',
            out_file: '../logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            env_production: {
                NODE_ENV: 'production',
                PORT: 4002
            }
        }
    ]
};
```

### Environment Variables (.env)
```
NODE_ENV=production
PORT=4002

# Supabase
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_KEY=<key>
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/postgres

# Shiprocket
SHIPROCKET_EMAIL=<email>
SHIPROCKET_PASSWORD=<password>
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external

# App
JWT_SECRET=<secret>
CORS_ORIGIN=https://wh.{domain}
```

---

## 13. Architectural Principles

### Principle 1 — Database computes, not code
All inventory calculations (balance, stock %, reorder qty, RTO rate, warehouse fault %) are computed in SQL views. The backend simply queries the views and returns results. No spreadsheet formula recreation in JavaScript.

### Principle 2 — Single transaction table
All movements go into `inventory_movements` with a `movement_type` discriminator. This keeps the data model simple and makes the ledger view straightforward. No separate tables for dispatch_log, stock_in_log, rto_log — one table, multiple movement types.

### Principle 3 — Shiprocket is a data source, not a dependency
If Shiprocket API is down, the system still works. Manual dispatch entry is always available. Shiprocket sync is additive, not required.

### Principle 4 — Operator UX first
The system must be as easy to use as the current Google Script form. If the warehouse operator can't figure it out in 30 seconds, it's too complex. Preserve the numbered-section flow, the card-based movement selection, and the multi-product entry pattern.

### Principle 5 — Audit everything
Every movement gets a submission_id, timestamp, and operator name. The audit_log tracks all changes. This is non-negotiable for a warehouse system.

---

## 14. What NOT To Build (Phase 1)

- Order creation in Shiprocket (we only read/pull)
- Customer management / CRM
- Payment or invoicing
- Shopify integration (future)
- Multi-warehouse support
- Barcode scanning (future enhancement)
- Role-based granular permissions (just admin for now)
- Email notifications
- Mobile app (responsive web is sufficient)
- Complex reporting / BI dashboards
- Batch/lot tracking

---

## 15. Definition of Done

Phase 1 is complete when:

1. All 13 products are seeded in the database
2. Stock In, Dispatch, and RTO can be recorded through the web app
3. Dashboard shows correct stock health for all products
4. Inventory Ledger matches the Google Sheet balance formula
5. Dispatch/RTO/Inward Analysis views work with real data
6. Shiprocket dispatch sync pulls real order data
7. Two admin users can log in
8. App is deployed on Hostinger VPS behind Caddy with SSL
9. PM2 keeps the app running
10. Current Google Sheet numbers can be verified against the new system

---

## 16. Reference System

This project follows the same architecture and patterns as the GREST Warehouse System:
- GitHub: `https://github.com/sam9s/GREST-Warehouse-System.git`
- Tech stack: identical (React + Vite + Express + Supabase + Caddy + PM2)
- Deployment pattern: identical (VPS + subdomain + reverse proxy)
- Development approach: identical (database-first, SQL views for analytics, MVC backend)

Key differences:
- GREST handles electronics (devices, IMEIs, barcodes) — complex multi-sheet domain
- WayVeda handles personal care products (13 SKUs, 3 movement types) — simpler domain
- WayVeda adds Shiprocket integration (GREST doesn't have this)
- WayVeda's RTO classification (Right/Wrong/Fake) is unique to this system

---

## 17. Immediate First Task for Codex

Start with this exact sequence:

1. Initialize new GitHub repo for WayVeda Warehouse System
2. Set up Express backend scaffolding (mirroring GREST structure)
3. Set up React + Vite frontend scaffolding
4. Create database migration files for all tables
5. Create SQL view definitions
6. Seed the 13 products
7. Build auth middleware (Supabase Auth)
8. Build movement entry API endpoints
9. Build inventory query endpoints
10. Build Login page
11. Build Dashboard page
12. Build Stock In form
13. Build Dispatch page
14. Build RTO form
15. Deploy and verify

---

## 18. Developer Execution Posture

Approach this as:
- A production system replacing a fragile Google Sheets workflow
- A database-first application with SQL-driven analytics
- An operator-friendly tool that warehouse staff will use daily
- A system that must handle concurrent use without data conflicts

Prefer:
- Clear SQL migrations (versioned, reversible)
- Explicit error handling in API endpoints
- Clean React component architecture (pages + shared components)
- CSS Modules over global CSS (as in GREST)
- Logging for all movement entries
- Conservative deployment (test locally → deploy → verify)

If there is a conflict between:
- Feature richness vs operational reliability → choose reliability
- Design polish vs functional completeness → choose functional completeness
- Cleverness vs simplicity → choose simplicity
- Manual entry vs broken automation → keep manual entry working always
