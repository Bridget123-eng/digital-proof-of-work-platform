import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/public/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ResetPassword from "../pages/auth/ResetPassword";
import Dashboard from "../pages/dashboard/Dashboard";
import EditPortfolio from "../pages/dashboard/EditPortfolio";
import UploadProject from "../pages/dashboard/UploadProject";
import MyProjects from "../pages/dashboard/Myprojects";
import Profile from "../pages/public/Profile";
import Explore from "../pages/public/Explore";


// Check authentication
const isAuthenticated = () => {
  return localStorage.getItem("userInfo");
};


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};


function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile/user/:userId" element={<Profile />} />


        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-portfolio"
          element={
            <ProtectedRoute>
              <EditPortfolio />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload-project"
          element={
            <ProtectedRoute>
              <UploadProject />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-projects"
          element={
            <ProtectedRoute>
              <MyProjects />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
