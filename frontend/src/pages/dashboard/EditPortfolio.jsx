import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { AuthContext } from "../../context/authContextValue";

const emptyCertificate = {
  title: "",
  fileUrl: "",
  issuedBy: "",
  issuedDate: "",
};

function AvatarFallback({ name }) {
  const initials = String(name || "Student")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-sky-500 to-emerald-400 text-2xl font-bold text-white">
      {initials}
    </div>
  );
}

function EditPortfolio() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    bio: "",
    skills: "",
    githubLink: "",
    profileImage: "",
    certificates: [emptyCertificate],
  });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    API.get("/portfolio/me")
      .then(({ data }) => {
        setFormData({
          bio: data.bio || "",
          skills: (data.skills || []).join(", "),
          githubLink: data.githubLink || "",
          profileImage: data.studentId?.profileImage || user?.profileImage || "",
          certificates: data.certificates?.length ? data.certificates : [emptyCertificate],
        });
        setStatus("ready");
      })
      .catch(() => setStatus("ready"));
  }, [user?.profileImage]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const updateCertificate = (index, field, value) => {
    const certificates = formData.certificates.map((certificate, currentIndex) =>
      currentIndex === index ? { ...certificate, [field]: value } : certificate
    );
    setFormData({ ...formData, certificates });
  };

  const addCertificate = () => {
    setFormData({
      ...formData,
      certificates: [...formData.certificates, emptyCertificate],
    });
  };

  const removeCertificate = (index) => {
    setFormData({
      ...formData,
      certificates: formData.certificates.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setStatus("saving");

    try {
      const payload = {
        bio: formData.bio,
        githubLink: formData.githubLink,
        profileImage: formData.profileImage,
        skills: formData.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        certificates: formData.certificates.filter((certificate) => certificate.title || certificate.fileUrl),
      };

      const { data } = await API.put("/portfolio", payload);
      const nextUser = { ...user, profileImage: data.studentId?.profileImage || formData.profileImage };
      localStorage.setItem("userInfo", JSON.stringify(nextUser));
      setUser(nextUser);
      setMessage("Profile updated successfully.");
      setStatus("ready");
    } catch (error) {
      setMessage(error.response?.data?.message || "Profile update failed.");
      setStatus("ready");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Edit Student Profile</h1>
            <p className="text-slate-600">Manage your profile picture, bio, skills, GitHub profile, and certificates.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded border border-slate-300 px-4 py-2" onClick={() => navigate(-1)}>
              Back
            </button>
            <Link className="rounded border border-slate-300 px-4 py-2" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>

        {status === "loading" && <p>Loading profile...</p>}

        {status !== "loading" && (
          <form onSubmit={handleSubmit} className="grid gap-5 rounded border border-slate-200 bg-white p-6">
            {message && <p className="rounded bg-slate-100 p-3 text-slate-700">{message}</p>}

            <div className="flex items-center gap-4">
              {formData.profileImage ? (
                <img
                  className="h-24 w-24 rounded-full border border-slate-200 object-cover"
                  src={formData.profileImage}
                  alt={user?.name || "Profile preview"}
                />
              ) : (
                <AvatarFallback name={user?.name} />
              )}
              <label className="grid flex-1 gap-1">
                <span className="font-medium">Profile picture URL</span>
                <input name="profileImage" value={formData.profileImage} className="rounded border p-3" onChange={handleChange} />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="font-medium">Bio</span>
              <textarea name="bio" value={formData.bio} rows="5" className="rounded border p-3" onChange={handleChange} />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-medium">Skills</span>
                <input name="skills" value={formData.skills} placeholder="React, Node.js, MongoDB" className="rounded border p-3" onChange={handleChange} />
              </label>
              <label className="grid gap-1">
                <span className="font-medium">GitHub profile</span>
                <input name="githubLink" value={formData.githubLink} className="rounded border p-3" onChange={handleChange} />
              </label>
            </div>

            <section className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Certificates</h2>
                <button type="button" className="rounded border border-slate-300 px-3 py-2" onClick={addCertificate}>
                  Add certificate
                </button>
              </div>

              {formData.certificates.map((certificate, index) => (
                <div key={index} className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-2">
                  <input placeholder="Certificate title" value={certificate.title || ""} className="rounded border p-3" onChange={(event) => updateCertificate(index, "title", event.target.value)} />
                  <input placeholder="Certificate URL" value={certificate.fileUrl || ""} className="rounded border p-3" onChange={(event) => updateCertificate(index, "fileUrl", event.target.value)} />
                  <input placeholder="Issued by" value={certificate.issuedBy || ""} className="rounded border p-3" onChange={(event) => updateCertificate(index, "issuedBy", event.target.value)} />
                  <input type="date" value={certificate.issuedDate ? String(certificate.issuedDate).slice(0, 10) : ""} className="rounded border p-3" onChange={(event) => updateCertificate(index, "issuedDate", event.target.value)} />
                  <button type="button" className="rounded border border-red-200 px-3 py-2 text-red-700 md:col-span-2" onClick={() => removeCertificate(index)}>
                    Remove certificate
                  </button>
                </div>
              ))}
            </section>

            <button disabled={status === "saving"} className="rounded bg-slate-950 px-5 py-3 text-white disabled:opacity-60">
              {status === "saving" ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditPortfolio;
