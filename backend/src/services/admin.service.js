const { query, withClient } = require("../db/client");
const { adminSupabase } = require("../config/supabase-client");
const { writeAuditLog } = require("./audit.service");
const { badRequest } = require("../utils/http-error");

async function listUsers() {
  const result = await query(`
    SELECT
      u.id,
      au.email,
      u.display_name,
      u.role,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    ORDER BY u.created_at DESC
  `);

  return result.rows.map((row) => ({
    createdAt: row.created_at,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    isActive: row.is_active,
    role: row.role,
    updatedAt: row.updated_at,
  }));
}

async function createUser(payload, currentUser) {
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const displayName = String(payload.displayName || "").trim();
  const role = String(payload.role || "operator").trim();

  if (!email || !password || !displayName) {
    throw badRequest("email, password, and displayName are required");
  }

  if (!["admin", "operator", "viewer"].includes(role)) {
    throw badRequest("role must be admin, operator, or viewer");
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      display_name: displayName,
    },
  });

  if (error || !data?.user) {
    throw badRequest(error?.message || "Failed to create Supabase auth user");
  }

  return withClient(async (client) => {
    const result = await client.query(
      `
        INSERT INTO users (id, display_name, role, is_active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          role = EXCLUDED.role,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id, display_name, role, is_active, created_at, updated_at
      `,
      [data.user.id, displayName, role]
    );

    const createdUser = {
      createdAt: result.rows[0].created_at,
      displayName: result.rows[0].display_name,
      email,
      id: result.rows[0].id,
      isActive: result.rows[0].is_active,
      role: result.rows[0].role,
      updatedAt: result.rows[0].updated_at,
    };

    await writeAuditLog(client, {
      action: "create",
      entityId: createdUser.id,
      entityType: "user",
      newData: createdUser,
      userId: currentUser.id,
    });

    return createdUser;
  });
}

async function listAuditLog({ limit = 100, offset = 0 } = {}) {
  const safeLimit = Math.min(Number(limit || 100), 500);
  const safeOffset = Math.max(Number(offset || 0), 0);

  const result = await query(
    `
      SELECT
        a.id,
        a.user_id,
        u.display_name,
        a.action,
        a.entity_type,
        a.entity_id,
        a.old_data,
        a.new_data,
        a.metadata,
        a.created_at
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT $1
      OFFSET $2
    `,
    [safeLimit, safeOffset]
  );

  return result.rows.map((row) => ({
    action: row.action,
    createdAt: row.created_at,
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
    metadata: row.metadata,
    newData: row.new_data,
    oldData: row.old_data,
    user: row.user_id
      ? {
          displayName: row.display_name,
          id: row.user_id,
        }
      : null,
  }));
}

module.exports = {
  createUser,
  listAuditLog,
  listUsers,
};
