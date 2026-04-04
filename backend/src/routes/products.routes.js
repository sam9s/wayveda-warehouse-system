const express = require("express");
const productsController = require("../controllers/products.controller");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.get("/", asyncHandler(productsController.listProducts));
router.get("/:id", asyncHandler(productsController.getProduct));
router.post("/", authorize("admin"), asyncHandler(productsController.createProduct));
router.put("/:id", authorize("admin"), asyncHandler(productsController.updateProduct));
router.delete("/:id", authorize("admin"), asyncHandler(productsController.deleteProduct));

module.exports = router;
