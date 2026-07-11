import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/public/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ResetPassword from "../pages/auth/ResetPassword";
import NewPassword from "../pages/auth/NewPassword";
import Dashboard from "../pages/dashboard/Dashboard";
import EditPortfolio from "../pages/dashboard/EditPortfolio";
import WorkspaceDetail from "../pages/dashboard/WorkspaceDetail";
import UploadProject from "../pages/dashboard/UploadProject";
import MyProjects from "../pages/dashboard/Myprojects";
import Notifications from "../pages/dashboard/Notifications";
import MyBadges from "../pages/dashboard/MyBadges";
import RecruiterRequirements from "../pages/dashboard/RecruiterRequirements";
import Profile from "../pages/public/Profile";
import Explore from "../pages/public/Explore";
import ProtectedRoute from "../components/ProtectedRoute";


function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/new" element={<NewPassword />} />
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
            <ProtectedRoute allowedRoles={["student", "verifier", "reviewer", "recruiter", "mentor", "admin"]}>
              <EditPortfolio />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspace/:view"
          element={
            <ProtectedRoute allowedRoles={["verifier", "reviewer", "recruiter", "mentor", "admin"]}>
              <WorkspaceDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload-project"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <UploadProject />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-projects"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <MyProjects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-badges"
          element={
            <ProtectedRoute allowedRoles={["student", "admin"]}>
              <MyBadges />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter-requirements"
          element={<ProtectedRoute allowedRoles={["recruiter"]}><RecruiterRequirements /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
