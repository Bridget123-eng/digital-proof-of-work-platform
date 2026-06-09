function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-[400px] p-8 shadow-lg rounded-lg">
        <h2 className="text-3xl font-bold mb-6">Register</h2>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full border p-3 mb-4 rounded"
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 mb-4 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 mb-4 rounded"
        />

        <button className="w-full bg-green-600 text-white p-3 rounded">
          Create Account
        </button>
      </div>
    </div>
  );
}

export default Register;