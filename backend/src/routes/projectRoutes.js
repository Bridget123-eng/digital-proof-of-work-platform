import express from "express";

import protect from "../middleware/authMiddleware.js";

import {
  createProject,
  getUserProjects,
  getPublicProjects,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/", protect, createProject);

router.get("/my-projects", protect, getUserProjects);

router.get("/", getPublicProjects);

export default router;