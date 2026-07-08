import { useState } from "react";
import API from "../../api/axios";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await API.post("/auth/register", formData);
      navigate("/login", {
        state: {
          message: "Account created. Login with your new credentials.",
        },
      });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Cannot create account. Please check backend and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <form
          onSubmit={handleRegister}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Get started
          </p>
          <h2 className="mt-2 text-3xl font-bold">Create Account</h2>
          <p className="mt-2 text-sm text-slate-600">
          </p>

          <div className="mt-6 grid gap-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-emerald-500"
              value={formData.name}
              required
              onChange={handleChange}
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-emerald-500"
              value={formData.email}
              required
              onChange={handleChange}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-emerald-500"
              value={formData.password}
              minLength={6}
              required
              onChange={handleChange}
            />

            <select
              name="role"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-emerald-500 bg-white"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">I am a Student</option>
              <option value="mentor">I am a Mentor</option>
            </select>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            disabled={isSubmitting}
            className="mt-6 w-full rounded-md bg-emerald-600 p-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link className="font-semibold text-emerald-700" to="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default Register;
