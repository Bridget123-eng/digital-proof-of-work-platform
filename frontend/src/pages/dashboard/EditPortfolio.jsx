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
  const role = user?.role === "administrator" ? "admin" : user?.role || "student";
  const showStudentFields = role === "student";
  const [formData, setFormData] = useState({
    bio: "",
    skills: "",
    githubLink: "",
    degree: "",
    profileImage: "",
    certificates: [emptyCertificate],
  });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");

  useEffect(() => {
    API.get("/portfolio/me")
      .then(({ data }) => {
        setFormData({
          bio: data.bio || "",
          skills: showStudentFields ? (data.skills || []).join(", ") : "",
          githubLink: showStudentFields ? data.githubLink || "" : "",
          degree: showStudentFields ? data.degree || "" : "",
          profileImage: data.studentId?.profileImage || user?.profileImage || "",
          certificates: showStudentFields && data.certificates?.length ? data.certificates : [emptyCertificate],
        });
        setStatus("ready");
      })
      .catch(() => setStatus("ready"));
  }, [showStudentFields, user?.profileImage]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleProfileImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessageTone("error");
      setMessage("Please choose an image file for your profile picture.");
      return;
    }

    if (file.size > 650 * 1024) {
      setMessageTone("error");
      setMessage("Please choose an image smaller than 650 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
        ...current,
        profileImage: String(reader.result || ""),
      }));
      setMessage("");
    };
    reader.readAsDataURL(file);
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
    setMessageTone("neutral");
    setStatus("saving");

    try {
      const payload = {
        bio: formData.bio,
        profileImage: formData.profileImage,
      };

      if (showStudentFields) {
        payload.githubLink = formData.githubLink;
        payload.degree = formData.degree;
        payload.skills = formData.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
        payload.certificates = formData.certificates.filter((certificate) => certificate.title || certificate.fileUrl);
      }

      const { data } = await API.put("/portfolio", payload);
      const nextUser = {
        ...user,
        bio: data.bio || "",
        skills: data.skills || [],
        profileImage: data.studentId?.profileImage || formData.profileImage,
        socialLinks: {
          ...(user?.socialLinks || {}),
          github: data.githubLink || user?.socialLinks?.github || "",
        },
      };
      localStorage.setItem("userInfo", JSON.stringify(nextUser));
      setUser(nextUser);
      setFormData({
        bio: data.bio || "",
        skills: showStudentFields ? (data.skills || []).join(", ") : "",
        githubLink: showStudentFields ? data.githubLink || "" : "",
        degree: showStudentFields ? data.degree || "" : "",
        profileImage: data.studentId?.profileImage || formData.profileImage || "",
        certificates: showStudentFields && data.certificates?.length ? data.certificates : [emptyCertificate],
      });
      setMessageTone("success");
      setMessage("Profile updated successfully. New or changed certificates were queued for reviewer verification.");
      setStatus("ready");
    } catch (error) {
      setMessageTone("error");
      setMessage(error.response?.data?.message || "Profile update failed.");
      setStatus("ready");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-slate-600">
              {showStudentFields
                ? "Manage your profile picture, bio, skills, GitHub profile, and certificates."
                : "Manage your profile picture and bio."}
            </p>
          </div>
        </div>

        {status === "loading" && <p>Loading profile...</p>}

        {status !== "loading" && (
          <form onSubmit={handleSubmit} className="grid gap-5 rounded border border-slate-200 bg-white p-6">
            {message && (
              <p
                className={`rounded p-3 text-sm ${
                  messageTone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : messageTone === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {message}
              </p>
            )}

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
              <div className="grid flex-1 gap-2">
                <span className="font-medium">Profile picture</span>
                <input type="file" accept="image/*" className="rounded border p-3" onChange={handleProfileImageUpload} />
                <p className="text-sm text-slate-500">Upload a JPG, PNG, or WEBP image up to 650 KB.</p>
              </div>
            </div>

            <label className="grid gap-1">
              <span className="font-medium">Bio</span>
              <textarea name="bio" value={formData.bio} rows="5" className="rounded border p-3" onChange={handleChange} />
            </label>

            {showStudentFields && (
              <>
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

                <label className="grid gap-1">
                  <span className="font-medium">Degree</span>
                  <input
                    name="degree"
                    value={formData.degree}
                    placeholder="B.Tech Computer Science, MBA, Diploma in Data Science"
                    className="rounded border p-3"
                    onChange={handleChange}
                  />
                </label>

                <section className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Certificates</h2>
                    <button type="button" className="rounded border border-slate-300 px-3 py-2" onClick={addCertificate}>
                      Add certificate
                    </button>
                  </div>

                  {formData.certificates.map((certificate, index) => (
                    <div key={index} className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-2">
                      {certificate.verificationStatus && (
                        <div className="md:col-span-2">
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold uppercase text-amber-800">
                            {String(certificate.verificationStatus).replace("_", " ")}
                          </span>
                          {certificate.reviewNote && (
                            <p className="mt-2 text-sm text-slate-600">Reviewer note: {certificate.reviewNote}</p>
                          )}
                        </div>
                      )}
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
              </>
            )}

            <div className="grid gap-3 pt-2 md:grid-cols-3">
              <button disabled={status === "saving"} className="rounded bg-slate-950 px-5 py-3 text-white disabled:opacity-60">
                {status === "saving" ? "Saving..." : "Save profile"}
              </button>
              <button className="rounded border border-slate-300 px-4 py-3" type="button" onClick={() => navigate(-1)}>
                Back
              </button>
              <Link className="rounded border border-slate-300 px-4 py-3 text-center" to="/dashboard">
                Dashboard
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditPortfolio;
