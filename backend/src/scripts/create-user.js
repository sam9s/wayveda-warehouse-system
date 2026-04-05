const { adminSupabase } = require("../config/supabase-client");
const { closePool, withClient } = require("../db/client");
const { writeAuditLog } = require("../services/audit.service");

const ALLOWED_ROLES = new Set(["system_admin", "admin", "operator", "viewer"]);

function readOption(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }

  return String(process.argv[index + 1] || "").trim();
}

function requireOption(flag, label) {
  const value = readOption(flag);
  if (!value) {
    throw new Error(`Missing required option ${flag} (${label})`);
  }

  return value;
}

async function main() {
  const email = requireOption("--email", "email").toLowerCase();
  const password = requireOption("--password", "password");
  const displayName = requireOption("--display-name", "display name");
  const role = (readOption("--role") || "operator").toLowerCase();
  const mustChangePassword = !process.argv.includes("--no-force-password-change");

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error("Role must be one of: system_admin, admin, operator, viewer");
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
    throw new Error(error?.message || "Failed to create auth user");
  }

  const appUser = await withClient(async (client) => {
    const result = await client.query(
      `
        INSERT INTO users (
          id,
          display_name,
          role,
          is_active,
          must_change_password,
          password_changed_at
        )
        VALUES (
          $1, $2, $3, TRUE, $4,
          CASE WHEN $4 THEN NULL ELSE NOW() END
        )
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          role = EXCLUDED.role,
          is_active = TRUE,
          must_change_password = $4,
          password_changed_at = CASE WHEN $4 THEN NULL ELSE NOW() END,
          updated_at = NOW()
        RETURNING
          id,
          display_name,
          role,
          is_active,
          must_change_password,
          password_changed_at,
          created_at,
          updated_at
      `,
      [data.user.id, displayName, role, mustChangePassword]
    );

    await writeAuditLog(client, {
      action: "create",
      entityId: result.rows[0].id,
      entityType: "user",
      newData: {
        createdAt: result.rows[0].created_at,
        displayName: result.rows[0].display_name,
        email,
        id: result.rows[0].id,
        isActive: result.rows[0].is_active,
        mustChangePassword: result.rows[0].must_change_password,
        passwordChangedAt: result.rows[0].password_changed_at,
        role: result.rows[0].role,
        updatedAt: result.rows[0].updated_at,
      },
      metadata: {
        mustChangePassword,
        source: "bootstrap-script",
      },
    });

    return result.rows[0];
  });

  console.log(
    JSON.stringify(
      {
        email,
        id: appUser.id,
        mustChangePassword: appUser.must_change_password,
        role: appUser.role,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
