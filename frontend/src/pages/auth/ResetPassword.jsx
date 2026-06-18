import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../../api/axios";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
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
    setResetUrl("");
    setErrorMessage("");

    setIsSubmitting(true);

    try {
      if (!token) {
        const { data } = await API.post("/auth/forgot-password", {
          email: formData.email,
        });
        setMessage(data.message || "If the email is registered, a password reset link has been sent.");
        setResetUrl(data.resetUrl || "");
      } else {
        if (formData.password !== formData.confirmPassword) {
          setErrorMessage("Passwords do not match.");
          setIsSubmitting(false);
          return;
        }

        await API.post("/auth/reset-password", {
          token,
          password: formData.password,
        });

        setMessage("Password reset successful. Redirecting to login...");
        setTimeout(() => navigate("/login"), 900);
      }
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
        <h1 className="mt-2 text-3xl font-bold">
          {token ? "Choose a new password" : "Reset Password"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {token
            ? "Set your new password below. This reset link expires after a short time."
            : "Enter your registered email address and we will send you a reset link."}
        </p>

        <div className="mt-6 grid gap-4">
          {!token && (
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500"
              value={formData.email}
              required
              onChange={handleChange}
            />
          )}
          {token && (
            <>
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
            </>
          )}
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

        {resetUrl && (
          <a
            className="mt-3 block break-all rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
            href={resetUrl}
          >
            Open development reset link
          </a>
        )}

        <button
          disabled={isSubmitting}
          className="mt-6 w-full rounded-md bg-amber-600 p-3 font-semibold text-white hover:bg-amber-700 disabled:bg-amber-300"
        >
          {isSubmitting ? (token ? "Saving..." : "Sending...") : token ? "Save new password" : "Send reset link"}
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
