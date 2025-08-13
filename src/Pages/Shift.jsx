import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { useShift } from "@/context/ShiftContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // Import motion and AnimatePresence

export default function Shift() {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const { refetch, isLoading, error } = useGet();
  const { openShift, closeShift, isShiftOpen } = useShift();
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenShift = async () => {
    const endpoint = "cashier/shift/open";

    try {
      await refetch(endpoint);
      openShift();
      setShiftStatus("Shift is open.");

      toast.success("Shift opened successfully! Redirecting to home...");

      const params = new URLSearchParams(location.search);
      params.delete("action");
      navigate(
        { pathname: location.pathname, search: params.toString() },
        { replace: true }
      );

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
      toast.error(err?.message || `Failed to open shift.`);
    }
  };

  const handleCloseShiftAction = async () => {
    const endpoint = "cashier/shift/close";
    try {
      await refetch(endpoint);
      closeShift();
      setShiftStatus("Shift is closed.");
      toast.success("Shift closed successfully!");

      const params = new URLSearchParams(location.search);
      params.delete("action");
      navigate(
        { pathname: location.pathname, search: params.toString() },
        { replace: true }
      );
    } catch (err) {
      toast.error(err?.message || `Failed to close shift.`);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");

    if (action === "close" && isShiftOpen) {
      handleCloseShiftAction();
    }
  }, [location.search, isShiftOpen]);

  if (isLoading) {
    return <Loading />;
  }

  // Define Framer Motion variants for animations
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
      <motion.div
        className="text-center p-8 bg-white shadow-2xl rounded-xl max-w-md w-full transition-all duration-300"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl font-bold text-[#910000] mb-6">Shift Status</h1>

        <AnimatePresence mode="wait">
          {/* عرض رسالة أو زر فتح الشفت */}
          {!isShiftOpen && !shiftStatus && (
            <motion.div
              key="open-initial"
              className="mt-6"
              variants={buttonVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -20 }}
            >
              <p className="text-gray-600 mb-4 flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                No active shift found.
              </p>
              <motion.button
                onClick={handleOpenShift}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition duration-300 w-full hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Open Shift
              </motion.button>
            </motion.div>
          )}

          {/* عرض حالة الشفت */}
          {shiftStatus && (
            <motion.div
              key="status-display"
              className="mt-4 flex flex-col items-center justify-center gap-2 text-lg font-medium"
              variants={buttonVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -20 }}
            >
              <div
                className={`flex items-center justify-center gap-2 ${
                  shiftStatus.includes("open") ? "text-green-600" : "text-red-600"
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

          {/* زر فتح شفت جديد بعد الإغلاق */}
          {!isShiftOpen && shiftStatus === "Shift is closed." && (
            <motion.div
              key="open-new"
              className="mt-6"
              variants={buttonVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -20 }}
            >
              <motion.button
                onClick={handleOpenShift}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition duration-300 w-full hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Open New Shift
              </motion.button>
            </motion.div>
          )}

          {/* العد التنازلي لإعادة التوجيه */}
          {countdown !== null && countdown > 0 && shiftStatus?.includes("open") && (
            <motion.div
              key="countdown"
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <p className="text-gray-500 mb-2">Redirecting to home in:</p>
              <motion.div
                className="text-5xl font-extrabold text-blue-600"
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

        {/* رسالة الخطأ */}
        {error && (
          <motion.div
            key="error-message"
            className="mt-4 text-lg text-red-600 flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <XCircle className="w-5 h-5" />
            Error: {error.message}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}