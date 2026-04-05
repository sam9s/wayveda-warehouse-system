const { shiprocketConfig, isShiprocketConfigured } = require("../config/shiprocket-config");
const { SHIPROCKET_PRODUCT_MAP } = require("../config/shiprocket-product-map");
const { query, withClient } = require("../db/client");
const { writeAuditLog } = require("./audit.service");
const { badRequest, serviceUnavailable } = require("../utils/http-error");

const DISPATCH_STATUSES = new Set(["SHIPPED", "DELIVERED"]);

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeProductKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSyncLog(row) {
  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    errorMessage: row.error_message,
    id: row.id,
    lastSyncedAt: row.last_synced_at,
    metadata: row.metadata || {},
    recordsSynced: Number(row.records_synced || 0),
    status: row.status,
    syncType: row.sync_type,
    updatedAt: row.updated_at,
  };
}

function formatShiprocketDispatchRow(row) {
  const metadata = row.metadata || {};

  return {
    awb: metadata.awb || metadata.awbCode || null,
    createdAt: row.created_at,
    entryDate: row.entry_date,
    id: row.id,
    notes: row.notes,
    orderId: row.shiprocket_order_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    shiprocketStatus: metadata.shiprocketStatus || metadata.orderStatus || null,
    source: row.source,
    submissionId: row.submission_id,
    syncedAt: metadata.syncedAt || row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertValidDateParam(name, value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw badRequest(`${name} must be in YYYY-MM-DD format`);
  }

  return normalized;
}

function defaultSyncRange() {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (shiprocketConfig.syncLookbackDays - 1));

  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: toDate.toISOString().slice(0, 10),
  };
}

function buildShiprocketUrl(pathname, queryParams = {}) {
  const url = new URL(`${shiprocketConfig.baseUrl}${pathname}`);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url;
}

async function parseShiprocketResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function shiprocketRequest(
  pathname,
  { body, method = "GET", queryParams = {}, token } = {}
) {
  const headers = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let requestBody;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildShiprocketUrl(pathname, queryParams), {
    body: requestBody,
    headers,
    method,
    signal: AbortSignal.timeout(shiprocketConfig.timeoutMs),
  });

  const payload = await parseShiprocketResponse(response);

  if (!response.ok) {
    const message =
      payload.message ||
      payload.error ||
      payload.errors?.[0]?.message ||
      `Shiprocket request failed with status ${response.status}`;

    throw serviceUnavailable(message);
  }

  return payload;
}

async function authenticateShiprocket() {
  if (!isShiprocketConfigured()) {
    throw serviceUnavailable(
      "Shiprocket credentials are not configured. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to backend/.env."
    );
  }

  const payload = await shiprocketRequest("/auth/login", {
    body: {
      email: shiprocketConfig.email,
      password: shiprocketConfig.password,
    },
    method: "POST",
  });

  const token =
    payload.token ||
    payload.access_token ||
    payload.data?.token ||
    payload.data?.access_token;

  if (!token) {
    throw serviceUnavailable("Shiprocket auth succeeded but no token was returned");
  }

  return token;
}

function extractOrders(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.orders,
    payload?.orders,
    payload?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractPagination(payload, { fallbackPage = 1, orderCount = 0, pageSize = 50 } = {}) {
  const data = payload?.data || {};
  const meta = data?.meta || payload?.meta || {};
  const currentPage =
    Number(meta.current_page || data.current_page || payload?.current_page || fallbackPage) ||
    fallbackPage;
  const reportedLastPage =
    Number(meta.last_page || data.last_page || payload?.last_page || 0) || 0;

  return {
    currentPage,
    lastPage:
      reportedLastPage ||
      (orderCount < pageSize ? currentPage : currentPage + 1),
  };
}

async function fetchShiprocketOrdersPage(token, { page, pageSize }) {
  return shiprocketRequest("/orders", {
    method: "GET",
    token,
    queryParams: {
      page,
      per_page: pageSize,
    },
  });
}

function isDateWithinRange(value, fromDate, toDate) {
  if (!value) {
    return false;
  }

  return value >= fromDate && value <= toDate;
}

function filterOrdersByDateRange(orders, { fromDate, toDate }) {
  return orders.filter((order) => {
    const orderDate = extractOrderDate(order);
    return isDateWithinRange(orderDate, fromDate, toDate);
  });
}

async function fetchShiprocketOrders(token, { fromDate, maxPages, pageSize, toDate }) {
  const aggregatedOrders = [];
  const seenOrderIds = new Set();
  let lastSeenPagination = {
    currentPage: 1,
    lastPage: 1,
  };

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await fetchShiprocketOrdersPage(token, {
      page,
      pageSize,
    });
    const pageOrders = extractOrders(payload);
    const pageOrderIds = pageOrders
      .map((order) => String(extractOrderIdentifier(order) || "").trim())
      .filter(Boolean);
    const unseenOrderIds = pageOrderIds.filter((orderId) => !seenOrderIds.has(orderId));
    const pagination = extractPagination(payload, {
      fallbackPage: page,
      orderCount: pageOrders.length,
      pageSize,
    });

    if (page > 1 && pageOrderIds.length && unseenOrderIds.length === 0) {
      break;
    }

    pageOrderIds.forEach((orderId) => {
      seenOrderIds.add(orderId);
    });
    aggregatedOrders.push(...pageOrders);
    lastSeenPagination = pagination;

    const shouldStop =
      !pageOrders.length ||
      pagination.currentPage >= pagination.lastPage;

    if (shouldStop) {
      break;
    }
  }

  return {
    orders: filterOrdersByDateRange(aggregatedOrders, { fromDate, toDate }),
    pagination: lastSeenPagination,
    totalOrdersFetched: aggregatedOrders.length,
  };
}

function extractLineItems(order) {
  const candidates = [order.items, order.order_items, order.products, order.line_items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractOrderIdentifier(order) {
  return (
    order.order_id ||
    order.channel_order_id ||
    order.id ||
    order.shipment_id ||
    order.awb_code ||
    null
  );
}

function extractOrderDate(order) {
  return (
    normalizeDate(order.shipped_date) ||
    normalizeDate(order.shipped_at) ||
    normalizeDate(order.delivered_date) ||
    normalizeDate(order.pickup_date) ||
    normalizeDate(order.order_date) ||
    normalizeDate(order.created_at) ||
    normalizeDate(order.updated_at)
  );
}

function extractOrderStatus(order) {
  return normalizeStatus(
    order.status ||
      order.current_status ||
      order.shipment_status ||
      order.order_status ||
      order.shipment_status_name
  );
}

function extractOrderAwb(order) {
  return order.awb_code || order.awb || order.awb_number || null;
}

function lineItemQuantity(item) {
  const candidates = [item.quantity, item.qty, item.units, item.count];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }

  return 0;
}

function lineItemName(item) {
  return (
    String(item.name || item.product_name || item.title || item.item_name || "")
      .trim()
  );
}

function lineItemSku(item) {
  return String(item.sku || item.item_sku || item.product_sku || "")
    .trim();
}

function buildProductResolver(products) {
  const byNormalizedName = new Map();
  const byNormalizedSku = new Map();
  const productsWithKeys = products.map((product) => ({
    ...product,
    normalizedName: normalizeProductKey(product.name),
    normalizedSku: normalizeProductKey(product.sku),
  }));

  productsWithKeys.forEach((product) => {
    byNormalizedName.set(product.normalizedName, product);

    if (product.normalizedSku) {
      byNormalizedSku.set(product.normalizedSku, product);
    }
  });

  return {
    byNormalizedName,
    byNormalizedSku,
    products: productsWithKeys,
  };
}

function resolveProductMatch(item, resolver) {
  const rawName = lineItemName(item);
  const rawSku = lineItemSku(item);
  const normalizedName = normalizeProductKey(rawName);
  const normalizedSku = normalizeProductKey(rawSku);

  const aliasTarget =
    SHIPROCKET_PRODUCT_MAP[normalizedName] ||
    SHIPROCKET_PRODUCT_MAP[normalizedSku] ||
    null;

  if (aliasTarget) {
    const aliased = resolver.byNormalizedName.get(normalizeProductKey(aliasTarget));
    if (aliased) {
      return { matchType: "alias", product: aliased };
    }
  }

  if (normalizedSku && resolver.byNormalizedSku.has(normalizedSku)) {
    return { matchType: "sku", product: resolver.byNormalizedSku.get(normalizedSku) };
  }

  if (normalizedName && resolver.byNormalizedName.has(normalizedName)) {
    return { matchType: "exact", product: resolver.byNormalizedName.get(normalizedName) };
  }

  if (normalizedName.length >= 8) {
    const candidates = resolver.products.filter(
      (product) =>
        product.normalizedName.includes(normalizedName) ||
        normalizedName.includes(product.normalizedName)
    );

    if (candidates.length === 1) {
      return { matchType: "fuzzy", product: candidates[0] };
    }
  }

  return { matchType: "unmapped", product: null };
}

function normalizeOrderForDispatch(order, resolver) {
  const orderId = extractOrderIdentifier(order);
  const entryDate = extractOrderDate(order);
  const status = extractOrderStatus(order);
  const awb = extractOrderAwb(order);
  const items = extractLineItems(order);

  if (!orderId || !entryDate || !status || !DISPATCH_STATUSES.has(status) || !items.length) {
    return {
      awb,
      entryDate,
      orderId,
      rawItems: items.length,
      ready: false,
      status,
    };
  }

  const aggregatedItems = new Map();
  const unmapped = [];

  items.forEach((item) => {
    const quantity = lineItemQuantity(item);
    if (quantity <= 0) {
      return;
    }

    const { product } = resolveProductMatch(item, resolver);
    if (!product) {
      unmapped.push({
        itemName: lineItemName(item),
        sku: lineItemSku(item) || null,
      });
      return;
    }

    const existing = aggregatedItems.get(product.id) || {
      productId: product.id,
      productName: product.name,
      quantity: 0,
    };

    existing.quantity += quantity;
    aggregatedItems.set(product.id, existing);
  });

  if (unmapped.length || aggregatedItems.size === 0) {
    return {
      awb,
      entryDate,
      items: Array.from(aggregatedItems.values()),
      orderId,
      ready: false,
      status,
      unmapped,
    };
  }

  return {
    awb,
    entryDate,
    items: Array.from(aggregatedItems.values()),
    orderId,
    ready: true,
    status,
  };
}

async function getActiveProducts(client) {
  const result = await client.query(
    `
      SELECT id, name::TEXT AS name, sku
      FROM products
      WHERE is_active = TRUE
      ORDER BY display_order, name
    `
  );

  return result.rows;
}

async function shiprocketOrderExists(client, orderId) {
  const result = await client.query(
    `
      SELECT 1
      FROM inventory_movements
      WHERE source = 'shiprocket'
        AND shiprocket_order_id = $1
      LIMIT 1
    `,
    [String(orderId)]
  );

  return Boolean(result.rows[0]);
}

async function createShiprocketDispatch(client, normalizedOrder, currentUser) {
  const submissionId = `shiprocket-${String(normalizedOrder.orderId).slice(0, 88)}`;
  const submittedBy =
    currentUser?.appUser?.displayName ||
    currentUser?.email ||
    "Shiprocket Sync";

  for (const [index, item] of normalizedOrder.items.entries()) {
    const metadata = {
      awb: normalizedOrder.awb,
      orderStatus: normalizedOrder.status,
      shiprocketStatus: normalizedOrder.status,
      syncedAt: new Date().toISOString(),
      syncSource: "shiprocket",
    };

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
          shiprocket_order_id,
          metadata
        )
        VALUES (
          $1, $2, $3, $4, 'dispatch', $5, $6, NULL, 0, 0, 0, $7,
          'shiprocket', $8, $9::jsonb
        )
        RETURNING id, product_id, quantity, entry_date, created_at, updated_at
      `,
      [
        submissionId,
        index + 1,
        normalizedOrder.entryDate,
        submittedBy,
        item.productId,
        item.quantity,
        `Shiprocket dispatch sync (${normalizedOrder.status})`,
        String(normalizedOrder.orderId),
        JSON.stringify(metadata),
      ]
    );

    await writeAuditLog(client, {
      action: "create",
      entityId: result.rows[0].id,
      entityType: "movement",
      metadata: {
        awb: normalizedOrder.awb,
        orderId: normalizedOrder.orderId,
        source: "shiprocket",
      },
      newData: {
        entryDate: normalizedOrder.entryDate,
        product: {
          id: item.productId,
          name: item.productName,
        },
        quantity: item.quantity,
        shiprocketOrderId: String(normalizedOrder.orderId),
        source: "shiprocket",
      },
      userId: currentUser?.id || null,
    });
  }

  return normalizedOrder.items.length;
}

async function createSyncLog(syncType, status, metadata = {}) {
  const result = await query(
    `
      INSERT INTO shiprocket_sync_log (
        sync_type,
        status,
        records_synced,
        last_synced_at,
        metadata
      )
      VALUES ($1::varchar, $2::varchar, 0, NULL, $3::jsonb)
      RETURNING *
    `,
    [syncType, status, JSON.stringify(metadata)]
  );

  return formatSyncLog(result.rows[0]);
}

async function updateSyncLog(logId, { errorMessage = null, metadata = {}, recordsSynced = 0, status }) {
  const result = await query(
    `
      UPDATE shiprocket_sync_log
      SET
        status = $2::varchar,
        records_synced = $3,
        last_synced_at = CASE
          WHEN $2::varchar IN ('success', 'partial') THEN NOW()
          ELSE last_synced_at
        END,
        error_message = $4,
        metadata = $5::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [logId, status, recordsSynced, errorMessage, JSON.stringify(metadata)]
  );

  return formatSyncLog(result.rows[0]);
}

async function getShiprocketStatus() {
  const latestResult = await query(
    `
      SELECT *
      FROM shiprocket_sync_log
      WHERE sync_type = 'dispatch'
      ORDER BY created_at DESC
      LIMIT 5
    `
  );

  const syncedCountResult = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM inventory_movements
      WHERE source = 'shiprocket'
        AND movement_type = 'dispatch'
    `
  );

  return {
    configured: isShiprocketConfigured(),
    defaults: {
      lookbackDays: shiprocketConfig.syncLookbackDays,
      maxPages: shiprocketConfig.maxPages,
      pageSize: shiprocketConfig.pageSize,
    },
    latestSync: formatSyncLog(latestResult.rows[0]),
    recentLogs: latestResult.rows.map(formatSyncLog),
    syncedDispatchCount: Number(syncedCountResult.rows[0]?.count || 0),
  };
}

async function listShiprocketDispatches({ limit = 50 } = {}) {
  const safeLimit = Math.min(Number(limit || 50), 200);
  const result = await query(
    `
      SELECT
        m.id,
        m.submission_id,
        m.entry_date,
        m.product_id,
        p.name::TEXT AS product_name,
        m.quantity,
        m.notes,
        m.source,
        m.shiprocket_order_id,
        m.metadata,
        m.created_at,
        m.updated_at
      FROM inventory_movements m
      JOIN products p ON p.id = m.product_id
      WHERE m.movement_type = 'dispatch'
        AND m.source = 'shiprocket'
      ORDER BY m.entry_date DESC, m.created_at DESC, m.submission_line_no DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map(formatShiprocketDispatchRow);
}

async function syncShiprocketDispatches(payload = {}, currentUser = null) {
  const fromDate = assertValidDateParam("fromDate", payload.fromDate);
  const toDate = assertValidDateParam("toDate", payload.toDate);
  const range = {
    ...defaultSyncRange(),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };
  const pageSize = Math.min(
    Number(payload.pageSize || shiprocketConfig.pageSize),
    shiprocketConfig.pageSize
  );
  const maxPages = Math.min(
    Number(payload.maxPages || shiprocketConfig.maxPages),
    shiprocketConfig.maxPages
  );

  const runningLog = await createSyncLog("dispatch", "running", {
    fromDate: range.fromDate,
    maxPages,
    pageSize,
    requestedBy: currentUser?.email || currentUser?.appUser?.displayName || "system",
    toDate: range.toDate,
  });

  try {
    const token = await authenticateShiprocket();
    const { orders, pagination, totalOrdersFetched } = await fetchShiprocketOrders(token, {
      fromDate: range.fromDate,
      maxPages,
      pageSize,
      toDate: range.toDate,
    });

    const summary = {
      createdOrders: 0,
      createdRows: 0,
      duplicateOrders: 0,
      pagesFetched: Math.min(maxPages, pagination.currentPage),
      processedOrders: 0,
      skippedOrders: 0,
      totalOrdersFetched,
      totalOrdersInRange: orders.length,
      unmappedProducts: [],
    };

    await withClient(async (client) => {
      const products = await getActiveProducts(client);
      const resolver = buildProductResolver(products);

      await client.query("BEGIN");

      try {
        for (const order of orders) {
          const normalizedOrder = normalizeOrderForDispatch(order, resolver);
          const orderId = String(normalizedOrder.orderId || "").trim();

          if (!orderId) {
            summary.skippedOrders += 1;
            continue;
          }

          summary.processedOrders += 1;

          if (!normalizedOrder.ready) {
            if (normalizedOrder.unmapped?.length) {
              summary.unmappedProducts.push({
                awb: normalizedOrder.awb || null,
                orderId,
                status: normalizedOrder.status || null,
                unmapped: normalizedOrder.unmapped,
              });
            } else {
              summary.skippedOrders += 1;
            }
            continue;
          }

          if (await shiprocketOrderExists(client, orderId)) {
            summary.duplicateOrders += 1;
            continue;
          }

          const createdRowCount = await createShiprocketDispatch(
            client,
            normalizedOrder,
            currentUser
          );

          summary.createdOrders += 1;
          summary.createdRows += createdRowCount;
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    const finalStatus =
      summary.unmappedProducts.length || summary.duplicateOrders || summary.skippedOrders
        ? "partial"
        : "success";

    const finalLog = await updateSyncLog(runningLog.id, {
      metadata: {
        ...summary,
        currentPage: pagination.currentPage,
        fromDate: range.fromDate,
        lastPage: pagination.lastPage,
        maxPages,
        pageSize,
        toDate: range.toDate,
      },
      recordsSynced: summary.createdRows,
      status: finalStatus,
    });

    return {
      log: finalLog,
      summary,
    };
  } catch (error) {
    const failedLog = await updateSyncLog(runningLog.id, {
      errorMessage: error.message,
      metadata: {
        fromDate: range.fromDate,
        maxPages,
        pageSize,
        toDate: range.toDate,
      },
      recordsSynced: 0,
      status: "failed",
    });

    throw Object.assign(error, { syncLog: failedLog });
  }
}

module.exports = {
  getShiprocketStatus,
  listShiprocketDispatches,
  syncShiprocketDispatches,
};
