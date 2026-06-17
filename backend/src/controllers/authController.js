import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { createAuditEvent } from "../utils/audit.js";
import { sendEmail } from "../utils/sendEmail.js";

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
const getPasswordResetUrl = (token) => {
  const baseUrl =
    process.env.RESET_PASSWORD_URL_BASE ||
    process.env.APP_ORIGIN ||
    "http://localhost:5173";

  return `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
};

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

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body;

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

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = cleanEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(200).json({
        message: "If that email is registered, a password reset link has been sent.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Suspended accounts must be reset by an administrator",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetUrl = getPasswordResetUrl(resetToken);

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Reset your Digital Proof of Work password",
      text: `Hello ${user.name},\n\nUse this link to reset your password: ${resetUrl}\n\nThis link will expire in 30 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <p>Hello ${user.name},</p>
        <p>Use the link below to reset your Digital Proof of Work password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    await createAuditEvent({
      actor: user._id,
      action: "user.password_reset_requested",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id) },
    });

    res.status(200).json({
      message: "If that email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Reset token and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const hashedResetToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedResetToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.role = normalizeRole(user.role);
    user.username = user.username || user.email;
    user.passwordResetToken = "";
    user.passwordResetExpires = undefined;
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
