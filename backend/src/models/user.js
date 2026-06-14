import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        "student",
        "verifier",
        "reviewer",
        "recruiter",
        "admin",
        "administrator",
      ],
      default: "student",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    profileImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    socialLinks: {
      github: {
        type: String,
        default: "",
      },
      linkedin: {
        type: String,
        default: "",
      },
      portfolio: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

export default mongoose.model("User", userSchema);
