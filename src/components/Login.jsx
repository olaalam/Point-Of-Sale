import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/Food2go Icon Vector Container.png";
import Loading from "./Loading";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { messaging } from "../firebase";
import { getToken } from "firebase/messaging";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
 const [user_name, setUserName] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [fcmToken, setFcmToken] = useState("");
 const navigate = useNavigate();
 const { t, i18n } = useTranslation();

 // ✅ جلب FCM Token عند تحميل الصفحة
 useEffect(() => {
  const fetchToken = async () => {
   try {
    const swRegistration = await navigator.serviceWorker.register(
     "/point-of-sale/firebase-messaging-sw.js",
     { scope: "/point-of-sale/" }
    );
const vapidKey= import.meta.env.VITE_FIREBASE_VAPID_KEY
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
     const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
     });
     console.log("FCM Token:", token);
     console.log("vapidKey",vapidKey)
     setFcmToken(token);
    } else {
     console.warn("Notification permission denied");
     toast.warn(t("NotificationsDisabled"));
    }
   } catch (err) {
    console.error("FCM error:", err);
    toast.error(t("FailedToEnableNotifications") + ": " + err.message);
   }
  };

  fetchToken();
 }, []);

 // ✅ دالة تسجيل الدخول
 const handleLogin = async () => {
  if (!user_name || !password) {
   toast.error(t("PleaseFillInAllFields"));
   return;
  }

  setLoading(true);

  try {
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
   const url = `${API_BASE_URL}api/cashier/auth/login`;

   // 🧠 تجهيز بيانات الطلب
   const storedCashierId =
    sessionStorage.getItem("cashier_id") ||
    sessionStorage.getItem("cashier_id");
   const fcm = fcmToken || sessionStorage.getItem("fcm_token") || "";

   const params = {
    user_name,
    password,
    fcm_token: fcm,
    ...(storedCashierId ? { cashier_id: storedCashierId } : {}),
   };

   const res = await axios.post(url, null, { params });

   console.log("Login Response:", res.data);
   toast.success(t("LoggedInSuccessfully"));
   console.log(res.data.preparation_num_status);
   // ✅ تخزين البيانات في sessionStorage (الكود القديم)
   sessionStorage.setItem("token", res.data.token);
   sessionStorage.setItem("user", JSON.stringify(res.data.cashier));
   sessionStorage.setItem("branch_id", res.data.cashier.branch_id);
   sessionStorage.setItem("resturant_name",res.data.resturant_name);
   sessionStorage.setItem("preparation_num_status", res.data.preparation_num_status);
   console.log(res.data.preparation_num_status);
   
   if (res.data.financial_account) {
    sessionStorage.setItem(
     "financial_account",
     JSON.stringify(res.data.financial_account)
    );
   }
   if (res.data.cashier?.id) {
    sessionStorage.setItem("cashier_id", res.data.cashier.id);
   }

   // --- 💡 الكود الجديد المطلوب لإضافته هنا ---
   // (بفرض أن بيانات الفرع (المطعم) موجودة داخل الـ cashier object)
   // (لو الأسماء دي مختلفة، عدّلها حسب الرد الفعلي من الـ API)

   const cashierData = res.data.cashier;
   let branchName = "اسم مطعمك"; // (قيمة افتراضية)
   let branchAddress = "عنوان مطعمك"; // (قيمة افتراضية)
   let branchPhone = "رقم التليفون"; // (قيمة افتراضية)
   let receiptFooter = "شكراً لزيارتكم"; // (قيمة افتراضية)
let resturant_logo=res.data.resturant_logo||"";
   // الاحتمال الأول: البيانات داخل object اسمه branch
   if (cashierData.branch) {
    branchName = cashierData.branch.name || branchName;
    branchAddress = cashierData.branch.address || branchAddress;
    branchPhone = cashierData.branch.phone || branchPhone;
    receiptFooter = cashierData.branch.receipt_footer || receiptFooter;

   }
   // الاحتمال الثاني: البيانات موجودة مباشرة في الـ cashier object
   else {
    branchName = cashierData.branch_name || branchName;
    branchAddress = cashierData.branch_address || branchAddress;
    branchPhone = cashierData.branch_phone || branchPhone;
    receiptFooter = cashierData.receipt_footer || receiptFooter;
   }

   // (تخزين البيانات)
   sessionStorage.setItem("restaurant_name", branchName);
      sessionStorage.setItem("resturant_logo", resturant_logo);

   
   sessionStorage.setItem("restaurant_address", branchAddress);
   sessionStorage.setItem("restaurant_phone", branchPhone);
   sessionStorage.setItem("receipt_footer", receiptFooter);
   // --- نهاية الكود الجديد ---

   // ✅ تأجيل التنقل خطوة صغيرة
   setTimeout(() => {
    navigate("/cashier", { replace: true });
   }, 100);
  } catch (err) {
   console.error("Error:", err);
   const errorMessage =
    err?.response?.data?.errors ||
    err?.response?.data?.faield ||
    t("AnErrorOccurred");
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
      <h2 className="text-xl font-semibold">{t("LoginTitle")}</h2>
      <p className="text-sm text-gray-500">{t("WelcomeBack")}</p>
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
       placeholder={t("Username")}
       value={user_name}
       onChange={(e) => setUserName(e.target.value)}
      />
      <Input
       type="password"
       placeholder={t("Password")}
       value={password}
       onChange={(e) => setPassword(e.target.value)}
      />
      <Button
       disabled={loading}
       type="submit"
       className="w-full bg-[#910000] hover:bg-[#750000]"
      >
       {loading ? <Loading /> : t("Login")}
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
  </div>
 );
}