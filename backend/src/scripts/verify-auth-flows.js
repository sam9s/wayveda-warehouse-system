const crypto = require("node:crypto");
const { adminSupabase } = require("../config/supabase-client");
const { appConfig } = require("../config/app-config");
const { closePool, query } = require("../db/client");

function getBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    `http://127.0.0.1:${appConfig.port}`
  );
}

async function requestJson(path, options = {}) {
  const { headers = {}, ...restOptions } = options;

  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    ...restOptions,
  });

  const rawBody = await response.text();
  let body = null;

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      body = rawBody;
    }
  }

  return {
    body,
    response,
  };
}

function assertStatus(response, expectedStatus, body, label) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `${label} failed with status ${response.status}: ${JSON.stringify(body)}`
    );
  }
}

async function createSmokeUser() {
  const token = crypto.randomBytes(6).toString("hex");
  const email = `phasec-smoke-${Date.now()}-${token}@example.com`;
  const password = `Wayveda!${crypto.randomBytes(9).toString("base64url")}`;
  const displayName = "Phase C Smoke Test";

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      display_name: displayName,
    },
  });

  if (error || !data?.user) {
    throw new Error(error?.message || "Failed to create smoke-test auth user");
  }

  await query(
    `
      INSERT INTO users (id, display_name, role, is_active)
      VALUES ($1, $2, 'admin', TRUE)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role,
        is_active = TRUE,
        updated_at = NOW()
    `,
    [data.user.id, displayName]
  );

  return {
    displayName,
    email,
    id: data.user.id,
    password,
  };
}

async function deleteSmokeUser(userId) {
  if (!userId) {
    return;
  }

  await query("DELETE FROM users WHERE id = $1", [userId]);

  const { error } = await adminSupabase.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Failed to delete smoke-test auth user: ${error.message}`);
  }
}

async function verifyLogin(email, password) {
  const { body, response } = await requestJson("/api/auth/login", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });

  assertStatus(response, 200, body, "Login");

  if (!body?.session?.access_token) {
    throw new Error(`Login response did not include an access token: ${JSON.stringify(body)}`);
  }

  if (body?.user?.role !== "admin") {
    throw new Error(`Smoke-test user should resolve as admin: ${JSON.stringify(body?.user)}`);
  }

  return body.session.access_token;
}

async function verifyProtectedGet(token, path, expectedStatus, label) {
  const { body, response } = await requestJson(path, {
    headers: {
      authorization: `Bearer ${token}`,
    },
    method: "GET",
  });

  assertStatus(response, expectedStatus, body, label);
  return body;
}

async function verifyValidationFailure(token) {
  const { body, response } = await requestJson("/api/movements/dispatch", {
    body: JSON.stringify({
      entryDate: "2026-04-04",
      items: [],
      submittedBy: "Phase C Smoke Test",
    }),
    headers: {
      authorization: `Bearer ${token}`,
    },
    method: "POST",
  });

  assertStatus(response, 400, body, "Dispatch validation");
}

async function main() {
  let smokeUser;

  try {
    smokeUser = await createSmokeUser();

    const accessToken = await verifyLogin(smokeUser.email, smokeUser.password);
    const me = await verifyProtectedGet(accessToken, "/api/auth/me", 200, "Current user");
    const products = await verifyProtectedGet(accessToken, "/api/products", 200, "Products");
    const dashboard = await verifyProtectedGet(
      accessToken,
      "/api/inventory/dashboard",
      200,
      "Dashboard"
    );
    const ledger = await verifyProtectedGet(
      accessToken,
      "/api/inventory/ledger",
      200,
      "Ledger"
    );
    const movements = await verifyProtectedGet(
      accessToken,
      "/api/movements?limit=5",
      200,
      "Movements"
    );
    const users = await verifyProtectedGet(
      accessToken,
      "/api/admin/users",
      200,
      "Admin users"
    );

    await verifyValidationFailure(accessToken);

    console.log(
      JSON.stringify(
        {
          dashboardRows: Array.isArray(dashboard) ? dashboard.length : 0,
          ledgerRows: Array.isArray(ledger) ? ledger.length : 0,
          movementRows: Array.isArray(movements) ? movements.length : 0,
          products: Array.isArray(products) ? products.length : 0,
          userRole: me?.user?.role,
          users: Array.isArray(users) ? users.length : 0,
        },
        null,
        2
      )
    );
  } finally {
    try {
      await deleteSmokeUser(smokeUser?.id);
    } finally {
      await closePool();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
