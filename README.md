# Digital Proof of Work Platform

A full-stack MERN MVP for verified student proof-of-work portfolios. It supports role-based accounts, student evidence submission, deterministic project analysis, verifier review queues, recruiter-facing analytics, public verified work, badges, notifications, audit trails, and admin demo seeding.

## Run locally

1. Create `backend/.env` from `backend/.env.example`.
2. Create `frontend/.env` from `frontend/.env.example`.
3. Install and start the backend:

```bash
cd backend
npm install
npm run dev
```

4. Install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

5. Register an admin account, sign in, open the dashboard, and click `Seed demo data`.

Demo accounts created by seeding all use `Password123!`:

- `student@dpow.demo`
- `verifier@dpow.demo`
- `recruiter@dpow.demo`
- `admin@dpow.demo`

## Deploy notes

- Backend requires `MONGO_URI`, `JWT_SECRET`, and optionally `PORT`.
- Frontend requires `VITE_API_URL` pointing to the deployed backend `/api` base URL.
- The backend exposes `/api/health` for deployment health checks.
A platform for verifying student achievements, project authenticity, and employability through secure proof-of-work validation workflows.
