import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/authContextValue";
import studentDashboard from "../../assets/dashboards/student-dashboard.png";
import adminDashboard from "../../assets/dashboards/admin-dashboard.png";
import verifierDashboard from "../../assets/dashboards/verifier-dashboard.png";
import recruiterDashboard from "../../assets/dashboards/recruiter-dashboard.png";


function getDashboardImage(role) {
  if (role === "admin" || role === "administrator") return adminDashboard;
  if (role === "recruiter") return recruiterDashboard;
  if (role === "verifier" || role === "reviewer") return verifierDashboard;
  return studentDashboard;
}

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const role = user?.role || "student";
  const image = getDashboardImage(role);
  const profileRoute = user?.id || user?._id ? `/profile/user/${user?.id || user?._id}` : "/edit-portfolio";

  const actions = [
    { label: "My Profile", route: profileRoute },
    { label: "Evidence", route: "/upload-project" },
    { label: "Repositories", route: "/explore" },
    { label: "Verifications", route: "/my-projects" },
    { label: "Badges", route: "/my-projects" },
    { label: "Notifications", route: "/dashboard" },
    { label: "Public Portfolio", route: "/explore" },
    { label: "Activity", route: "/my-projects" },
  ];

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div
        className="fixed inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: "100% 100%",
        }}
      />
      <div className="fixed inset-0 bg-slate-950/70" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-7xl rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-inner shadow-black/20">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Digital Proof of Work</p>
                <h1 className="mt-4 text-4xl font-semibold">Dashboard</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Click the feature name to go directly to that section. The image covers the full page and the menu is aligned with the action labels.
                </p>
              </div>

              <div className="grid gap-3">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => navigate(action.route)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-left text-base font-semibold text-white transition hover:border-sky-300 hover:bg-slate-900"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/30 shadow-2xl">
              <div className="h-full min-h-[420px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;

