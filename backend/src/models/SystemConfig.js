import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "platform",
    },
    badgeRules: {
      type: [String],
      default: [],
    },
    verificationCriteria: {
      type: [String],
      default: [],
    },
    aiSettings: {
      mode: {
        type: String,
        default: "deterministic fallback",
      },
      humanReviewRequired: {
        type: Boolean,
        default: true,
      },
    },
    notificationTemplates: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("SystemConfig", systemConfigSchema);
