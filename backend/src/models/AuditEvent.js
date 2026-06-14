import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditEventSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model("AuditEvent", auditEventSchema);
