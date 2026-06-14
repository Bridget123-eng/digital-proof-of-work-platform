import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Verified student achievement
        </p>
        <h1 className="mt-4 max-w-4xl text-5xl font-bold">
          Digital Proof of Work Platform
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Submit project evidence, analyze repository quality, route work to human verifiers, award badges, and publish trusted portfolios for recruiters.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded bg-slate-950 px-5 py-3 text-white" to="/register">
            Create account
          </Link>
          <Link className="rounded border border-slate-300 px-5 py-3" to="/explore">
            Explore verified work
          </Link>
          <Link className="rounded border border-slate-300 px-5 py-3" to="/login">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Home;
