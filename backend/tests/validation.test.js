import test from "node:test";
import assert from "node:assert/strict";
import { validateProjectPayload } from "../src/utils/validation.js";

test("rejects submissions without meaningful evidence", () => {
  const result = validateProjectPayload({
    title: "App",
    description: "A short description",
    skills: ["React"],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /title/i);
  assert.match(result.errors.join(" "), /evidence/i);
});

test("accepts a well-formed project submission", () => {
  const result = validateProjectPayload({
    title: "Portfolio Analytics",
    description: "This project tracks student skill growth, recruiter feedback, and verified outcomes with a clear dashboard, audit trail, and actionable recommendations for reviewers and employers.",
    skills: ["React", "Node.js", "MongoDB"],
    githubLink: "https://github.com/example/portfolio-analytics",
    liveLink: "https://demo.example.com",
    evidenceType: "repository",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
