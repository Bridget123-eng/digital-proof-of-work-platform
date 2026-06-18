import Project from "../models/Project.js";
import Portfolio from "../models/Portfolio.js";
import Notification from "../models/Notification.js";
import Badge from "../models/Badge.js";
import { analyzeProject } from "../utils/analyzeProject.js";
import { createAuditEvent } from "../utils/audit.js";

const allowedEvidenceTypes = new Set(["repository", "certificate", "live_demo", "case_study"]);
const allowedVisibility = new Set(["private", "public"]);

const normalizeText = (value, maxLength = 5000) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const normalizeStringList = (value, maxItems = 20) => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim());

  return [...new Set(source.filter(Boolean).map((item) => item.slice(0, 120)))].slice(0, maxItems);
};

const normalizeCertificates = (certificates) =>
  (Array.isArray(certificates) ? certificates : [])
    .map((certificate) => ({
      title: normalizeText(certificate?.title, 120),
      fileUrl: normalizeText(certificate?.fileUrl, 500),
      issuedBy: normalizeText(certificate?.issuedBy, 120),
      issuedDate: certificate?.issuedDate || undefined,
    }))
    .filter((certificate) => certificate.title || certificate.fileUrl)
    .slice(0, 10);

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

    const normalizedTitle = normalizeText(title, 160);
    const normalizedDescription = normalizeText(description, 4000);

    if (!normalizedTitle || !normalizedDescription) {
      return res.status(400).json({
        message: "Project title and description are required",
      });
    }

    const normalizedEvidenceType = allowedEvidenceTypes.has(evidenceType)
      ? evidenceType
      : "repository";

    const normalizedVisibility = allowedVisibility.has(visibility)
      ? visibility
      : "public";

    const skillList = normalizeStringList(skills);

    const analysis = analyzeProject({
      title: normalizedTitle,
      description: normalizedDescription,
      skills: skillList,
      githubLink: normalizeText(githubLink, 500),
      liveLink: normalizeText(liveLink, 500),
    });

    const proofFileList = normalizeStringList(proofFiles, 10).map((file) => file.slice(0, 500));
    const certificateList = normalizeCertificates(certificates);

    const project = await Project.create({
      user: req.user._id,
      title: normalizedTitle,
      description: normalizedDescription,
      skills: skillList,
      githubLink: normalizeText(githubLink, 500),
      liveLink: normalizeText(liveLink, 500),
      evidenceType: normalizedEvidenceType,
      visibility: normalizedVisibility,
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
    const normalizedNote = normalizeText(note, 1000);

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
    project.reviewNote = normalizedNote;
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
      metadata: { status, note: normalizedNote, owner: String(project.user) },
    });

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getReviewerAnalytics = async (req, res) => {
  try {
    const reviewerFilter = req.user.role === "admin" ? {} : { reviewedBy: req.user._id };
    const completedFilter = {
      ...reviewerFilter,
      reviewedAt: { $exists: true },
    };

    const [reviewsCompleted, pendingReviews, approvedReviews, reviewedProjects] = await Promise.all([
      Project.countDocuments(completedFilter),
      Project.countDocuments({ verificationStatus: "pending" }),
      Project.countDocuments({ ...completedFilter, verificationStatus: "verified" }),
      Project.find(completedFilter).select("createdAt reviewedAt verificationStatus").lean(),
    ]);

    const reviewDurations = reviewedProjects
      .map((project) => {
        const createdAt = new Date(project.createdAt).getTime();
        const reviewedAt = new Date(project.reviewedAt).getTime();
        return reviewedAt > createdAt ? (reviewedAt - createdAt) / (1000 * 60 * 60) : null;
      })
      .filter((duration) => duration !== null);

    const averageReviewTimeHours = reviewDurations.length
      ? Number((reviewDurations.reduce((sum, duration) => sum + duration, 0) / reviewDurations.length).toFixed(1))
      : 0;

    res.status(200).json({
      reviewsCompleted,
      averageReviewTimeHours,
      pendingReviews,
      approvalPercentage: reviewsCompleted ? Math.round((approvedReviews / reviewsCompleted) * 100) : 0,
    });
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
