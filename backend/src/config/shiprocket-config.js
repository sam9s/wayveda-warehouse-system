const { loadEnv } = require("./env");

loadEnv();

function readOptional(name, fallback = null) {
  const value = process.env[name];
  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : fallback;
}

function readPositiveInteger(name, fallback) {
  const rawValue = readOptional(name, null);
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeBaseUrl(value) {
  const normalized = String(value || "https://apiv2.shiprocket.in/v1/external").trim();
  return normalized.replace(/\/+$/, "");
}

const shiprocketConfig = {
  baseUrl: normalizeBaseUrl(readOptional("SHIPROCKET_BASE_URL")),
  email: readOptional("SHIPROCKET_EMAIL"),
  maxPages: readPositiveInteger("SHIPROCKET_SYNC_MAX_PAGES", 5),
  pageSize: readPositiveInteger("SHIPROCKET_SYNC_PAGE_SIZE", 50),
  password: readOptional("SHIPROCKET_PASSWORD"),
  syncLookbackDays: readPositiveInteger("SHIPROCKET_SYNC_LOOKBACK_DAYS", 30),
  timeoutMs: readPositiveInteger("SHIPROCKET_TIMEOUT_MS", 20000),
};

function isShiprocketConfigured() {
  return Boolean(shiprocketConfig.email && shiprocketConfig.password);
}

module.exports = {
  isShiprocketConfigured,
  shiprocketConfig,
};
