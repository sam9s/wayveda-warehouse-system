const express = require("express");
const shiprocketController = require("../controllers/shiprocket.controller");
const { authorize } = require("../middleware/authorize");
const { asyncHandler } = require("../utils/async-handler");

const router = express.Router();

router.get(
  "/status",
  authorize("operator", "admin"),
  asyncHandler(shiprocketController.status)
);
router.get(
  "/dispatches",
  authorize("operator", "admin"),
  asyncHandler(shiprocketController.listDispatches)
);
router.post(
  "/sync",
  authorize("admin"),
  asyncHandler(shiprocketController.syncDispatches)
);

module.exports = router;
