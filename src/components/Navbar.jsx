// Navbar.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import { FaUserCircle, FaUsers, FaListAlt, FaTable } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo.jpg";
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData } = usePost();
  const { isShiftOpen, shiftStartTime } = useShift();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(localStorage.getItem("language") || "en");
  const currentTab = sessionStorage.getItem("tab") || "take_away";

  React.useEffect(() => {
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
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
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

  const handleCloseShift = () => {
    navigate("/shift?action=close");
  };

  const handleDueUsers = () => {
    navigate("/due");
  };

  const handleAllOrders = () => {
    navigate("/all-orders"); // ✅ صفحة الطلبات
  };

  // ✅ تم التعديل هنا: يفتح Dine In داخل Home بدل /tables
  const handleTables = () => {
    navigate("/tables", { replace: true });
  };

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

  const handleTabChange = (value) => {
    sessionStorage.setItem("tab", value);
    sessionStorage.setItem("order_type", value);
    if (value === "take_away") {
      sessionStorage.removeItem("table_id");
      sessionStorage.removeItem("delivery_user_id");
    } else if (value === "dine_in") {
      sessionStorage.removeItem("delivery_user_id");
    } else if (value === "delivery") {
      sessionStorage.removeItem("table_id");
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="text-gray-800 px-4 py-5 md:px-6 mb-6 w-full z-50 bg-white shadow-md">
      <div className="flex items-center justify-between gap-4">
        {/* القسم الأيسر */}
        <div className="flex items-center gap-2">
          {location.pathname !== "/shift" && location.pathname !== "/cashier" && (
            <button
              onClick={() => navigate(-1)}
              className="font-bold text-center px-1 pb-1 hover:bg-red-200 cursor-pointer hover:text-gray-800 rounded bg-bg-primary text-3xl text-white transition-colors duration-200"
              title="Go back"
            >
              ←
            </button>
          )}
          <button
            onClick={() => navigate("/profile")}
            className="text-gray-600 hover:text-[#910000]"
          >
            <FaUserCircle className="text-2xl md:text-3xl" />
          </button>
          <button
            onClick={handleDueUsers}
            className="text-gray-600 hover:text-[#910000]"
          >
            <FaUsers className="text-2xl md:text-3xl" />
          </button>

          {/* ✅ أيقونة صفحة All Orders */}
          <button
            onClick={handleAllOrders}
            className="text-gray-600 hover:text-[#910000]"
            title={t("AllOrders")}
          >
            <FaListAlt className="text-2xl md:text-3xl" />
          </button>

          {/* ✅ Tabs مع أيقونة Tables بجانب dine-in */}
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="flex gap-2 bg-transparent p-0 ml-2">
              <TabsTrigger
                value="take_away"
                className="px-3 py-1 text-sm font-semibold 
                  bg-white text-bg-primary border border-bg-primary
                  data-[state=active]:bg-bg-primary data-[state=active]:text-white
                  transition-colors duration-200"
              >
                {t("take_away")}
              </TabsTrigger>
              <TabsTrigger
                value="delivery"
                className="px-3 py-1 text-sm font-semibold 
                  bg-white text-bg-primary border border-bg-primary
                  data-[state=active]:bg-bg-primary data-[state=active]:text-white
                  transition-colors duration-200"
              >
                {t("Delivery")}
              </TabsTrigger>

                <TabsTrigger
                  value="dine_in"
                  className="px-3 py-1 text-sm font-semibold 
                    bg-white text-bg-primary border border-bg-primary
                    data-[state=active]:bg-bg-primary data-[state=active]:text-white
                    transition-colors duration-200"
                >
                  {t("Dinein")}
                </TabsTrigger>

                {/* ✅ زر الطاولات يفتح Dine In */}
                <button
                  onClick={handleTables}
                  className="p-2 border border-bg-primary rounded-lg hover:bg-bg-primary hover:text-white text-bg-primary transition"
                  title={t("Tables")}
                >
                  <FaTable className="text-lg" />
                </button>
            </TabsList>
          </Tabs>
        </div>

{/* العنوان */}
<a
  href="https://Food2go.online"
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center justify-center"
>
  <img
    src={logo}
    alt="Food2go Logo"
    className="h-18 w-18  object-contain cursor-pointer"
  />
</a>


        {/* القسم الأيمن */}
        <div className="flex items-center gap-2">
          {location.pathname !== "/shift" && location.pathname !== "/cashier" && (
            <>
              <div className="flex items-center text-xs md:text-sm font-medium text-gray-600">
                <span className="text-gray-500 mr-1 hidden sm:inline">{t("shift")}:</span>
                <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-800 text-xs md:text-sm">
                  {formatElapsedTime()}
                </span>
              </div>
              <button
                onClick={handleCloseShift}
                className="bg-[#910000] text-white px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-red-700"
              >
                <span className="hidden md:inline">{t("closeshift")}</span>
                <span className="md:hidden">{t("Close")}</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">EN</span>
            <button
              onClick={toggleLanguage}
              className={`
                relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer
                rounded-full border-2 border-transparent transition-colors
                duration-200 ease-in-out
                ${language === "ar" ? "bg-bg-primary" : "bg-gray-300"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full
                  bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${language === "ar" ? "translate-x-6" : "translate-x-0"}
                `}
              />
            </button>
            <span className="text-sm font-medium">AR</span>
          </div>

          <button
            onClick={handleLogout}
            className="bg-gray-200 text-gray-800 px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-gray-300"
          >
            <span className="hidden sm:inline">{t("logout")}</span>
            <span className="sm:hidden">{t("Exit")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
