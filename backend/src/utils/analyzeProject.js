const hasUrl = (value) => /^https?:\/\/\S+\.\S+/.test(value || "");

export const analyzeProject = ({ title = "", description = "", skills = [], githubLink = "", liveLink = "" }) => {
  const words = description.trim().split(/\s+/).filter(Boolean);
  const normalizedSkills = skills.filter(Boolean);
  const strengths = [];
  const risks = [];
  let score = 20;

  if (title.trim().length >= 6) score += 10;
  if (words.length >= 35) {
    score += 25;
    strengths.push("Detailed project description");
  } else {
    risks.push("Description should explain problem, approach, and outcome");
  }

  if (normalizedSkills.length >= 3) {
    score += 15;
    strengths.push("Multiple technical skills listed");
  } else {
    risks.push("Add at least three relevant skills");
  }

  if (hasUrl(githubLink)) {
    score += 20;
    strengths.push("Repository link provided");
  } else {
    risks.push("Repository URL is missing or invalid");
  }

  if (hasUrl(liveLink)) {
    score += 10;
    strengths.push("Live demo link provided");
  }

  const cappedScore = Math.min(score, 100);

  return {
    score: cappedScore,
    strengths,
    risks,
    fallbackUsed: true,
    analyzedAt: new Date(),
    summary:
      cappedScore >= 75
        ? "Strong evidence package ready for human verification."
        : "Evidence is accepted but needs stronger proof before verification.",
  };
};
