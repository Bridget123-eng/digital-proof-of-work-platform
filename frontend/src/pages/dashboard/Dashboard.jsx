import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { AuthContext } from "../../context/authContextValue";

const dashboardConfig = {
  student: {
    badge: "Student workspace",
    heading: "Show your work and keep your proof ready.",
    description:
      "Manage your verified profile, submit evidence, and track how your proof-of-work is moving through review.",
  },
  verifier: {
    badge: "Verifier workspace",
    heading: "Review evidence and keep the trust layer moving.",
    description:
      "Work through the verification queue, make auditable decisions, and keep activity history visible.",
  },
  reviewer: {
    badge: "Reviewer workspace",
    heading: "Review evidence and keep the trust layer moving.",
    description:
      "Work through the verification queue, make auditable decisions, and keep activity history visible.",
  },
  recruiter: {
    badge: "Recruiter workspace",
    heading: "Search trusted work and evaluate candidates faster.",
    description:
      "Browse public proof-of-work, follow analytics, and focus on verified candidate signals instead of unproven claims.",
  },
  admin: {
    badge: "Administrator dashboard",
    heading: "Manage the platform, protect trust, and monitor every workflow.",
    description:
      "Control accounts, verification flow, badge awards, audit visibility, analytics, and configuration from one secure workspace.",
  },
};

const initialState = {
  notifications: [],
  badges: [],
  projects: [],
  queue: [],
  audit: [],
  users: [],
  publicProjects: [],
  analytics: null,
  portfolio: null,
  adminOverview: null,
  allBadges: [],
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

const normalizeRole = (role) => (role === "administrator" ? "admin" : role || "student");
const formatStatusLabel = (status) => String(status || "pending").replace(/_/g, " ");
const calculateProfileCompletion = (portfolio) => {
  if (!portfolio) {
    return 0;
  }

  const checks = [
    Boolean(portfolio.bio?.trim()),
    Boolean(portfolio.githubLink?.trim()),
    (portfolio.skills || []).length > 0,
    (portfolio.certificates || []).length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};
const getInitials = (name) =>
  String(name || "Student")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function getDashboardConfig(role) {
  return dashboardConfig[normalizeRole(role)] || dashboardConfig.student;
}

function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const role = normalizeRole(user?.role);
  const config = getDashboardConfig(role);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState(location.state?.message || "");
  const [dashboardData, setDashboardData] = useState(initialState);
  const [rowEdits, setRowEdits] = useState({});
  const [busyKey, setBusyKey] = useState("");
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm);
  const [badgeForm, setBadgeForm] = useState(emptyBadgeForm);
  const [configForm, setConfigForm] = useState(emptyConfigForm);
  const [tempPasswordMessage, setTempPasswordMessage] = useState("");

  useEffect(() => {
    if (location.state?.message) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setStatus("loading");
      setErrorMessage("");

      const requests = [
        ["notifications", API.get("/system/notifications")],
        ["portfolio", API.get("/portfolio/me")],
      ];

      if (role === "student" || role === "admin") {
        requests.push(["projects", API.get("/projects/my-projects")]);
        requests.push(["badges", API.get("/system/badges/me")]);
      }

      if (role === "verifier" || role === "reviewer" || role === "admin") {
        requests.push(["queue", API.get("/projects/queue?status=pending")]);
        requests.push(["audit", API.get("/system/audit")]);
      }

      if (role === "recruiter" || role === "admin") {
        requests.push(["analytics", API.get("/projects/analytics")]);
        requests.push(["publicProjects", API.get("/projects")]);
      }

      if (role === "admin") {
        requests.push(["users", API.get("/system/users")]);
        requests.push(["adminOverview", API.get("/system/admin-overview")]);
        requests.push(["allBadges", API.get("/system/badges")]);
      }

      try {
        const responses = await Promise.all(requests.map(([, request]) => request));
        const nextData = { ...initialState };

        requests.forEach(([key], index) => {
          nextData[key] = responses[index].data;
        });

        if (!cancelled) {
          setDashboardData(nextData);
          const nextRowEdits = Object.fromEntries(
            (nextData.users || []).map((entry) => [
              entry._id,
              {
                role: normalizeRole(entry.role),
                status: entry.status || "active",
              },
            ])
          );
          setRowEdits(nextRowEdits);
          if (!badgeForm.userId && nextData.users?.length) {
            setBadgeForm((current) => ({
              ...current,
              userId: nextData.users[0]._id,
            }));
          }
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.response?.data?.message || "Unable to load the dashboard right now.");
          setStatus("error");
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [role]);

  const unreadNotifications = dashboardData.notifications.filter((item) => !item.read).length;
  const adminOverview = dashboardData.adminOverview;
  const studentProjects = dashboardData.projects || [];
  const profileCompletion = calculateProfileCompletion(dashboardData.portfolio);
  const studentProjectStats = {
    submitted: studentProjects.length,
    pending: studentProjects.filter((project) => ["pending", "in_review"].includes(project.verificationStatus)).length,
    verified: studentProjects.filter((project) => project.verificationStatus === "verified").length,
    needsAttention: studentProjects.filter((project) =>
      ["rejected", "changes_requested"].includes(project.verificationStatus)
    ).length,
  };
  const studentNextSteps = [
    {
      label: profileCompletion < 100 ? "Complete your profile bio, GitHub, skills, and certificates." : "Your profile is complete and presentation-ready.",
      tone: profileCompletion < 100 ? "text-amber-100" : "text-emerald-100",
    },
    {
      label:
        studentProjectStats.pending > 0
          ? `${studentProjectStats.pending} submission${studentProjectStats.pending === 1 ? "" : "s"} currently waiting for verification.`
          : "No submissions are waiting for review right now.",
      tone: studentProjectStats.pending > 0 ? "text-sky-100" : "text-slate-200",
    },
    {
      label:
        studentProjectStats.needsAttention > 0
          ? `${studentProjectStats.needsAttention} submission${studentProjectStats.needsAttention === 1 ? "" : "s"} need updates or a resubmission.`
          : "No submissions currently need changes from you.",
      tone: studentProjectStats.needsAttention > 0 ? "text-rose-100" : "text-slate-200",
    },
  ];
  const roleOverviewCopy = {
    student: {
      title: "Student progress summary",
      description:
        "Keep your profile complete, submit strong evidence, and watch each verification step without needing any admin tools in this workspace.",
      note:
        "Your student workspace is limited to your own portfolio, projects, badges, and notifications. Verification and role changes stay server-protected.",
    },
    verifier: {
      title: "Verifier workspace summary",
      description:
        "Review pending evidence, make auditable decisions, and keep the trust layer moving with role-safe tools only.",
      note:
        "Verification actions are server-checked and recorded in the audit trail so reviewer decisions remain accountable.",
    },
    reviewer: {
      title: "Reviewer workspace summary",
      description:
        "Review pending evidence, make auditable decisions, and keep the trust layer moving with role-safe tools only.",
      note:
        "Verification actions are server-checked and recorded in the audit trail so reviewer decisions remain accountable.",
    },
    recruiter: {
      title: "Recruiter workspace summary",
      description:
        "Search trusted public work, compare verified signals, and focus on candidate quality instead of unverified claims.",
      note:
        "Recruiters only see the discovery and analytics surfaces intended for hiring workflows, not admin or review controls.",
    },
    admin: {
      title: "Administrator workspace summary",
      description:
        "Manage users, reviews, badges, analytics, monitoring, and platform rules from a single audited control surface.",
      note:
        "Suspended users are blocked from protected routes, role changes are server-checked, and admin events are recorded in the audit trail.",
    },
  };
  const roleOverview = roleOverviewCopy[role] || roleOverviewCopy.student;

  useEffect(() => {
    if (role === "admin" && adminOverview?.configuration) {
      setConfigForm({
        badgeRules: (adminOverview.configuration.badgeRules || []).join("\n"),
        verificationCriteria: (adminOverview.configuration.verificationCriteria || []).join("\n"),
        aiMode: adminOverview.configuration.aiSettings?.mode || "",
        humanReviewRequired: adminOverview.configuration.aiSettings?.humanReviewRequired !== false,
        notificationTemplates: (adminOverview.configuration.notificationTemplates || []).join("\n"),
      });
    }
  }, [role, adminOverview]);

  const roleActions = {
    student: [
      { label: "Edit profile", type: "route", route: "/edit-portfolio", detail: "Complete your verified profile." },
      { label: "Submit evidence", type: "route", route: "/upload-project", detail: "Add new proof-of-work." },
      { label: "My projects", type: "route", route: "/my-projects", detail: "Check review status and feedback." },
      { label: "Notifications", type: "info", action: "student-notifications", detail: "See updates and deadlines." },
      { label: "Badges", type: "info", action: "student-badges", detail: "Review trust signals earned." },
    ],
    verifier: [
      { label: "Verification queue", type: "section", section: "queue", detail: "Review pending submissions." },
      { label: "Audit history", type: "section", section: "audit", detail: "Inspect recent role-safe activity." },
      { label: "My profile", type: "route", route: "/edit-portfolio", detail: "Update your verifier profile." },
      { label: "Notifications", type: "section", section: "notifications", detail: "Track review updates." },
    ],
    reviewer: [
      { label: "Verification queue", type: "section", section: "queue", detail: "Review pending submissions." },
      { label: "Audit history", type: "section", section: "audit", detail: "Inspect recent role-safe activity." },
      { label: "My profile", type: "route", route: "/edit-portfolio", detail: "Update your reviewer profile." },
      { label: "Notifications", type: "section", section: "notifications", detail: "Track review updates." },
    ],
    recruiter: [
      { label: "Explore work", type: "route", route: "/explore", detail: "Search verified public projects." },
      { label: "Reports snapshot", type: "section", section: "analytics", detail: "Check verification analytics." },
      { label: "Public candidates", type: "section", section: "public-projects", detail: "Review trusted portfolios." },
      { label: "My profile", type: "route", route: "/edit-portfolio", detail: "Maintain your recruiter profile." },
    ],
    admin: [
      { label: "User management", type: "section", section: "users", detail: "Create, suspend, reset, and reassign accounts." },
      { label: "Verification management", type: "section", section: "verification-management", detail: "Monitor pending, rejected, and bottlenecked reviews." },
      { label: "Badge management", type: "section", section: "badge-management", detail: "Award and monitor platform badges." },
      { label: "Audit trail", type: "section", section: "audit-trail", detail: "Inspect critical security and workflow events." },
      { label: "Data exports", type: "section", section: "data-exports", detail: "Export users, audit, and analytics reports." },
      { label: "Analytics", type: "section", section: "analytics-dashboard", detail: "Track platform-wide metrics." },
      { label: "System monitoring", type: "section", section: "system-monitoring", detail: "Check API, storage, AI, and job status." },
      { label: "Configuration", type: "section", section: "configuration", detail: "Review current platform rules and templates." },
      { label: "Seed demo data", type: "action", action: "seed-demo", detail: "Prepare safe presentation accounts." },
    ],
  };

  const quickStatsByRole = {
    student: [
      { value: dashboardData.projects.length, label: "Projects submitted" },
      { value: unreadNotifications, label: "Unread notifications" },
      { value: dashboardData.badges.length, label: "Badges earned" },
    ],
    verifier: [
      { value: dashboardData.queue.length, label: "Pending reviews" },
      { value: unreadNotifications, label: "Unread notifications" },
      { value: dashboardData.audit.length, label: "Visible audit events" },
    ],
    reviewer: [
      { value: dashboardData.queue.length, label: "Pending reviews" },
      { value: unreadNotifications, label: "Unread notifications" },
      { value: dashboardData.audit.length, label: "Visible audit events" },
    ],
    recruiter: [
      { value: dashboardData.analytics?.verified || 0, label: "Verified projects" },
      { value: dashboardData.analytics?.verificationRate || 0, label: "Verification rate %" },
      { value: dashboardData.publicProjects.length, label: "Public work items" },
    ],
    admin: [
      { value: adminOverview?.metrics?.totalUsers || dashboardData.users.length, label: "Total users" },
      { value: adminOverview?.metrics?.totalProjects || 0, label: "Total projects" },
      { value: adminOverview?.metrics?.approvalRate || 0, label: "Approval rate %" },
    ],
  };

  const actions = roleActions[role] || roleActions.student;
  const quickStats = quickStatsByRole[role] || quickStatsByRole.student;

  const refreshAdminSlices = async () => {
    if (role !== "admin") return;

    const [{ data: users }, { data: adminOverview }, { data: allBadges }] = await Promise.all([
      API.get("/system/users"),
      API.get("/system/admin-overview"),
      API.get("/system/badges"),
    ]);

    setDashboardData((current) => ({
      ...current,
      users,
      adminOverview,
      allBadges,
    }));

    setRowEdits(
      Object.fromEntries(
        users.map((entry) => [
          entry._id,
          {
            role: normalizeRole(entry.role),
            status: entry.status || "active",
          },
        ])
      )
    );
  };

  const handleAction = async (action) => {
    if (action.type === "route") {
      navigate(action.route);
      return;
    }

    if (action.type === "section") {
      document.getElementById(action.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action.type === "info") {
      if (action.action === "student-notifications") {
        setActionMessage(
          unreadNotifications > 0
            ? `You have ${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}.`
            : "You do not have any unread notifications right now."
        );
      }

      if (action.action === "student-badges") {
        setActionMessage(
          dashboardData.badges.length > 0
            ? `You have earned ${dashboardData.badges.length} badge${dashboardData.badges.length === 1 ? "" : "s"}.`
            : "You have not earned any badges yet."
        );
      }
      return;
    }

    if (action.action === "seed-demo") {
      try {
        setBusyKey("seed-demo");
        const { data } = await API.post("/system/seed-demo");
        setActionMessage(`${data.message}. Demo credentials are ready to use.`);
        await refreshAdminSlices();
      } catch (error) {
        setActionMessage(error.response?.data?.message || "Unable to seed demo data.");
      } finally {
        setBusyKey("");
      }
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      setBusyKey(`notification-${notificationId}`);
      await API.patch(`/system/notifications/${notificationId}/read`);
      setDashboardData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item._id === notificationId ? { ...item, read: true } : item
        ),
      }));
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to update the notification.");
    } finally {
      setBusyKey("");
    }
  };

  const submitReview = async (projectId, nextStatus) => {
    try {
      setBusyKey(`review-${projectId}-${nextStatus}`);
      await API.patch(`/projects/${projectId}/review`, {
        status: nextStatus,
        note:
          nextStatus === "verified"
            ? "Verified from dashboard workspace."
            : "Returned from dashboard workspace for another review cycle.",
      });
      setDashboardData((current) => ({
        ...current,
        queue: current.queue.filter((project) => project._id !== projectId),
      }));
      setActionMessage(`Project ${nextStatus.replace("_", " ")} successfully.`);
      if (role === "admin") {
        await refreshAdminSlices();
      }
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to update the review decision.");
    } finally {
      setBusyKey("");
    }
  };

  const saveUserUpdate = async (userId) => {
    const nextValues = rowEdits[userId];

    try {
      setBusyKey(`user-${userId}`);
      const { data } = await API.patch(`/system/users/${userId}`, nextValues);
      setDashboardData((current) => ({
        ...current,
        users: current.users.map((entry) => (entry._id === userId ? data : entry)),
      }));
      setActionMessage("User access updated and recorded in the audit trail.");
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to update that user.");
    } finally {
      setBusyKey("");
    }
  };

  const resetUserAccount = async (userId) => {
    try {
      setBusyKey(`reset-${userId}`);
      const { data } = await API.post(`/system/users/${userId}/reset-account`);
      setTempPasswordMessage(`Temporary password for ${data.user.email}: ${data.temporaryPassword}`);
      setActionMessage(data.message);
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to reset that account.");
    } finally {
      setBusyKey("");
    }
  };

  const createAdminUser = async (event) => {
    event.preventDefault();

    try {
      setBusyKey("create-user");
      const { data } = await API.post("/system/users", createUserForm);
      setCreateUserForm(emptyCreateUserForm);
      setTempPasswordMessage(`Temporary password for ${data.user.email}: ${data.temporaryPassword}`);
      setActionMessage("Account created successfully.");
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to create the account.");
    } finally {
      setBusyKey("");
    }
  };

  const createBadgeAward = async (event) => {
    event.preventDefault();

    try {
      setBusyKey("create-badge");
      const { data } = await API.post("/system/badges", badgeForm);
      setBadgeForm((current) => ({
        ...emptyBadgeForm,
        userId: current.userId,
        name: current.name,
      }));
      setActionMessage(`Badge "${data.name}" awarded successfully.`);
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to create the badge.");
    } finally {
      setBusyKey("");
    }
  };

  const deleteBadgeAward = async (badgeId) => {
    try {
      setBusyKey(`delete-badge-${badgeId}`);
      const { data } = await API.delete(`/system/badges/${badgeId}`);
      setActionMessage(data.message);
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to delete the badge.");
    } finally {
      setBusyKey("");
    }
  };

  const saveSystemConfig = async (event) => {
    event.preventDefault();

    try {
      setBusyKey("save-config");
      const payload = {
        badgeRules: configForm.badgeRules.split("\n").map((item) => item.trim()).filter(Boolean),
        verificationCriteria: configForm.verificationCriteria.split("\n").map((item) => item.trim()).filter(Boolean),
        aiSettings: {
          mode: configForm.aiMode,
          humanReviewRequired: configForm.humanReviewRequired,
        },
        notificationTemplates: configForm.notificationTemplates.split("\n").map((item) => item.trim()).filter(Boolean),
      };
      await API.put("/system/config", payload);
      setActionMessage("Platform configuration updated successfully.");
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to update configuration.");
    } finally {
      setBusyKey("");
    }
  };

  const exportReport = async (type) => {
    try {
      setBusyKey(`export-${type}`);
      const { data } = await API.get(`/system/exports/${type}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-export.json`;
      link.click();
      URL.revokeObjectURL(url);
      setActionMessage(`${type} export created successfully.`);
      await refreshAdminSlices();
    } catch (error) {
      setActionMessage(error.response?.data?.message || "Unable to export data.");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl">
            {role === "student" ? (
              <div className="relative overflow-hidden p-6 lg:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_24%),radial-gradient(circle_at_left,_rgba(14,165,233,0.12),_transparent_30%)]" />
                <div className="relative space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Digital Proof of Work</p>
                    <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                      {config.badge}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-4">
                      {dashboardData.portfolio?.studentId?.profileImage || user?.profileImage ? (
                        <img
                          src={dashboardData.portfolio?.studentId?.profileImage || user?.profileImage}
                          alt={user?.name || "Student"}
                          className="h-16 w-16 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-sky-400/20 text-lg font-semibold text-white">
                          {getInitials(user?.name)}
                        </div>
                      )}
                      <p className="text-2xl font-semibold text-white">{user?.name || "Student"}</p>
                    </div>
                    <div>
                      <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight">{config.heading}</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{config.description}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {quickStats.map((stat) => (
                      <div key={stat.label} className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-[0_20px_60px_-40px_rgba(56,189,248,0.75)]">
                        <p className="text-3xl font-semibold text-white">{stat.value}</p>
                        <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => handleAction(action)}
                        disabled={busyKey === action.action}
                        className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-5 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="block text-base font-semibold text-white">{action.label}</span>
                        <span className="mt-2 block text-sm leading-6 text-slate-400">{action.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Digital Proof of Work</p>
                    <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                      {config.badge}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
                      {dashboardData.portfolio?.studentId?.profileImage || user?.profileImage ? (
                        <img
                          src={dashboardData.portfolio?.studentId?.profileImage || user?.profileImage}
                          alt={user?.name || "User"}
                          className="h-16 w-16 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-sky-400/20 text-lg font-semibold text-white">
                          {getInitials(user?.name)}
                        </div>
                      )}
                      <p className="text-2xl font-semibold text-white">{user?.name || "User"}</p>
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
                        onClick={() => handleAction(action)}
                        disabled={busyKey === action.action}
                        className="rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-left transition hover:border-sky-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
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
                      <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Role overview</p>
                      <h2 className="mt-4 text-2xl font-semibold">{roleOverview.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {roleOverview.description}
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current role</p>
                        <p className="mt-2 text-lg font-medium text-white">{role}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Unread notifications</p>
                        <p className="mt-2 text-lg font-medium text-white">{unreadNotifications}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Profile owner</p>
                        <p className="mt-2 text-lg font-medium text-white">{user?.name || "User"}</p>
                      </div>
                    </div>

                    <div className="mt-auto rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-sm font-semibold text-emerald-100">Security note</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                        {roleOverview.note}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </section>

          {actionMessage && (
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-50">
              {actionMessage}
            </section>
          )}

          {tempPasswordMessage && (
            <section className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm text-amber-50">
              {tempPasswordMessage}
            </section>
          )}

          {status === "loading" && (
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-6 text-slate-200">
              Loading your workspace...
            </section>
          )}

          {status === "error" && (
            <section className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-6 text-red-100">
              {errorMessage}
            </section>
          )}

          {status === "ready" && (
            <div className="grid gap-6">
              {role !== "student" && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Profile</p>
                    <h2 className="mt-2 text-2xl font-semibold">Verified profile readiness</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/edit-portfolio")}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-300"
                  >
                    Edit profile
                  </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Skills listed</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{dashboardData.portfolio?.skills?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Certificates linked</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{dashboardData.portfolio?.certificates?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Profile bio</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {dashboardData.portfolio?.bio || "Add a short verified bio to strengthen your profile."}
                    </p>
                  </div>
                </div>
                {role === "student" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-sky-400/10 p-4">
                      <p className="text-sm text-sky-100">Profile completion</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{profileCompletion}%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-slate-400">GitHub profile</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {dashboardData.portfolio?.githubLink ? "Connected and visible in your portfolio." : "Add your GitHub profile to strengthen credibility."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-slate-400">Portfolio status</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {profileCompletion === 100 ? "Ready for recruiters and reviewers." : "Complete the missing pieces before your next submission."}
                      </p>
                    </div>
                  </div>
                )}
              </section>
              )}

              {role === "student" && (
                <section id="student-workflow" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_30px_90px_-50px_rgba(14,165,233,0.8)]">
                    <p className="text-sm uppercase tracking-[0.22em] text-amber-300">Submission workflow</p>
                    <h2 className="mt-2 text-2xl font-semibold">Track your verification progress</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Projects submitted</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{studentProjectStats.submitted}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Awaiting verification</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{studentProjectStats.pending}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Verified projects</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{studentProjectStats.verified}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Needs changes</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{studentProjectStats.needsAttention}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/my-projects")}
                      className="mt-4 rounded-2xl border border-slate-600 px-4 py-3 text-sm font-semibold text-white transition hover:border-amber-300"
                    >
                      Open project tracker
                    </button>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_30px_90px_-50px_rgba(16,185,129,0.7)]">
                    <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Student actions</p>
                    <h2 className="mt-2 text-2xl font-semibold">What to focus on next</h2>
                    <div className="mt-4 grid gap-3">
                      {studentNextSteps.map((step) => (
                        <div key={step.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className={`text-sm leading-6 ${step.tone}`}>{step.label}</p>
                        </div>
                      ))}
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Recommended student workflow</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          Build your profile, submit repository or certificate evidence, respond quickly to reviewer feedback, and collect badges as verified proof accumulates.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {role === "admin" && (
                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Projects</p>
                        <h2 className="mt-2 text-2xl font-semibold">Evidence submissions</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/upload-project")}
                        className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-300"
                      >
                        Submit evidence
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {dashboardData.projects.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                          No evidence submissions yet. Add your first project to start the review workflow.
                        </div>
                      )}
                      {dashboardData.projects.slice(0, 4).map((project) => (
                        <article key={project._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                              <p className="mt-1 text-sm text-slate-300">{project.description}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                                {project.skills?.slice(0, 3).join(" • ") || "No skills listed"} | Submitted{" "}
                                {new Date(project.createdAt).toLocaleDateString()}
                              </p>
                              {project.reviewNote && (
                                <p className="mt-2 text-sm text-amber-100">Reviewer note: {project.reviewNote}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                                {formatStatusLabel(project.verificationStatus)}
                              </span>
                              {(project.githubLink || project.liveLink) && (
                                <div className="flex gap-2 text-xs">
                                  {project.githubLink && (
                                    <a
                                      href={project.githubLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-white/10 px-3 py-1 text-slate-200 transition hover:border-sky-300"
                                    >
                                      GitHub
                                    </a>
                                  )}
                                  {project.liveLink && (
                                    <a
                                      href={project.liveLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-white/10 px-3 py-1 text-slate-200 transition hover:border-sky-300"
                                    >
                                      Live demo
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div id="badges" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Trust signals</p>
                    <h2 className="mt-2 text-2xl font-semibold">Badges</h2>
                    <div className="mt-4 grid gap-3">
                      {dashboardData.badges.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                          No badges yet. Verified reviews will appear here.
                        </div>
                      )}
                      {dashboardData.badges.map((badge) => (
                        <div key={badge._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-lg font-semibold text-white">{badge.name}</p>
                          <p className="mt-1 text-sm capitalize text-emerald-100">{badge.level}</p>
                          <p className="mt-2 text-sm text-slate-300">{badge.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {(role === "verifier" || role === "reviewer" || role === "admin") && (
                <section id={role === "admin" ? "verification-management" : "queue"} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.22em] text-amber-300">Verification management</p>
                      <h2 className="mt-2 text-2xl font-semibold">Reviewer workspace</h2>
                    </div>
                    {role === "admin" && adminOverview?.metrics && (
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Pending: {adminOverview.metrics.pendingVerifications}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Rejected: {adminOverview.metrics.rejectedSubmissions}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Turnaround: {adminOverview.metrics.averageTurnaroundHours}h
                        </span>
                      </div>
                    )}
                  </div>
                  {role === "admin" && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Pending verifications</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{adminOverview?.metrics?.pendingVerifications || 0}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Rejected submissions</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{adminOverview?.metrics?.rejectedSubmissions || 0}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Review bottlenecks</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{adminOverview?.verificationManagement?.reviewBottlenecks?.length || 0}</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid gap-4">
                    {dashboardData.queue.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                        No pending submissions are waiting right now.
                      </div>
                    )}
                    {dashboardData.queue.map((project) => (
                      <article key={project._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                            <p className="mt-1 text-sm text-slate-300">{project.description}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                              Owner: {project.user?.name || "Unknown"} | Score: {project.analysis?.score || 0}/100
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => submitReview(project._id, "verified")}
                              disabled={busyKey === `review-${project._id}-verified`}
                              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => submitReview(project._id, "changes_requested")}
                              disabled={busyKey === `review-${project._id}-changes_requested`}
                              className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
                            >
                              Request changes
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {role === "admin" && adminOverview?.verificationManagement?.reviewBottlenecks?.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                      <p className="text-sm font-semibold text-amber-100">Review bottlenecks</p>
                      <div className="mt-3 grid gap-2">
                        {adminOverview.verificationManagement.reviewBottlenecks.slice(0, 5).map((entry) => (
                          <p key={entry._id} className="text-sm text-amber-50/90">
                            {entry.title} by {entry.owner} has been waiting {entry.waitingHours} hours.
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {(role === "recruiter" || role === "admin") && (
                <section id={role === "admin" ? "analytics-dashboard" : "analytics"} className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Analytics dashboard</p>
                    <h2 className="mt-2 text-2xl font-semibold">Platform-wide metrics</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Total users</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {adminOverview?.metrics?.totalUsers || dashboardData.analytics?.total || 0}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Total projects</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {adminOverview?.metrics?.totalProjects || dashboardData.analytics?.total || 0}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Approval rate</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {adminOverview?.metrics?.approvalRate || dashboardData.analytics?.verificationRate || 0}%
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Verification turnaround</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {adminOverview?.metrics?.averageTurnaroundHours || 0}h
                        </p>
                      </div>
                      {role === "admin" && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                          <p className="text-sm text-slate-400">Active recruiters</p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {adminOverview?.metrics?.activeRecruiters || 0} / {adminOverview?.metrics?.totalRecruiters || 0}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div id="public-projects" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Public portfolio</p>
                        <h2 className="mt-2 text-2xl font-semibold">Verified public work</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/explore")}
                        className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300"
                      >
                        Open explore
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {dashboardData.publicProjects.slice(0, 4).map((project) => (
                        <article key={project._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                          <p className="mt-1 text-sm text-slate-300">By {project.user?.name || "Unknown candidate"}</p>
                          <p className="mt-2 text-sm text-slate-300">{project.description}</p>
                        </article>
                      ))}
                      {dashboardData.publicProjects.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                          No verified public work is available yet.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {role === "admin" && (
                <>
                  <section id="users" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <form onSubmit={createAdminUser} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-rose-300">User management</p>
                      <h2 className="mt-2 text-2xl font-semibold">Create accounts</h2>
                      <div className="mt-4 grid gap-3">
                        <input
                          value={createUserForm.name}
                          onChange={(event) => setCreateUserForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Full name"
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        />
                        <input
                          value={createUserForm.email}
                          onChange={(event) => setCreateUserForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email address"
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        />
                        <select
                          value={createUserForm.role}
                          onChange={(event) => setCreateUserForm((current) => ({ ...current, role: event.target.value }))}
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        >
                          <option value="student">student</option>
                          <option value="verifier">verifier</option>
                          <option value="reviewer">reviewer</option>
                          <option value="recruiter">recruiter</option>
                          <option value="admin">admin</option>
                        </select>
                        <input
                          value={createUserForm.password}
                          onChange={(event) => setCreateUserForm((current) => ({ ...current, password: event.target.value }))}
                          placeholder="Temporary password (optional)"
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        />
                        <button
                          type="submit"
                          disabled={busyKey === "create-user"}
                          className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          Create account
                        </button>
                      </div>
                    </form>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-rose-300">User management</p>
                      <h2 className="mt-2 text-2xl font-semibold">Manage people</h2>
                      <div className="mt-4 grid gap-3">
                        {dashboardData.users.map((entry) => (
                          <article key={entry._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.7fr_0.7fr_auto_auto]">
                              <div>
                                <p className="text-lg font-semibold text-white">{entry.name}</p>
                                <p className="text-sm text-slate-300">{entry.email}</p>
                              </div>
                              <label className="grid gap-1 text-sm text-slate-300">
                                <span>Role</span>
                                <select
                                  value={rowEdits[entry._id]?.role || normalizeRole(entry.role)}
                                  onChange={(event) =>
                                    setRowEdits((current) => ({
                                      ...current,
                                      [entry._id]: {
                                        ...current[entry._id],
                                        role: event.target.value,
                                      },
                                    }))
                                  }
                                  className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-white"
                                >
                                  <option value="student">student</option>
                                  <option value="verifier">verifier</option>
                                  <option value="reviewer">reviewer</option>
                                  <option value="recruiter">recruiter</option>
                                  <option value="admin">admin</option>
                                </select>
                              </label>
                              <label className="grid gap-1 text-sm text-slate-300">
                                <span>Status</span>
                                <select
                                  value={rowEdits[entry._id]?.status || entry.status || "active"}
                                  onChange={(event) =>
                                    setRowEdits((current) => ({
                                      ...current,
                                      [entry._id]: {
                                        ...current[entry._id],
                                        status: event.target.value,
                                      },
                                    }))
                                  }
                                  className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-white"
                                >
                                  <option value="active">active</option>
                                  <option value="suspended">suspended</option>
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => saveUserUpdate(entry._id)}
                                disabled={busyKey === `user-${entry._id}`}
                                className="self-end rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => resetUserAccount(entry._id)}
                                disabled={busyKey === `reset-${entry._id}`}
                                className="self-end rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
                              >
                                Reset
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section id="badge-management" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <form onSubmit={createBadgeAward} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Badge management</p>
                      <h2 className="mt-2 text-2xl font-semibold">Create and award badges</h2>
                      <div className="mt-4 grid gap-3">
                        <select
                          value={badgeForm.userId}
                          onChange={(event) => setBadgeForm((current) => ({ ...current, userId: event.target.value }))}
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        >
                          {dashboardData.users.map((entry) => (
                            <option key={entry._id} value={entry._id}>
                              {entry.name} ({entry.email})
                            </option>
                          ))}
                        </select>
                        <select
                          value={badgeForm.name}
                          onChange={(event) => setBadgeForm((current) => ({ ...current, name: event.target.value }))}
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        >
                          <option value="Top Contributor">Top Contributor</option>
                          <option value="AI Developer">AI Developer</option>
                          <option value="Research Scholar">Research Scholar</option>
                          <option value="Verified Proof of Work">Verified Proof of Work</option>
                        </select>
                        <textarea
                          value={badgeForm.description}
                          onChange={(event) => setBadgeForm((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Badge description"
                          rows="4"
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        />
                        <select
                          value={badgeForm.level}
                          onChange={(event) => setBadgeForm((current) => ({ ...current, level: event.target.value }))}
                          className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                        >
                          <option value="bronze">bronze</option>
                          <option value="silver">silver</option>
                          <option value="gold">gold</option>
                        </select>
                        <button
                          type="submit"
                          disabled={busyKey === "create-badge"}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          Award badge
                        </button>
                      </div>
                    </form>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Badge management</p>
                      <h2 className="mt-2 text-2xl font-semibold">Recent badge awards</h2>
                      <div className="mt-4 grid gap-3">
                        {dashboardData.allBadges.slice(0, 10).map((badge) => (
                          <article key={badge._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-lg font-semibold text-white">{badge.name}</p>
                            <p className="mt-1 text-sm text-slate-300">
                              Awarded to {badge.user?.name || "Unknown"} as {badge.level}
                            </p>
                            <p className="mt-2 text-sm text-slate-300">{badge.description || "No description provided."}</p>
                            <button
                              type="button"
                              onClick={() => deleteBadgeAward(badge._id)}
                              disabled={busyKey === `delete-badge-${badge._id}`}
                              className="mt-3 rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-100 disabled:opacity-60"
                            >
                              Delete badge
                            </button>
                          </article>
                        ))}
                        {dashboardData.allBadges.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                            No badge awards have been created yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section id="audit-trail" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Audit trail</p>
                    <h2 className="mt-2 text-2xl font-semibold">Critical platform activity</h2>
                    <div className="mt-4 grid gap-3">
                      {(adminOverview?.auditTrail || []).map((event) => (
                        <article key={event._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">{event.action}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            Actor: {event.actor?.name || "System"} | Target: {event.entityType}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section id="data-exports" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Data exports</p>
                    <h2 className="mt-2 text-2xl font-semibold">Export critical platform reports</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        { key: "users", label: "Export users" },
                        { key: "audit", label: "Export audit trail" },
                        { key: "analytics", label: "Export analytics" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => exportReport(item.key)}
                          disabled={busyKey === `export-${item.key}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-white transition hover:border-sky-300 disabled:opacity-60"
                        >
                          <span className="block text-base font-semibold">{item.label}</span>
                          <span className="mt-1 block text-sm text-slate-300">Records an audited export event.</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section id="system-monitoring" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">System monitoring</p>
                      <h2 className="mt-2 text-2xl font-semibold">Runtime health</h2>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-slate-400">API health</p>
                          <p className="mt-2 text-lg font-semibold text-white">{adminOverview?.monitoring?.api || "unknown"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-slate-400">AI service status</p>
                          <p className="mt-2 text-lg font-semibold text-white">{adminOverview?.monitoring?.aiService || "unknown"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-slate-400">Background jobs</p>
                          <p className="mt-2 text-lg font-semibold text-white">{adminOverview?.monitoring?.backgroundJobs || "unknown"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">System monitoring</p>
                      <h2 className="mt-2 text-2xl font-semibold">Storage usage</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {Object.entries(adminOverview?.monitoring?.storageUsage || {}).map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm capitalize text-slate-400">{label}</p>
                            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <form onSubmit={saveSystemConfig} id="configuration" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-violet-300">Configuration</p>
                    <h2 className="mt-2 text-2xl font-semibold">Manage platform rules</h2>
                    <div className="mt-4 grid gap-6 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Badge rules</p>
                        <textarea
                          value={configForm.badgeRules}
                          onChange={(event) => setConfigForm((current) => ({ ...current, badgeRules: event.target.value }))}
                          rows="5"
                          className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Verification criteria</p>
                        <textarea
                          value={configForm.verificationCriteria}
                          onChange={(event) => setConfigForm((current) => ({ ...current, verificationCriteria: event.target.value }))}
                          rows="5"
                          className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">AI settings</p>
                        <div className="mt-3 grid gap-3 text-sm text-slate-300">
                          <input
                            value={configForm.aiMode}
                            onChange={(event) => setConfigForm((current) => ({ ...current, aiMode: event.target.value }))}
                            className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"
                          />
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={configForm.humanReviewRequired}
                              onChange={(event) =>
                                setConfigForm((current) => ({
                                  ...current,
                                  humanReviewRequired: event.target.checked,
                                }))
                              }
                            />
                            <span>Human review required</span>
                          </label>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Notification templates</p>
                        <textarea
                          value={configForm.notificationTemplates}
                          onChange={(event) => setConfigForm((current) => ({ ...current, notificationTemplates: event.target.value }))}
                          rows="5"
                          className="mt-3 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={busyKey === "save-config"}
                      className="mt-6 rounded-xl bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    >
                      Save configuration
                    </button>
                  </form>
                </>
              )}

              {(role === "verifier" || role === "reviewer") && (
                <section id="audit" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <p className="text-sm uppercase tracking-[0.22em] text-sky-300">Audit trail</p>
                  <h2 className="mt-2 text-2xl font-semibold">Recent recorded activity</h2>
                  <div className="mt-4 grid gap-3">
                    {dashboardData.audit.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                        No audit events are visible for this role yet.
                      </div>
                    )}
                    {dashboardData.audit.slice(0, 8).map((event) => (
                      <article key={event._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">{event.action}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          Actor: {event.actor?.name || "System"} | Target: {event.entityType}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {role !== "student" && (
              <section id="notifications" className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Notifications</p>
                <h2 className="mt-2 text-2xl font-semibold">Recent updates</h2>
                <div className="mt-4 grid gap-3">
                  {dashboardData.notifications.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                      No notifications yet.
                    </div>
                  )}
                  {dashboardData.notifications.map((item) => (
                    <article key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-300">{item.message}</p>
                        </div>
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item._id)}
                            disabled={busyKey === `notification-${item._id}`}
                            className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
