// Navbar.js - النسخة الكاملة المحدثة والنهائية
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import {
  FaUserCircle,
  FaUsers,
  FaListAlt,
  FaTable,
  FaDollarSign,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import logo from "@/assets/logo.jpg";

// المودالز الجديدة
import ExpensesModal from "@/Pages/ExpensesModal";
import PasswordConfirmModal from "@/Pages/PasswordConfirmModal";
import EndShiftReportModal from "@/Pages/ReportsAfterShift";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postData } = usePost();
  const { isShiftOpen, shiftStartTime, closeShift } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );
  const [loading, setLoading] = useState(false);

  // حالات المودالز الجديدة
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [endShiftReport, setEndShiftReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const currentTab = sessionStorage.getItem("tab") || "take_away";
  const isArabic = i18n.language === "ar";

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
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
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
      navigate("/", { replace: true });
    } else if (value === "dine_in") {
      sessionStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "delivery") {
      sessionStorage.removeItem("table_id");
      navigate("/", { replace: true });
    } else if (value === "online-order") {
      navigate("/online-orders", { replace: true });
    }
  };

  const handleTables = () => navigate("/tables", { replace: true });
  const handleDueUsers = () => navigate("/due");
  const handleAllOrders = () => navigate("/all-orders");
  const handleExpenses = () => setShowExpensesModal(true);

  // ===== إغلاق الشيفت بكل الخطوات =====
  const handleCloseShift = () => {
    if (!isShiftOpen) {
      toast.error(t("No active shift found"));
      return;
    }
    setShowPasswordModal(true);
  };

  // Navbar.js - النسخة النظيفة جدًا باستخدام API واحد فقط
  const handlePasswordConfirmed = async (password) => {
    setShowPasswordModal(false);
    setReportLoading(true);

    try {
      const token = sessionStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // API واحدة بتعمل كل حاجة: تحقق الباسورد + تجيب التقرير
      const response = await axios.post(
        `${baseUrl}cashier/reports/end_shift_report`,
        { password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // الـ API دي لازم ترجع التقرير جاهز
      setEndShiftReport(response.data); // response.data يحتوي على reportData
      setShowReportModal(true);
    } catch (err) {
      const msg =
        err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };
const handleClose = async () => {
    try {
      setLoading(true);

      const token = sessionStorage.getItem("token");
      const endpoint = `${import.meta.env.VITE_API_BASE_URL
        }cashier/shift/close`;

      // ✅ استدعاء API لقفل الـ shift
      await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // ✅ تحديث الـ context
      closeShift();

      // ✅ مسح بيانات الـ shift من sessionStorage
      sessionStorage.removeItem("shift_start_time");
      sessionStorage.removeItem("shift_data");
      sessionStorage.clear();

      // ✅ عرض رسالة النجاح
      toast.success(t("ShiftClosedSuccessfully"));

      // ✅ الانتقال للـ home بعد ثانية
      navigate("/login");
    } catch (err) {
      console.error("Close shift error:", err);
      toast.error(err?.response?.data?.message || t("FailedToCloseShift"));
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = async () => {
    try {
      await postData("api/logout", {});
      sessionStorage.clear();
      toast.success(t("Logged out successfully"));
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || t("Error while logging out"));
    }
  };

  return (
    <>
      <div className="text-gray-800 px-4 py-5 md:px-6 mb-6 w-full z-50 bg-white shadow-md">
        <div className="flex items-center justify-between gap-4">
          {/* الجزء الأيسر */}
          <div className="flex items-center gap-2">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
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

            <button
              onClick={handleAllOrders}
              className="text-gray-600 hover:text-[#910000]"
              title={t("AllOrders")}
            >
              <FaListAlt className="text-2xl md:text-3xl" />
            </button>

            <button
              onClick={handleExpenses}
              className="text-green-600 hover:text-green-800"
              title="Add Expense"
            >
              <FaDollarSign className="text-2xl md:text-3xl" />
            </button>

            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="flex gap-2 bg-transparent p-0 ml-2">
                <TabsTrigger
                  value="online-order"
                  className="px-3 py-1 text-sm font-semibold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-colors duration-200"
                >
                  {t("OnlineOrders")}
                </TabsTrigger>
                <TabsTrigger
                  value="take_away"
                  className="px-3 py-1 text-sm font-semibold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-colors duration-200"
                >
                  {t("take_away")}
                </TabsTrigger>
                <TabsTrigger
                  value="delivery"
                  className="px-3 py-1 text-sm font-semibold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-colors duration-200"
                >
                  {t("Delivery")}
                </TabsTrigger>
                <TabsTrigger
                  value="dine_in"
                  className="px-3 py-1 text-sm font-semibold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-colors duration-200"
                >
                  {t("Dinein")}
                </TabsTrigger>

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

          {/* اللوجو */}
          <a
            href="https://Food2go.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <img
              src={logo}
              alt="Food2go Logo"
              className="h-18 w-18 object-contain cursor-pointer"
            />
          </a>

          {/* الجزء الأيمن */}
          <div className="flex items-center gap-2">
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
                    disabled={loading || reportLoading}
                    className="bg-[#910000] text-white px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {loading || reportLoading ? (
                      "..."
                    ) : (
                      <>
                        <span className="hidden md:inline">
                          {t("closeshift")}
                        </span>
                        <span className="md:hidden">{t("Close")}</span>
                      </>
                    )}
                  </button>
                </>
              )}

            {/* تبديل اللغة */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">EN</span>
              <button
                onClick={toggleLanguage}
                className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isArabic ? "bg-bg-primary" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !isArabic ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm font-medium">AR</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-800 px-3 py-1 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-semibold hover:bg-gray-300 transition"
            >
              <span className="hidden sm:inline">{t("logout")}</span>
              <span className="sm:hidden">{t("Exit")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* المودالز */}
      {showExpensesModal && (
        <ExpensesModal onClose={() => setShowExpensesModal(false)} />
      )}

      {showPasswordModal && (
        <PasswordConfirmModal
          onConfirm={handlePasswordConfirmed}
          onCancel={handleClose}
          loading={reportLoading}
        />
      )}

      {showReportModal && (
        <EndShiftReportModal
          reportData={endShiftReport}
          onClose={() => setShowReportModal(false)}
          onConfirmClose={handleClose}
        />
      )}
    </>
  );
}
