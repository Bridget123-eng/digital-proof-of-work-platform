import Portfolio from "../models/Portfolio.js";
import Project from "../models/Project.js";
import RecruiterRequirement from "../models/RecruiterRequirement.js";
import User from "../models/user.js";
import { createAuditEvent } from "../utils/audit.js";

const normalizeText = (value, maxLength) => String(value || "").trim().slice(0, maxLength);
const normalizeSkills = (value) => [...new Set((Array.isArray(value) ? value : String(value || "").split(","))
  .map((skill) => normalizeText(skill, 80))
  .filter(Boolean))].slice(0, 20);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createRequirement = async (req, res) => {
  try {
    const title = normalizeText(req.body.title, 160);
    const description = normalizeText(req.body.description, 2000);
    const skills = normalizeSkills(req.body.skills);

    if (title.length < 4 || skills.length === 0) {
      return res.status(400).json({ message: "Provide a requirement title and at least one skill." });
    }

    const requirement = await RecruiterRequirement.create({ recruiter: req.user._id, title, description, skills });
    await createAuditEvent({ actor: req.user._id, action: "recruiter.requirement_created", entityType: "RecruiterRequirement", entityId: requirement._id, metadata: { skills } });
    res.status(201).json(requirement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyRequirements = async (req, res) => {
  try {
    const requirements = await RecruiterRequirement.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(requirements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRequirementMatches = async (req, res) => {
  try {
    const requirement = await RecruiterRequirement.findOne({ _id: req.params.id, recruiter: req.user._id });
    if (!requirement) return res.status(404).json({ message: "Requirement not found" });

    const skillMatchers = requirement.skills.map((skill) => new RegExp(`^${escapeRegex(skill)}$`, "i"));
    const [portfolios, projects] = await Promise.all([
      Portfolio.find({ skills: { $in: skillMatchers } }).populate("studentId", "name profileImage").lean(),
      Project.find({ visibility: "public", verificationStatus: "verified", skills: { $in: skillMatchers } }).select("user skills").lean(),
    ]);
    const projectSkillsByUser = new Map();
    projects.forEach((project) => {
      const key = String(project.user);
      projectSkillsByUser.set(key, [...new Set([...(projectSkillsByUser.get(key) || []), ...(project.skills || [])])]);
    });
    const candidateIds = new Set([
      ...portfolios.map((portfolio) => String(portfolio.studentId?._id || "")).filter(Boolean),
      ...projectSkillsByUser.keys(),
    ]);
    const users = await User.find({ _id: { $in: [...candidateIds] }, role: "student", status: "active" }).select("name profileImage").lean();
    const portfolioByUser = new Map(portfolios.map((portfolio) => [String(portfolio.studentId?._id), portfolio]));
    const matches = users.map((user) => {
      const availableSkills = [...new Set([...(portfolioByUser.get(String(user._id))?.skills || []), ...(projectSkillsByUser.get(String(user._id)) || [])])];
      const matchingSkills = requirement.skills.filter((required) => availableSkills.some((skill) => skill.toLowerCase() === required.toLowerCase()));
      return { user, skills: availableSkills, matchingSkills, matchPercent: Math.round((matchingSkills.length / requirement.skills.length) * 100) };
    }).filter((match) => match.matchingSkills.length).sort((a, b) => b.matchPercent - a.matchPercent || a.user.name.localeCompare(b.user.name));
    res.status(200).json({ requirement, matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
