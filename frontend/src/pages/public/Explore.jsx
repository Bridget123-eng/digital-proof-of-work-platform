import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function Explore() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");

  const fetchProjects = (params = {}) => {
    setStatus("loading");
    const query = new URLSearchParams(params).toString();
    API.get(`/projects?${query}`)
      .then(({ data }) => {
        setProjects(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProjects({ search, skill });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Verified Public Work</h1>
          <p className="text-slate-600">Only human-approved public evidence appears here.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-8 flex flex-wrap gap-4 rounded border border-slate-200 bg-white p-4">
          <input
            type="text"
            placeholder="Search projects..."
            className="flex-1 rounded border p-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by skill..."
            className="flex-1 rounded border p-2"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
          <button type="submit" className="rounded bg-slate-950 px-6 py-2 text-white">
            Search
          </button>
        </form>

        {status === "loading" && <p>Loading verified projects...</p>}
        {status === "error" && <p className="text-red-600">Unable to load projects.</p>}
        {status === "ready" && projects.length === 0 && <p>No verified public projects yet.</p>}

        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article key={project._id} className="rounded border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  <p className="text-sm text-slate-500">By {project.user?.name}</p>
                </div>
                <span className="rounded bg-emerald-100 px-2 py-1 text-sm text-emerald-800">
                  Verified
                </span>
              </div>
              <p className="mt-3 text-slate-700">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(project.skills || []).map((skill) => (
                  <span key={skill} className="rounded bg-slate-100 px-2 py-1 text-sm">
                    {skill}
                  </span>
                ))}
              </div>

              {project.githubData && (
                <div className="mt-4 rounded bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-700">GitHub Analysis</p>
                  <p className="mt-1 text-slate-600">
                    {project.githubData.metadata?.language || "Various"} • {project.githubData.metadata?.stars || 0} stars • {project.githubData.metadata?.commits || 0} commits
                  </p>
                </div>
              )}

              {(project.proofFiles?.length > 0 || project.certificates?.length > 0) && (
                <div className="mt-3 flex gap-3 text-xs text-slate-500">
                  {project.proofFiles?.length > 0 && <span>{project.proofFiles.length} Evidence files</span>}
                  {project.certificates?.length > 0 && <span>{project.certificates.length} Certificates</span>}
                </div>
              )}
              {project.user?._id && (
                <Link
                  className="mt-4 inline-block rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                  to={`/profile/user/${project.user._id}`}
                >
                  View public portfolio
                </Link>
              )}
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button className="rounded border border-slate-300 px-4 py-3" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
          <Link className="rounded border border-slate-300 px-4 py-3 text-center" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Explore;
