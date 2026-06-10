import { useContext } from "react";
import { AuthContext } from "../../context/authContextValue";

function Dashboard() {

  const { logout } = useContext(AuthContext);

  return (
    <div className="p-10">

      <h1 className="text-4xl font-bold">
        Student Dashboard
      </h1>

      <button
        onClick={logout}
        className="mt-6 bg-red-600 text-white px-4 py-2 rounded"
      >
        Logout
      </button>

    </div>
  );
}

export default Dashboard;
