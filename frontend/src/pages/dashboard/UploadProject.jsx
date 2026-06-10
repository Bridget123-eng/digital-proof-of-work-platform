import { useState } from "react";
import API from "../../api/axios";

function UploadProject() {

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skills: "",
    githubLink: "",
    liveLink: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      const userInfo = JSON.parse(
        localStorage.getItem("userInfo")
      );

      await API.post(
        "/projects",
        {
          ...formData,
          skills: formData.skills.split(","),
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      alert("Project uploaded");

    } catch (error) {
      alert(error.response.data.message);
    }
  };

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Upload Project
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl"
      >

        <input
          type="text"
          name="title"
          placeholder="Project Title"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Project Description"
          className="w-full border p-3 mb-4 rounded"
          rows="5"
          onChange={handleChange}
        />

        <input
          type="text"
          name="skills"
          placeholder="Skills (comma separated)"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <input
          type="text"
          name="githubLink"
          placeholder="GitHub Link"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <input
          type="text"
          name="liveLink"
          placeholder="Live Project Link"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <button
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Upload
        </button>

      </form>
    </div>
  );
}

export default UploadProject;