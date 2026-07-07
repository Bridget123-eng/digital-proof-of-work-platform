import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

const emptyCertificate = {
  title: "",
  fileUrl: "",
  issuedBy: "",
  issuedDate: "",
};

function UploadProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skills: "",
    githubLink: "",
    liveLink: "",
    evidenceType: "repository",
    visibility: "public",
    proofFiles: "",
    certificates: [emptyCertificate],
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const updateCertificate = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      certificates: current.certificates.map((certificate, currentIndex) =>
        currentIndex === index ? { ...certificate, [field]: value } : certificate
      ),
    }));
  };

  const addCertificate = () => {
    setFormData((current) => ({
      ...current,
      certificates: [...current.certificates, emptyCertificate],
    }));
  };

  const removeCertificate = (index) => {
    setFormData((current) => ({
      ...current,
      certificates:
        current.certificates.length === 1
          ? [emptyCertificate]
          : current.certificates.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors([]);
    setSaving(true);

    try {
      const { data } = await API.post("/projects", {
        ...formData,
        skills: formData.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        proofFiles: formData.proofFiles.split(",").map((file) => file.trim()).filter(Boolean),
        certificates: formData.certificates
          .filter((certificate) => certificate.title || certificate.fileUrl)
          .map((certificate) => ({
            title: certificate.title,
            fileUrl: certificate.fileUrl,
            issuedBy: certificate.issuedBy,
            issuedDate: certificate.issuedDate || undefined,
          })),
      });

      setResult(data);
      setFormData({
        title: "",
        description: "",
        skills: "",
        githubLink: "",
        liveLink: "",
        evidenceType: "repository",
        visibility: "public",
        proofFiles: "",
        certificates: [emptyCertificate],
      });
    } catch (requestError) {
      const serverErrors = requestError.response?.data?.errors || [];
      setValidationErrors(Array.isArray(serverErrors) ? serverErrors : []);
      setError(requestError.response?.data?.message || "Project upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold">Evidence Submission</h1>
            <p className="text-slate-600">Submit proof, repository links, and project context for verification.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded border border-slate-200 bg-white p-6">
          {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
          {validationErrors.length > 0 && (
            <ul className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {validationErrors.map((message) => (
                <li key={message} className="ml-4 list-disc">{message}</li>
              ))}
            </ul>
          )}
          {result && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="font-semibold">Submission created and queued for review.</p>
              <p>Analysis score: {result.analysis?.score}/100. {result.analysis?.summary}</p>
            </div>
          )}

          <label className="grid gap-1">
            <span className="font-medium">Project title</span>
            <input required type="text" name="title" value={formData.title} className="rounded border p-3" onChange={handleChange} />
          </label>

          <label className="grid gap-1">
            <span className="font-medium">Project description</span>
            <textarea required name="description" value={formData.description} className="rounded border p-3" rows="6" onChange={handleChange} />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-medium">Skills</span>
              <input name="skills" value={formData.skills} placeholder="React, Node.js, MongoDB" className="rounded border p-3" onChange={handleChange} />
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Evidence type</span>
              <select name="evidenceType" value={formData.evidenceType} className="rounded border p-3" onChange={handleChange}>
                <option value="repository">Repository</option>
                <option value="certificate">Certificate</option>
                <option value="live_demo">Live demo</option>
                <option value="case_study">Case study</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="font-medium">Proof links</span>
            <input
              name="proofFiles"
              value={formData.proofFiles}
              placeholder="Certificate PDF URL, demo recording URL, document URL"
              className="rounded border p-3"
              onChange={handleChange}
            />
            <span className="text-sm text-slate-500">Add multiple URLs separated by commas.</span>
          </label>

          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Certificate evidence</h2>
              <button
                type="button"
                onClick={addCertificate}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
                + Add certificate
              </button>
            </div>
            <div className="mt-3 grid gap-4">
              {formData.certificates.map((certificate, index) => (
                <div key={index} className="grid gap-4 rounded border border-slate-200 bg-white p-4 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="font-medium">Certificate title</span>
                    <input
                      value={certificate.title}
                      className="rounded border p-3"
                      onChange={(event) => updateCertificate(index, "title", event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="font-medium">Certificate URL</span>
                    <input
                      value={certificate.fileUrl}
                      className="rounded border p-3"
                      onChange={(event) => updateCertificate(index, "fileUrl", event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="font-medium">Issued by</span>
                    <input
                      value={certificate.issuedBy}
                      className="rounded border p-3"
                      onChange={(event) => updateCertificate(index, "issuedBy", event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="font-medium">Issued date</span>
                    <input
                      type="date"
                      value={certificate.issuedDate}
                      className="rounded border p-3"
                      onChange={(event) => updateCertificate(index, "issuedDate", event.target.value)}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => removeCertificate(index)}
                      className="rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                    >
                      Remove certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-medium">GitHub link</span>
              <input name="githubLink" value={formData.githubLink} className="rounded border p-3" onChange={handleChange} />
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Live demo link</span>
              <input name="liveLink" value={formData.liveLink} className="rounded border p-3" onChange={handleChange} />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="font-medium">Visibility</span>
            <select name="visibility" value={formData.visibility} className="rounded border p-3" onChange={handleChange}>
              <option value="public">Public after verification</option>
              <option value="private">Private</option>
            </select>
          </label>

          <div className="grid gap-3 pt-2 md:grid-cols-3">
            <button disabled={saving} className="rounded bg-slate-950 px-5 py-3 text-white disabled:opacity-60 md:col-span-1">
              {saving ? "Submitting..." : "Submit evidence"}
            </button>
            <button className="rounded border border-slate-300 px-4 py-3" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
            <Link className="rounded border border-slate-300 px-4 py-3 text-center" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadProject;
