import express from "express";

import protect, { authorize } from "../middleware/authMiddleware.js";

import {
  createProject,
  getProjectAnalytics,
  getUserProjects,
  getPublicProjects,
  getVerificationQueue,
  reviewProject,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/", protect, authorize("student", "admin"), createProject);

router.get("/my-projects", protect, getUserProjects);

router.get(
  "/queue",
  protect,
  authorize("verifier", "reviewer", "admin"),
  getVerificationQueue
);

router.get(
  "/analytics",
  protect,
  authorize("recruiter", "admin"),
  getProjectAnalytics
);

router.patch(
  "/:id/review",
  protect,
  authorize("verifier", "reviewer", "admin"),
  reviewProject
);

router.get("/", getPublicProjects);

export default router;
