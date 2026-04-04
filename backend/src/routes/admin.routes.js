const express = require("express");
const adminController = require("../controllers/admin.controller");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.get("/users", authorize("admin"), asyncHandler(adminController.listUsers));
router.post("/users", authorize("admin"), asyncHandler(adminController.createUser));
router.get("/audit-log", authorize("admin"), asyncHandler(adminController.listAuditLog));

module.exports = router;
