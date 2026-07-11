import express from "express";

import protect, { authorize } from "../middleware/authMiddleware.js";

import {
  createProject,
  getProjectAnalytics,
  getReviewerAnalytics,
  getUserProjects,
  getPublicProjects,
  getVerificationQueue,
  reviewProject,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/", protect, authorize("student"), createProject);

router.get("/my-projects", protect, getUserProjects);

router.get(
  "/queue",
  protect,
  authorize("reviewer", "admin"),
  getVerificationQueue
);

router.get(
  "/analytics",
  protect,
  authorize("recruiter", "mentor", "admin"),
  getProjectAnalytics
);
router.get(
  "/reviewer-analytics",
  protect,
  getReviewerAnalytics
);

router.patch("/:id/review", protect, authorize("reviewer"), reviewProject);

router.get("/", getPublicProjects);

export default router;
