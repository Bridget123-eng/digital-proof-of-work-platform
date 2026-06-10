import Project from "../models/Project.js";


// CREATE PROJECT
export const createProject = async (req, res) => {
  try {

    const {
      title,
      description,
      skills,
      githubLink,
      liveLink,
    } = req.body;

    const project = await Project.create({
      user: req.user._id,
      title,
      description,
      skills,
      githubLink,
      liveLink,
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
    });

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

    const projects = await Project.find()
      .populate("user", "name email");

    res.status(200).json(projects);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};