import express from "express";

import {
  getMe,
  registerUser,
  loginUser,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import { authRateLimit, passwordResetRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/register", authRateLimit, registerUser);
router.post("/login", authRateLimit, loginUser);
router.post("/forgot-password", passwordResetRateLimit, requestPasswordReset);
router.post("/verify-reset-code", passwordResetRateLimit, verifyPasswordResetCode);
router.post("/reset-password", passwordResetRateLimit, resetPassword);
router.get("/me", protect, getMe);

export default router;
