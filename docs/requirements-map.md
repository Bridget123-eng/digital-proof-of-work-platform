# Digital Proof of Work Requirements Map

This project implements the guide's MVP as one connected workflow:

- Account access: student, verifier, recruiter, and admin roles can register, login, recover passwords, and receive protected dashboard access.
- Portfolio profile: users can create/update bio, skills, profile image URL, GitHub profile, certificates, and public portfolio data.
- Evidence submission: authenticated users submit projects with description, skills, repository/live links, proof URLs, certificates, visibility, and lifecycle status.
- Repository analysis: the backend applies deterministic scoring with strengths, risks, summary, timestamp, and `fallbackUsed` metadata.
- Verification queue: verifier/reviewer/admin/recruiter roles can view authorized evidence with status filters and text search.
- Reviewer workspace: verifier/reviewer/admin roles can move projects through `in_review`, `verified`, `changes_requested`, and `rejected`.
- Public portfolio: Explore shows verified public work and links to allowlisted public profile views.
- Badges: verified projects create a "Verified Proof of Work" badge.
- Notifications: review updates create user notifications.
- Audit trail: profile, project submission, review, demo seed, and admin updates create audit events.
- Analytics and reports: role dashboards show verification analytics and export queue data as CSV.
- Administration: admins can seed demo data, view users, update user roles, and suspend/reactivate accounts.
- Security boundaries: protected APIs enforce JWT authentication, role authorization, and suspended-account blocking on the backend.
- Demo readiness: seed data creates student, verifier, recruiter, and admin demo accounts using `Password123!`.

Known production notes:

- MongoDB Atlas network access must allow the current machine IP.
- File uploads are represented as proof URLs in this release; production object storage or signed URLs should replace permanent public URLs.
- The AI feature is currently deterministic analysis, which is the required fallback baseline before introducing an external model.
