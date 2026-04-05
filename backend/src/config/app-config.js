const { getEnvOrThrow, loadEnv } = require("./env");

loadEnv();

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolvePublicAppUrl(origins) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.trim();
  }

  if (origins[0]) {
    return origins[0];
  }

  return "https://wh.wayveda.cloud";
}

const corsOrigins = parseCsv(process.env.CORS_ORIGIN || "");

const appConfig = {
  appEnv: process.env.NODE_ENV || "development",
  appName: "wayveda-warehouse-backend",
  appVersion: process.env.npm_package_version || "0.1.0",
  corsOrigins,
  jwtSecret: getEnvOrThrow("JWT_SECRET"),
  port: Number(process.env.PORT || 4002),
  publicAppUrl: resolvePublicAppUrl(corsOrigins),
  supabaseAnonKey: getEnvOrThrow("SUPABASE_ANON_KEY"),
  supabaseServiceKey: getEnvOrThrow("SUPABASE_SERVICE_KEY"),
  supabaseUrl: getEnvOrThrow("SUPABASE_URL"),
};

module.exports = {
  appConfig,
};
