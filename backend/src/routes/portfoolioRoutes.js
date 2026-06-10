import express from "express";

import protect from "../middleware/authMiddleware.js";

import {
  createPortfolio,
  getMyPortfolio,
  updatePortfolio,
  getPublicPortfolio,
} from "../controllers/portfolioController.js";

const router = express.Router();


// CREATE PORTFOLIO
router.post("/", protect, createPortfolio);


// GET LOGGED-IN USER PORTFOLIO
router.get("/me", protect, getMyPortfolio);


// UPDATE PORTFOLIO
router.put("/", protect, updatePortfolio);


// GET PUBLIC PORTFOLIO
router.get("/:id", getPublicPortfolio);

export default router;