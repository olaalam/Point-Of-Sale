import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { useShift } from "@/context/ShiftContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { CheckCircle, XCircle, Loader2, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Shift() {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const { refetch, isLoading, error } = useGet();
  const { openShift, closeShift, isShiftOpen } = useShift();
  const navigate = useNavigate();
  const location = useLocation();
  const name = localStorage.getItem("user");
  const user = JSON.parse(name);
  const userName = user.user_name;
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

      {/* Main Container */}
      <div className="max-w-md w-full m-auto pb-20">
        {/* Welcome Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl text-gray-800">
            Welcome Back, <span className="text-bg-primary font-semibold">{userName}</span>
          </h1>
        </div>

        {/* Shift Status Card */}
        <motion.div
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Card Header */}
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Shift Status</h2>
            <p className="text-gray-500 text-sm">
              {isShiftOpen ? "You're currently on shift" : "You're up for your shift"}
            </p>
          </div>

          {/* Profile Avatar */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Display shift status or action buttons */}
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
                  className="w-full bg-bg-primary hover:bg-red-800 text-white font-medium py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Take your shift</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {/* Display shift status */}
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
                  className={`flex items-center justify-center gap-2 text-lg font-medium ${shiftStatus.includes("open") ? "text-green-600" : "text-bg-primary"
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

            {/* Open new shift after closing */}
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
                  className="w-full bg-bg-primary hover:bg-red-800 text-white font-medium py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Open New Shift</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {/* Countdown for redirection */}
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

          {/* Error message */}
          {error && (
            <motion.div
              key="error-message"
              className="px-6 pb-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-bg-primary flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" />
                Error: {error.message}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}