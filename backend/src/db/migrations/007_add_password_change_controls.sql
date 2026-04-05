ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

UPDATE users
SET
    must_change_password = TRUE,
    updated_at = NOW()
WHERE password_changed_at IS NULL;
