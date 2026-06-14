import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    level: {
      type: String,
      enum: ["bronze", "silver", "gold"],
      default: "bronze",
    },
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

badgeSchema.index({ user: 1, project: 1, name: 1 }, { unique: true });

export default mongoose.model("Badge", badgeSchema);
