CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name CITEXT NOT NULL UNIQUE,
    category VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    opening_stock INTEGER NOT NULL DEFAULT 0 CHECK (opening_stock >= 0),
    opening_stock_date DATE NOT NULL DEFAULT DATE '2025-07-24',
    max_level INTEGER CHECK (max_level IS NULL OR max_level >= 0),
    qty_per_carton INTEGER CHECK (qty_per_carton IS NULL OR qty_per_carton > 0),
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_name_not_blank CHECK (btrim(name::TEXT) <> ''),
    CONSTRAINT products_category_not_blank CHECK (category IS NULL OR btrim(category) <> ''),
    CONSTRAINT products_sku_not_blank CHECK (sku IS NULL OR btrim(sku) <> ''),
    CONSTRAINT products_unit_not_blank CHECK (btrim(unit) <> '')
);

CREATE INDEX IF NOT EXISTS idx_products_active_order
    ON products (is_active, display_order, name);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR(50) NOT NULL,
    submission_line_no INTEGER NOT NULL DEFAULT 1 CHECK (submission_line_no > 0),
    entry_date DATE NOT NULL,
    submitted_by VARCHAR(100) NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (
        movement_type IN ('stock_in', 'dispatch', 'rto')
    ),
    product_id UUID NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
    cartons INTEGER CHECK (cartons IS NULL OR cartons > 0),
    rto_right INTEGER NOT NULL DEFAULT 0 CHECK (rto_right >= 0),
    rto_wrong INTEGER NOT NULL DEFAULT 0 CHECK (rto_wrong >= 0),
    rto_fake INTEGER NOT NULL DEFAULT 0 CHECK (rto_fake >= 0),
    notes TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (
        source IN ('manual', 'shiprocket', 'import')
    ),
    shiprocket_order_id VARCHAR(100),
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_movements_submission_not_blank CHECK (btrim(submission_id) <> ''),
    CONSTRAINT inventory_movements_submitted_by_not_blank CHECK (btrim(submitted_by) <> ''),
    CONSTRAINT inventory_movements_payload_by_type CHECK (
        (
            movement_type = 'stock_in'
            AND quantity IS NOT NULL
            AND rto_right = 0
            AND rto_wrong = 0
            AND rto_fake = 0
        )
        OR
        (
            movement_type = 'dispatch'
            AND quantity IS NOT NULL
            AND cartons IS NULL
            AND rto_right = 0
            AND rto_wrong = 0
            AND rto_fake = 0
        )
        OR
        (
            movement_type = 'rto'
            AND quantity IS NULL
            AND cartons IS NULL
            AND (rto_right + rto_wrong + rto_fake) > 0
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_movements_entry_date
    ON inventory_movements (entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_movements_type_entry_date
    ON inventory_movements (movement_type, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_movements_product_entry_date
    ON inventory_movements (product_id, entry_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_movements_submission
    ON inventory_movements (submission_id, submission_line_no);

CREATE INDEX IF NOT EXISTS idx_movements_source
    ON inventory_movements (source, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_movements_shiprocket_order
    ON inventory_movements (shiprocket_order_id)
    WHERE shiprocket_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shiprocket_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('success', 'failed', 'partial', 'running')
    ),
    records_synced INTEGER NOT NULL DEFAULT 0 CHECK (records_synced >= 0),
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shiprocket_sync_log_sync_type_not_blank CHECK (btrim(sync_type) <> '')
);

CREATE INDEX IF NOT EXISTS idx_shiprocket_sync_type_created_at
    ON shiprocket_sync_log (sync_type, created_at DESC);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (
        role IN ('admin', 'operator', 'viewer')
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_display_name_not_blank CHECK (btrim(display_name) <> '')
);

CREATE INDEX IF NOT EXISTS idx_users_active_role
    ON users (is_active, role);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_log_action_not_blank CHECK (btrim(action) <> ''),
    CONSTRAINT audit_log_entity_type_not_blank CHECK (btrim(entity_type) <> '')
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
    ON audit_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
    ON audit_log (user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_products_set_updated_at ON products;
CREATE TRIGGER trg_products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_movements_set_updated_at ON inventory_movements;
CREATE TRIGGER trg_inventory_movements_set_updated_at
BEFORE UPDATE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shiprocket_sync_log_set_updated_at ON shiprocket_sync_log;
CREATE TRIGGER trg_shiprocket_sync_log_set_updated_at
BEFORE UPDATE ON shiprocket_sync_log
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
