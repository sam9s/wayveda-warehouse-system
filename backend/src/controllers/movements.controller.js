const movementsService = require("../services/movements.service");

async function createStockIn(req, res) {
  const result = await movementsService.createManualMovement(
    "stock_in",
    req.body || {},
    req.currentUser
  );
  res.status(201).json(result);
}

async function createDispatch(req, res) {
  const result = await movementsService.createManualMovement(
    "dispatch",
    req.body || {},
    req.currentUser
  );
  res.status(201).json(result);
}

async function createRto(req, res) {
  const result = await movementsService.createManualMovement(
    "rto",
    req.body || {},
    req.currentUser
  );
  res.status(201).json(result);
}

async function listMovements(req, res) {
  const movements = await movementsService.listMovements(req.query || {});
  res.status(200).json({ movements });
}

async function getMovement(req, res) {
  const movement = await movementsService.getMovementById(req.params.id);
  res.status(200).json({ movement });
}

module.exports = {
  createDispatch,
  createRto,
  createStockIn,
  getMovement,
  listMovements,
};
