CREATE OR REPLACE VIEW v_inventory_ledger AS
WITH movement_totals AS (
    SELECT
        m.product_id,
        COALESCE(SUM(m.quantity) FILTER (WHERE m.movement_type = 'stock_in'), 0) AS total_received,
        COALESCE(SUM(m.quantity) FILTER (WHERE m.movement_type = 'dispatch'), 0) AS total_dispatched,
        COALESCE(SUM(m.rto_right) FILTER (WHERE m.movement_type = 'rto'), 0) AS total_rto_right,
        COALESCE(SUM(m.rto_wrong) FILTER (WHERE m.movement_type = 'rto'), 0) AS total_rto_wrong,
        COALESCE(SUM(m.rto_fake) FILTER (WHERE m.movement_type = 'rto'), 0) AS total_rto_fake
    FROM inventory_movements m
    GROUP BY m.product_id
),
latest_entry AS (
    SELECT DISTINCT ON (m.product_id)
        m.product_id,
        m.entry_date,
        m.movement_type,
        m.submission_id,
        m.created_at
    FROM inventory_movements m
    ORDER BY m.product_id, m.entry_date DESC, m.created_at DESC, m.submission_line_no DESC
)
SELECT
    p.id AS product_id,
    p.display_order,
    p.name::TEXT AS product_name,
    p.category,
    p.sku,
    p.unit,
    p.opening_stock_date,
    p.opening_stock,
    COALESCE(mt.total_received, 0) AS total_received,
    COALESCE(mt.total_dispatched, 0) AS total_dispatched,
    COALESCE(mt.total_rto_right, 0) AS total_rto_right,
    COALESCE(mt.total_rto_wrong, 0) AS total_rto_wrong,
    COALESCE(mt.total_rto_fake, 0) AS total_rto_fake,
    (
        p.opening_stock
        + COALESCE(mt.total_received, 0)
        + COALESCE(mt.total_rto_right, 0)
        - COALESCE(mt.total_dispatched, 0)
        - COALESCE(mt.total_rto_wrong, 0)
        - COALESCE(mt.total_rto_fake, 0)
    ) AS balance,
    p.max_level,
    CASE
        WHEN p.max_level IS NULL OR p.max_level = 0 THEN NULL
        ELSE ROUND(
            (
                (
                    p.opening_stock
                    + COALESCE(mt.total_received, 0)
                    + COALESCE(mt.total_rto_right, 0)
                    - COALESCE(mt.total_dispatched, 0)
                    - COALESCE(mt.total_rto_wrong, 0)
                    - COALESCE(mt.total_rto_fake, 0)
                )::NUMERIC / p.max_level
            ) * 100,
            1
        )
    END AS stock_percentage,
    CASE
        WHEN p.max_level IS NULL THEN NULL
        ELSE GREATEST(
            0,
            p.max_level - (
                p.opening_stock
                + COALESCE(mt.total_received, 0)
                + COALESCE(mt.total_rto_right, 0)
                - COALESCE(mt.total_dispatched, 0)
                - COALESCE(mt.total_rto_wrong, 0)
                - COALESCE(mt.total_rto_fake, 0)
            )
        )
    END AS reorder_qty,
    CASE
        WHEN COALESCE(mt.total_dispatched, 0) = 0 THEN NULL
        ELSE ROUND(
            (
                (
                    COALESCE(mt.total_rto_right, 0)
                    + COALESCE(mt.total_rto_wrong, 0)
                    + COALESCE(mt.total_rto_fake, 0)
                )::NUMERIC / mt.total_dispatched
            ) * 100,
            1
        )
    END AS rto_rate_pct,
    CASE
        WHEN (
            COALESCE(mt.total_rto_right, 0)
            + COALESCE(mt.total_rto_wrong, 0)
            + COALESCE(mt.total_rto_fake, 0)
        ) = 0 THEN NULL
        ELSE ROUND(
            (
                (
                    COALESCE(mt.total_rto_wrong, 0)
                    + COALESCE(mt.total_rto_fake, 0)
                )::NUMERIC / (
                    COALESCE(mt.total_rto_right, 0)
                    + COALESCE(mt.total_rto_wrong, 0)
                    + COALESCE(mt.total_rto_fake, 0)
                )
            ) * 100,
            1
        )
    END AS warehouse_fault_pct,
    le.entry_date AS latest_entry_date,
    le.movement_type AS latest_entry_type,
    le.submission_id AS latest_submission_id,
    p.is_active
FROM products p
LEFT JOIN movement_totals mt ON mt.product_id = p.id
LEFT JOIN latest_entry le ON le.product_id = p.id
WHERE p.is_active = TRUE;

CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    product_id,
    display_order,
    product_name,
    category,
    sku,
    unit,
    balance,
    max_level,
    stock_percentage,
    reorder_qty,
    latest_entry_date,
    latest_entry_type,
    rto_rate_pct,
    warehouse_fault_pct,
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

CREATE OR REPLACE VIEW v_dispatch_daily AS
SELECT
    m.entry_date,
    m.product_id,
    p.name::TEXT AS product_name,
    SUM(m.quantity) AS qty_dispatched
FROM inventory_movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'dispatch'
GROUP BY m.entry_date, m.product_id, p.name;

CREATE OR REPLACE VIEW v_rto_monthly AS
SELECT
    DATE_TRUNC('month', m.entry_date)::DATE AS month_start,
    TO_CHAR(DATE_TRUNC('month', m.entry_date), 'YYYY-MM') AS month,
    m.product_id,
    p.name::TEXT AS product_name,
    SUM(m.rto_right) AS total_right,
    SUM(m.rto_wrong) AS total_wrong,
    SUM(m.rto_fake) AS total_fake,
    SUM(m.rto_right + m.rto_wrong + m.rto_fake) AS total_rto
FROM inventory_movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'rto'
GROUP BY DATE_TRUNC('month', m.entry_date), m.product_id, p.name;

CREATE OR REPLACE VIEW v_inward_daily AS
SELECT
    m.entry_date,
    m.product_id,
    p.name::TEXT AS product_name,
    SUM(m.quantity) AS qty_received,
    SUM(m.cartons) AS cartons_received
FROM inventory_movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'stock_in'
GROUP BY m.entry_date, m.product_id, p.name;
