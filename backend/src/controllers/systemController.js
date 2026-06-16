import bcrypt from "bcryptjs";
import AuditEvent from "../models/AuditEvent.js";
import Badge from "../models/Badge.js";
import Notification from "../models/Notification.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import SystemConfig from "../models/SystemConfig.js";
import User from "../models/User.js";
import { analyzeProject } from "../utils/analyzeProject.js";
import { createAuditEvent } from "../utils/audit.js";

const allowedRoles = new Set(["student", "verifier", "reviewer", "recruiter", "admin", "administrator"]);
const allowedStatuses = new Set(["active", "suspended"]);
const criticalAuditActions = new Set([
  "user.login",
  "user.admin_updated",
  "user.admin_created",
  "user.account_reset",
  "project.reviewed",
  "badge.created",
  "badge.deleted",
  "config.updated",
  "data.exported",
  "demo.seeded",
  "notification.read",
]);
const defaultSystemConfig = {
  badgeRules: ["Verified Proof of Work", "Top Contributor", "AI Developer", "Research Scholar"],
  verificationCriteria: [
    "Repository and description consistency",
    "Evidence link validity",
    "Reviewer decision with audit record",
  ],
  aiSettings: {
    mode: "deterministic fallback",
    humanReviewRequired: true,
  },
  notificationTemplates: ["status", "review", "system"],
};

const normalizeRole = (role = "student") => (role === "administrator" ? "admin" : role);
const cleanEmail = (email) => String(email || "").trim().toLowerCase();
const trimText = (value, maxLength = 500) => String(value || "").trim().slice(0, maxLength);
const buildTempPassword = () => `Reset${Math.random().toString(36).slice(2, 8)}!42`;
const normalizeStringList = (value, maxItems = 20, maxLength = 120) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split("\n")
        .map((item) => item.trim());

  return [...new Set(source.filter(Boolean).map((item) => item.slice(0, maxLength)))].slice(0, maxItems);
};
const normalizeConfigPayload = (payload = {}) => ({
  badgeRules: normalizeStringList(payload.badgeRules ?? defaultSystemConfig.badgeRules, 20, 120),
  verificationCriteria: normalizeStringList(payload.verificationCriteria ?? defaultSystemConfig.verificationCriteria, 20, 160),
  aiSettings: {
    mode: trimText(payload.aiSettings?.mode || defaultSystemConfig.aiSettings.mode, 120),
    humanReviewRequired: payload.aiSettings?.humanReviewRequired !== false,
  },
  notificationTemplates: normalizeStringList(payload.notificationTemplates ?? defaultSystemConfig.notificationTemplates, 20, 80),
});
const serializeConfig = (config) => ({
  badgeRules: config.badgeRules || [],
  verificationCriteria: config.verificationCriteria || [],
  aiSettings: {
    mode: config.aiSettings?.mode || defaultSystemConfig.aiSettings.mode,
    humanReviewRequired: config.aiSettings?.humanReviewRequired !== false,
  },
  notificationTemplates: config.notificationTemplates || [],
  updatedAt: config.updatedAt,
});
const getOrCreateSystemConfig = async () =>
  SystemConfig.findOneAndUpdate(
    { key: "platform" },
    { $setOnInsert: { key: "platform", ...normalizeConfigPayload(defaultSystemConfig) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await createAuditEvent({
      actor: req.user._id,
      action: "notification.read",
      entityType: "Notification",
      entityId: notification._id,
      metadata: { owner: String(req.user._id) },
    });

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ user: req.user._id })
      .populate("project", "title")
      .sort({ createdAt: -1 });

    res.status(200).json(badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditEvents = async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? {}
        : {
            $or: [{ actor: req.user._id }, { "metadata.owner": String(req.user._id) }],
          };

    const events = await AuditEvent.find(query)
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { name, email, role = "student", password } = req.body;
    const normalizedEmail = cleanEmail(email);
    const normalizedRole = normalizeRole(role);
    const nextPassword = trimText(password, 120) || buildTempPassword();

    if (!trimText(name, 120) || !normalizedEmail) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (!allowedRoles.has(role) && !allowedRoles.has(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (nextPassword.length < 8) {
      return res.status(400).json({ message: "Temporary password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "A user with that email already exists" });
    }

    const hashedPassword = await bcrypt.hash(nextPassword, 10);

    const user = await User.create({
      name: trimText(name, 120),
      email: normalizedEmail,
      username: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      status: "active",
    });

    await createAuditEvent({
      actor: req.user._id,
      action: "user.admin_created",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id), role: normalizedRole, email: normalizedEmail },
    });

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      temporaryPassword: nextPassword,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role, status } = req.body;
    const updates = {};

    if (role) {
      if (!allowedRoles.has(role)) {
        return res.status(400).json({ message: "Invalid role selected" });
      }

      updates.role = role === "administrator" ? "admin" : role;
    }

    if (status) {
      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ message: "Invalid account status" });
      }

      updates.status = status;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    if (String(req.user._id) === String(req.params.id) && updates.status === "suspended") {
      return res.status(400).json({ message: "Administrators cannot suspend their own account" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await createAuditEvent({
      actor: req.user._id,
      action: "user.admin_updated",
      entityType: "User",
      entityId: user._id,
      metadata: { ...updates, owner: String(user._id) },
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const temporaryPassword = buildTempPassword();
    user.password = await bcrypt.hash(temporaryPassword, 10);
    user.status = "active";
    user.username = user.username || user.email;
    await user.save();

    await createAuditEvent({
      actor: req.user._id,
      action: "user.account_reset",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id), status: user.status },
    });

    res.status(200).json({
      message: "Account reset successfully",
      temporaryPassword,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBadgeAwards = async (req, res) => {
  try {
    const badges = await Badge.find()
      .populate("user", "name email role")
      .populate("project", "title")
      .populate("awardedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBadgeAward = async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);

    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    await Badge.findByIdAndDelete(badge._id);

    await createAuditEvent({
      actor: req.user._id,
      action: "badge.deleted",
      entityType: "Badge",
      entityId: badge._id,
      metadata: { owner: String(badge.user), name: badge.name },
    });

    res.status(200).json({ message: "Badge removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBadgeAward = async (req, res) => {
  try {
    const { userId, name, description = "", level = "bronze" } = req.body;

    if (!userId || !trimText(name, 120)) {
      return res.status(400).json({ message: "Target user and badge name are required" });
    }

    if (!["bronze", "silver", "gold"].includes(level)) {
      return res.status(400).json({ message: "Invalid badge level" });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const badge = await Badge.create({
      user: targetUser._id,
      name: trimText(name, 120),
      description: trimText(description, 300),
      level,
      awardedBy: req.user._id,
    });

    await Notification.create({
      user: targetUser._id,
      title: "New badge awarded",
      message: `You received the "${badge.name}" badge.`,
      type: "status",
    });

    await createAuditEvent({
      actor: req.user._id,
      action: "badge.created",
      entityType: "Badge",
      entityId: badge._id,
      metadata: { owner: String(targetUser._id), level: badge.level, name: badge.name },
    });

    const populatedBadge = await badge.populate("user", "name email role");

    res.status(201).json(populatedBadge);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A badge with that name already exists for this project scope" });
    }

    res.status(500).json({ message: error.message });
  }
};

export const getSystemConfig = async (req, res) => {
  try {
    const config = await getOrCreateSystemConfig();
    res.status(200).json(serializeConfig(config));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSystemConfig = async (req, res) => {
  try {
    const normalizedConfig = normalizeConfigPayload(req.body);
    const config = await SystemConfig.findOneAndUpdate(
      { key: "platform" },
      normalizedConfig,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await createAuditEvent({
      actor: req.user._id,
      action: "config.updated",
      entityType: "SystemConfig",
      entityId: config._id,
      metadata: { owner: "platform" },
    });

    res.status(200).json(serializeConfig(config));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminOverviewPayload = async () => {
  const [
    totalUsers,
    totalProjects,
    pendingVerifications,
    rejectedSubmissions,
    verifiedProjects,
    activeRecruiters,
    totalRecruiters,
    usersByRole,
    suspendedUsers,
    recentAuditEvents,
    recentBadges,
    recentNotifications,
    pendingQueue,
    verifiedProjectsWithDates,
    config,
    portfolioCount,
    badgeCount,
    notificationCount,
  ] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Project.countDocuments({ verificationStatus: "pending" }),
    Project.countDocuments({ verificationStatus: "rejected" }),
    Project.countDocuments({ verificationStatus: "verified" }),
    User.countDocuments({ role: "recruiter", status: "active" }),
    User.countDocuments({ role: "recruiter" }),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.countDocuments({ status: "suspended" }),
    AuditEvent.find()
      .populate("actor", "name email role")
      .sort({ createdAt: -1 })
      .limit(60)
      .lean(),
    Badge.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    Notification.find().sort({ createdAt: -1 }).limit(12).lean(),
    Project.find({ verificationStatus: "pending" })
      .populate("user", "name email")
      .sort({ createdAt: 1 })
      .limit(20)
      .lean(),
    Project.find({
      verificationStatus: "verified",
      reviewedAt: { $exists: true },
    })
      .select("createdAt reviewedAt")
      .lean(),
    getOrCreateSystemConfig(),
    Portfolio.countDocuments(),
    Badge.countDocuments(),
    Notification.countDocuments(),
  ]);

  const approvalRate = totalProjects ? Math.round((verifiedProjects / totalProjects) * 100) : 0;
  const turnaroundHours = verifiedProjectsWithDates
    .map((project) => {
      const createdAt = new Date(project.createdAt).getTime();
      const reviewedAt = new Date(project.reviewedAt).getTime();
      return reviewedAt > createdAt ? (reviewedAt - createdAt) / (1000 * 60 * 60) : null;
    })
    .filter((value) => value !== null);
  const averageTurnaroundHours = turnaroundHours.length
    ? Number((turnaroundHours.reduce((sum, value) => sum + value, 0) / turnaroundHours.length).toFixed(1))
    : 0;

  const verificationBottlenecks = pendingQueue
    .filter((project) => Date.now() - new Date(project.createdAt).getTime() > 1000 * 60 * 60 * 24)
    .map((project) => ({
      _id: project._id,
      title: project.title,
      owner: project.user?.name || "Unknown",
      waitingHours: Math.round((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60)),
    }));

  const criticalActivities = recentAuditEvents
    .filter((event) => criticalAuditActions.has(event.action))
    .slice(0, 20);

  return {
    metrics: {
      totalUsers,
      totalProjects,
      pendingVerifications,
      rejectedSubmissions,
      approvalRate,
      averageTurnaroundHours,
      activeRecruiters,
      totalRecruiters,
      suspendedUsers,
    },
    userBreakdown: usersByRole.map((entry) => ({
      role: normalizeRole(entry._id),
      count: entry.count,
    })),
    verificationManagement: {
      pendingVerifications,
      rejectedSubmissions,
      reviewBottlenecks: verificationBottlenecks,
      queueSample: pendingQueue.slice(0, 8),
    },
    badges: recentBadges,
    auditTrail: criticalActivities,
    monitoring: {
      api: "ok",
      database: "connected",
      aiService: "deterministic analyzer active",
      storageUsage: {
        projects: totalProjects,
        portfolios: portfolioCount,
        badges: badgeCount,
        notifications: notificationCount,
      },
      backgroundJobs: "inline processing",
    },
    configuration: serializeConfig(config),
    recentNotifications,
  };
};

export const getAdminOverview = async (req, res) => {
  try {
    const overview = await getAdminOverviewPayload();
    res.status(200).json(overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSystemExport = async (req, res) => {
  try {
    const { type } = req.params;
    let payload;

    if (type === "users") {
      payload = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    } else if (type === "audit") {
      payload = await AuditEvent.find()
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    } else if (type === "analytics") {
      payload = await getAdminOverviewPayload();
    } else {
      return res.status(400).json({ message: "Unsupported export type" });
    }

    await createAuditEvent({
      actor: req.user._id,
      action: "data.exported",
      entityType: "SystemExport",
      metadata: { owner: "platform", type },
    });

    res.status(200).json({
      type,
      exportedAt: new Date().toISOString(),
      payload,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const seedDemoData = async (req, res) => {
  try {
    const password = await bcrypt.hash("Password123!", 10);
    const demoUsers = [
      { name: "Asha Student", email: "student@dpow.demo", role: "student" },
      { name: "Vikram Verifier", email: "verifier@dpow.demo", role: "verifier" },
      { name: "Riya Recruiter", email: "recruiter@dpow.demo", role: "recruiter" },
      { name: "Admin User", email: "admin@dpow.demo", role: "admin" },
    ];

    const users = {};

    for (const demoUser of demoUsers) {
      users[demoUser.role] = await User.findOneAndUpdate(
        { email: demoUser.email },
        { ...demoUser, password },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const analysis = analyzeProject({
      title: "Campus Placement Analytics",
      description:
        "A full stack dashboard that tracks placement readiness, student skills, interview rounds, recruiter feedback, and verified outcomes for a college training cell.",
      skills: ["React", "Node.js", "MongoDB", "Analytics"],
      githubLink: "https://github.com/demo/campus-placement-analytics",
      liveLink: "https://demo.example.com",
    });

    const project = await Project.findOneAndUpdate(
      { user: users.student._id, title: "Campus Placement Analytics" },
      {
        user: users.student._id,
        title: "Campus Placement Analytics",
        description:
          "A full stack dashboard that tracks placement readiness, student skills, interview rounds, recruiter feedback, and verified outcomes for a college training cell.",
        skills: ["React", "Node.js", "MongoDB", "Analytics"],
        githubLink: "https://github.com/demo/campus-placement-analytics",
        liveLink: "https://demo.example.com",
        visibility: "public",
        evidenceType: "repository",
        verificationStatus: "verified",
        reviewedBy: users.verifier._id,
        reviewedAt: new Date(),
        reviewNote: "Repository, live demo, and description are consistent.",
        analysis,
      },
      { upsert: true, new: true }
    );

    await Portfolio.findOneAndUpdate(
      { studentId: users.student._id },
      {
        studentId: users.student._id,
        bio: "Full-stack student focused on employability tools and practical analytics.",
        skills: ["React", "Node.js", "MongoDB", "Analytics"],
        githubLink: "https://github.com/demo-student",
        projects: [project._id],
      },
      { upsert: true, new: true }
    );

    await Badge.findOneAndUpdate(
      { user: users.student._id, project: project._id, name: "Verified Proof of Work" },
      {
        user: users.student._id,
        project: project._id,
        name: "Verified Proof of Work",
        description: "Demo badge awarded for verified repository evidence.",
        level: "gold",
        awardedBy: users.verifier._id,
      },
      { upsert: true, new: true }
    );

    await Notification.create({
      user: users.student._id,
      title: "Demo data ready",
      message: "Your verified proof-of-work demo profile is ready to present.",
      type: "system",
    });

    await createAuditEvent({
      actor: req.user._id,
      action: "demo.seeded",
      entityType: "Project",
      entityId: project._id,
    });

    res.status(200).json({
      message: "Demo data seeded",
      credentials: demoUsers.map(({ email, role }) => ({
        email,
        role,
        password: "Password123!",
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
