const hasMeaningfulText = (value = "") => String(value || "").trim().length >= 8;
const hasUrl = (value = "") => /^https?:\/\/\S+\.\S+/.test(String(value || "").trim());

export const validateProjectPayload = (payload = {}) => {
  const errors = [];

  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const skills = Array.isArray(payload.skills) ? payload.skills : [];
  const githubLink = String(payload.githubLink || "").trim();
  const liveLink = String(payload.liveLink || "").trim();
  const proofFiles = Array.isArray(payload.proofFiles) ? payload.proofFiles : [];
  const certificates = Array.isArray(payload.certificates) ? payload.certificates : [];

  if (!hasMeaningfulText(title) || title.length < 6) {
    errors.push("Project title must be at least 6 characters.");
  }

  if (!hasMeaningfulText(description) || description.split(/\s+/).filter(Boolean).length < 20) {
    errors.push("Project description must include at least 20 words and explain the work.");
  }

  if (skills.length < 3) {
    errors.push("Provide at least three relevant skills.");
  }

  const hasEvidenceLink = hasUrl(githubLink) || hasUrl(liveLink) || proofFiles.some((file) => hasUrl(file)) || certificates.some((certificate) => hasUrl(certificate?.fileUrl));

  if (!hasEvidenceLink) {
    errors.push("Submit at least one repository, demo, proof file, or certificate link as evidence.");
  }

  return { valid: errors.length === 0, errors };
};
