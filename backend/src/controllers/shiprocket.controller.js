const shiprocketService = require("../services/shiprocket.service");

async function status(req, res) {
  const state = await shiprocketService.getShiprocketStatus();
  res.status(200).json(state);
}

async function listDispatches(req, res) {
  const rows = await shiprocketService.listShiprocketDispatches(req.query || {});
  res.status(200).json({ rows });
}

async function syncDispatches(req, res) {
  const result = await shiprocketService.syncShiprocketDispatches(
    req.body || {},
    req.currentUser
  );
  res.status(200).json(result);
}

module.exports = {
  listDispatches,
  status,
  syncDispatches,
};
