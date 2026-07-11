import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import { AuthContext } from "../../context/authContextValue";

const normalizeRole = (role) => ({ administrator: "admin", verifier: "reviewer" }[role] || role || "student");
const formatStatusLabel = (status) => String(status || "pending").replace(/_/g, " ");

const viewTitles = {
  queue: ["Verification queue", "Review pending proof-of-work submissions."],
  "review-workspace": ["Review workspace", "Open evidence, compare proof, and record review decisions."],
  "reviewer-analytics": ["Reviewer analytics", "Track completed reviews, pending work, and approval rate."],
  audit: ["Audit logs", "Inspect review and platform activity."],
  "audit-logs": ["Audit logs", "Inspect review and platform activity."],
  "audit-trail": ["Audit trail", "Inspect critical platform activity."],
  analytics: ["Reports snapshot", "Check verification analytics and public project health."],
  "analytics-dashboard": ["Analytics dashboard", "Track platform-wide metrics."],
  "public-projects": ["Public candidates", "Review verified public work."],
  "verification-management": ["Verification management", "Monitor pending and bottlenecked review work."],
  users: ["User management", "Create accounts and manage platform access."],
  "badge-management": ["Badge management", "Create, award, and monitor badges."],
  "data-exports": ["Data exports", "Export platform reports."],
  "system-monitoring": ["System monitoring", "Check runtime and storage status."],
  configuration: ["Configuration", "Manage platform rules and notification templates."],
};

const emptyCreateUserForm = {
  name: "",
  email: "",
  role: "student",
  password: "",
};

const emptyBadgeForm = {
  userId: "",
  name: "Top Contributor",
  description: "",
  level: "bronze",
};

const emptyConfigForm = {
  badgeRules: "",
  verificationCriteria: "",
  aiMode: "",
  humanReviewRequired: true,
  notificationTemplates: "",
};

const buildConfigForm = (configuration = {}) => ({
  badgeRules: (configuration.badgeRules || []).join("\n"),
  verificationCriteria: (configuration.verificationCriteria || []).join("\n"),
  aiMode: configuration.aiSettings?.mode || "",
  humanReviewRequired: configuration.aiSettings?.humanReviewRequired !== false,
  notificationTemplates: (configuration.notificationTemplates || []).join("\n"),
});

function WorkspaceDetail() {
  const navigate = useNavigate();
  const { view = "queue" } = useParams();
  const { user } = useContext(AuthContext);
  const role = normalizeRole(user?.role);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [tempPasswordMessage, setTempPasswordMessage] = useState("");
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
  const [rowEdits, setRowEdits] = useState({});
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm);
  const [badgeForm, setBadgeForm] = useState(emptyBadgeForm);
  const [configForm, setConfigForm] = useState(emptyConfigForm);
  const [busyKey, setBusyKey] = useState("");

  const [title, description] = useMemo(
    () => viewTitles[view] || ["Workspace", "Review detailed workspace information."],
    [view]
  );

  const loadWorkspace = async () => {
    setStatus("loading");
    setMessage("");

    const requests = [];
    const needsQueue = ["queue", "review-workspace", "verification-management"].includes(view);
    const needsAudit = ["audit", "audit-trail", "audit-logs"].includes(view);
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
          "audit-trail",
        ].includes(view)
      ) {
        requests.push(["adminOverview", API.get("/system/admin-overview")]);
      }
      if (["users", "badge-management"].includes(view)) requests.push(["users", API.get("/system/users")]);
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

      setData(nextData);
      setRowEdits(
        Object.fromEntries(
          (nextData.users || []).map((entry) => [
            entry._id,
            {
              role: normalizeRole(entry.role),
              status: entry.status || "active",
              assignedVerifier: entry.assignedVerifier?._id || entry.assignedVerifier || "",
            },
          ])
        )
      );
      if (nextData.users?.length) {
        setBadgeForm((current) => (current.userId ? current : { ...current, userId: nextData.users[0]._id }));
      }
      if (nextData.adminOverview?.configuration) {
        setConfigForm(buildConfigForm(nextData.adminOverview.configuration));
      }
      setStatus("ready");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load this workspace.");
      setStatus("error");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const createAdminUser = async (event) => {
    event.preventDefault();
    try {
      setBusyKey("create-user");
      const { data: response } = await API.post("/system/users", createUserForm);
      setCreateUserForm(emptyCreateUserForm);
      setTempPasswordMessage(`Temporary password for ${response.user.email}: ${response.temporaryPassword}`);
      setMessage("Account created successfully.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create the account.");
    } finally {
      setBusyKey("");
    }
  };

  const saveUserUpdate = async (userId) => {
    try {
      setBusyKey(`user-${userId}`);
      await API.patch(`/system/users/${userId}`, rowEdits[userId]);
      setMessage("User access updated and recorded in the audit trail.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update that user.");
    } finally {
      setBusyKey("");
    }
  };

  const resetUserAccount = async (userId) => {
    try {
      setBusyKey(`reset-${userId}`);
      const { data: response } = await API.post(`/system/users/${userId}/reset-account`);
      setTempPasswordMessage(`Temporary password for ${response.user.email}: ${response.temporaryPassword}`);
      setMessage(response.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to reset that account.");
    } finally {
      setBusyKey("");
    }
  };

  const createBadgeAward = async (event) => {
    event.preventDefault();
    try {
      setBusyKey("create-badge");
      const { data: response } = await API.post("/system/badges", badgeForm);
      setBadgeForm((current) => ({ ...emptyBadgeForm, userId: current.userId, name: current.name }));
      setMessage(`Badge "${response.name}" awarded successfully.`);
      await loadWorkspace();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create the badge.");
    } finally {
      setBusyKey("");
    }
  };

  const deleteBadgeAward = async (badgeId) => {
    try {
      setBusyKey(`delete-badge-${badgeId}`);
      const { data: response } = await API.delete(`/system/badges/${badgeId}`);
      setMessage(response.message);
      await loadWorkspace();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete the badge.");
    } finally {
      setBusyKey("");
    }
  };

  const saveSystemConfig = async (event) => {
    event.preventDefault();
    try {
      setBusyKey("save-config");
      await API.put("/system/config", {
        badgeRules: configForm.badgeRules.split("\n").map((item) => item.trim()).filter(Boolean),
        verificationCriteria: configForm.verificationCriteria.split("\n").map((item) => item.trim()).filter(Boolean),
        aiSettings: {
          mode: configForm.aiMode,
          humanReviewRequired: configForm.humanReviewRequired,
        },
        notificationTemplates: configForm.notificationTemplates.split("\n").map((item) => item.trim()).filter(Boolean),
      });
      setMessage("Platform configuration updated successfully.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update configuration.");
    } finally {
      setBusyKey("");
    }
  };

  const exportReport = async (type) => {
    try {
      setBusyKey(`export-${type}`);
      const { data: response } = await API.get(`/system/exports/${type}`);
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-export.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`${type} export created successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to export that report.");
    } finally {
      setBusyKey("");
    }
  };

  const renderQueue = () => (
    <div className="grid gap-4">
      {view === "verification-management" && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Pending verifications", data.adminOverview?.metrics?.pendingVerifications || data.queue.length],
            ["Rejected submissions", data.adminOverview?.metrics?.rejectedSubmissions || 0],
            ["Review bottlenecks", data.adminOverview?.verificationManagement?.reviewBottlenecks?.length || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      )}

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
                      <a key={index} className="rounded border px-3 py-1 text-sm text-sky-700" href={typeof file === "string" ? file : file.url} target="_blank" rel="noreferrer">
                        {typeof file === "string" ? `File ${index + 1}` : (file.title || `File ${index + 1}`)}
                      </a>
                    ))}
                    {(project.certificates || []).map((certificate) => (
                      <a key={certificate.fileUrl || certificate.title} className="rounded border px-3 py-1 text-sm text-sky-700" href={certificate.fileUrl} target="_blank" rel="noreferrer">
                        {certificate.title || "Certificate"}
                      </a>
                    ))}
                    {!project.githubLink && !project.liveLink && !(project.proofFiles || []).length && !(project.certificates || []).length && (
                      <span className="text-sm text-slate-500">No links or files attached.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Student context</p>
                  <p className="mt-2 text-sm text-slate-700">Skills: {(project.skills || []).join(", ") || "None listed"}</p>
<<<<<<< HEAD
                  <p className="mt-2 text-sm text-slate-700">Education: {(project.studentPortfolio?.education || []).map(e => `${e.degree} at ${e.school}`).join(", ") || "Not listed."}</p>
                  <p className="mt-2 text-sm text-slate-700">Degree: {project.studentPortfolio?.degree || "Not listed."}</p>
=======
<<<<<<< HEAD
                  <p className="mt-2 text-sm text-slate-700">Education: {(project.studentPortfolio?.education || []).map(e => `${e.degree} at ${e.school}`).join(", ") || "Not listed."}</p>
=======
                  <p className="mt-2 text-sm text-slate-700">Degree: {project.studentPortfolio?.degree || "Not listed."}</p>
>>>>>>> 368968e66cf7d6dcbb335f03665c323669d1a628
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
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
              {role === "reviewer" ? <>
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
              </> : <p className="text-sm text-slate-600">This queue is visible for monitoring. Only reviewer accounts can approve, reject, or request changes.</p>}
            </div>
          </div>
        </article>
      ))}

      {view === "verification-management" && (data.adminOverview?.verificationManagement?.reviewBottlenecks || []).length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Review bottlenecks</h2>
          <div className="mt-3 grid gap-2">
            {data.adminOverview.verificationManagement.reviewBottlenecks.map((item) => (
              <p key={item.projectId || item.title} className="text-sm text-slate-700">
                {item.title} by {item.studentName || "Unknown"} has been waiting {item.waitingHours} hours.
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderAnalytics = () => {
    const metrics = data.adminOverview?.metrics;
    const analytics = data.analytics || {};
    const cards = [
      ["Total users", metrics?.totalUsers ?? 0],
      ["Total projects", metrics?.totalProjects ?? analytics.total ?? 0],
      ["Approval rate", `${metrics?.approvalRate ?? analytics.verificationRate ?? 0}%`],
      ["Verification turnaround", `${metrics?.averageTurnaroundHours ?? 0}h`],
      ["Active recruiters", `${metrics?.activeRecruiters ?? 0} / ${metrics?.totalRecruiters ?? 0}`],
    ];

    return (
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderUsers = () => (
    <div className="grid gap-6">
      <form onSubmit={createAdminUser} className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Create account</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_1fr_auto]">
          <input value={createUserForm.name} onChange={(event) => setCreateUserForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className="rounded border border-slate-300 px-3 py-2" required />
          <input type="email" value={createUserForm.email} onChange={(event) => setCreateUserForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" className="rounded border border-slate-300 px-3 py-2" required />
          <select value={createUserForm.role} onChange={(event) => setCreateUserForm((current) => ({ ...current, role: event.target.value }))} className="rounded border border-slate-300 px-3 py-2">
            <option value="student">student</option>
            <option value="reviewer">reviewer</option>
<<<<<<< HEAD
=======
            <option value="verifier">verifier</option>
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
            <option value="mentor">mentor</option>
            <option value="recruiter">recruiter</option>
            <option value="admin">admin</option>
          </select>
          <input value={createUserForm.password} onChange={(event) => setCreateUserForm((current) => ({ ...current, password: event.target.value }))} placeholder="Temporary password (optional)" className="rounded border border-slate-300 px-3 py-2" />
          <button type="submit" disabled={busyKey === "create-user"} className="rounded bg-sky-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Create</button>
        </div>
      </form>

      <div className="grid gap-3">
        {data.users.map((entry) => (
          <article key={entry._id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_auto_auto]">
              <div>
                <p className="font-semibold text-slate-950">{entry.name}</p>
                <p className="mt-1 text-sm text-slate-600">{entry.email}</p>
              </div>
              <label className="grid gap-1 text-sm text-slate-600">
                <span>Role</span>
                <select value={rowEdits[entry._id]?.role || normalizeRole(entry.role)} onChange={(event) => setRowEdits((current) => ({ ...current, [entry._id]: { ...current[entry._id], role: event.target.value } }))} className="rounded border border-slate-300 px-3 py-2">
                  <option value="student">student</option>
                  <option value="reviewer">reviewer</option>
<<<<<<< HEAD
=======
                  <option value="verifier">verifier</option>
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
                  <option value="mentor">mentor</option>
                  <option value="recruiter">recruiter</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                <span>Status</span>
                <select value={rowEdits[entry._id]?.status || entry.status || "active"} onChange={(event) => setRowEdits((current) => ({ ...current, [entry._id]: { ...current[entry._id], status: event.target.value } }))} className="rounded border border-slate-300 px-3 py-2">
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </label>
              {normalizeRole(entry.role) === "student" ? (
                <label className="grid gap-1 text-sm text-slate-600">
                  <span>Reviewer</span>
                  <select value={rowEdits[entry._id]?.assignedVerifier || ""} onChange={(event) => setRowEdits((current) => ({ ...current, [entry._id]: { ...current[entry._id], assignedVerifier: event.target.value } }))} className="rounded border border-slate-300 px-3 py-2">
                    <option value="">Unassigned</option>
                    {data.users
                      .filter((userEntry) => normalizeRole(userEntry.role) === "reviewer" && (userEntry.status || "active") === "active")
                      .map((verifier) => (
                        <option key={verifier._id} value={verifier._id}>{verifier.name}</option>
                      ))}
                  </select>
                </label>
              ) : (
                <div className="hidden lg:block" />
              )}
              <button type="button" onClick={() => saveUserUpdate(entry._id)} disabled={busyKey === `user-${entry._id}`} className="self-end rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save</button>
              <button type="button" onClick={() => resetUserAccount(entry._id)} disabled={busyKey === `reset-${entry._id}`} className="self-end rounded border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60">Reset</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderBadges = () => (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={createBadgeAward} className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Create and award badge</h2>
        <div className="mt-4 grid gap-3">
          <select value={badgeForm.userId} onChange={(event) => setBadgeForm((current) => ({ ...current, userId: event.target.value }))} className="rounded border border-slate-300 px-3 py-2">
            {data.users.map((entry) => (
              <option key={entry._id} value={entry._id}>{entry.name} ({entry.email})</option>
            ))}
          </select>
          <select value={badgeForm.name} onChange={(event) => setBadgeForm((current) => ({ ...current, name: event.target.value }))} className="rounded border border-slate-300 px-3 py-2">
            <option value="Top Contributor">Top Contributor</option>
            <option value="AI Developer">AI Developer</option>
            <option value="Research Scholar">Research Scholar</option>
            <option value="Verified Proof of Work">Verified Proof of Work</option>
          </select>
          <textarea value={badgeForm.description} onChange={(event) => setBadgeForm((current) => ({ ...current, description: event.target.value }))} placeholder="Badge description" rows="4" className="rounded border border-slate-300 px-3 py-2" />
          <select value={badgeForm.level} onChange={(event) => setBadgeForm((current) => ({ ...current, level: event.target.value }))} className="rounded border border-slate-300 px-3 py-2">
            <option value="bronze">bronze</option>
            <option value="silver">silver</option>
            <option value="gold">gold</option>
          </select>
          <button type="submit" disabled={busyKey === "create-badge"} className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Award badge</button>
        </div>
      </form>
      <div className="grid gap-3">
        {data.badges.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No badge awards have been created yet.</div>}
        {data.badges.map((badge) => (
          <article key={badge._id} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-950">{badge.name}</p>
            <p className="mt-1 text-sm text-slate-600">Awarded to {badge.user?.name || "Unknown"} as {badge.level}</p>
            <p className="mt-2 text-sm text-slate-700">{badge.description || "No description provided."}</p>
            <button type="button" onClick={() => deleteBadgeAward(badge._id)} disabled={busyKey === `delete-badge-${badge._id}`} className="mt-3 rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60">Delete badge</button>
          </article>
        ))}
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="grid gap-3">
      {data.audit.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No audit events are visible yet.</div>}
      {data.audit.map((event) => (
        <article key={event._id} className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="font-semibold uppercase tracking-wide text-slate-900">{event.action}</p>
          <p className="mt-1 text-sm text-slate-600">Actor: {event.actor?.name || "System"} | Target: {event.metadata?.projectTitle || event.entityType}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
        </article>
      ))}
    </div>
  );

  const renderExports = () => (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        { key: "users", label: "Export users" },
        { key: "audit", label: "Export audit trail" },
        { key: "analytics", label: "Export analytics" },
      ].map((item) => (
        <button key={item.key} type="button" onClick={() => exportReport(item.key)} disabled={busyKey === `export-${item.key}`} className="rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:border-sky-300 disabled:opacity-60">
          <span className="block font-semibold text-slate-950">{item.label}</span>
          <span className="mt-1 block text-sm text-slate-600">Records an audited export event.</span>
        </button>
      ))}
    </div>
  );

  const renderMonitoring = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Runtime health</h2>
        <div className="mt-4 grid gap-3">
          {[
            ["API health", data.adminOverview?.monitoring?.api || "unknown"],
            ["AI service status", data.adminOverview?.monitoring?.aiService || "unknown"],
            ["Background jobs", data.adminOverview?.monitoring?.backgroundJobs || "unknown"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Storage usage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(data.adminOverview?.monitoring?.storageUsage || {}).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm capitalize text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderConfiguration = () => (
    <form onSubmit={saveSystemConfig} className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Badge rules
          <textarea value={configForm.badgeRules} onChange={(event) => setConfigForm((current) => ({ ...current, badgeRules: event.target.value }))} rows="5" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Verification criteria
          <textarea value={configForm.verificationCriteria} onChange={(event) => setConfigForm((current) => ({ ...current, verificationCriteria: event.target.value }))} rows="5" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950" />
        </label>
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            AI mode
            <input value={configForm.aiMode} onChange={(event) => setConfigForm((current) => ({ ...current, aiMode: event.target.value }))} className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950" />
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={configForm.humanReviewRequired} onChange={(event) => setConfigForm((current) => ({ ...current, humanReviewRequired: event.target.checked }))} />
            Human review required
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Notification templates
          <textarea value={configForm.notificationTemplates} onChange={(event) => setConfigForm((current) => ({ ...current, notificationTemplates: event.target.value }))} rows="5" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950" />
        </label>
      </div>
      <button type="submit" disabled={busyKey === "save-config"} className="mt-6 rounded bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Save configuration</button>
    </form>
  );

  const renderPublicProjects = () => (
    <div className="grid gap-3">
      {data.publicProjects.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No verified public work is available yet.</div>}
      {data.publicProjects.map((project) => (
        <article key={project._id} className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">{project.title}</h2>
          <p className="mt-1 text-sm text-slate-600">By {project.user?.name || "Unknown candidate"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{project.description}</p>
        </article>
      ))}
    </div>
  );

  const renderReviewerAnalytics = () => {
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
  };

  const renderContent = () => {
    if (["queue", "review-workspace", "verification-management"].includes(view)) return renderQueue();
    if (["analytics", "analytics-dashboard"].includes(view)) return renderAnalytics();
    if (view === "reviewer-analytics") return renderReviewerAnalytics();
    if (["audit", "audit-trail"].includes(view)) return renderAudit();
    if (view === "public-projects") return renderPublicProjects();
    if (view === "users") return renderUsers();
    if (view === "badge-management") return renderBadges();
    if (view === "data-exports") return renderExports();
    if (view === "system-monitoring") return renderMonitoring();
    if (view === "configuration") return renderConfiguration();
    return <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">This workspace is ready.</div>;
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>

        {message && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</div>}
        {tempPasswordMessage && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{tempPasswordMessage}</div>}

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
