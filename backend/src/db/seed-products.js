const { createPool } = require("./client");
const { CANONICAL_PRODUCTS, OPENING_STOCK_DATE } = require("./data/catalog");

async function main() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const product of CANONICAL_PRODUCTS) {
      await client.query(
        `
          INSERT INTO products (
            name,
            category,
            opening_stock,
            opening_stock_date,
            display_order,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, TRUE)
          ON CONFLICT (name) DO UPDATE SET
            category = EXCLUDED.category,
            opening_stock = EXCLUDED.opening_stock,
            opening_stock_date = EXCLUDED.opening_stock_date,
            display_order = EXCLUDED.display_order,
            is_active = TRUE,
            updated_at = NOW()
        `,
        [
          product.name,
          product.category,
          product.openingStock,
          OPENING_STOCK_DATE,
          product.displayOrder,
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Seeded ${CANONICAL_PRODUCTS.length} products.`);
  } catch (error) {
    await client.query("ROLLBACK");
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
