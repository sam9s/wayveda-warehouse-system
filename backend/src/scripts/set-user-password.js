const { adminSupabase } = require("../config/supabase-client");
const { closePool, withClient } = require("../db/client");
const { writeAuditLog } = require("../services/audit.service");

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
  const mustChangePassword = !process.argv.includes("--no-force-password-change");

  const result = await withClient(async (client) => {
    const lookup = await client.query(
      `
        SELECT
          u.id,
          au.email,
          u.display_name,
          u.role
        FROM users u
        INNER JOIN auth.users au ON au.id = u.id
        WHERE lower(au.email) = $1
      `,
      [email]
    );

    if (!lookup.rows[0]) {
      throw new Error(`No application user found for email ${email}`);
    }

    const user = lookup.rows[0];
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const updated = await client.query(
      `
        UPDATE users
        SET
          must_change_password = $2,
          password_changed_at = CASE WHEN $2 THEN NULL ELSE NOW() END,
          updated_at = NOW()
        WHERE id = $1
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
      [user.id, mustChangePassword]
    );

    await writeAuditLog(client, {
      action: "password_reset",
      entityId: user.id,
      entityType: "user",
      metadata: {
        email,
        mustChangePassword,
        source: "password-reset-script",
      },
    });

    return {
      email,
      id: updated.rows[0].id,
      mustChangePassword: updated.rows[0].must_change_password,
      role: updated.rows[0].role,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
