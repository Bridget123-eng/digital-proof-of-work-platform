import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { createAuditEvent } from "../utils/audit.js";

const roleAliases = {
  administrator: "admin",
};

const allowedRoles = [
  "student",
  "verifier",
  "reviewer",
  "recruiter",
  "admin",
  "administrator",
];
const selfSignupRoles = new Set(["student", "verifier", "reviewer", "recruiter"]);

const normalizeRole = (role = "student") => roleAliases[role] || role;

const cleanEmail = (email) => String(email || "").trim().toLowerCase();

const buildUserResponse = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username || user.email,
  role: normalizeRole(user.role),
  status: user.status,
  profileImage: user.profileImage || "",
  bio: user.bio || "",
  skills: user.skills || [],
  socialLinks: user.socialLinks || {},
  token: generateToken(user._id),
});

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "student",
    } = req.body;

    const normalizedEmail = cleanEmail(email);
    const normalizedRole = normalizeRole(role);

    if (!name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    if (!allowedRoles.includes(role) || !allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const adminEmails = String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((adminEmail) => adminEmail.trim().toLowerCase())
      .filter(Boolean);

    const isBootstrapAdmin = adminEmails.includes(normalizedEmail);

    if (!isBootstrapAdmin && !selfSignupRoles.has(normalizedRole)) {
      return res.status(403).json({
        message: "That role must be assigned by an administrator",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      username: normalizedEmail,
      password: hashedPassword,
      role: isBootstrapAdmin ? "admin" : normalizedRole,
    });

    await createAuditEvent({
      actor: user._id,
      action: "user.registered",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id), role: user.role },
    });

    res.status(201).json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = cleanEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Account is suspended",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const normalizedRole = normalizeRole(user.role);
    const normalizedUsername = user.username || normalizedEmail;

    if (user.role !== normalizedRole || user.username !== normalizedUsername) {
      user.role = normalizedRole;
      user.username = normalizedUsername;
      await user.save();
    }

    await createAuditEvent({
      actor: user._id,
      action: "user.login",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id), role: normalizedRole },
    });

    res.status(200).json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, currentPassword, password } = req.body;
    const normalizedEmail = cleanEmail(email);

    if (!normalizedEmail || !currentPassword || !password) {
      return res.status(400).json({
        message: "Email, current password, and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Suspended accounts must be reset by an administrator",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.role = normalizeRole(user.role);
    user.username = user.username || normalizedEmail;
    await user.save();

    await createAuditEvent({
      actor: user._id,
      action: "user.password_reset",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id) },
    });

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json(buildUserResponse(req.user));
};
