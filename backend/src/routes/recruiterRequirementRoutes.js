import express from "express";
import protect, { authorize } from "../middleware/authMiddleware.js";
import { createRequirement, getMyRequirements, getRequirementMatches } from "../controllers/recruiterRequirementController.js";

const router = express.Router();
router.use(protect, authorize("recruiter"));
router.post("/", createRequirement);
router.get("/", getMyRequirements);
router.get("/:id/matches", getRequirementMatches);
export default router;
