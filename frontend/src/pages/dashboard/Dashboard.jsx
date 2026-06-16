import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/authContextValue";

const dashboardConfig = {
  student: {
    badge: "Student workspace",
    heading: "Show your work and keep your proof ready.",
    description:
      "Track your portfolio, submit evidence, and keep your public profile ready for recruiters and reviewers.",
    highlights: ["Portfolio ready", "Evidence submissions", "Verification progress"],
  },
  verifier: {
    badge: "Verifier workspace",
    heading: "Review evidence and keep the trust layer moving.",
    description:
      "Jump into submitted work, check proof quality, and keep approval decisions organized for the platform.",
    highlights: ["Pending reviews", "Proof quality checks", "Approval decisions"],
  },
  reviewer: {
    badge: "Reviewer workspace",
    heading: "Review evidence and keep the trust layer moving.",
    description:
      "Jump into submitted work, check proof quality, and keep approval decisions organized for the platform.",
    highlights: ["Pending reviews", "Proof quality checks", "Approval decisions"],
  },
  recruiter: {
    badge: "Recruiter workspace",
    heading: "Browse trusted work and spot strong candidates faster.",
    description:
      "Explore public portfolios, verified projects, and signals that help you evaluate candidates with confidence.",
    highlights: ["Candidate portfolios", "Verified project work", "Recruitment signals"],
  },
  admin: {
    badge: "Admin workspace",
    heading: "Keep the platform healthy and the workflows aligned.",
    description:
      "Monitor users, review platform activity, and step into verification or recruiting flows when needed.",
    highlights: ["User management", "Platform activity", "Workflow oversight"],
  },
};

function getDashboardConfig(role) {
  if (role === "administrator") return dashboardConfig.admin;
  return dashboardConfig[role] || dashboardConfig.student;
}

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const role = user?.role || "student";
  const config = getDashboardConfig(role);
  const profileRoute = user?.id || user?._id ? `/profile/user/${user?.id || user?._id}` : "/edit-portfolio";

  const actions = [
    { label: "My Profile", route: profileRoute, detail: "View your public-facing profile" },
    { label: "Evidence", route: "/upload-project", detail: "Submit proof of work and supporting links" },
    { label: "Repositories", route: "/explore", detail: "Browse project work across the platform" },
    { label: "Verifications", route: "/my-projects", detail: "Check review and approval status" },
    { label: "Badges", route: "/my-projects", detail: "See the trust signals attached to your work" },
    { label: "Notifications", route: "/dashboard", detail: "Return here for the latest activity snapshot" },
    { label: "Public Portfolio", route: "/explore", detail: "Open visible work and published profiles" },
    { label: "Activity", route: "/my-projects", detail: "Review recent project updates in one place" },
  ];

  const quickStats = [
    { value: actions.length, label: "Quick actions" },
    { value: config.highlights.length, label: "Focus areas" },
    { value: role === "administrator" ? "Admin" : role.charAt(0).toUpperCase() + role.slice(1), label: "Current role" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl">
            <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Digital Proof of Work</p>
                  <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                    {config.badge}
                  </div>
                  <div>
                    <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight">{config.heading}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{config.description}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {quickStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <p className="text-2xl font-semibold text-white">{stat.value}</p>
                      <p className="mt-1 text-sm text-slate-300">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => navigate(action.route)}
                      className="rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-left transition hover:border-sky-300 hover:bg-slate-900"
                    >
                      <span className="block text-base font-semibold text-white">{action.label}</span>
                      <span className="mt-1 block text-sm text-slate-400">{action.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                <div className="flex h-full flex-col gap-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Focus areas</p>
                    <h2 className="mt-4 text-2xl font-semibold">What this dashboard supports</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      The dashboard no longer depends on uploaded artwork, so this panel stays useful even when image assets are removed.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {config.highlights.map((item, index) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          0{index + 1}
                        </p>
                        <p className="mt-2 text-lg font-medium text-white">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="text-sm font-semibold text-emerald-100">Signed in as</p>
                    <p className="mt-2 text-xl font-semibold text-white">{user?.name || "User"}</p>
                    <p className="mt-1 text-sm capitalize text-emerald-50/90">{role === "administrator" ? "admin" : role}</p>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
