import Portfolio from "../models/Portfolio.js";
import Badge from "../models/Badge.js";
import User from "../models/User.js";
import { createAuditEvent } from "../utils/audit.js";

const normalizeText = (value, maxLength = 4000) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);
const normalizeProfileImage = (value) => normalizeText(value, 900000);

const normalizeSkills = (skills) => {
  const source = Array.isArray(skills)
    ? skills
    : String(skills || "")
        .split(",")
        .map((skill) => skill.trim());

  return [...new Set(source.filter(Boolean).map((skill) => skill.slice(0, 80)))].slice(0, 30);
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
    .slice(0, 15);


// CREATE PORTFOLIO
export const createPortfolio = async (req, res) => {
  try {

    const {
      bio,
      skills,
      githubLink,
      profileImage,
      certificates = [],
    } = req.body;

    // Check existing portfolio
    const existingPortfolio =
      await Portfolio.findOne({
        studentId: req.user._id,
      });

    if (existingPortfolio) {
      return res.status(400).json({
        message: "Portfolio already exists",
      });
    }

    // Create portfolio
    const portfolio = await Portfolio.create({
      studentId: req.user._id,
      bio: normalizeText(bio, 2000),
      skills: normalizeSkills(skills),
      githubLink: normalizeText(githubLink, 500),
      certificates: normalizeCertificates(certificates),
    });

    if (profileImage) {
      await User.findByIdAndUpdate(req.user._id, { profileImage: normalizeProfileImage(profileImage) });
    }

    await createAuditEvent({
      actor: req.user._id,
      action: "portfolio.created",
      entityType: "Portfolio",
      entityId: portfolio._id,
      metadata: { owner: String(req.user._id) },
    });

    res.status(201).json(portfolio);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET MY PORTFOLIO
export const getMyPortfolio = async (req, res) => {
  try {

    const portfolio = await Portfolio.findOneAndUpdate(
      { studentId: req.user._id },
      { $setOnInsert: { studentId: req.user._id } },
      { upsert: true, new: true }
    )
      .populate("studentId", "name email profileImage")
      .populate("projects");

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
      });
    }

    res.status(200).json(portfolio);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// UPDATE PORTFOLIO
export const updatePortfolio = async (req, res) => {
  try {

    const portfolio = await Portfolio.findOneAndUpdate(
      { studentId: req.user._id },
      { $setOnInsert: { studentId: req.user._id } },
      { upsert: true, new: true }
    );

    portfolio.bio = req.body.bio !== undefined ? normalizeText(req.body.bio, 2000) : portfolio.bio;

    portfolio.skills = req.body.skills !== undefined
      ? normalizeSkills(req.body.skills)
      : portfolio.skills;

    portfolio.githubLink = req.body.githubLink !== undefined
      ? normalizeText(req.body.githubLink, 500)
      : portfolio.githubLink;

    if (Array.isArray(req.body.certificates)) {
      portfolio.certificates = normalizeCertificates(req.body.certificates);
    }

    if (req.body.profileImage !== undefined) {
      await User.findByIdAndUpdate(req.user._id, {
        profileImage: normalizeProfileImage(req.body.profileImage),
      });
    }

    const updatedPortfolio =
      await portfolio.save();

    await createAuditEvent({
      actor: req.user._id,
      action: "portfolio.updated",
      entityType: "Portfolio",
      entityId: portfolio._id,
      metadata: { owner: String(req.user._id) },
    });

    const populatedPortfolio = await updatedPortfolio.populate(
      "studentId",
      "name email profileImage"
    );

    res.status(200).json(populatedPortfolio);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET PUBLIC PORTFOLIO
export const getPublicPortfolio = async (req, res) => {
  try {

    const portfolioQuery = req.params.userId
      ? { studentId: req.params.userId }
      : { _id: req.params.id };

    const portfolio = await Portfolio.findOne(
      portfolioQuery
    )
      .populate("studentId", "name email profileImage")
      .populate("projects");

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
      });
    }

    const badges = await Badge.find({
      user: portfolio.studentId._id,
    }).populate("project", "title");

    const publicProjects = portfolio.projects.filter(
      (project) =>
        project.visibility === "public" &&
        project.verificationStatus === "verified"
    );

    res.status(200).json({
      _id: portfolio._id,
      student: portfolio.studentId,
      bio: portfolio.bio,
      skills: portfolio.skills,
      githubLink: portfolio.githubLink,
      certificates: portfolio.certificates,
      projects: publicProjects,
      badges,
      updatedAt: portfolio.updatedAt,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
