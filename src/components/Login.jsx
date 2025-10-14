import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/Food2go Icon Vector Container.png";
import Loading from "./Loading";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { messaging } from "../firebase";
import { getToken } from "firebase/messaging";

export default function LoginPage() {
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState("");
  const navigate = useNavigate();

  // ✅ جلب FCM Token عند تحميل الصفحة
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Register the service worker properly for subpath
        const swRegistration = await navigator.serviceWorker.register(
          "/point-of-sale/firebase-messaging-sw.js",
          { scope: "/point-of-sale/" }
        );

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: swRegistration,
          });
          console.log("FCM Token:", token);
          setFcmToken(token);
          // localStorage.setItem("fcm_token", token);
        } else {
          console.warn("Notification permission denied");
          toast.warn("Notifications disabled; some features may be limited");
        }
      } catch (err) {
        console.error("FCM error:", err);
        toast.error("Failed to enable notifications: " + err.message);
      }
    };

    fetchToken();
  }, []);

  // ✅ دالة تسجيل الدخول
  const handleLogin = async () => {
    console.log("Login clicked");

    if (!user_name || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const url = `${API_BASE_URL}api/cashier/auth/login`;

      // 🧠 تجهيز بيانات الطلب
      const storedCashierId = localStorage.getItem("cashier_id");
      const fcm = fcmToken || localStorage.getItem("fcm_token") || "";

      // إرسال البيانات — مع cashier_id فقط لو موجود
      const params = {
        user_name,
        password,
        fcm_token: fcm,
        ...(storedCashierId ? { cashier_id: storedCashierId } : {}), // ✅ مضاف فقط لو موجود
      };

      const res = await axios.post(url, null, { params });

      console.log("Login Response:", res.data);
      toast.success("Logged in successfully");

      // ✅ تخزين بيانات المستخدم
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.cashier));
      localStorage.setItem("branch_id", res.data.cashier.branch_id);
      // حفظ cashier_id لو رجع من السيرفر
      if (res.data.cashier?.id) {
        localStorage.setItem("cashier_id", res.data.cashier.id);
      }

      navigate("/cashier");
    } catch (err) {
      console.error("Error:", err);
      const errorMessage =
        err?.response?.data?.errors ||
        err?.response?.data?.message ||
        "An error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-[#910000]">Food2go</h1>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Log in to Food2go</h2>
            <p className="text-sm text-gray-500">Welcome back</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <Input
              type="text"
              placeholder="Username"
              value={user_name}
              onChange={(e) => setUserName(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              disabled={loading}
              type="submit"
              className="w-full bg-[#910000] hover:bg-[#750000]"
            >
              {loading ? <Loading /> : "Login"}
            </Button>
          </form>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <img
          src={logo}
          alt="Food2go Logo"
          className="w-full h-auto max-w-[378px] max-h-[311px] object-contain"
        />
      </div>
      <ToastContainer />
    </div>
  );
}
