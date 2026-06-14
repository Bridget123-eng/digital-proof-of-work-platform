import Project from "../models/Project.js";
import Portfolio from "../models/Portfolio.js";
import Notification from "../models/Notification.js";
import Badge from "../models/Badge.js";
import { analyzeProject } from "../utils/analyzeProject.js";
import { createAuditEvent } from "../utils/audit.js";


// CREATE PROJECT
export const createProject = async (req, res) => {
  try {

    const {
      title,
      description,
      skills,
      githubLink,
      liveLink,
      evidenceType,
      visibility,
      proofFiles,
      certificates,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Project title and description are required",
      });
    }

    const skillList = Array.isArray(skills)
      ? skills
      : String(skills || "")
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);

    const analysis = analyzeProject({
      title,
      description,
      skills: skillList,
      githubLink,
      liveLink,
    });

    const proofFileList = Array.isArray(proofFiles)
      ? proofFiles.filter(Boolean)
      : String(proofFiles || "")
          .split(",")
          .map((file) => file.trim())
          .filter(Boolean);

    const certificateList = Array.isArray(certificates)
      ? certificates.filter((certificate) => certificate?.title || certificate?.fileUrl)
      : [];

    const project = await Project.create({
      user: req.user._id,
      title,
      description,
      skills: skillList,
      githubLink,
      liveLink,
      evidenceType,
      visibility,
      proofFiles: proofFileList,
      certificates: certificateList,
      analysis,
    });

    await Portfolio.findOneAndUpdate(
      { studentId: req.user._id },
      {
        $setOnInsert: { studentId: req.user._id },
        $addToSet: {
          projects: project._id,
          skills: { $each: skillList },
          certificates: { $each: certificateList },
        },
      },
      { upsert: true, new: true }
    );

    await createAuditEvent({
      actor: req.user._id,
      action: "project.submitted",
      entityType: "Project",
      entityId: project._id,
      metadata: { score: analysis.score },
    });

    res.status(201).json(project);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET USER PROJECTS
export const getUserProjects = async (req, res) => {
  try {

    const projects = await Project.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(projects);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET PUBLIC PROFILE PROJECTS
export const getPublicProjects = async (req, res) => {
  try {

    const projects = await Project.find({
      visibility: "public",
      verificationStatus: "verified",
    })
      .populate("user", "name email");

    res.status(200).json(projects);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getVerificationQueue = async (req, res) => {
  try {
    const { status = "pending", q = "" } = req.query;
    const query = {};

    if (status !== "all") query.verificationStatus = status;
    if (q) query.$text = { $search: q };

    const projects = await Project.find(query)
      .populate("user", "name email")
      .populate("reviewedBy", "name email")
      .lean()
      .sort({ createdAt: 1 });

    const portfolios = await Portfolio.find({
      studentId: { $in: projects.map((project) => project.user?._id).filter(Boolean) },
    })
      .populate("studentId", "name email profileImage")
      .lean();

    const portfolioMap = new Map(
      portfolios.map((portfolio) => [String(portfolio.studentId?._id), portfolio])
    );

    res.status(200).json(
      projects.map((project) => ({
        ...project,
        studentPortfolio: portfolioMap.get(String(project.user?._id)) || null,
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const reviewProject = async (req, res) => {
  try {
    const { status, note = "" } = req.body;
    const allowedStatuses = ["in_review", "verified", "rejected", "changes_requested"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid review status",
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    project.verificationStatus = status;
    project.reviewNote = note;
    project.reviewedBy = req.user._id;
    project.reviewedAt = new Date();
    await project.save();

    await Notification.create({
      user: project.user,
      title: "Evidence review updated",
      message: `Your project "${project.title}" is now ${status.replace("_", " ")}.`,
      type: "review",
    });

    if (status === "verified") {
      await Badge.findOneAndUpdate(
        { user: project.user, project: project._id, name: "Verified Proof of Work" },
        {
          user: project.user,
          project: project._id,
          name: "Verified Proof of Work",
          description: "Awarded after a human verifier approved the submitted evidence.",
          level: project.analysis?.score >= 85 ? "gold" : "silver",
          awardedBy: req.user._id,
        },
        { upsert: true, new: true }
      );
    }

    await createAuditEvent({
      actor: req.user._id,
      action: "project.reviewed",
      entityType: "Project",
      entityId: project._id,
      metadata: { status, note },
    });

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getProjectAnalytics = async (req, res) => {
  try {
    const [total, pending, verified, rejected, inReview] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ verificationStatus: "pending" }),
      Project.countDocuments({ verificationStatus: "verified" }),
      Project.countDocuments({ verificationStatus: "rejected" }),
      Project.countDocuments({ verificationStatus: "in_review" }),
    ]);

    const recent = await Project.find()
      .populate("user", "name email")
      .sort({ updatedAt: -1 })
      .limit(8);

    res.status(200).json({
      total,
      pending,
      verified,
      rejected,
      inReview,
      verificationRate: total ? Math.round((verified / total) * 100) : 0,
      recent,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
