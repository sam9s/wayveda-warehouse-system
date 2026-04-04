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
