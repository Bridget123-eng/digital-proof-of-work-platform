import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function ResetPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    code: "",
  });
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

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

    setIsSubmitting(true);

    try {
      if (!codeSent) {
        const { data } = await API.post("/auth/forgot-password", {
          email: formData.email,
        });
        setMessage(data.message || "If the email is registered, a password reset code has been sent.");
        setCodeSent(true);
      } else {
        await API.post("/auth/verify-reset-code", {
          email: formData.email,
          code: formData.code,
        });

        sessionStorage.setItem(
          "passwordResetVerification",
          JSON.stringify({ email: formData.email, code: formData.code })
        );
        navigate("/reset-password/new");
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
        <h1 className="mt-2 text-3xl font-bold">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          {codeSent
            ? "Enter the verification code sent to your email."
            : "Enter your registered email address and we will send you a short-lived verification code."}
        </p>

        <div className="mt-6 grid gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500 disabled:bg-slate-100"
            value={formData.email}
            required
            disabled={codeSent}
            onChange={handleChange}
          />
          {codeSent && (
            <input
              type="text"
              inputMode="numeric"
              name="code"
              placeholder="6-digit verification code"
              className="rounded-md border border-slate-300 p-3 outline-none focus:border-amber-500"
              value={formData.code}
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              required
              onChange={handleChange}
            />
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

        <button
          disabled={isSubmitting}
          className="mt-6 w-full rounded-md bg-amber-600 p-3 font-semibold text-white hover:bg-amber-700 disabled:bg-amber-300"
        >
          {isSubmitting ? (codeSent ? "Verifying..." : "Sending...") : codeSent ? "Verify code" : "Send reset code"}
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
