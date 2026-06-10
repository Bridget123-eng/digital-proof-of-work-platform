import { useEffect, useState } from "react";
import API from "../../api/axios";

function MyProjects() {

  const [projects, setProjects] = useState([]);

  useEffect(() => {

    const fetchProjects = async () => {

      const userInfo = JSON.parse(
        localStorage.getItem("userInfo")
      );

      const { data } = await API.get(
        "/projects/my-projects",
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      setProjects(data);
    };

    fetchProjects();

  }, []);

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        My Portfolio Projects
      </h1>

      <div className="grid gap-6">

        {projects.map((project) => (

          <div
            key={project._id}
            className="border p-6 rounded-lg shadow"
          >

            <h2 className="text-2xl font-bold">
              {project.title}
            </h2>

            <p className="mt-3">
              {project.description}
            </p>

            <div className="flex gap-2 mt-4 flex-wrap">
              {project.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-gray-200 px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <span className="font-semibold">
                Verification:
              </span>

              <span className="ml-2 text-blue-600">
                {project.verificationStatus}
              </span>
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}

export default MyProjects;