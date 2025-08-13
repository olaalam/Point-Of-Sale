import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData } = usePost();
  const { isShiftOpen, shiftStartTime, closeShift } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for the timer
  useEffect(() => {
    if (isShiftOpen) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isShiftOpen]);

  const handleLogout = async () => {
    // Check if a shift is currently open. If so, prevent logout.
    if (isShiftOpen) {
      toast.error("You must close the shift before logging out.");
      return; // Stop the function here
    }

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

  const handleCloseShift = () => {
    // Navigate to shift page with close action
    navigate("/shift?action=close");
  };

  const formatElapsedTime = () => {
    if (!shiftStartTime) return "00:00:00";

    const elapsed = Math.floor((currentTime - new Date(shiftStartTime)) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    // Make sure all values are positive
    const safeHours = Math.max(0, hours);
    const safeMinutes = Math.max(0, minutes);
    const safeSeconds = Math.max(0, seconds);

    return `${safeHours.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')}:${safeSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white text-gray-800 p-4 shadow-md flex items-center justify-between">
      {/* Back button, hidden on /cashier page and on /shift with action=close */}
      {location.pathname !== "/cashier" && !(location.pathname === "/shift" && location.search === "?action=close") && (
        <button
          onClick={() => navigate(-1)}
          className="font-bold px-3 py-1 rounded hover:bg-red-50 text-lg"
        >
          ←
        </button>
      )}

      {/* Centered Title */}
      <div className="flex-1 text-center">
        <h1 className="text-xl font-bold text-[#910000]">Food2go</h1>
      </div>

      {/* Shift controls and timer */}
      <div className="flex items-center space-x-4">
        {isShiftOpen && (
          <>
            {/* Timer display */}
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
              <span className="text-gray-500">Shift Duration:</span>
              <span className="text-gray-800 bg-gray-100 px-2 py-1 rounded-md">{formatElapsedTime()}</span>
            </div>

            {/* Close shift button */}
            <button
              onClick={handleCloseShift}
              className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition duration-300"
            >
              Close Shift
            </button>
          </>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition duration-300"
        >
          Logout
        </button>
          </div>
    </div>
  );
}
