import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaUserCircle, FaUsers } from "react-icons/fa";
import { useTranslation } from "react-i18next";
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData } = usePost();
  const { isShiftOpen, shiftStartTime } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState(i18n.language || "en");

  useEffect(() => {
    if (isShiftOpen) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isShiftOpen]);

const toggleLanguage = () => {
  const newLang = language === "en" ? "ar" : "en"; 
  i18n.changeLanguage(newLang);
  setLanguage(newLang);
  localStorage.setItem("language", newLang); 
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
  // document.body.dir = newLang === "ar" ? "rtl" : "ltr";
};

  const checkShiftStatus = () => {
    if (isShiftOpen !== undefined) return isShiftOpen;
    const storedShiftData = sessionStorage.getItem("shift_data");
    if (storedShiftData) {
      try {
        const shiftData = JSON.parse(storedShiftData);
        return shiftData.isOpen || false;
      } catch {
        return false;
      }
    }
    const shiftStartTime = sessionStorage.getItem("shift_start_time");
    return !!shiftStartTime;
  };

  const handleLogout = async () => {
    const shiftIsOpen = checkShiftStatus();
    if (shiftIsOpen) {
toast.error(t("YouMustCloseShiftBeforeLogout"));
      return;
    }
    try {
      await postData("api/logout", {});
      sessionStorage.clear();
toast.success(t("LoggedOutSuccessfully"));
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || t("Errorwhileloggingout"));
    }
  };

  const handleCloseShift = () => navigate("/shift?action=close");
  const handleDueUsers = () => navigate("/due");

  const formatElapsedTime = () => {
    const start = shiftStartTime || sessionStorage.getItem("shift_start_time");
    if (!start) return "00:00:00";
    const elapsed = Math.floor((currentTime - new Date(start)) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-gray-800 px-4 py-2 md:px-6 mb-6 w-full z-50 bg-white shadow-md">
      <div className="relative flex items-center justify-between">
        {/* Left section (Back + Profile) */}
        <div className="flex items-center space-x-2">
          {location.pathname !== "/shift" &&
            location.pathname !== "/cashier" && (
              <button
                onClick={() => navigate(-1)}
                className="font-bold text-center px-1 pb-1 hover:bg-red-200 cursor-pointer hover:text-gray-800 rounded bg-bg-primary text-4xl text-white transition-colors duration-200"
                title="Go back"
              >
                ←
              </button>
            )}

          {/* Profile */}
          <button
            onClick={() => navigate("/profile")}
            className="text-gray-600 hover:text-[#910000] transition-colors duration-200"
            title={t("profile")}
          >
            <FaUserCircle className="text-2xl md:text-3xl" />
          </button>

          {/* Due Users */}
          <button
            onClick={handleDueUsers}
            className="text-gray-600 hover:text-[#910000] transition-colors duration-200"
            title={t("dueUsers")}
          >
            <FaUsers className="text-2xl md:text-3xl" />
          </button>

          {/* 🌐 Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md text-xs font-semibold hover:bg-gray-300 transition duration-300"
          >
            {language === "en" ? "AR" : "EN"}
          </button>
        </div>

        {/* Title */}
        <h1 className="text-lg md:text-xl font-bold text-[#910000] text-center absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          {t("title")}
        </h1>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {location.pathname !== "/shift" &&
            location.pathname !== "/cashier" && (
              <>
                <div className="flex items-center text-xs md:text-sm font-medium text-gray-600">
                  <span className="text-gray-500 mr-1 hidden sm:inline">
                    {t("shift")}:
                  </span>
                  <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-800 text-xs md:text-sm">
                    {formatElapsedTime()}
                  </span>
                </div>

                <button
                  onClick={handleCloseShift}
                  className="bg-[#910000] text-white px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-red-700 transition duration-300"
                >
                  {t("closeShift")}
                </button>
              </>
            )}

          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-800 px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-gray-300 transition duration-300"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
