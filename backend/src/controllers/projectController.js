import Project from "../models/Project.js";
import Portfolio from "../models/Portfolio.js";
import User from "../models/user.js";
import Notification from "../models/Notification.js";
import Badge from "../models/Badge.js";
import { analyzeProject } from "../utils/analyzeProject.js";
import { analyzeGithubRepo } from "../services/githubService.js";
import { createAuditEvent } from "../utils/audit.js";
import { validateProjectPayload } from "../utils/validation.js";

const allowedEvidenceTypes = new Set(["repository", "certificate", "live_demo", "case_study"]);
const allowedVisibility = new Set(["private", "public"]);
const allowedQueueStatuses = new Set(["pending", "in_review", "verified", "rejected", "changes_requested", "draft", "all"]);
const reviewRoles = new Set(["reviewer"]);

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

const getReviewableStudentIds = async (reviewerId) =>
  User.find({
    role: "student",
    status: "active",
    $or: [{ assignedVerifier: reviewerId }, { assignedVerifier: null }],
  }).distinct("_id");

const toPublicProject = (project, verifiedProjectCounts = new Map()) => {
  const plainProject = typeof project.toObject === "function" ? project.toObject() : project;
  const userId = String(plainProject.user?._id || plainProject.user || "");

  return {
    _id: plainProject._id,
    title: plainProject.title,
    description: plainProject.description,
    skills: plainProject.skills || [],
    githubLink: plainProject.githubLink || "",
    liveLink: plainProject.liveLink || "",
    proofFiles: plainProject.proofFiles || [],
    certificates: plainProject.certificates || [],
    githubData: plainProject.githubData || null,
    analysis: plainProject.analysis || null,
    evidenceType: plainProject.evidenceType,
    verificationStatus: "verified",
    createdAt: plainProject.createdAt,
    updatedAt: plainProject.updatedAt,
    user: plainProject.user
      ? {
          _id: plainProject.user._id,
          name: plainProject.user.name,
          profileImage: plainProject.user.profileImage || "",
        }
      : null,
    candidate: {
      name: plainProject.user?.name || "",
      skills: plainProject.skills || [],
      verifiedProjects: verifiedProjectCounts.get(userId) || 1,
      verificationStatus: "Verified",
    },
  };
};

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
    const normalizedEvidenceType = allowedEvidenceTypes.has(evidenceType)
      ? evidenceType
      : "repository";
    const normalizedVisibility = allowedVisibility.has(visibility)
      ? visibility
      : "public";

    const skillList = normalizeStringList(skills);
    const proofFileList = (Array.isArray(proofFiles) ? proofFiles : [])
      .map((file) => ({
        url: normalizeText(typeof file === "string" ? file : file?.url, 500),
        type: ["image", "video", "document", "link"].includes(file?.type) ? file.type : "link",
        title: normalizeText(file?.title, 120),
      }))
      .filter((file) => file.url)
      .slice(0, 10);
    const certificateList = normalizeCertificates(certificates);

    const existingProject = await Project.findOne({
      user: req.user._id,
      title: normalizedTitle,
    });

    if (existingProject) {
      return res.status(409).json({
        message: "A submission with this title already exists for your account.",
      });
    }

    const validation = validateProjectPayload({
      title: normalizedTitle,
      description: normalizedDescription,
      skills: skillList,
      githubLink: normalizeText(githubLink, 500),
      liveLink: normalizeText(liveLink, 500),
      proofFiles: proofFileList,
      certificates: certificateList,
    });

    if (!validation.valid) {
      return res.status(400).json({
        message: "Please correct the submission details.",
        errors: validation.errors,
      });
    }

    const analysis = analyzeProject({
      title: normalizedTitle,
      description: normalizedDescription,
      skills: skillList,
      githubLink: normalizeText(githubLink, 500),
      liveLink: normalizeText(liveLink, 500),
    });

    let githubData = null;
    if (githubLink) {
      githubData = await analyzeGithubRepo(githubLink);
    }

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
      githubData,
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
      { upsert: true, returnDocument: "after" }
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
    const { skill, tech, lang, search } = req.query;
    const query = {
      visibility: "public",
      verificationStatus: "verified",
    };

    if (skill || tech) {
      const skillTerms = (skill || "").split(",").concat((tech || "").split(",")).map(s => s.trim()).filter(Boolean);
      if (skillTerms.length > 0) {
        query.skills = { $in: skillTerms.map(s => new RegExp(s, "i")) };
      }
    }

    if (lang) {
      query["githubData.metadata.language"] = new RegExp(lang.trim(), "i");
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { skills: new RegExp(search, "i") },
      ];
    }

    const projects = await Project.find(query)
      .populate("user", "name profileImage")
      .sort({ updatedAt: -1 })
      .lean();

    const verifiedProjectCounts = new Map();
    projects.forEach((project) => {
      const userId = String(project.user?._id || "");
      if (userId) verifiedProjectCounts.set(userId, (verifiedProjectCounts.get(userId) || 0) + 1);
    });

    res.status(200).json(projects.map((project) => toPublicProject(project, verifiedProjectCounts)));

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

    if (!allowedQueueStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid verification status" });
    }

    if (status !== "all") query.verificationStatus = status;
    if (q) query.$text = { $search: q };
    if (!["admin", "recruiter"].includes(req.user.role)) {
      const studentsForVerifier = await getReviewableStudentIds(req.user._id);
      query.user = { $in: studentsForVerifier };
    }

    const projects = await Project.find(query)
      .populate("user", "name profileImage assignedVerifier")
      .populate("reviewedBy", "name")
      .lean()
      .sort({ createdAt: 1 });

    const portfolios = await Portfolio.find({
      studentId: { $in: projects.map((project) => project.user?._id).filter(Boolean) },
    })
      .populate("studentId", "name profileImage assignedVerifier")
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

    if (!reviewRoles.has(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to review this submission",
      });
    }

    const student = await User.findOne({
      _id: project.user,
      role: "student",
      status: "active",
    }).select("assignedVerifier");

    if (!student || (student.assignedVerifier && String(student.assignedVerifier) !== String(req.user._id))) {
      return res.status(403).json({
        message: "This submission is not assigned to you for review",
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
          description: "Awarded after a human reviewer approved the submitted evidence.",
          level: project.analysis?.score >= 85 ? "gold" : "silver",
          awardedBy: req.user._id,
        },
        { upsert: true, returnDocument: "after" }
      );
    }

    if (project.certificates?.length) {
      const portfolio = await Portfolio.findOneAndUpdate(
        { studentId: project.user },
        { $setOnInsert: { studentId: project.user } },
        { upsert: true, returnDocument: "after" }
      );

      project.certificates.forEach((projectCertificate) => {
        const projectFileUrl = normalizeText(projectCertificate.fileUrl, 500).toLowerCase();
        const projectTitle = normalizeText(projectCertificate.title, 120).toLowerCase();
        const existingCertificate = portfolio.certificates.find((certificate) => {
          const fileUrl = normalizeText(certificate.fileUrl, 500).toLowerCase();
          const title = normalizeText(certificate.title, 120).toLowerCase();
          return (projectFileUrl && fileUrl === projectFileUrl) || (projectTitle && title === projectTitle);
        });

        if (existingCertificate) {
          existingCertificate.verificationStatus = status;
          existingCertificate.reviewNote = normalizedNote;
          existingCertificate.reviewedAt = new Date();
        } else {
          portfolio.certificates.push({
            title: projectCertificate.title,
            fileUrl: projectCertificate.fileUrl,
            issuedBy: projectCertificate.issuedBy,
            issuedDate: projectCertificate.issuedDate,
            verificationStatus: status,
            reviewNote: normalizedNote,
            reviewedAt: new Date(),
          });
        }
      });

      await portfolio.save();
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
    const assignedStudentIds = req.user.role === "admin" ? null : await getReviewableStudentIds(req.user._id);
    const completedFilter = {
      ...reviewerFilter,
      reviewedAt: { $exists: true },
    };
    const [reviewsCompleted, pendingReviews, approvedReviews, reviewedProjects] = await Promise.all([
      Project.countDocuments(completedFilter),
      Project.countDocuments(
        req.user.role === "admin"
          ? { verificationStatus: "pending" }
          : { verificationStatus: "pending", user: { $in: assignedStudentIds } }
      ),
      Project.countDocuments(
        req.user.role === "admin"
          ? { ...completedFilter, verificationStatus: "verified" }
          : { ...completedFilter, verificationStatus: "verified" }
      ),
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
    const isRecruiterOrMentor = ["recruiter", "mentor"].includes(req.user.role);
    const baseFilter = isRecruiterOrMentor
      ? { visibility: "public", verificationStatus: "verified" }
      : {};

    const [total, pending, verified, rejected, inReview] = await Promise.all([
      Project.countDocuments(baseFilter),
      isRecruiterOrMentor ? 0 : Project.countDocuments({ verificationStatus: "pending" }),
      Project.countDocuments({ ...baseFilter, verificationStatus: "verified" }),
      isRecruiterOrMentor ? 0 : Project.countDocuments({ verificationStatus: "rejected" }),
      isRecruiterOrMentor ? 0 : Project.countDocuments({ verificationStatus: "in_review" }),
    ]);

    const recent = await Project.find(baseFilter)
      .populate("user", isRecruiterOrMentor ? "name profileImage" : "name email")
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    res.status(200).json({
      total,
      pending,
      verified,
      rejected,
      inReview,
      verificationRate: total ? Math.round((verified / total) * 100) : 0,
      recent: isRecruiterOrMentor ? recent.map((project) => toPublicProject(project)) : recent,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
