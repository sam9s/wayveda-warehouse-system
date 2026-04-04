const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.get("/dashboard", asyncHandler(inventoryController.dashboard));
router.get("/ledger", asyncHandler(inventoryController.ledger));
router.get("/dispatch-analysis", asyncHandler(inventoryController.dispatchAnalysis));
router.get("/rto-analysis", asyncHandler(inventoryController.rtoAnalysis));
router.get("/inward-analysis", asyncHandler(inventoryController.inwardAnalysis));

module.exports = router;
