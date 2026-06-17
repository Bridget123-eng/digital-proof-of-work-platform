import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function MyBadges() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    API.get("/system/badges/me")
      .then(({ data }) => {
        setBadges(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Badges</h1>
          <p className="text-slate-600">Review the badges you have earned through verified proof-of-work.</p>
        </div>

        <div className="grid gap-4 rounded border border-slate-200 bg-white p-6">
          {status === "loading" && <p>Loading badges...</p>}
          {status === "error" && <p className="text-red-600">Unable to load badges.</p>}
          {status === "ready" && badges.length === 0 && <p>You have not earned any badges yet.</p>}

          {badges.map((badge) => (
            <article key={badge._id} className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{badge.name}</p>
                  <p className="mt-2 text-sm text-slate-700">{badge.description || "No badge description provided."}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                    {badge.level} | {new Date(badge.createdAt).toLocaleDateString()}
                  </p>
                  {badge.project?.title && (
                    <p className="mt-2 text-sm text-emerald-700">Related project: {badge.project.title}</p>
                  )}
                </div>
              </div>
            </article>
          ))}

          <div className="grid gap-3 pt-2 md:grid-cols-2">
            <button className="rounded border border-slate-300 px-4 py-3" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
            <Link className="rounded border border-slate-300 px-4 py-3 text-center" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyBadges;
