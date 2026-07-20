import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

const emptyForm = { title: "", description: "", skills: "" };

function RecruiterRequirements() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [requirements, setRequirements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRequirements = async () => {
    try {
      const { data } = await API.get("/recruiter-requirements");
      setRequirements(data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load requirements.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequirements();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      const { data } = await API.post("/recruiter-requirements", {
        ...form,
        skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setRequirements((current) => [data, ...current]);
      setForm(emptyForm);
      setMessage("Requirement published. Matching students are ready to review.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to publish the requirement.");
    } finally {
      setBusy(false);
    }
  };

  const showMatches = async (id) => {
    try {
      setBusy(true);
      const { data } = await API.get(`/recruiter-requirements/${id}/matches`);
      setSelected(data);
      setMessage("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to find matching students.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Recruiter workspace</p>
        <h1 className="mt-1 text-3xl font-bold">Find matching students</h1>
        <p className="mt-2 text-sm text-slate-600">Publish skills you need. Results use verified public project and portfolio skills.</p>
        {message && <p className="mt-4 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Role or opportunity title" className="rounded border border-slate-300 p-3" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the opportunity" rows="5" className="rounded border border-slate-300 p-3" />
          <input required value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Required skills, e.g. React, Node.js, MongoDB" className="rounded border border-slate-300 p-3" />
          <button disabled={busy} className="rounded bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">Publish requirement</button>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Back
          </button>
          <Link to="/dashboard" className="rounded border border-sky-300 px-4 py-3 text-center text-sm font-semibold text-sky-700">
            Dashboard
          </Link>
        </div>
      </section>
      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Your requirements</h2>
        {requirements.length === 0 && <p className="rounded border border-dashed border-slate-300 bg-white p-5 text-slate-600">No requirements posted yet.</p>}
        {requirements.map((requirement) => <article key={requirement._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{requirement.title}</h3>
          {requirement.description && <p className="mt-2 text-sm text-slate-600">{requirement.description}</p>}
          <p className="mt-3 text-sm text-slate-700">Skills: {requirement.skills.join(", ")}</p>
          <button disabled={busy} onClick={() => showMatches(requirement._id)} className="mt-4 rounded border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-700 disabled:opacity-60">View matching students</button>
        </article>)}
        {selected && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-bold">Matches for {selected.requirement.title}</h2>
          {selected.matches.length === 0 && <p className="mt-3 text-sm text-slate-600">No verified students match these skills yet.</p>}
          <div className="mt-4 grid gap-3">
            {selected.matches.map((match) => <article key={match.user._id} className="rounded border border-emerald-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{match.user.name}</h3><p className="mt-1 text-sm text-slate-600">Matched: {match.matchingSkills.join(", ")}</p></div><span className="rounded bg-emerald-100 px-2 py-1 text-sm font-bold text-emerald-800">{match.matchPercent}%</span></div>
              <p className="mt-2 text-sm text-slate-600">Skills: {match.skills.join(", ")}</p>
              <Link to={`/profile/user/${match.user._id}`} className="mt-3 inline-block text-sm font-semibold text-sky-700">Open verified portfolio</Link>
            </article>)}
          </div>
        </section>}
      </section>
    </div>
  </main>;
}

export default RecruiterRequirements;
