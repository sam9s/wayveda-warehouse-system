const express = require("express");
const authRoutes = require("./auth.routes");
const productsRoutes = require("./products.routes");
const movementsRoutes = require("./movements.routes");
const inventoryRoutes = require("./inventory.routes");
const adminRoutes = require("./admin.routes");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/async-handler");
const inventoryController = require("../controllers/inventory.controller");

const router = express.Router();

router.get("/health", asyncHandler(inventoryController.health));
router.use("/auth", authRoutes);

router.use(requireAuth);
router.use("/products", productsRoutes);
router.use("/movements", movementsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
