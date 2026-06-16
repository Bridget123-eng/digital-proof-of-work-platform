import { Navigate, useLocation } from "react-router-dom";

const normalizeRole = (role) => (role === "administrator" ? "admin" : role);

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem("userInfo");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem("userInfo");
    return null;
  }
}

function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const user = readStoredUser();
  const normalizedUserRole = normalizeRole(user?.role);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  if (!user || user.status === "suspended") {
    localStorage.removeItem("userInfo");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return <Navigate to="/dashboard" replace state={{ message: "You do not have permission to view that page." }} />;
  }

  return children;
}

export default ProtectedRoute;
