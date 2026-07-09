import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    skills: {
      type: [String],
      default: [],
    },

    githubLink: {
      type: String,
      default: "",
    },

    liveLink: {
      type: String,
      default: "",
    },

    proofFiles: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video", "document", "link"],
        },
        title: String,
      },
    ],

    certificates: [
      {
        title: {
          type: String,
          default: "",
          trim: true,
        },
        fileUrl: {
          type: String,
          default: "",
          trim: true,
        },
        issuedBy: {
          type: String,
          default: "",
          trim: true,
        },
        issuedDate: {
          type: Date,
        },
      },
    ],

    evidenceType: {
      type: String,
      enum: ["repository", "certificate", "live_demo", "case_study"],
      default: "repository",
    },

    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "public",
    },

    analysis: {
      score: {
        type: Number,
        default: 0,
      },
      strengths: {
        type: [String],
        default: [],
      },
      risks: {
        type: [String],
        default: [],
      },
      summary: {
        type: String,
        default: "",
      },
      fallbackUsed: {
        type: Boolean,
        default: true,
      },
      analyzedAt: {
        type: Date,
      },
    },

    verificationStatus: {
      type: String,
      enum: ["draft", "pending", "in_review", "verified", "rejected", "changes_requested"],
      default: "pending",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewNote: {
      type: String,
      default: "",
    },

    reviewedAt: {
      type: Date,
    },
    githubData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, verificationStatus: 1, createdAt: -1 });
projectSchema.index({ verificationStatus: 1, createdAt: 1 });
projectSchema.index({ title: "text", description: "text", skills: "text" });

export default mongoose.model("Project", projectSchema);
