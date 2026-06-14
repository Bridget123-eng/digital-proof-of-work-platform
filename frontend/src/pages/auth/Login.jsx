import { useContext, useState } from "react";
import { AuthContext } from "../../context/authContextValue";
import API from "../../api/axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Login() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { data } = await API.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Cannot login. Please confirm the backend and database are running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1fr]">
        <form
          onSubmit={handleLogin}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
            Welcome back
          </p>
          <h2 className="mt-2 text-3xl font-bold">Login</h2>
          <p className="mt-2 text-sm text-slate-600">
            Access your evidence, verification queue, and public proof profile.
          </p>

          {location.state?.message && (
            <p className="mt-5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {location.state.message}
            </p>
          )}

          <div className="mt-6 grid gap-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-sky-500"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-sky-500"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            disabled={isSubmitting}
            className="mt-6 w-full rounded-md bg-sky-600 p-3 font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            No account?{" "}
            <Link className="font-semibold text-sky-700" to="/register">
              Create one
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-slate-600">
            <Link className="font-semibold text-sky-700" to="/reset-password">
              Reset password
            </Link>
          </p>
        </form>

        <section className="hidden overflow-hidden rounded-lg border border-white/10 bg-white/10 p-8 text-white shadow-2xl lg:block">
          <div className="grid aspect-[4/3] place-items-center rounded-lg bg-gradient-to-br from-sky-300 via-emerald-300 to-amber-200 p-8">
            <div className="w-full rounded-lg bg-white/85 p-6 text-slate-950 shadow-xl">
              <div className="h-3 w-24 rounded bg-sky-500" />
              <div className="mt-6 grid gap-3">
                <div className="h-14 rounded bg-slate-100" />
                <div className="h-14 rounded bg-emerald-100" />
                <div className="h-14 rounded bg-amber-100" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="h-20 rounded bg-sky-100" />
                <div className="h-20 rounded bg-emerald-100" />
                <div className="h-20 rounded bg-amber-100" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
