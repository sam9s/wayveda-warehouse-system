const { query, withClient } = require("../db/client");
const { writeAuditLog } = require("./audit.service");
const {
  badRequest,
  notFound,
} = require("../utils/http-error");
const {
  normalizeNullableString,
  pickDefinedEntries,
  toIntegerOrNull,
} = require("../utils/pick");

const PRODUCT_SELECT_FIELDS = `
  id,
  name::TEXT AS name,
  category,
  sku,
  unit,
  opening_stock,
  opening_stock_date,
  max_level,
  qty_per_carton,
  display_order,
  is_active,
  metadata,
  created_at,
  updated_at
`;

function mapProduct(row) {
  return {
    category: row.category,
    createdAt: row.created_at,
    displayOrder: row.display_order,
    id: row.id,
    isActive: row.is_active,
    maxLevel: row.max_level,
    metadata: row.metadata,
    name: row.name,
    openingStock: row.opening_stock,
    openingStockDate: row.opening_stock_date,
    qtyPerCarton: row.qty_per_carton,
    sku: row.sku,
    unit: row.unit,
    updatedAt: row.updated_at,
  };
}

function assertIntegerField(fieldName, value, options = {}) {
  if (value === undefined) {
    return undefined;
  }

  const numericValue = toIntegerOrNull(value);
  if (Number.isNaN(numericValue)) {
    throw badRequest(`${fieldName} must be a whole number`);
  }

  if (
    numericValue !== null &&
    options.min !== undefined &&
    numericValue < options.min
  ) {
    throw badRequest(`${fieldName} must be at least ${options.min}`);
  }

  return numericValue;
}

function normalizeProductPayload(payload, { isCreate = false } = {}) {
  const normalized = {
    category: normalizeNullableString(payload.category),
    displayOrder: assertIntegerField("displayOrder", payload.displayOrder, {
      min: 0,
    }),
    isActive:
      payload.isActive === undefined ? undefined : Boolean(payload.isActive),
    maxLevel: assertIntegerField("maxLevel", payload.maxLevel, { min: 0 }),
    metadata: payload.metadata,
    name: normalizeNullableString(payload.name),
    openingStock: assertIntegerField("openingStock", payload.openingStock, {
      min: 0,
    }),
    openingStockDate: normalizeNullableString(payload.openingStockDate),
    qtyPerCarton: assertIntegerField("qtyPerCarton", payload.qtyPerCarton, {
      min: 1,
    }),
    sku: normalizeNullableString(payload.sku),
    unit: normalizeNullableString(payload.unit),
  };

  if (normalized.metadata !== undefined) {
    if (
      normalized.metadata === null ||
      typeof normalized.metadata !== "object" ||
      Array.isArray(normalized.metadata)
    ) {
      throw badRequest("metadata must be an object");
    }
  }

  if (isCreate && !normalized.name) {
    throw badRequest("name is required");
  }

  return normalized;
}

async function getProductRowById(client, productId) {
  const result = await client.query(
    `
      SELECT
        ${PRODUCT_SELECT_FIELDS}
      FROM products
      WHERE id = $1
    `,
    [productId]
  );

  if (!result.rows[0]) {
    throw notFound("Product not found");
  }

  return result.rows[0];
}

function buildDeleteReadiness(product, movementSummary) {
  const summary = {
    balance:
      product.openingStock
      + movementSummary.totalReceived
      + movementSummary.totalRtoRight
      - movementSummary.totalDispatched,
    movementCount: movementSummary.movementCount,
    totalDispatched: movementSummary.totalDispatched,
    totalReceived: movementSummary.totalReceived,
    totalRtoFake: movementSummary.totalRtoFake,
    totalRtoRight: movementSummary.totalRtoRight,
    totalRtoWrong: movementSummary.totalRtoWrong,
  };

  const checks = [
    {
      key: "inactive",
      label: "Product is inactive",
      passed: !product.isActive,
    },
    {
      key: "zeroBalance",
      label: "Current balance is zero",
      passed: summary.balance === 0,
    },
    {
      key: "noMovementHistory",
      label: "No movement history exists",
      passed: summary.movementCount === 0,
    },
  ];

  const reasons = [];
  if (product.isActive) {
    reasons.push("Deactivate the product before attempting permanent delete.");
  }
  if (summary.balance !== 0) {
    reasons.push(
      `Current balance is ${summary.balance}. Inventory must be reduced to zero first.`
    );
  }
  if (summary.movementCount > 0) {
    reasons.push(
      "Movement history exists. Direct delete would break auditability and requires guided cleanup."
    );
  }

  let status = "blocked";
  if (
    !product.isActive
    && summary.balance === 0
    && summary.movementCount === 0
  ) {
    status = "safe";
  } else if (
    !product.isActive
    && summary.balance === 0
    && summary.movementCount > 0
  ) {
    status = "guided_cleanup_required";
  }

  return {
    canHardDelete: status === "safe",
    checks,
    guidance:
      status === "safe"
        ? "This SKU can be deleted permanently because it is inactive, carries zero balance, and has no movement history."
        : status === "guided_cleanup_required"
          ? "This SKU cannot be deleted directly. It is inactive and empty, but historical movements still exist and must be handled through a guided cleanup workflow."
          : "This SKU is not ready for permanent delete. Complete the blocking steps first.",
    product,
    reasons,
    status,
    summary,
  };
}

async function getDeleteReadinessWithClient(client, productId) {
  const currentProduct = mapProduct(await getProductRowById(client, productId));
  const movementResult = await client.query(
    `
      SELECT
        COUNT(*)::INT AS movement_count,
        COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'stock_in'), 0)::INT AS total_received,
        COALESCE(SUM(quantity) FILTER (WHERE movement_type = 'dispatch'), 0)::INT AS total_dispatched,
        COALESCE(SUM(rto_right) FILTER (WHERE movement_type = 'rto'), 0)::INT AS total_rto_right,
        COALESCE(SUM(rto_wrong) FILTER (WHERE movement_type = 'rto'), 0)::INT AS total_rto_wrong,
        COALESCE(SUM(rto_fake) FILTER (WHERE movement_type = 'rto'), 0)::INT AS total_rto_fake
      FROM inventory_movements
      WHERE product_id = $1
    `,
    [productId]
  );

  const movementRow = movementResult.rows[0] || {};
  return buildDeleteReadiness(currentProduct, {
    movementCount: Number(movementRow.movement_count || 0),
    totalDispatched: Number(movementRow.total_dispatched || 0),
    totalReceived: Number(movementRow.total_received || 0),
    totalRtoFake: Number(movementRow.total_rto_fake || 0),
    totalRtoRight: Number(movementRow.total_rto_right || 0),
    totalRtoWrong: Number(movementRow.total_rto_wrong || 0),
  });
}

async function listProducts({ includeInactive = false }) {
  const result = await query(
    `
      SELECT
        ${PRODUCT_SELECT_FIELDS}
      FROM products
      WHERE ($1::boolean = TRUE OR is_active = TRUE)
      ORDER BY display_order, name
    `,
    [includeInactive]
  );

  return result.rows.map(mapProduct);
}

async function getProductById(productId) {
  return withClient(async (client) => mapProduct(await getProductRowById(client, productId)));
}

async function createProduct(payload, currentUser) {
  const product = normalizeProductPayload(payload, { isCreate: true });

  return withClient(async (client) => {
    const result = await client.query(
      `
        INSERT INTO products (
          name,
          category,
          sku,
          unit,
          opening_stock,
          opening_stock_date,
          max_level,
          qty_per_carton,
          display_order,
          is_active,
          metadata
        )
        VALUES (
          $1, $2, $3, COALESCE($4, 'pcs'),
          COALESCE($5, 0), COALESCE($6, CURRENT_DATE),
          $7, $8, COALESCE($9, 0), COALESCE($10, TRUE),
          COALESCE($11::jsonb, '{}'::jsonb)
        )
        RETURNING
          id,
          name::TEXT AS name,
          category,
          sku,
          unit,
          opening_stock,
          opening_stock_date,
          max_level,
          qty_per_carton,
          display_order,
          is_active,
          metadata,
          created_at,
          updated_at
      `,
      [
        product.name,
        product.category,
        product.sku,
        product.unit,
        product.openingStock,
        product.openingStockDate,
        product.maxLevel,
        product.qtyPerCarton,
        product.displayOrder,
        product.isActive,
        product.metadata ? JSON.stringify(product.metadata) : null,
      ]
    );

    const createdProduct = mapProduct(result.rows[0]);
    await writeAuditLog(client, {
      action: "create",
      entityId: createdProduct.id,
      entityType: "product",
      newData: createdProduct,
      userId: currentUser.id,
    });

    return createdProduct;
  });
}

async function updateProduct(productId, payload, currentUser) {
  const updates = normalizeProductPayload(payload);
  const entries = pickDefinedEntries([
    ["name", updates.name],
    ["category", updates.category],
    ["sku", updates.sku],
    ["unit", updates.unit],
    ["opening_stock", updates.openingStock],
    ["opening_stock_date", updates.openingStockDate],
    ["max_level", updates.maxLevel],
    ["qty_per_carton", updates.qtyPerCarton],
    ["display_order", updates.displayOrder],
    ["is_active", updates.isActive],
    ["metadata", updates.metadata],
  ]);

  if (!entries.length) {
    throw badRequest("No product fields were provided for update");
  }

  return withClient(async (client) => {
    const currentProduct = mapProduct(await getProductRowById(client, productId));

    const setClauses = entries.map(
      ([columnName], index) => `${columnName} = $${index + 2}`
    );
    const values = entries.map(([columnName, value]) =>
      columnName === "metadata" ? JSON.stringify(value) : value
    );

    const updatedResult = await client.query(
      `
        UPDATE products
        SET ${setClauses.join(", ")}, updated_at = NOW()
        WHERE id = $1
        RETURNING
          ${PRODUCT_SELECT_FIELDS}
      `,
      [productId, ...values]
    );

    const updatedProduct = mapProduct(updatedResult.rows[0]);

    await writeAuditLog(client, {
      action: "update",
      entityId: productId,
      entityType: "product",
      newData: updatedProduct,
      oldData: currentProduct,
      userId: currentUser.id,
    });

    return updatedProduct;
  });
}

async function softDeleteProduct(productId, currentUser) {
  return withClient(async (client) => {
    const currentProduct = mapProduct(await getProductRowById(client, productId));
    const result = await client.query(
      `
        UPDATE products
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING
          ${PRODUCT_SELECT_FIELDS}
      `,
      [productId]
    );

    if (!result.rows[0]) {
      throw notFound("Product not found");
    }

    const updatedProduct = mapProduct(result.rows[0]);
    await writeAuditLog(client, {
      action: "delete",
      entityId: productId,
      entityType: "product",
      newData: updatedProduct,
      oldData: currentProduct,
      userId: currentUser.id,
    });

    return updatedProduct;
  });
}

async function getProductDeleteReadiness(productId) {
  return withClient(async (client) => getDeleteReadinessWithClient(client, productId));
}

async function hardDeleteProduct(productId, currentUser) {
  return withClient(async (client) => {
    const readiness = await getDeleteReadinessWithClient(client, productId);

    if (!readiness.canHardDelete) {
      throw badRequest("Product is not eligible for permanent delete.", readiness);
    }

    const result = await client.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING
          ${PRODUCT_SELECT_FIELDS}
      `,
      [productId]
    );

    if (!result.rows[0]) {
      throw notFound("Product not found");
    }

    const deletedProduct = mapProduct(result.rows[0]);
    await writeAuditLog(client, {
      action: "hard_delete",
      entityId: productId,
      entityType: "product",
      metadata: {
        deleteReadiness: readiness,
      },
      oldData: deletedProduct,
      userId: currentUser.id,
    });

    return {
      product: deletedProduct,
      readiness,
    };
  });
}

module.exports = {
  createProduct,
  getProductById,
  getProductDeleteReadiness,
  hardDeleteProduct,
  listProducts,
  softDeleteProduct,
  updateProduct,
};
