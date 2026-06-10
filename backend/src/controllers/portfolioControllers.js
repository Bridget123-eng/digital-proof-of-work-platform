import Portfolio from "../models/Portfolio.js";


// CREATE PORTFOLIO
export const createPortfolio = async (req, res) => {
  try {

    const {
      bio,
      skills,
      githubLink,
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

    const portfolio = await Portfolio.findOne({
      studentId: req.user._id,
    })
      .populate("studentId", "name email")
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

    const portfolio = await Portfolio.findOne({
      studentId: req.user._id,
    });

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
      });
    }

    portfolio.bio =
      req.body.bio || portfolio.bio;

    portfolio.skills =
      req.body.skills || portfolio.skills;

    portfolio.githubLink =
      req.body.githubLink ||
      portfolio.githubLink;

    const updatedPortfolio =
      await portfolio.save();

    res.status(200).json(updatedPortfolio);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// GET PUBLIC PORTFOLIO
export const getPublicPortfolio = async (req, res) => {
  try {

    const portfolio = await Portfolio.findById(
      req.params.id
    )
      .populate("studentId", "name email")
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