import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {

  const user = JSON.parse(
    localStorage.getItem("userInfo")
  );

  return user ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;