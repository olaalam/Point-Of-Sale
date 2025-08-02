import React from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("cart");
    navigate("/login");
  };

  return (
    <div className="relative flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      {/* زر الرجوع */}
      <button
        onClick={() => navigate(-1)}
        className="font-bold px-3 py-1 rounded hover:bg-red-50 text-lg"
      >
        ←
      </button>

      {/* العنوان مثبت في المنتصف */}
      <div className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-bold text-bg-primary">
        Food2go
      </div>

      {/* زر Logout */}
      <button
        onClick={handleLogout}
        className="text-bg-primary font-semibold px-4 py-2 border border-bg-primary rounded hover:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
}

