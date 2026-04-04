const express = require("express");
const movementsController = require("../controllers/movements.controller");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.post("/stock-in", authorize("admin", "operator"), asyncHandler(movementsController.createStockIn));
router.post("/dispatch", authorize("admin", "operator"), asyncHandler(movementsController.createDispatch));
router.post("/rto", authorize("admin", "operator"), asyncHandler(movementsController.createRto));
router.get("/", asyncHandler(movementsController.listMovements));
router.get("/:id", asyncHandler(movementsController.getMovement));

module.exports = router;
