const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createPool } = require("./client");

const migrationsDir = path.resolve(__dirname, "migrations");

function migrationVersion(fileName) {
  return fileName.split("_")[0];
}

function sha256(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(50) PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function main() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    const applied = await client.query(
      "SELECT version, checksum FROM schema_migrations"
    );
    const appliedByVersion = new Map(
      applied.rows.map((row) => [row.version, row.checksum])
    );

    for (const fileName of files) {
      const version = migrationVersion(fileName);
      const filePath = path.join(migrationsDir, fileName);
      const sql = fs.readFileSync(filePath, "utf8");
      const checksum = sha256(sql);
      const appliedChecksum = appliedByVersion.get(version);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(
            `Migration checksum mismatch for ${fileName}. Refusing to continue.`
          );
        }

        console.log(`Skipping ${fileName} (already applied)`);
        continue;
      }

      console.log(`Applying ${fileName}`);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `
          INSERT INTO schema_migrations (version, name, checksum)
          VALUES ($1, $2, $3)
        `,
        [version, fileName, checksum]
      );
      await client.query("COMMIT");
    }

    console.log("Database migrations are up to date.");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      if (rollbackError.code !== "25P01") {
        console.error("Rollback failed:", rollbackError.message);
      }
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
