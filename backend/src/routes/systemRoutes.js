import express from "express";
import protect, { authorize } from "../middleware/authMiddleware.js";
import {
  createAdminUser,
  createBadgeAward,
  getAdminOverview,
  getAuditEvents,
  getBadgeAwards,
  getMyBadges,
  getNotifications,
  getSystemConfig,
  getSystemExport,
  listUsers,
  markNotificationRead,
  resetUserAccount,
  seedDemoData,
  deleteBadgeAward,
  updateUserRole,
  updateSystemConfig,
} from "../controllers/systemController.js";

const router = express.Router();

router.get("/notifications", protect, getNotifications);
router.patch("/notifications/:id/read", protect, markNotificationRead);
router.get("/badges/me", protect, getMyBadges);
router.get("/audit", protect, getAuditEvents);
router.get("/admin-overview", protect, authorize("admin"), getAdminOverview);
router.get("/config", protect, authorize("admin"), getSystemConfig);
router.put("/config", protect, authorize("admin"), updateSystemConfig);
router.get("/exports/:type", protect, authorize("admin"), getSystemExport);
router.get("/users", protect, authorize("admin"), listUsers);
router.post("/users", protect, authorize("admin"), createAdminUser);
router.patch("/users/:id", protect, authorize("admin"), updateUserRole);
router.post("/users/:id/reset-account", protect, authorize("admin"), resetUserAccount);
router.get("/badges", protect, authorize("admin"), getBadgeAwards);
router.post("/badges", protect, authorize("admin"), createBadgeAward);
router.delete("/badges/:id", protect, authorize("admin"), deleteBadgeAward);
router.post("/seed-demo", protect, authorize("admin"), seedDemoData);

export default router;
