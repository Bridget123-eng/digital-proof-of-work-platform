import AuditEvent from "../models/AuditEvent.js";

export const createAuditEvent = async ({
  actor,
  action,
  entityType,
  entityId,
  metadata = {},
}) => {
  try {
    await AuditEvent.create({
      actor,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (error) {
    console.error("Audit event failed", error.message);
  }
};
