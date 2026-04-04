const { Pool } = require("pg");
const { getEnvOrThrow, loadEnv } = require("../config/env");

let pool;

function createPool() {
  if (pool) {
    return pool;
  }

  loadEnv();

  const sslMode = (process.env.PGSSLMODE || "").toLowerCase();
  pool = new Pool({
    connectionString: getEnvOrThrow("DATABASE_URL"),
    max: Number(process.env.PGPOOL_MAX || 10),
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
  }
}

async function query(text, params = []) {
  const pool = createPool();
  return pool.query(text, params);
}

async function closePool() {
  if (!pool) {
    return;
  }

  const activePool = pool;
  pool = undefined;
  await activePool.end();
}

module.exports = {
  closePool,
  createPool,
  query,
  withClient,
};
