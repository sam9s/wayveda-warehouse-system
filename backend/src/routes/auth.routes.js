const express = require("express");
const { asyncHandler } = require("../utils/async-handler");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/login", asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/change-password", requireAuth, asyncHandler(authController.changePassword));
router.post("/logout", requireAuth, asyncHandler(authController.logout));
router.post("/reset-password", asyncHandler(authController.resetPassword));

module.exports = router;
