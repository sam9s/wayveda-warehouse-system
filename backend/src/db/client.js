const { Pool } = require("pg");
const { getEnvOrThrow, loadEnv } = require("../config/env");

function createPool() {
  loadEnv();

  const sslMode = (process.env.PGSSLMODE || "").toLowerCase();
  const pool = new Pool({
    connectionString: getEnvOrThrow("DATABASE_URL"),
    max: Number(process.env.PGPOOL_MAX || 4),
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : false,
  });

  pool.on("error", (error) => {
    console.error(`Postgres pool idle client error: ${error.message}`);
  });

  return pool;
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
