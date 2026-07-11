import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.js";
import generateToken from "../utils/generateToken.js";
import { createAuditEvent } from "../utils/audit.js";
import { EMAIL_NOT_CONFIGURED_MESSAGE, EmailServiceError, sendEmail } from "../utils/sendEmail.js";

const roleAliases = {
  administrator: "admin",
  verifier: "reviewer",
};

const allowedRoles = [
  "student",
  "reviewer",
  "recruiter",
  "mentor",
  "admin",
  "administrator",
];
const selfSignupRoles = new Set(["student", "mentor"]);

const normalizeRole = (role = "student") => roleAliases[role] || role;
const cleanEmail = (email) => String(email || "").trim().toLowerCase();
const isProduction = () => process.env.NODE_ENV === "production";
const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const createResetCode = () => String(crypto.randomInt(100000, 1000000));
const getOtpExpiryMinutes = () => {
  const minutes = Number(process.env.OTP_EXPIRES_IN_MINUTES || 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 10;
};
const hashResetCode = (email, code) =>
  crypto.createHash("sha256").update(`${cleanEmail(email)}:${String(code || "").trim()}`).digest("hex");
const findUserByValidResetCode = (email, code) =>
  User.findOne({
    email: cleanEmail(email),
    passwordResetToken: hashResetCode(email, code),
    passwordResetExpires: { $gt: new Date() },
  });

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
        message: "Public registration is limited to student accounts. Verifier and recruiter accounts must be created by an administrator.",
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
        message: "If that email is registered, a password reset code has been sent.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Suspended accounts must be reset by an administrator",
      });
    }

    const resetCode = createResetCode();
    const hashedResetCode = hashResetCode(normalizedEmail, resetCode);

    user.passwordResetToken = hashedResetCode;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * getOtpExpiryMinutes());
    await user.save();

    try {
      const safeName = escapeHtml(user.name);
      const safeResetCode = escapeHtml(resetCode);
      await sendEmail({
        to: user.email,
        subject: "Reset your Digital Proof of Work password",
        text: `Hello ${user.name},\n\nUse this verification code to reset your password: ${resetCode}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
        html: `
          <p>Hello ${safeName},</p>
          <p>Use this verification code to reset your Digital Proof of Work password:</p>
          <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.18em;">${safeResetCode}</p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error(`Password reset email failed: ${emailError.message}`);

      user.passwordResetToken = "";
      user.passwordResetExpires = undefined;
      await user.save();

      await createAuditEvent({
        actor: user._id,
        action: "user.password_reset_requested",
        entityType: "User",
        entityId: user._id,
        metadata: { owner: String(user._id), emailDelivery: "failed" },
      });

      if (emailError instanceof EmailServiceError && emailError.message === EMAIL_NOT_CONFIGURED_MESSAGE) {
        return res.status(503).json({
          success: false,
          message: "Email service is not configured. OTP cannot be sent.",
        });
      }

      if (isProduction()) {
        return res.status(503).json({
          success: false,
          message: "Email service is not configured. Please contact admin.",
        });
      }

      return res.status(503).json({
        success: false,
        message: "Unable to send reset code. Please check email configuration and try again.",
      });
    }

    await createAuditEvent({
      actor: user._id,
      action: "user.password_reset_requested",
      entityType: "User",
      entityId: user._id,
      metadata: { owner: String(user._id) },
    });

    res.status(200).json({
      message: "If that email is registered, a password reset code has been sent.",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = cleanEmail(email);
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      return res.status(400).json({
        message: "Email and reset code are required",
      });
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({
        message: "Reset code must be 6 digits",
      });
    }

    const user = await findUserByValidResetCode(normalizedEmail, normalizedCode);

    if (!user) {
      return res.status(400).json({
        message: "Reset code is invalid or has expired",
      });
    }

    res.status(200).json({
      message: "Reset code verified",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const normalizedEmail = cleanEmail(email);
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode || !password) {
      return res.status(400).json({
        message: "Email, reset code, and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({
        message: "Reset code must be 6 digits",
      });
    }

    const user = await findUserByValidResetCode(normalizedEmail, normalizedCode);

    if (!user) {
      return res.status(400).json({
        message: "Reset code is invalid or has expired",
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
