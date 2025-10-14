import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useShift } from "@/context/ShiftContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { CheckCircle, XCircle, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Shift() {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const { openShift, closeShift, isShiftOpen } = useShift();
  const navigate = useNavigate();
  const location = useLocation();

  // 🧠 استرجاع بيانات المستخدم
  const userData = localStorage.getItem("user");
  const user = userData && userData !== "undefined" ? JSON.parse(userData) : null;
  const userName = user?.user_name || "Cashier";
  const cashierId = localStorage.getItem("cashier_id");

  // ✅ فتح الشيفت (POST)
  const handleOpenShift = async () => {
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}cashier/shift/open`;

    try {
      setLoading(true);

      // بناء البيانات المرسلة
      const payload = {};
      if (cashierId) payload.cashier_id = cashierId;

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // ✅ هنا POST لفتح الشيفت
      await axios.post(endpoint, payload, { headers });

      openShift();
      setShiftStatus("Shift is open.");

      toast.success("Shift opened successfully! Redirecting to home...");

      // تنظيف الـ URL من ?action
      const params = new URLSearchParams(location.search);
      params.delete("action");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });

      // بدء العد التنازلي للتحويل
      let timeLeft = 3;
      setCountdown(timeLeft);
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          navigate("/");
        }
      }, 1000);
    } catch (err) {
      console.error("Open shift error:", err);
      toast.error(err?.response?.data?.message || "Failed to open shift.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ غلق الشيفت (GET)
  const handleCloseShiftAction = async () => {
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}cashier/shift/close`;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // ✅ هنا GET لغلق الشيفت
      await axios.get(endpoint, { headers });

      closeShift();
      setShiftStatus("Shift is closed.");
      toast.success("Shift closed successfully!");

      // تنظيف الـ URL من ?action
      const params = new URLSearchParams(location.search);
      params.delete("action");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    } catch (err) {
      console.error("Close shift error:", err);
      toast.error(err?.response?.data?.message || "Failed to close shift.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ تنفيذ الغلق التلقائي في حالة action=close
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    if (action === "close" && isShiftOpen) {
      handleCloseShiftAction();
    }
  }, [location.search, isShiftOpen]);

  if (loading) return <Loading />;

  // Framer Motion variants
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring" } },
  };
  const buttonVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <ToastContainer />

      <div className="max-w-md w-full m-auto pb-20">
        <div className="text-center mb-6">
          <h1 className="text-2xl text-gray-800">
            Welcome Back, <span className="text-bg-primary font-semibold">{userName}</span>
          </h1>
        </div>

        <motion.div
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Shift Status</h2>
            <p className="text-gray-500 text-sm">
              {isShiftOpen ? "You're currently on shift" : "You're up for your shift"}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isShiftOpen && !shiftStatus && (
              <motion.div
                key="open-initial"
                className="px-6 pb-6"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.button
                  onClick={handleOpenShift}
                  className="w-full bg-bg-primary hover:bg-red-800 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Take your shift</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {isShiftOpen && (
              <motion.div
                key="back-to-work"
                className="px-6 pb-6"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.button
                  onClick={() => navigate("/")}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Back to Work</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {shiftStatus && (
              <motion.div
                key="status-display"
                className="px-6 pb-4 text-center"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <div
                  className={`flex items-center justify-center gap-2 text-lg font-medium ${
                    shiftStatus.includes("open") ? "text-green-600" : "text-bg-primary"
                  }`}
                >
                  {shiftStatus.includes("open") ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                  {shiftStatus}
                </div>
              </motion.div>
            )}

            {!isShiftOpen && shiftStatus === "Shift is closed." && (
              <motion.div
                key="open-new"
                className="px-6 pb-6"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.button
                  onClick={handleOpenShift}
                  className="w-full bg-bg-primary hover:bg-red-800 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Open New Shift</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {countdown !== null && countdown > 0 && shiftStatus?.includes("open") && (
              <motion.div
                key="countdown"
                className="px-6 pb-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <p className="text-gray-500 mb-2">Redirecting to home in:</p>
                <motion.div
                  className="text-4xl font-bold text-bg-primary"
                  key={countdown}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {countdown}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
