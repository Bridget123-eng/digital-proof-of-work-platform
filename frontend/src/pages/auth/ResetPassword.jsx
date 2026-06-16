import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function ResetPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await API.post("/auth/reset-password", {
        email: formData.email,
        currentPassword: formData.currentPassword,
        password: formData.password,
      });

      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 700);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Cannot reset password. Please check backend and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-16 max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          Account recovery
        </p>
        <h1 className="mt-2 text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Confirm your current password before choosing a new one. If you cannot access your current password, ask an administrator to reset the account for you.
        </p>

        <div className="mt-6 grid gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500"
            value={formData.email}
            required
            onChange={handleChange}
          />
          <input
            type="password"
            name="currentPassword"
            placeholder="Current password"
            className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500"
            value={formData.currentPassword}
            minLength={6}
            required
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="New password"
            className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500"
            value={formData.password}
            minLength={6}
            required
            onChange={handleChange}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500"
            value={formData.confirmPassword}
            minLength={6}
            required
            onChange={handleChange}
          />
        </div>

        {errorMessage && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <button
          disabled={isSubmitting}
          className="mt-6 w-full rounded-md bg-amber-600 p-3 font-semibold text-white hover:bg-amber-700 disabled:bg-amber-300"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link className="font-semibold text-amber-700" to="/login">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}

export default ResetPassword;
