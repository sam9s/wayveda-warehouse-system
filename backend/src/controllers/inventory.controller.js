const inventoryService = require("../services/inventory.service");

async function health(req, res) {
  const { query } = require("../db/client");
  const dbResult = await query("SELECT NOW() AS now");

  res.status(200).json({
    database: "ok",
    now: dbResult.rows[0].now,
    status: "ok",
  });
}

async function dashboard(req, res) {
  const summary = await inventoryService.getDashboardSummary();
  res.status(200).json({ summary });
}

async function ledger(req, res) {
  const ledgerRows = await inventoryService.getInventoryLedger();
  res.status(200).json({ ledger: ledgerRows });
}

async function dispatchAnalysis(req, res) {
  const rows = await inventoryService.getDispatchAnalysis(req.query || {});
  res.status(200).json({ rows });
}

async function rtoAnalysis(req, res) {
  const rows = await inventoryService.getRtoAnalysis(req.query || {});
  res.status(200).json({ rows });
}

async function inwardAnalysis(req, res) {
  const rows = await inventoryService.getInwardAnalysis(req.query || {});
  res.status(200).json({ rows });
}

module.exports = {
  dashboard,
  dispatchAnalysis,
  health,
  inwardAnalysis,
  ledger,
  rtoAnalysis,
};
