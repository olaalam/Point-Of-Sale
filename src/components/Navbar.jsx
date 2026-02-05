// Navbar.jsx - النسخة الكاملة المعدلة مع Dropdown للإشعارات تحت الجرس (بدون إزالة أو اختصار أي شيء)
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import {
  FaBell,
  FaChevronDown,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import logo from "@/assets/logo.jpg";
import {
  User,
  LogOut,
  Clock,
  Globe,
} from "lucide-react";

// المودالز
import ExpensesModal from "@/Pages/ExpensesModal";
import PasswordConfirmModal from "@/Pages/PasswordConfirmModal";
import EndShiftReportModal from "@/Pages/ReportsAfterShift";

export default function Navbar() {
  const FALLBACK_SOUND = "https://www.soundjay.com/buttons/sounds/button-1.mp3";
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

  // حالات المودالز
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCashInputModal, setShowCashInputModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [cashAmount, setCashAmount] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [endShiftReport, setEndShiftReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const audioRef = useRef(null);
  const previousCountRef = useRef(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userData = JSON.parse(sessionStorage.getItem("user") || "{}");
  const permissions = {
    online_order: userData.online_order === 1,
    take_away: userData.take_away === 1,
    delivery: userData.delivery === 1,
    dine_in: userData.dine_in === 1,
  };

  const currentTab = sessionStorage.getItem("tab") || "take_away";
  const isArabic = i18n.language === "ar";
  useEffect(() => {
    const storedSound = sessionStorage.getItem("notification_sound") || FALLBACK_SOUND;
    audioRef.current = new Audio(storedSound);
    audioRef.current.load();

    const enableAudio = () => {
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => { });
      window.removeEventListener('click', enableAudio);
    };
    window.addEventListener('click', enableAudio);
  }, []);

  const { data: notificationsData, refetch: refetchNotifications } = useGet(
    "cashier/orders/notifications",
    { useCache: false }
  );

  const notifications = notificationsData?.orders || [];

  useEffect(() => {
    if (notificationsData?.orders_count !== undefined) {
      const newCount = notificationsData.orders_count;

      if (newCount > previousCountRef.current) {
        if (audioRef.current) {
          const currentStoredSound = sessionStorage.getItem("notification_sound") || FALLBACK_SOUND;
          if (audioRef.current.src !== currentStoredSound) {
            audioRef.current.src = currentStoredSound;
          }

          audioRef.current.play().catch((e) => console.warn("Audio play blocked:", e));
          toast.info(t("New Order Received!"));
        }
      }

      setNotificationCount(newCount);
      previousCountRef.current = newCount;
    }
  }, [notificationsData, t]);

  useEffect(() => {
    if (!permissions.online_order) return;
    const interval = setInterval(() => {
      refetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetchNotifications, permissions.online_order]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (!permissions[value.replace("-", "_")]) {
      toast.warn(t("You do not have permission for this section"));
      return;
    }

    const isRepeated = sessionStorage.getItem("is_repeating_order") === "true";

    sessionStorage.setItem("tab", value);
    sessionStorage.setItem("order_type", value);

    if (!isRepeated) {
      sessionStorage.removeItem("cart");
    } else {
      sessionStorage.removeItem("is_repeating_order");
    }

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

  const handleTables = () => {
    if (!permissions.dine_in) {
      toast.warn(t("You do not have permission for tables"));
      return;
    }
    navigate("/tables", { replace: true });
  };

  const handleDueUsers = () => navigate("/due");
  const handleAllOrders = () => navigate("/all-orders");
  const handleExpenses = () => setShowExpensesModal(true);
  const handleDeliveryOrder = () => navigate("/deliveryOrders");
  const handleDineInOrder = () => navigate("/dine-in-orders");

  const handleCloseShift = () => {
    if (!isShiftOpen) {
      toast.error(t("No active shift found"));
      return;
    }
    setShowPasswordModal(true);
  };

  const handleAutoCashConfirmed = async (password) => {
    setReportLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const response = await axios.post(
        `${baseUrl}cashier/reports/end_shift_report`,
        {
          password: password,
          amount: 0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setEndShiftReport(response.data);
      setShowReportModal(true);
    } catch (err) {
      const msg = err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePasswordConfirmed = (password) => {
    setPendingPassword(password);
    setShowPasswordModal(false);
    const enterAmountStatus = sessionStorage.getItem("enter_amount");

    if (enterAmountStatus === "1") {
      setShowCashInputModal(true);
      setCashAmount("");
    } else {
      handleAutoCashConfirmed(password);
    }
  };

  const handleCashConfirmed = async () => {
    if (!cashAmount || isNaN(cashAmount) || Number(cashAmount) < 0) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    setReportLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const response = await axios.post(
        `${baseUrl}cashier/reports/end_shift_report`,
        {
          password: pendingPassword,
          amount: Number(cashAmount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setEndShiftReport(response.data);
      setShowCashInputModal(false);
      setShowReportModal(true);
    } catch (err) {
      const msg = err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const handleFinalClose = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");
      const endpoint = `${import.meta.env.VITE_API_BASE_URL}cashier/shift/close`;

      await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      closeShift();
      sessionStorage.removeItem("shift_start_time");
      sessionStorage.removeItem("shift_data");
      sessionStorage.clear();

      toast.success(t("ShiftClosedSuccessfully"));
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

  const handleOrderClick = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      await axios.get(`${baseUrl}cashier/orders/order_read/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      refetchNotifications();
      navigate(`/online-orders/${orderId}`);
      setIsDropdownOpen(false);
    } catch (err) {
      console.error("Error marking order as read:", err);
      toast.error("فشل في تحديث حالة الطلب");
      navigate(`/online-orders/${orderId}`);
      setIsDropdownOpen(false);
    }
  };

  return (
    <>
      <div className="text-gray-800 px-4 md:px-6 w-full z-50 bg-white shadow-md">
        <div className="flex items-center justify-between gap-4 py-1.5">
          {/* Left Section: Navigation */}
          <div className="flex items-center gap-2 flex-1 pb-1">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
                <button
                  onClick={() => navigate(-1)}
                  className="h-9 px-3 flex items-center justify-center font-bold text-center hover:bg-red-200 cursor-pointer hover:text-gray-800 rounded bg-bg-primary text-2xl text-white transition-colors duration-200"
                  title="Go back"
                >
                  ←
                </button>
              )}

            <button
              onClick={handleDueUsers}
              className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary rounded-md hover:bg-bg-primary hover:text-white transition-all duration-200 whitespace-nowrap"
            >
              {t("Due")}
            </button>

            <button
              onClick={handleAllOrders}
              className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary rounded-md hover:bg-bg-primary hover:text-white transition-all duration-200 whitespace-nowrap"
              title={t("AllOrders")}
            >

              {t("AllOrders")}
            </button>

            <button
              onClick={handleExpenses}
              className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-green-600 border border-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all duration-200 whitespace-nowrap"
              title="Add Expense"
            >
              {t("Expenses")}
            </button>

            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="flex gap-2 bg-transparent p-0 ml-2">
                {permissions.online_order && (
                  <TabsTrigger
                    value="online-order"
                    className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-all duration-200 whitespace-nowrap"
                  >
                    {t("OnlineOrders")}
                  </TabsTrigger>
                )}

                {permissions.take_away && (
                  <TabsTrigger
                    value="take_away"
                    className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-all duration-200 whitespace-nowrap"
                  >
                    {t("take_away")}
                  </TabsTrigger>
                )}

                {permissions.delivery && (
                  <TabsTrigger
                    value="delivery"
                    className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-all duration-200 whitespace-nowrap"
                  >
                    {t("Delivery")}
                  </TabsTrigger>
                )}

                {permissions.dine_in && (
                  <TabsTrigger
                    value="dine_in"
                    className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary data-[state=active]:bg-bg-primary data-[state=active]:text-white transition-all duration-200 whitespace-nowrap"
                  >
                    {t("Dinein")}
                  </TabsTrigger>
                )}

                {permissions.dine_in && (
                  <button
                    onClick={handleTables}
                    className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary rounded-md hover:bg-bg-primary hover:text-white transition-all duration-200 whitespace-nowrap"
                    title={t("Tables")}
                  >
                    {t("Tables")}
                  </button>
                )}

                {(permissions.delivery || permissions.dine_in) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-bg-primary border border-bg-primary rounded-md hover:bg-bg-primary hover:text-white transition-all duration-200 whitespace-nowrap cursor-pointer outline-none">
                        {t("Reports")}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 bg-white">
                      {permissions.delivery && (
                        <DropdownMenuItem onClick={handleDeliveryOrder} className="cursor-pointer py-2 px-3 text-xs font-bold text-gray-700">
                          {t("DeliveryOrder")}
                        </DropdownMenuItem>
                      )}
                      {permissions.dine_in && (
                        <DropdownMenuItem onClick={handleDineInOrder} className="cursor-pointer py-2 px-3 text-xs font-bold text-gray-700">
                          {t("DineInOrder")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TabsList>
            </Tabs>
          </div>

          {/* Center Section: Logo */}
          <div className="flex-shrink-0 px-4">
            <a
              href="https://Food2go.online"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={logo}
                alt="Food2go Logo"
                className="h-10 md:h-12 w-auto object-contain cursor-pointer"
              />
            </a>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
                <div className="flex items-center text-xs md:text-sm font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  <span className="text-gray-500 mr-1 hidden sm:inline">
                    {t("shift")}:
                  </span>
                  <span className="text-gray-800 font-bold">
                    {formatElapsedTime()}
                  </span>
                </div>
              )}

            {/* Notifications Dropdown */}
            {permissions.online_order && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer outline-none"
                >
                  <FaBell className="text-lg" />
                  {notificationCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center shadow-sm">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                  <FaChevronDown className={`text-[10px] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className={`absolute ${isArabic ? "left-0" : "right-0"} mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto`}>
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                      <h3 className="font-bold text-gray-800 text-lg">{t("New Orders")} ({notificationCount})</h3>
                    </div>
                    <div className="py-2">
                      {notifications.length > 0 ? (
                        <ul>
                          {notifications.map((orderId) => (
                            <li key={orderId}>
                              <button onClick={() => handleOrderClick(orderId)} className="w-full px-4 py-3 hover:bg-gray-100 transition text-right flex items-center justify-between border-b border-gray-100 last:border-0 border-r-4 border-r-bg-primary">
                                <div>
                                  <span className="font-semibold text-gray-800">Order #{orderId}</span>
                                  <span className="block text-sm text-gray-500 mt-1">{t("New Order")}</span>
                                </div>
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">{t("New")}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="p-8 text-center text-gray-500">{t("No new orders")}</p>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                      <button onClick={() => { handleTabChange("online-order"); setIsDropdownOpen(false); }} className="w-full text-center text-bg-primary font-bold hover:underline">{t("View All Orders")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 px-3 text-[10px] md:text-sm font-bold bg-white text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer outline-none">
                  <span>{userData.name || t("Account")}</span>
                  <FaChevronDown className="text-[10px] text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isArabic ? "start" : "end"} className="w-56 mt-2 bg-white">
                <DropdownMenuLabel className="font-bold text-gray-700">{userData.name || t("UserAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="flex items-center gap-2 cursor-pointer py-2 px-3 font-semibold"><User className="w-4 h-4 text-gray-500" /><span>{t("Profile")}</span></DropdownMenuItem>
                <DropdownMenuItem onClick={toggleLanguage} className="flex items-center gap-2 cursor-pointer py-2 px-3 font-semibold"><Globe className="w-4 h-4 text-gray-500" /><span>{isArabic ? "English" : "العربية"}</span></DropdownMenuItem>
                {location.pathname !== "/shift" && location.pathname !== "/cashier" && isShiftOpen && (
                  <DropdownMenuItem onClick={handleCloseShift} disabled={loading || reportLoading} className="flex items-center gap-2 cursor-pointer py-2 px-3 text-red-600 focus:text-red-600 font-semibold"><Clock className="w-4 h-4" /><span>{t("closeshift")}</span></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer py-2 px-3 text-red-800 focus:text-white focus:bg-red-800 font-semibold"><LogOut className="w-4 h-4" /><span>{t("logout")}</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {showExpensesModal && (
        <ExpensesModal onClose={() => setShowExpensesModal(false)} />
      )}
      {showPasswordModal && (
        <PasswordConfirmModal
          onConfirm={handlePasswordConfirmed}
          onCancel={handleFinalClose}
          loading={reportLoading}
        />
      )}
      {showCashInputModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">إغلاق الوردية</h3>
              <p className="text-gray-500 mt-2">كم المبلغ الموجود في العهدة الآن؟</p>
            </div>
            <div className="relative">
              <input
                type="number"
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-bg-primary outline-none text-center text-3xl font-bold text-gray-700 transition-all"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                autoFocus
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">EGP</span>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setShowCashInputModal(false); setCashAmount(""); }}
                className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleCashConfirmed}
                disabled={!cashAmount || reportLoading}
                className="flex-1 py-3 bg-bg-primary text-white font-semibold rounded-xl shadow-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {reportLoading ? "جاري التحميل..." : "تأكيد وإرسال"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReportModal && (
        <EndShiftReportModal
          reportData={endShiftReport}
          onClose={() => setShowReportModal(false)}
          onConfirmClose={handleFinalClose}
        />
      )}
    </>
  );
}