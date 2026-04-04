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

async function listProducts({ includeInactive = false }) {
  const result = await query(
    `
      SELECT
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
      FROM products
      WHERE ($1::boolean = TRUE OR is_active = TRUE)
      ORDER BY display_order, name
    `,
    [includeInactive]
  );

  return result.rows.map(mapProduct);
}

async function getProductById(productId) {
  const result = await query(
    `
      SELECT
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
      FROM products
      WHERE id = $1
    `,
    [productId]
  );

  if (!result.rows[0]) {
    throw notFound("Product not found");
  }

  return mapProduct(result.rows[0]);
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
          COALESCE($5, 0), COALESCE($6, DATE '2025-07-24'),
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
    const currentResult = await client.query(
      `
        SELECT
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
        FROM products
        WHERE id = $1
      `,
      [productId]
    );

    if (!currentResult.rows[0]) {
      throw notFound("Product not found");
    }

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
      [productId, ...values]
    );

    const oldProduct = mapProduct(currentResult.rows[0]);
    const updatedProduct = mapProduct(updatedResult.rows[0]);

    await writeAuditLog(client, {
      action: "update",
      entityId: productId,
      entityType: "product",
      newData: updatedProduct,
      oldData: oldProduct,
      userId: currentUser.id,
    });

    return updatedProduct;
  });
}

async function softDeleteProduct(productId, currentUser) {
  return withClient(async (client) => {
    const currentProduct = await getProductById(productId);
    const result = await client.query(
      `
        UPDATE products
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
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

module.exports = {
  createProduct,
  getProductById,
  listProducts,
  softDeleteProduct,
  updateProduct,
};
