import express from "express";
import protect, { authorize } from "../middleware/authMiddleware.js";
import {
  getAuditEvents,
  getMyBadges,
  getNotifications,
  listUsers,
  markNotificationRead,
  seedDemoData,
  updateUserRole,
} from "../controllers/systemController.js";

const router = express.Router();

router.get("/notifications", protect, getNotifications);
router.patch("/notifications/:id/read", protect, markNotificationRead);
router.get("/badges/me", protect, getMyBadges);
router.get("/audit", protect, getAuditEvents);
router.get("/users", protect, authorize("admin"), listUsers);
router.patch("/users/:id", protect, authorize("admin"), updateUserRole);
router.post("/seed-demo", protect, authorize("admin"), seedDemoData);

export default router;
