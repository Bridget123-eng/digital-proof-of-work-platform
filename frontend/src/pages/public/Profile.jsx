import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api/axios";

function Profile() {
  const { id, userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    API.get(userId ? `/portfolio/user/${userId}` : `/portfolio/${id}`)
      .then(({ data }) => {
        setProfile(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id, userId]);

  const skills = profile?.skills || [];
  const projects = profile?.projects || [];
  const badges = profile?.badges || [];
  const certificates = profile?.certificates || [];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link to="/explore" className="rounded border border-slate-300 px-4 py-2">
          Explore
        </Link>

        {status === "loading" && <p className="mt-6">Loading public profile...</p>}
        {status === "error" && <p className="mt-6 text-red-600">Public profile not found.</p>}

        {profile && (
          <div className="mt-6 grid gap-6">
            <section className="rounded border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase text-emerald-700">Public portfolio</p>
              <h1 className="mt-2 text-4xl font-bold">{profile.student?.name}</h1>
              {profile.degree && <p className="mt-2 text-lg font-semibold text-slate-700">{profile.degree}</p>}
              <p className="mt-3 max-w-3xl text-slate-700">{profile.bio || "No bio provided."}</p>
              {profile.student?.profileImage && (
                <img
                  className="mt-4 h-24 w-24 rounded-full border border-slate-200 object-cover"
                  src={profile.student.profileImage}
                  alt={profile.student?.name || "Student"}
                />
              )}
              {profile.githubLink && (
                <a className="mt-4 inline-block text-emerald-700" href={profile.githubLink} target="_blank" rel="noreferrer">
                  GitHub profile
                </a>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="rounded bg-slate-100 px-2 py-1 text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">Verified Projects</h2>
              <div className="mt-4 grid gap-4">
                {projects.map((project) => (
                  <article key={project._id} className="rounded border border-slate-200 bg-white p-5">
                    <h3 className="text-xl font-semibold">{project.title}</h3>
                    <p className="mt-2 text-slate-700">{project.description}</p>
                    <p className="mt-3 text-sm text-emerald-800">Verification score {project.analysis?.score || 0}/100</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.githubLink && (
                        <a className="rounded border border-slate-300 px-3 py-1 text-sm text-sky-700" href={project.githubLink} target="_blank" rel="noreferrer">
                          Repository
                        </a>
                      )}
                      {project.liveLink && (
                        <a className="rounded border border-slate-300 px-3 py-1 text-sm text-sky-700" href={project.liveLink} target="_blank" rel="noreferrer">
                          Live demo
                        </a>
                      )}
                    </div>
                  </article>
                ))}
                {projects.length === 0 && <p>No verified public projects yet.</p>}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">Badges</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {badges.map((badge) => (
                  <div key={badge._id} className="rounded border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-sm text-emerald-800">{badge.level}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">Certificates</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {certificates.map((certificate) => (
                  <a
                    key={certificate.fileUrl}
                    className="rounded border border-slate-200 bg-white p-4 text-slate-700"
                    href={certificate.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="font-semibold">{certificate.title || "Certificate"}</span>
                    <span className="block text-sm text-slate-500">{certificate.issuedBy}</span>
                    <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      Verified
                    </span>
                  </a>
                ))}
                {certificates.length === 0 && <p>No verified certificates yet.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
