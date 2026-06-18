import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import { AuthContext } from "../../context/authContextValue";

const normalizeRole = (role) => (role === "administrator" ? "admin" : role || "student");
const formatStatusLabel = (status) => String(status || "pending").replace(/_/g, " ");

const viewTitles = {
  queue: ["Verification queue", "Review pending proof-of-work submissions."],
  "review-workspace": ["Review workspace", "Open evidence, compare proof, and record review decisions."],
  "reviewer-analytics": ["Reviewer analytics", "Track completed reviews, pending work, and approval rate."],
  audit: ["Audit logs", "Inspect review and platform activity."],
  "audit-trail": ["Audit trail", "Inspect critical platform activity."],
  analytics: ["Reports snapshot", "Check verification analytics and public project health."],
  "analytics-dashboard": ["Analytics dashboard", "Track platform-wide metrics."],
  "public-projects": ["Public candidates", "Review verified public work."],
  "verification-management": ["Verification management", "Monitor pending and bottlenecked review work."],
  users: ["User management", "Review platform users and account status."],
  "badge-management": ["Badge management", "Review recent badge awards."],
  "data-exports": ["Data exports", "Export platform reports from the admin dashboard."],
  "system-monitoring": ["System monitoring", "Check runtime and storage status."],
  configuration: ["Configuration", "Review platform rules and notification settings."],
};

function WorkspaceDetail() {
  const navigate = useNavigate();
  const { view = "queue" } = useParams();
  const { user } = useContext(AuthContext);
  const role = normalizeRole(user?.role);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [data, setData] = useState({
    queue: [],
    audit: [],
    reviewAnalytics: null,
    analytics: null,
    publicProjects: [],
    adminOverview: null,
    users: [],
    badges: [],
  });
  const [reviewNotes, setReviewNotes] = useState({});
  const [busyKey, setBusyKey] = useState("");

  const [title, description] = useMemo(
    () => viewTitles[view] || ["Workspace", "Review detailed workspace information."],
    [view]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setStatus("loading");
      setMessage("");

      const requests = [];
      const needsQueue = ["queue", "review-workspace", "verification-management"].includes(view);
      const needsAudit = ["audit", "audit-trail"].includes(view);
      const needsReviewAnalytics = view === "reviewer-analytics";
      const needsAnalytics = ["analytics", "analytics-dashboard"].includes(view);
      const needsPublicProjects = ["public-projects", "analytics"].includes(view);

      if (needsQueue) requests.push(["queue", API.get("/projects/queue?status=pending")]);
      if (needsAudit) requests.push(["audit", API.get("/system/audit")]);
      if (needsReviewAnalytics) requests.push(["reviewAnalytics", API.get("/projects/reviewer-analytics")]);
      if (needsAnalytics) requests.push(["analytics", API.get("/projects/analytics")]);
      if (needsPublicProjects) requests.push(["publicProjects", API.get("/projects")]);
      if (role === "admin") {
        if (
          [
            "verification-management",
            "analytics-dashboard",
            "system-monitoring",
            "configuration",
            "data-exports",
          ].includes(view)
        ) {
          requests.push(["adminOverview", API.get("/system/admin-overview")]);
        }
        if (view === "users") requests.push(["users", API.get("/system/users")]);
        if (view === "badge-management") requests.push(["badges", API.get("/system/badges")]);
      }

      try {
        const responses = await Promise.all(requests.map(([, request]) => request));
        const nextData = {
          queue: [],
          audit: [],
          reviewAnalytics: null,
          analytics: null,
          publicProjects: [],
          adminOverview: null,
          users: [],
          badges: [],
        };

        requests.forEach(([key], index) => {
          nextData[key] = responses[index].data;
        });

        if (!cancelled) {
          setData(nextData);
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.response?.data?.message || "Unable to load this workspace.");
          setStatus("error");
        }
      }
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [role, view]);

  const submitReview = async (projectId, nextStatus) => {
    try {
      setBusyKey(`review-${projectId}-${nextStatus}`);
      await API.patch(`/projects/${projectId}/review`, {
        status: nextStatus,
        note: reviewNotes[projectId] || `Project ${formatStatusLabel(nextStatus)} from workspace.`,
      });
      setData((current) => ({
        ...current,
        queue: current.queue.filter((project) => project._id !== projectId),
      }));
      setMessage(`Project ${formatStatusLabel(nextStatus)} successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update the review decision.");
    } finally {
      setBusyKey("");
    }
  };

  const renderQueue = () => (
    <div className="grid gap-4">
      {data.queue.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          No pending submissions are waiting right now.
        </div>
      )}
      {data.queue.map((project) => (
        <article key={project._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{project.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{project.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student: {project.user?.name || "Unknown"} | Evidence: {formatStatusLabel(project.evidenceType)} | Score: {project.analysis?.score || 0}/100
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-800">
                  {formatStatusLabel(project.verificationStatus)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Evidence links</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.githubLink && <a className="rounded border px-3 py-1 text-sm text-sky-700" href={project.githubLink} target="_blank" rel="noreferrer">GitHub</a>}
                    {project.liveLink && <a className="rounded border px-3 py-1 text-sm text-sky-700" href={project.liveLink} target="_blank" rel="noreferrer">Live demo</a>}
                    {(project.proofFiles || []).map((file, index) => (
                      <a key={file} className="rounded border px-3 py-1 text-sm text-sky-700" href={file} target="_blank" rel="noreferrer">File {index + 1}</a>
                    ))}
                    {!project.githubLink && !project.liveLink && !(project.proofFiles || []).length && (
                      <span className="text-sm text-slate-500">No links or files attached.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Student context</p>
                  <p className="mt-2 text-sm text-slate-700">Skills: {(project.skills || []).join(", ") || "None listed"}</p>
                  <p className="mt-2 text-sm text-slate-700">Portfolio bio: {project.studentPortfolio?.bio || "No bio available."}</p>
                  <p className="mt-2 text-sm text-slate-700">GitHub: {project.studentPortfolio?.githubLink || "Not linked."}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Analysis</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{project.analysis?.summary || "No analysis summary available."}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Decision</p>
              <textarea
                value={reviewNotes[project._id] || ""}
                onChange={(event) => setReviewNotes((current) => ({ ...current, [project._id]: event.target.value }))}
                rows="7"
                placeholder="Add review notes."
                className="mt-3 w-full rounded border border-slate-300 p-3 text-sm"
              />
              <div className="mt-3 grid gap-2">
                <button type="button" disabled={busyKey === `review-${project._id}-verified`} onClick={() => submitReview(project._id, "verified")} className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Approve</button>
                <button type="button" disabled={busyKey === `review-${project._id}-rejected`} onClick={() => submitReview(project._id, "rejected")} className="rounded border border-rose-300 px-4 py-2 font-semibold text-rose-700 disabled:opacity-60">Reject</button>
                <button type="button" disabled={busyKey === `review-${project._id}-changes_requested`} onClick={() => submitReview(project._id, "changes_requested")} className="rounded border border-amber-300 px-4 py-2 font-semibold text-amber-700 disabled:opacity-60">Request changes</button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );

  const renderAnalytics = () => {
    const metrics = data.adminOverview?.metrics;
    const analytics = data.analytics || {};
    const cards = [
      ["Total projects", metrics?.totalProjects ?? analytics.total ?? 0],
      ["Verified projects", analytics.verified ?? 0],
      ["Pending reviews", metrics?.pendingVerifications ?? analytics.pending ?? 0],
      ["Approval rate", `${metrics?.approvalRate ?? analytics.verificationRate ?? 0}%`],
    ];

    return (
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderSimpleList = (items, emptyMessage, renderItem) => (
    <div className="grid gap-3">
      {items.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">{emptyMessage}</div>}
      {items.map(renderItem)}
    </div>
  );

  const renderContent = () => {
    if (["queue", "review-workspace", "verification-management"].includes(view)) return renderQueue();
    if (["analytics", "analytics-dashboard", "system-monitoring", "configuration", "data-exports"].includes(view)) return renderAnalytics();
    if (view === "reviewer-analytics") {
      const analytics = data.reviewAnalytics || {};
      return (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Reviews completed", analytics.reviewsCompleted || 0],
            ["Average review time", `${analytics.averageReviewTimeHours || 0}h`],
            ["Pending reviews", analytics.pendingReviews || 0],
            ["Approval percentage", `${analytics.approvalPercentage || 0}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      );
    }
    if (["audit", "audit-trail"].includes(view)) {
      return renderSimpleList(data.audit, "No audit events are visible yet.", (event) => (
        <article key={event._id} className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="font-semibold uppercase tracking-wide text-slate-900">{event.action}</p>
          <p className="mt-1 text-sm text-slate-600">Actor: {event.actor?.name || "System"} | Target: {event.metadata?.projectTitle || event.entityType}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
        </article>
      ));
    }
    if (view === "public-projects") {
      return renderSimpleList(data.publicProjects, "No verified public work is available yet.", (project) => (
        <article key={project._id} className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">{project.title}</h2>
          <p className="mt-1 text-sm text-slate-600">By {project.user?.name || "Unknown candidate"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{project.description}</p>
        </article>
      ));
    }
    if (view === "users") {
      return renderSimpleList(data.users, "No users found.", (entry) => (
        <article key={entry._id} className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-950">{entry.name}</p>
          <p className="mt-1 text-sm text-slate-600">{entry.email} | {entry.role} | {entry.status}</p>
        </article>
      ));
    }
    if (view === "badge-management") {
      return renderSimpleList(data.badges, "No badges found.", (badge) => (
        <article key={badge._id} className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="font-semibold text-slate-950">{badge.name}</p>
          <p className="mt-1 text-sm text-slate-600">Awarded to {badge.user?.name || "Unknown"} as {badge.level}</p>
        </article>
      ));
    }
    return <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">This workspace is ready.</div>;
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
            {message}
          </div>
        )}

        {status === "loading" && <div className="rounded-lg border border-slate-200 bg-white p-5">Loading workspace...</div>}
        {status === "error" && <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">{message}</div>}
        {status === "ready" && renderContent()}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button className="rounded border border-slate-300 px-4 py-3" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
          <Link className="rounded border border-slate-300 px-4 py-3 text-center" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default WorkspaceDetail;
