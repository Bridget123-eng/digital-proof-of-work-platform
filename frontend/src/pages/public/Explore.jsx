import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

function Explore() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    API.get("/projects")
      .then(({ data }) => {
        setProjects(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Verified Public Work</h1>
            <p className="text-slate-600">Only human-approved public evidence appears here.</p>
          </div>
          <Link to="/" className="rounded border border-slate-300 px-4 py-2">
            Home
          </Link>
        </div>

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
                {project.skills.map((skill) => (
                  <span key={skill} className="rounded bg-slate-100 px-2 py-1 text-sm">
                    {skill}
                  </span>
                ))}
              </div>
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
      </div>
    </div>
  );
}

export default Explore;
