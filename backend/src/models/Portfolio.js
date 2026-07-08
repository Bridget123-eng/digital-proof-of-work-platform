import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    // Owner of portfolio
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Student biography
    bio: {
      type: String,
      default: "",
    },

    // Skills list
    skills: {
      type: [String],
      default: [],
    },

    // GitHub profile link
    githubLink: {
      type: String,
      default: "",
    },

    degree: {
      type: String,
      default: "",
      trim: true,
    },

    // Linked projects
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],

    // Uploaded certificates
    certificates: [
      {
        title: {
          type: String,
          default: "",
        },

        fileUrl: {
          type: String,
          default: "",
        },

        issuedBy: {
          type: String,
          default: "",
        },

        issuedDate: {
          type: Date,
        },

        verificationStatus: {
          type: String,
          enum: ["pending", "in_review", "verified", "rejected", "changes_requested"],
          default: "pending",
        },

        reviewNote: {
          type: String,
          default: "",
        },

        reviewedAt: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Portfolio",
  portfolioSchema
);
