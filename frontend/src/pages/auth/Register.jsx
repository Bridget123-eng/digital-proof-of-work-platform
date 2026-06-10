import { useState } from "react";
import API from "../../api/axios";
import { useNavigate } from "react-router-dom";

function Register() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {

      await API.post(
        "/auth/register",
        formData
      );

      alert("Registration successful");

      navigate("/login");

    } catch (error) {
      alert(error.response.data.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">

      <form
        onSubmit={handleRegister}
        className="w-[400px] p-8 shadow-lg rounded-lg"
      >

        <h2 className="text-3xl font-bold mb-6">
          Register
        </h2>

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full border p-3 mb-4 rounded"
          onChange={handleChange}
        />

        <button
          className="w-full bg-green-600 text-white p-3 rounded"
        >
          Create Account
        </button>

      </form>
    </div>
  );
}

export default Register;