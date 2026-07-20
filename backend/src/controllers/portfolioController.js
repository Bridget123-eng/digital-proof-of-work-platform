import Portfolio from "../models/Portfolio.js";
import Badge from "../models/Badge.js";
import User from "../models/user.js";
import Project from "../models/Project.js";
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
      verificationStatus: certificate?.verificationStatus || "pending",
      reviewNote: normalizeText(certificate?.reviewNote, 1000),
      reviewedAt: certificate?.reviewedAt,
    }))
    .filter((certificate) => certificate.title || certificate.fileUrl)
    .slice(0, 15);

const toPublicProject = (project) => ({
  _id: project._id,
  title: project.title,
  description: project.description,
  skills: project.skills || [],
  githubLink: project.githubLink || "",
  liveLink: project.liveLink || "",
  proofFiles: project.proofFiles || [],
  githubData: project.githubData || null,
  analysis: project.analysis || null,
  evidenceType: project.evidenceType,
  verificationStatus: "verified",
  certificates: project.certificates || [],
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

const certificateKey = (certificate) =>
  `${normalizeText(certificate?.title, 120).toLowerCase()}::${normalizeText(certificate?.fileUrl, 500).toLowerCase()}`;

const hasCertificateChanged = (nextCertificate, existingCertificate) =>
  normalizeText(nextCertificate?.title, 120) !== normalizeText(existingCertificate?.title, 120) ||
  normalizeText(nextCertificate?.fileUrl, 500) !== normalizeText(existingCertificate?.fileUrl, 500) ||
  normalizeText(nextCertificate?.issuedBy, 120) !== normalizeText(existingCertificate?.issuedBy, 120) ||
  String(nextCertificate?.issuedDate || "").slice(0, 10) !== String(existingCertificate?.issuedDate || "").slice(0, 10);

const queueCertificateReviews = async ({ userId, certificates, existingCertificates }) => {
  const existingMap = new Map(existingCertificates.map((certificate) => [certificateKey(certificate), certificate]));
  const createdSubmissions = [];

  for (const certificate of certificates) {
    const existingCertificate = existingMap.get(certificateKey(certificate));
    const needsReview =
      !existingCertificate ||
      hasCertificateChanged(certificate, existingCertificate) ||
      !["pending", "in_review", "verified"].includes(existingCertificate.verificationStatus || "pending");

    if (!needsReview) {
      certificate.verificationStatus = existingCertificate.verificationStatus || "pending";
      certificate.reviewNote = existingCertificate.reviewNote || "";
      certificate.reviewedAt = existingCertificate.reviewedAt;
      continue;
    }

    certificate.verificationStatus = "pending";
    certificate.reviewNote = "";
    certificate.reviewedAt = undefined;

    const title = `Certificate: ${certificate.title || certificate.issuedBy || "Student credential"}`;
    const alreadyQueued = await Project.findOne({
      user: userId,
      evidenceType: "certificate",
      "certificates.fileUrl": certificate.fileUrl,
      verificationStatus: { $in: ["pending", "in_review", "verified"] },
    });

    if (alreadyQueued) {
      continue;
    }

    const project = await Project.create({
      user: userId,
      title,
      description: [
        certificate.title ? `Certificate: ${certificate.title}` : "",
        certificate.issuedBy ? `Issued by ${certificate.issuedBy}` : "",
        certificate.issuedDate ? `Issued on ${String(certificate.issuedDate).slice(0, 10)}` : "",
      ]
        .filter(Boolean)
        .join(". "),
      skills: [],
      proofFiles: certificate.fileUrl ? [certificate.fileUrl] : [],
      certificates: [certificate],
      evidenceType: "certificate",
      visibility: "public",
      analysis: {
        score: 0,
        summary: "Certificate submitted from the student profile and queued for human verification.",
      },
    });

    createdSubmissions.push(project);
  }

  return createdSubmissions;
};


// CREATE PORTFOLIO
export const createPortfolio = async (req, res) => {
  try {

    const {
      bio,
      skills,
      githubLink,
      degree,
      profileImage,
      education = [],
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
    const normalizedBio = normalizeText(bio, 2000);
    const normalizedSkills = normalizeSkills(skills);
    const normalizedGithubLink = normalizeText(githubLink, 500);
    const normalizedDegree = normalizeText(degree, 180);
    const normalizedProfileImage = profileImage ? normalizeProfileImage(profileImage) : "";
    const normalizedCertificates = normalizeCertificates(certificates);
    await queueCertificateReviews({
      userId: req.user._id,
      certificates: normalizedCertificates,
      existingCertificates: [],
    });

    const portfolio = await Portfolio.create({
      studentId: req.user._id,
      bio: normalizedBio,
      skills: normalizedSkills,
      githubLink: normalizedGithubLink,
      education: education || [],
      degree: normalizedDegree,
      certificates: normalizedCertificates,
      profileImage: normalizedProfileImage,
    });

    await User.findByIdAndUpdate(req.user._id, {
      bio: normalizedBio,
      skills: normalizedSkills,
      ...(normalizedProfileImage ? { profileImage: normalizedProfileImage } : {}),
      "socialLinks.github": normalizedGithubLink,
    });

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
      { upsert: true, returnDocument: "after" }
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
      { upsert: true, returnDocument: "after" }
    );

    const nextBio = req.body.bio !== undefined ? normalizeText(req.body.bio, 2000) : portfolio.bio;
    const nextSkills = req.body.skills !== undefined ? normalizeSkills(req.body.skills) : portfolio.skills;
    const nextGithubLink =
      req.body.githubLink !== undefined ? normalizeText(req.body.githubLink, 500) : portfolio.githubLink;
    const nextDegree = req.body.degree !== undefined ? normalizeText(req.body.degree, 180) : portfolio.degree;

    portfolio.bio = nextBio;
    portfolio.skills = nextSkills;
    portfolio.githubLink = nextGithubLink;
    portfolio.degree = nextDegree;

    let queuedCertificates = [];
    if (Array.isArray(req.body.certificates)) {
      const normalizedCertificates = normalizeCertificates(req.body.certificates);
      queuedCertificates = await queueCertificateReviews({
        userId: req.user._id,
        certificates: normalizedCertificates,
        existingCertificates: portfolio.certificates || [],
      });
      portfolio.certificates = normalizedCertificates;
    }

    if (Array.isArray(req.body.education)) {
      portfolio.education = req.body.education.map((edu) => ({
        school: normalizeText(edu.school, 200),
        degree: normalizeText(edu.degree, 200),
        fieldOfStudy: normalizeText(edu.fieldOfStudy, 200),
        from: edu.from ? new Date(edu.from) : null,
        to: edu.to ? new Date(edu.to) : null,
        current: !!edu.current,
        description: normalizeText(edu.description, 1000),
      }));
    }

    const userUpdates = {
      bio: nextBio,
      skills: nextSkills,
      "socialLinks.github": nextGithubLink,
    };

    if (req.body.profileImage !== undefined) {
      userUpdates.profileImage = normalizeProfileImage(req.body.profileImage);
    }

    await User.findByIdAndUpdate(req.user._id, userUpdates);

    const updatedPortfolio =
      await portfolio.save();

    await createAuditEvent({
      actor: req.user._id,
      action: "portfolio.updated",
      entityType: "Portfolio",
      entityId: portfolio._id,
      metadata: { owner: String(req.user._id), queuedCertificateReviews: queuedCertificates.length },
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
      .populate("studentId", "name profileImage")
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
    const publicCertificates = (portfolio.certificates || []).filter(
      (certificate) => certificate.verificationStatus === "verified"
    );

    res.status(200).json({
      _id: portfolio._id,
      student: {
        _id: portfolio.studentId._id,
        name: portfolio.studentId.name,
        profileImage: portfolio.studentId.profileImage || "",
      },
      bio: portfolio.bio,
      skills: portfolio.skills,
      githubLink: portfolio.githubLink,
      education: portfolio.education || [],
      degree: portfolio.degree || "",
      certificates: publicCertificates,
      projects: publicProjects.map(toPublicProject),
      badges,
      verifiedProjects: publicProjects.length,
      verificationStatus: publicProjects.length ? "Verified" : "Pending",
      updatedAt: portfolio.updatedAt,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
