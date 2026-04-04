const { query } = require("../db/client");
const { badRequest } = require("../utils/http-error");

function buildDateFilters({
  dateColumn = "entry_date",
  endDate,
  productId,
  startDate,
}, values) {
  const conditions = [];

  if (productId) {
    values.push(productId);
    conditions.push(`product_id = $${values.length}`);
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
  const values = [];
  const granularity = granularityConfig(filters.granularity || "daily");
  const conditions = buildDateFilters(filters, values);
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

async function getInwardAnalysis(filters) {
  const values = [];
  const granularity = granularityConfig(filters.granularity || "daily");
  const conditions = buildDateFilters(filters, values);
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

async function getRtoAnalysis(filters) {
  const values = [];
  const conditions = buildDateFilters(
    {
      ...filters,
      dateColumn: "month_start",
    },
    values
  );
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT
        month_start AS period_start,
        month AS period_label,
        product_id,
        product_name,
        total_right,
        total_wrong,
        total_fake,
        total_rto
      FROM v_rto_monthly
      ${whereClause}
      ORDER BY period_start DESC, product_name
    `,
    values
  );

  return result.rows;
}

module.exports = {
  getDashboardSummary,
  getDispatchAnalysis,
  getInventoryLedger,
  getInwardAnalysis,
  getRtoAnalysis,
};
