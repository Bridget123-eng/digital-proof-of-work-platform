import { useEffect, useState } from "react";
import API from "../../api/axios";

function Profile() {

  const [projects, setProjects] = useState([]);

  useEffect(() => {

    const fetchProjects = async () => {

      const { data } = await API.get("/projects");

      setProjects(data);
    };

    fetchProjects();

  }, []);

  return (
    <div className="p-10">

      <h1 className="text-4xl font-bold mb-8">
        Public Portfolio
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

            <p className="mt-2 text-gray-600">
              By {project.user?.name}
            </p>

            <p className="mt-4">
              {project.description}
            </p>

            <div className="flex gap-2 mt-4 flex-wrap">
              {project.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-100 px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}

export default Profile;