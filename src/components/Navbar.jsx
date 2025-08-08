import React from "react";
import { useNavigate, useLocation } from "react-router-dom"; // استدعاء useLocation
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // استخدام useLocation
  const { postData } = usePost();

  const handleLogout = async () => {
    try {
      await postData("api/logout", {});
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("branch_id");
      localStorage.removeItem("cart");
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || "Error while logging out");
    }
  };

  return (
    <div className="relative flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      {/* زر الرجوع هيظهر فقط إذا كان المسار ليس /cashier */}
      {location.pathname !== "/cashier" && (
        <button
          onClick={() => navigate(-1)}
          className="font-bold px-3 py-1 rounded hover:bg-red-50 text-lg"
        >
          ←
        </button>
      )}

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