const { Pool } = require("pg");
const { getEnvOrThrow, loadEnv } = require("../config/env");

function createPool() {
  loadEnv();

  const sslMode = (process.env.PGSSLMODE || "").toLowerCase();

  return new Pool({
    connectionString: getEnvOrThrow("DATABASE_URL"),
    max: Number(process.env.PGPOOL_MAX || 4),
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : false,
  });
}

async function withClient(work) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    return await work(client);
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = {
  createPool,
  withClient,
};
