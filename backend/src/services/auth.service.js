const { query, withClient } = require("../db/client");
const { adminSupabase, publicSupabase } = require("../config/supabase-client");
const {
  badRequest,
  forbidden,
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
        RETURNING id, display_name, role, is_active, created_at
      `,
      [authUser.id, deriveDisplayName(authUser)]
    );

    return mapAppUser(inserted.rows[0]);
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
  getAppUserById,
  login,
  logout,
  verifyAccessToken,
};
