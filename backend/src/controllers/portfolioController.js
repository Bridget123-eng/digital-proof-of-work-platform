import Portfolio from "../models/Portfolio.js";
import Badge from "../models/Badge.js";
import User from "../models/User.js";
import { createAuditEvent } from "../utils/audit.js";


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
      bio,
      skills,
      githubLink,
      certificates,
    });

    if (profileImage) {
      await User.findByIdAndUpdate(req.user._id, { profileImage });
    }

    await createAuditEvent({
      actor: req.user._id,
      action: "portfolio.created",
      entityType: "Portfolio",
      entityId: portfolio._id,
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

    portfolio.bio = req.body.bio ?? portfolio.bio;

    portfolio.skills = Array.isArray(req.body.skills)
      ? req.body.skills
      : portfolio.skills;

    portfolio.githubLink = req.body.githubLink ?? portfolio.githubLink;

    if (Array.isArray(req.body.certificates)) {
      portfolio.certificates = req.body.certificates;
    }

    if (req.body.profileImage !== undefined) {
      await User.findByIdAndUpdate(req.user._id, {
        profileImage: req.body.profileImage,
      });
    }

    const updatedPortfolio =
      await portfolio.save();

    await createAuditEvent({
      actor: req.user._id,
      action: "portfolio.updated",
      entityType: "Portfolio",
      entityId: portfolio._id,
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
