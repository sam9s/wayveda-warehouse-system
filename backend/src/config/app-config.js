const { getEnvOrThrow, loadEnv } = require("./env");

loadEnv();

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const appConfig = {
  appEnv: process.env.NODE_ENV || "development",
  appName: "wayveda-warehouse-backend",
  appVersion: process.env.npm_package_version || "0.1.0",
  corsOrigins: parseCsv(process.env.CORS_ORIGIN || ""),
  jwtSecret: getEnvOrThrow("JWT_SECRET"),
  port: Number(process.env.PORT || 4002),
  supabaseAnonKey: getEnvOrThrow("SUPABASE_ANON_KEY"),
  supabaseServiceKey: getEnvOrThrow("SUPABASE_SERVICE_KEY"),
  supabaseUrl: getEnvOrThrow("SUPABASE_URL"),
};

module.exports = {
  appConfig,
};
