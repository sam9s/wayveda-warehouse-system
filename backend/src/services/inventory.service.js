const { query } = require("../db/client");
const { badRequest } = require("../utils/http-error");

function buildDateFilters({
  dateColumn = "entry_date",
  endDate,
  productColumn = "product_id",
  productId,
  startDate,
}, values) {
  const conditions = [];

  if (productId) {
    values.push(productId);
    conditions.push(`${productColumn} = $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    conditions.push(`${dateColumn} >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`${dateColumn} <= $${values.length}`);
  }

  return conditions;
}

function normalizeAnalysisFilters(filters = {}, defaultGranularity = "daily") {
  return {
    endDate: filters.endDate || filters.to || null,
    granularity: filters.granularity || filters.period || defaultGranularity,
    productId: filters.productId || filters.product_id || null,
    startDate: filters.startDate || filters.from || null,
  };
}

const ROLLING_WINDOWS = [
  {
    key: "today",
    sqlCondition: (dateColumn) => `${dateColumn} = CURRENT_DATE`,
  },
  {
    key: "last7Days",
    sqlCondition: (dateColumn) =>
      `${dateColumn} >= CURRENT_DATE - INTERVAL '6 days' AND ${dateColumn} <= CURRENT_DATE`,
  },
  {
    key: "last30Days",
    sqlCondition: (dateColumn) =>
      `${dateColumn} >= CURRENT_DATE - INTERVAL '29 days' AND ${dateColumn} <= CURRENT_DATE`,
  },
];

function buildRollingWindowSelects(metrics, dateColumn = "entry_date") {
  return ROLLING_WINDOWS.flatMap((window) =>
    metrics.map(
      (metric) =>
        `COALESCE(SUM(${metric.expression}) FILTER (WHERE ${window.sqlCondition(dateColumn)}), 0)::int AS ${window.key}_${metric.key}`
    )
  ).join(",\n        ");
}

function mapRollingWindowSummary(row, metricKeys) {
  return ROLLING_WINDOWS.reduce((summary, window) => {
    summary[window.key] = metricKeys.reduce((windowMetrics, metricKey) => {
      windowMetrics[metricKey] = Number(row?.[`${window.key}_${metricKey}`] || 0);
      return windowMetrics;
    }, {});
    return summary;
  }, {});
}

function granularityConfig(granularity) {
  switch (granularity) {
    case "daily":
      return {
        groupBy: "entry_date",
        label: "TO_CHAR(entry_date, 'YYYY-MM-DD')",
        periodStart: "entry_date::date",
      };
    case "weekly":
      return {
        groupBy: "DATE_TRUNC('week', entry_date)",
        label: "TO_CHAR(DATE_TRUNC('week', entry_date), 'YYYY-MM-DD')",
        periodStart: "DATE_TRUNC('week', entry_date)::date",
      };
    case "monthly":
      return {
        groupBy: "DATE_TRUNC('month', entry_date)",
        label: "TO_CHAR(DATE_TRUNC('month', entry_date), 'YYYY-MM')",
        periodStart: "DATE_TRUNC('month', entry_date)::date",
      };
    default:
      throw badRequest("granularity must be one of: daily, weekly, monthly");
  }
}

async function getDashboardSummary() {
  const result = await query(
    `
      SELECT *
      FROM v_dashboard_summary
      ORDER BY display_order, product_name
    `
  );

  return result.rows;
}

async function getInventoryLedger() {
  const result = await query(
    `
      SELECT *
      FROM v_inventory_ledger
      ORDER BY display_order, product_name
    `
  );

  return result.rows;
}

async function getDispatchAnalysis(filters) {
  const normalizedFilters = normalizeAnalysisFilters(filters, "daily");
  const values = [];
  const granularity = granularityConfig(normalizedFilters.granularity);
  const conditions = buildDateFilters(normalizedFilters, values);
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        ${granularity.periodStart} AS period_start,
        ${granularity.label} AS period_label,
        product_id,
        product_name,
        SUM(qty_dispatched)::int AS quantity
      FROM v_dispatch_daily
      ${whereClause}
      GROUP BY ${granularity.groupBy}, product_id, product_name
      ORDER BY period_start DESC, product_name
    `,
    values
  );

  return result.rows;
}

async function getDispatchAnalysisSummary(filters) {
  const normalizedFilters = normalizeAnalysisFilters(filters, "daily");
  const values = [];
  const conditions = buildDateFilters(
    {
      productId: normalizedFilters.productId,
      startDate: null,
      endDate: null,
    },
    values
  );
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        ${buildRollingWindowSelects(
          [{ expression: "qty_dispatched", key: "quantity" }],
          "entry_date"
        )}
      FROM v_dispatch_daily
      ${whereClause}
    `,
    values
  );

  return mapRollingWindowSummary(result.rows[0], ["quantity"]);
}

async function getInwardAnalysis(filters) {
  const normalizedFilters = normalizeAnalysisFilters(filters, "daily");
  const values = [];
  const granularity = granularityConfig(normalizedFilters.granularity);
  const conditions = buildDateFilters(normalizedFilters, values);
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        ${granularity.periodStart} AS period_start,
        ${granularity.label} AS period_label,
        product_id,
        product_name,
        SUM(qty_received)::int AS quantity,
        SUM(COALESCE(cartons_received, 0))::int AS cartons
      FROM v_inward_daily
      ${whereClause}
      GROUP BY ${granularity.groupBy}, product_id, product_name
      ORDER BY period_start DESC, product_name
    `,
    values
  );

  return result.rows;
}

async function getInwardAnalysisSummary(filters) {
  const normalizedFilters = normalizeAnalysisFilters(filters, "daily");
  const values = [];
  const conditions = buildDateFilters(
    {
      productId: normalizedFilters.productId,
      startDate: null,
      endDate: null,
    },
    values
  );
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        ${buildRollingWindowSelects(
          [
            { expression: "qty_received", key: "quantity" },
            { expression: "COALESCE(cartons_received, 0)", key: "cartons" },
          ],
          "entry_date"
        )}
      FROM v_inward_daily
      ${whereClause}
    `,
    values
  );

  return mapRollingWindowSummary(result.rows[0], ["quantity", "cartons"]);
}

async function getRtoAnalysis(filters) {
  const normalizedFilters = normalizeAnalysisFilters(filters, "monthly");
  const values = [];
  const granularity = granularityConfig(normalizedFilters.granularity);
  const conditions = buildDateFilters(
    {
      ...normalizedFilters,
      dateColumn: "m.entry_date",
      productColumn: "m.product_id",
    },
    values
  );
  const whereClause = conditions.length
    ? `AND ${conditions.join(" AND ")}`
    : "";

  const result = await query(
    `
      SELECT
        ${granularity.periodStart} AS period_start,
        ${granularity.label} AS period_label,
        m.product_id,
        p.name::TEXT AS product_name,
        SUM(m.rto_right)::int AS total_right,
        SUM(m.rto_wrong)::int AS total_wrong,
        SUM(m.rto_fake)::int AS total_fake,
        SUM(m.rto_right + m.rto_wrong + m.rto_fake)::int AS total_rto
      FROM inventory_movements m
      JOIN products p ON p.id = m.product_id
      WHERE m.movement_type = 'rto'
      ${whereClause}
      GROUP BY ${granularity.groupBy}, m.product_id, p.name
      ORDER BY period_start DESC, product_name
    `,
    values
  );

  return result.rows;
}

async function getRtoAnalysisSummary(filters) {
  const normalizedFilters = normalizeAnalysisFilters(filters, "monthly");
  const values = [];
  const conditions = buildDateFilters(
    {
      ...normalizedFilters,
      endDate: null,
      startDate: null,
      dateColumn: "m.entry_date",
      productColumn: "m.product_id",
    },
    values
  );
  const whereClause = conditions.length
    ? `AND ${conditions.join(" AND ")}`
    : "";

  const result = await query(
    `
      SELECT
        ${buildRollingWindowSelects(
          [
            { expression: "m.rto_right + m.rto_wrong + m.rto_fake", key: "totalRto" },
            { expression: "m.rto_right", key: "right" },
            { expression: "m.rto_wrong", key: "wrong" },
            { expression: "m.rto_fake", key: "fake" },
          ],
          "m.entry_date"
        )}
      FROM inventory_movements m
      WHERE m.movement_type = 'rto'
      ${whereClause}
    `,
    values
  );

  return mapRollingWindowSummary(result.rows[0], ["totalRto", "right", "wrong", "fake"]);
}

module.exports = {
  getDashboardSummary,
  getDispatchAnalysis,
  getDispatchAnalysisSummary,
  getInventoryLedger,
  getInwardAnalysis,
  getInwardAnalysisSummary,
  getRtoAnalysis,
  getRtoAnalysisSummary,
};
