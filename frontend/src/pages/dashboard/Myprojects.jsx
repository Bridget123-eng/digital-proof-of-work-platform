import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function MyProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    API.get("/projects/my-projects")
      .then(({ data }) => {
        setProjects(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Portfolio Projects</h1>
        </div>

        {status === "loading" && <p>Loading projects...</p>}
        {status === "error" && <p className="text-red-600">Unable to load projects.</p>}
        {status === "ready" && projects.length === 0 && <p>No projects submitted yet.</p>}

        <div className="grid gap-4">
          {projects.map((project) => (
            <article key={project._id} className="rounded border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  <p className="mt-2 text-slate-700">{project.description}</p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-sm">
                  {(project.verificationStatus || "pending").replace("_", " ")}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded bg-emerald-100 px-2 py-1 text-sm text-emerald-800">
                  Analysis {project.analysis?.score || 0}/100
                </span>
                {(project.skills || []).map((skill) => (
                  <span key={skill} className="rounded bg-slate-100 px-2 py-1 text-sm">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.githubLink && (
                  <a className="rounded border border-slate-300 px-3 py-1 text-sm" href={project.githubLink} target="_blank" rel="noreferrer">
                    GitHub repository
                  </a>
                )}
                {project.liveLink && (
                  <a className="rounded border border-slate-300 px-3 py-1 text-sm" href={project.liveLink} target="_blank" rel="noreferrer">
                    Live demo
                  </a>
                )}
                {(project.proofFiles || []).map((file, index) => (
                  <a key={file} className="rounded border border-slate-300 px-3 py-1 text-sm" href={file} target="_blank" rel="noreferrer">
                    Proof {index + 1}
                  </a>
                ))}
                {(project.certificates || []).map((certificate) => (
                  <a key={certificate.fileUrl} className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-800" href={certificate.fileUrl} target="_blank" rel="noreferrer">
                    {certificate.title || "Certificate"}
                  </a>
                ))}
              </div>
              {project.reviewNote && (
                <p className="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-700">
                  Reviewer note: {project.reviewNote}
                </p>
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

export default MyProjects;
