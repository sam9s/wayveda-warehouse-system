const { createPool } = require("./client");
const { CANONICAL_PRODUCTS, LEDGER_TARGETS } = require("./data/catalog");

function mismatchMessage(productName, field, expected, actual) {
  return `${productName}: expected ${field}=${expected}, got ${actual}`;
}

async function main() {
  const pool = createPool();

  try {
    const result = await pool.query(`
      SELECT
        product_name,
        opening_stock,
        total_received,
        total_dispatched,
        total_rto_right,
        total_rto_wrong,
        total_rto_fake,
        balance
      FROM v_inventory_ledger
      ORDER BY display_order, product_name
    `);

    if (result.rows.length !== CANONICAL_PRODUCTS.length) {
      throw new Error(
        `Expected ${CANONICAL_PRODUCTS.length} products in v_inventory_ledger, found ${result.rows.length}.`
      );
    }

    const mismatches = [];

    for (const row of result.rows) {
      const expected = LEDGER_TARGETS[row.product_name];
      if (!expected) {
        mismatches.push(`Unexpected product in ledger: ${row.product_name}`);
        continue;
      }

      const fieldMap = [
        ["openingStock", row.opening_stock],
        ["stockIn", row.total_received],
        ["dispatch", row.total_dispatched],
        ["rtoRight", row.total_rto_right],
        ["rtoWrong", row.total_rto_wrong],
        ["rtoFake", row.total_rto_fake],
        ["balance", row.balance],
      ];

      for (const [field, actualValue] of fieldMap) {
        if (Number(actualValue) !== expected[field]) {
          mismatches.push(
            mismatchMessage(
              row.product_name,
              field,
              expected[field],
              Number(actualValue)
            )
          );
        }
      }
    }

    if (mismatches.length) {
      throw new Error(`Ledger verification failed.\n${mismatches.join("\n")}`);
    }

    console.log("Ledger verification passed.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
