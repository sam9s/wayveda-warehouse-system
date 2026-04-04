const { query, withClient } = require("../db/client");
const { writeAuditLog } = require("./audit.service");
const { badRequest, notFound } = require("../utils/http-error");
const { createSubmissionId } = require("../utils/submission-id");

const SUPPORTED_MOVEMENT_TYPES = new Set(["stock_in", "dispatch", "rto"]);

function mapMovement(row) {
  return {
    cartons: row.cartons,
    createdAt: row.created_at,
    entryDate: row.entry_date,
    id: row.id,
    metadata: row.metadata,
    movementType: row.movement_type,
    notes: row.notes,
    product: {
      id: row.product_id,
      name: row.product_name,
    },
    quantity: row.quantity,
    rtoFake: row.rto_fake,
    rtoRight: row.rto_right,
    rtoWrong: row.rto_wrong,
    shiprocketOrderId: row.shiprocket_order_id,
    source: row.source,
    submissionId: row.submission_id,
    submissionLineNo: row.submission_line_no,
    submittedBy: row.submitted_by,
    updatedAt: row.updated_at,
  };
}

function normalizeEntryDate(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw badRequest("entryDate must be in YYYY-MM-DD format");
  }

  return normalized;
}

function normalizePositiveInteger(fieldName, value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : undefined;
  }

  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw badRequest(`${fieldName} must be a whole number`);
  }

  return numericValue;
}

function normalizeManualMovementPayload(movementType, payload, currentUser) {
  if (!SUPPORTED_MOVEMENT_TYPES.has(movementType)) {
    throw badRequest(`Unsupported movement type: ${movementType}`);
  }

  const items = payload.items || payload.products;
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("At least one item is required");
  }

  const entryDate = normalizeEntryDate(payload.entryDate);
  const notes =
    payload.notes === undefined ? null : String(payload.notes || "").trim() || null;
  const submittedBy =
    String(payload.submittedBy || currentUser.appUser?.displayName || currentUser.email || "")
      .trim();

  if (!submittedBy) {
    throw badRequest("submittedBy is required");
  }

  const normalizedItems = items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw badRequest(`items[${index}] must be an object`);
    }

    const productId = item.productId ? String(item.productId).trim() : null;
    const productName = item.productName ? String(item.productName).trim() : null;

    if (!productId && !productName) {
      throw badRequest(`items[${index}] must include productId or productName`);
    }

    if (movementType === "stock_in") {
      const quantity = normalizePositiveInteger(
        `items[${index}].quantity`,
        item.quantity
      );
      const cartons = normalizePositiveInteger(
        `items[${index}].cartons`,
        item.cartons,
        { allowNull: true }
      );

      if (!quantity || quantity <= 0) {
        throw badRequest(`items[${index}].quantity must be greater than zero`);
      }

      return {
        cartons,
        productId,
        productName,
        quantity,
        rtoFake: 0,
        rtoRight: 0,
        rtoWrong: 0,
      };
    }

    if (movementType === "dispatch") {
      const quantity = normalizePositiveInteger(
        `items[${index}].quantity`,
        item.quantity
      );

      if (!quantity || quantity <= 0) {
        throw badRequest(`items[${index}].quantity must be greater than zero`);
      }

      return {
        cartons: null,
        productId,
        productName,
        quantity,
        rtoFake: 0,
        rtoRight: 0,
        rtoWrong: 0,
      };
    }

    const rtoRight = normalizePositiveInteger(
      `items[${index}].rtoRight`,
      item.rtoRight,
      { allowNull: true }
    ) || 0;
    const rtoWrong = normalizePositiveInteger(
      `items[${index}].rtoWrong`,
      item.rtoWrong,
      { allowNull: true }
    ) || 0;
    const rtoFake = normalizePositiveInteger(
      `items[${index}].rtoFake`,
      item.rtoFake,
      { allowNull: true }
    ) || 0;

    if (rtoRight + rtoWrong + rtoFake <= 0) {
      throw badRequest(
        `items[${index}] must include at least one positive RTO quantity`
      );
    }

    return {
      cartons: null,
      productId,
      productName,
      quantity: null,
      rtoFake,
      rtoRight,
      rtoWrong,
    };
  });

  return {
    entryDate,
    items: normalizedItems,
    metadata: payload.metadata || {},
    notes,
    submissionId: payload.submissionId
      ? String(payload.submissionId).trim()
      : createSubmissionId(entryDate),
    submittedBy,
  };
}

async function resolveProducts(client, items) {
  const productIds = items
    .map((item) => item.productId)
    .filter(Boolean);
  const productNames = items
    .map((item) => item.productName)
    .filter(Boolean);

  const result = await client.query(
    `
      SELECT id, name::TEXT AS name, is_active
      FROM products
      WHERE
        (cardinality($1::uuid[]) = 0 OR id = ANY($1::uuid[]))
        OR
        (cardinality($2::text[]) = 0 OR name::TEXT = ANY($2::text[]))
    `,
    [productIds, productNames]
  );

  const byId = new Map(result.rows.map((row) => [row.id, row]));
  const byName = new Map(result.rows.map((row) => [row.name, row]));

  return items.map((item) => {
    const product =
      (item.productId && byId.get(item.productId)) ||
      (item.productName && byName.get(item.productName));

    if (!product) {
      throw badRequest(
        `Unknown product reference: ${item.productId || item.productName}`
      );
    }

    if (!product.is_active) {
      throw badRequest(`Product is inactive: ${product.name}`);
    }

    return {
      ...item,
      productId: product.id,
      productName: product.name,
    };
  });
}

async function createManualMovement(movementType, payload, currentUser) {
  const normalized = normalizeManualMovementPayload(
    movementType,
    payload,
    currentUser
  );

  return withClient(async (client) => {
    const resolvedItems = await resolveProducts(client, normalized.items);
    const createdRows = [];

    await client.query("BEGIN");

    try {
      for (const [index, item] of resolvedItems.entries()) {
        const result = await client.query(
          `
            INSERT INTO inventory_movements (
              submission_id,
              submission_line_no,
              entry_date,
              submitted_by,
              movement_type,
              product_id,
              quantity,
              cartons,
              rto_right,
              rto_wrong,
              rto_fake,
              notes,
              source,
              metadata
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, 'manual', $13::jsonb
            )
            RETURNING
              id,
              submission_id,
              submission_line_no,
              entry_date,
              submitted_by,
              movement_type,
              product_id,
              quantity,
              cartons,
              rto_right,
              rto_wrong,
              rto_fake,
              notes,
              source,
              shiprocket_order_id,
              metadata,
              created_at,
              updated_at
          `,
          [
            normalized.submissionId,
            index + 1,
            normalized.entryDate,
            normalized.submittedBy,
            movementType,
            item.productId,
            item.quantity,
            item.cartons,
            item.rtoRight,
            item.rtoWrong,
            item.rtoFake,
            normalized.notes,
            JSON.stringify(normalized.metadata || {}),
          ]
        );

        const insertedRow = result.rows[0];
        const mappedRow = {
          ...mapMovement({
            ...insertedRow,
            product_name: item.productName,
          }),
        };

        await writeAuditLog(client, {
          action: "create",
          entityId: insertedRow.id,
          entityType: "movement",
          newData: mappedRow,
          userId: currentUser.id,
        });

        createdRows.push(mappedRow);
      }

      await client.query("COMMIT");
      return {
        items: createdRows,
        submissionId: normalized.submissionId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

async function listMovements(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.movementType) {
    values.push(filters.movementType);
    conditions.push(`m.movement_type = $${values.length}`);
  }

  if (filters.productId) {
    values.push(filters.productId);
    conditions.push(`m.product_id = $${values.length}`);
  }

  if (filters.startDate) {
    values.push(filters.startDate);
    conditions.push(`m.entry_date >= $${values.length}`);
  }

  if (filters.endDate) {
    values.push(filters.endDate);
    conditions.push(`m.entry_date <= $${values.length}`);
  }

  if (filters.submissionId) {
    values.push(filters.submissionId);
    conditions.push(`m.submission_id = $${values.length}`);
  }

  const limit = Math.min(Number(filters.limit || 100), 500);
  const offset = Math.max(Number(filters.offset || 0), 0);
  values.push(limit, offset);

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const result = await query(
    `
      SELECT
        m.id,
        m.submission_id,
        m.submission_line_no,
        m.entry_date,
        m.submitted_by,
        m.movement_type,
        m.product_id,
        p.name::TEXT AS product_name,
        m.quantity,
        m.cartons,
        m.rto_right,
        m.rto_wrong,
        m.rto_fake,
        m.notes,
        m.source,
        m.shiprocket_order_id,
        m.metadata,
        m.created_at,
        m.updated_at
      FROM inventory_movements m
      JOIN products p ON p.id = m.product_id
      ${whereClause}
      ORDER BY m.entry_date DESC, m.created_at DESC, m.submission_line_no DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );

  return result.rows.map(mapMovement);
}

async function getMovementById(movementId) {
  const result = await query(
    `
      SELECT
        m.id,
        m.submission_id,
        m.submission_line_no,
        m.entry_date,
        m.submitted_by,
        m.movement_type,
        m.product_id,
        p.name::TEXT AS product_name,
        m.quantity,
        m.cartons,
        m.rto_right,
        m.rto_wrong,
        m.rto_fake,
        m.notes,
        m.source,
        m.shiprocket_order_id,
        m.metadata,
        m.created_at,
        m.updated_at
      FROM inventory_movements m
      JOIN products p ON p.id = m.product_id
      WHERE m.id = $1
    `,
    [movementId]
  );

  if (!result.rows[0]) {
    throw notFound("Movement not found");
  }

  return mapMovement(result.rows[0]);
}

module.exports = {
  createManualMovement,
  getMovementById,
  listMovements,
};
