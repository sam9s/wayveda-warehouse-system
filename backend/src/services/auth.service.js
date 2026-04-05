const { query, withClient } = require("../db/client");
const { appConfig } = require("../config/app-config");
const { adminSupabase, publicSupabase } = require("../config/supabase-client");
const {
  badRequest,
  forbidden,
  serviceUnavailable,
  unauthorized,
} = require("../utils/http-error");

function deriveDisplayName(authUser) {
  const metadataName =
    authUser.user_metadata?.display_name ||
    authUser.user_metadata?.full_name ||
    authUser.app_metadata?.display_name;

  if (metadataName) {
    return String(metadataName).trim();
  }

  if (authUser.email) {
    return authUser.email.split("@")[0];
  }

  return "WayVeda User";
}

function mapAppUser(row) {
  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    passwordChangedAt: row.password_changed_at,
    role: row.role,
  };
}

function buildCurrentUser(authUser, appUser) {
  return {
    appUser,
    authUser,
    email: authUser.email,
    id: authUser.id,
    isActive: appUser?.isActive ?? true,
    mustChangePassword: appUser?.mustChangePassword ?? false,
    role: appUser?.role ?? "viewer",
  };
}

async function getAppUserById(userId) {
  const result = await query(
    `
      SELECT
        id,
        display_name,
        role,
        is_active,
        must_change_password,
        password_changed_at,
        created_at
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  return mapAppUser(result.rows[0]);
}

async function ensureAppUser(authUser) {
  const existingUser = await getAppUserById(authUser.id);
  if (existingUser) {
    if (!existingUser.isActive) {
      throw forbidden("This user account is inactive");
    }

    return existingUser;
  }

  return withClient(async (client) => {
    const countResult = await client.query(
      "SELECT COUNT(*)::int AS user_count FROM users"
    );
    const userCount = Number(countResult.rows[0].user_count);

    if (userCount > 0) {
      throw forbidden("This authenticated user is not provisioned in WayVeda");
    }

    const inserted = await client.query(
      `
        INSERT INTO users (id, display_name, role, is_active)
        VALUES ($1, $2, 'admin', TRUE)
        RETURNING
          id,
          display_name,
          role,
          is_active,
          must_change_password,
          password_changed_at,
          created_at
      `,
      [authUser.id, deriveDisplayName(authUser)]
    );

    const updated = await client.query(
      `
        UPDATE users
        SET
          must_change_password = FALSE,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          display_name,
          role,
          is_active,
          must_change_password,
          password_changed_at,
          created_at
      `,
      [inserted.rows[0].id]
    );

    return mapAppUser(updated.rows[0]);
  });
}

async function verifyAccessToken(accessToken) {
  if (!accessToken) {
    throw unauthorized("Missing access token");
  }

  const { data, error } = await publicSupabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw unauthorized(error?.message || "Invalid access token");
  }

  const appUser = await ensureAppUser(data.user);
  return buildCurrentUser(data.user, appUser);
}

async function login({ email, password }) {
  if (!email || !password) {
    throw badRequest("Both email and password are required");
  }

  const { data, error } = await publicSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user || !data?.session) {
    throw unauthorized(error?.message || "Invalid login credentials");
  }

  const appUser = await ensureAppUser(data.user);

  return {
    session: data.session,
    user: buildCurrentUser(data.user, appUser),
  };
}

function validateNewPassword(newPassword) {
  if (!newPassword) {
    throw badRequest("New password is required");
  }

  if (String(newPassword).length < 8) {
    throw badRequest("New password must be at least 8 characters long");
  }
}

async function changePassword(currentUser, { currentPassword, newPassword }) {
  if (!currentUser?.email || !currentUser?.id) {
    throw unauthorized("Authenticated user context is missing");
  }

  if (!currentPassword) {
    throw badRequest("Current password is required");
  }

  validateNewPassword(newPassword);

  if (currentPassword === newPassword) {
    throw badRequest("New password must be different from the current password");
  }

  const { data: verificationData, error: verificationError } =
    await publicSupabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });

  if (verificationError || !verificationData?.user) {
    throw unauthorized("Current password is incorrect");
  }

  const { error: passwordUpdateError } =
    await adminSupabase.auth.admin.updateUserById(currentUser.id, {
      password: newPassword,
    });

  if (passwordUpdateError) {
    throw badRequest(passwordUpdateError.message);
  }

  const updatedAppUser = await withClient(async (client) => {
    const result = await client.query(
      `
        UPDATE users
        SET
          must_change_password = FALSE,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          display_name,
          role,
          is_active,
          must_change_password,
          password_changed_at,
          created_at
      `,
      [currentUser.id]
    );

    await client.query(
      `
        INSERT INTO audit_log (
          user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        currentUser.id,
        "password_change",
        "user",
        currentUser.id,
        JSON.stringify({
          clearedMustChangePassword: true,
          source: "self-service",
        }),
      ]
    );

    return mapAppUser(result.rows[0]);
  });

  const verificationToken = verificationData.session?.access_token;
  if (verificationToken) {
    await adminSupabase.auth.admin.signOut(verificationToken, "local").catch(() => {
      // A verification-session cleanup failure should not block the password update.
    });
  }

  return {
    success: true,
    user: buildCurrentUser(currentUser.authUser, updatedAppUser),
  };
}

async function requestPasswordReset({ email }) {
  if (!email) {
    throw badRequest("Email is required");
  }

  const { error } = await publicSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appConfig.publicAppUrl}/reset-password`,
  });

  if (error) {
    throw serviceUnavailable(
      "Password recovery email is not available right now. Contact the system administrator for a temporary reset."
    );
  }

  return {
    message:
      "If an active WayVeda account exists for that email, password reset instructions have been sent.",
    success: true,
  };
}

async function resetPassword({ accessToken, newPassword }) {
  if (!accessToken) {
    throw unauthorized("Recovery link is invalid or expired");
  }

  validateNewPassword(newPassword);

  const { data, error } = await publicSupabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw unauthorized(error?.message || "Recovery link is invalid or expired");
  }

  const { error: passwordUpdateError } =
    await adminSupabase.auth.admin.updateUserById(data.user.id, {
      password: newPassword,
    });

  if (passwordUpdateError) {
    throw badRequest(passwordUpdateError.message);
  }

  const updatedAppUser = await withClient(async (client) => {
    const result = await client.query(
      `
        UPDATE users
        SET
          must_change_password = FALSE,
          password_changed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          display_name,
          role,
          is_active,
          must_change_password,
          password_changed_at,
          created_at
      `,
      [data.user.id]
    );

    await client.query(
      `
        INSERT INTO audit_log (
          user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        data.user.id,
        "password_reset",
        "user",
        data.user.id,
        JSON.stringify({
          source: "recovery-link",
        }),
      ]
    );

    return mapAppUser(result.rows[0]);
  });

  await adminSupabase.auth.admin.signOut(accessToken, "local").catch(() => {
    // Recovery-session cleanup failure should not block the password reset.
  });

  return {
    message: "Password reset successful. Sign in with your new password.",
    success: true,
    user: buildCurrentUser(data.user, updatedAppUser),
  };
}

async function logout(accessToken, scope = "global") {
  if (!accessToken) {
    throw unauthorized("Missing access token");
  }

  const { error } = await adminSupabase.auth.admin.signOut(accessToken, scope);
  if (error) {
    throw badRequest(error.message);
  }

  return { success: true };
}

module.exports = {
  changePassword,
  getAppUserById,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  verifyAccessToken,
};
