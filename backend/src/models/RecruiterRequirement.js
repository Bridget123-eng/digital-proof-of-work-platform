import mongoose from "mongoose";

const recruiterRequirementSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    skills: { type: [String], default: [] },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

recruiterRequirementSchema.index({ recruiter: 1, status: 1, createdAt: -1 });

export default mongoose.models.RecruiterRequirement || mongoose.model("RecruiterRequirement", recruiterRequirementSchema);
