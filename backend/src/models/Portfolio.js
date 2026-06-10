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