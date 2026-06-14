import bcrypt from "bcryptjs";
import AuditEvent from "../models/AuditEvent.js";
import Badge from "../models/Badge.js";
import Notification from "../models/Notification.js";
import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import { analyzeProject } from "../utils/analyzeProject.js";
import { createAuditEvent } from "../utils/audit.js";

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

export const updateUserRole = async (req, res) => {
  try {
    const { role, status } = req.body;
    const updates = {};

    if (role) updates.role = role;
    if (status) updates.status = status;

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
      metadata: updates,
    });

    res.status(200).json(user);
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
