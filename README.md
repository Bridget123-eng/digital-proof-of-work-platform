# Digital Proof of Work Platform

A full-stack proof-of-work platform for verified student achievements, evidence review, recruiter visibility, and responsible AI-assisted analysis. The current release follows the project guide’s MVP structure with role-based dashboards, evidence submission, deterministic project scoring, verification workflows, badges, notifications, audit events, and admin oversight.

## What this release covers

- Student accounts with secure authentication and password recovery
- Portfolio profile creation and updates
- Evidence submission with validation and duplicate protection
- Deterministic repository analysis with a human-review fallback
- Verifier and admin review queues with audit logging
- Public verified portfolios and recruiter-facing exploration
- Badges, notifications, analytics summaries, and admin export actions
- Backend validation tests and a deployment-ready structure

## Run locally

1. Create backend/.env from backend/.env.example.
2. Create frontend/.env from frontend/.env.example.
3. Install and start the backend:

```bash
cd backend
npm install
npm run dev
```

4. Install and start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## Quality and validation

- Backend validation logic is enforced for titles, descriptions, skills, and evidence links.
- Review actions are permission-checked on the server before changing submission status.
- The project includes a backend regression test for submission validation.

```bash
cd backend
npm test
```

## Deploy notes

- Backend requires `MONGO_URI`, `JWT_SECRET`, and optionally `PORT`.
- Frontend requires `VITE_API_URL` pointing to the deployed backend `/api` base URL.
- The backend exposes `/api/health` for deployment health checks.
- The AI feature is intentionally deterministic in this release so it can be evaluated safely before introducing an external model.

