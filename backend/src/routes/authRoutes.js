import express from "express";

import {
  getMe,
  registerUser,
  loginUser,
  resetPassword,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);

export default router;
