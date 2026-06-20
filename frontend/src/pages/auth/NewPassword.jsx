import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function NewPassword() {
  const navigate = useNavigate();
  const [resetData] = useState(() => {
    const savedVerification = sessionStorage.getItem("passwordResetVerification");

    if (!savedVerification) {
      return null;
    }

    try {
      const parsedVerification = JSON.parse(savedVerification);

      if (!parsedVerification.email || !parsedVerification.code) {
        sessionStorage.removeItem("passwordResetVerification");
        return null;
      }

      return parsedVerification;
    } catch {
      sessionStorage.removeItem("passwordResetVerification");
      return null;
    }
  });
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!resetData) {
      navigate("/reset-password", { replace: true });
    }
  }, [navigate, resetData]);

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

    if (!resetData) {
      setErrorMessage("Please verify your reset code first.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await API.post("/auth/reset-password", {
        email: resetData.email,
        code: resetData.code,
        password: formData.password,
      });

      sessionStorage.removeItem("passwordResetVerification");
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 900);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Cannot reset password. Please check your code and try again."
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
        <h1 className="mt-2 text-3xl font-bold">Create New Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your reset code was verified. Choose a new password for your account.
        </p>

        <div className="mt-6 grid gap-4">
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
          {isSubmitting ? "Saving..." : "Save new password"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          Need a new code?{" "}
          <Link className="font-semibold text-amber-700" to="/reset-password">
            Start again
          </Link>
        </p>
      </form>
    </main>
  );
}

export default NewPassword;
