import { useEffect, useRef } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "../firebase";
import { toast } from "react-toastify";

const FALLBACK_URL = "/NotificationSound.mp3";

const NotificationListener = () => {
  // استخدام useRef للحفاظ على كائن الصوت حياً وجاهزاً
  const audioRef = useRef(null);

  useEffect(() => {
    // دالة لتجهيز الصوت مسبقاً (Preload)
    const prepareAudio = () => {
      const storedSound = sessionStorage.getItem("notification_sound") || FALLBACK_URL;

      if (!audioRef.current) {
        audioRef.current = new Audio(storedSound);
        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.load(); // تحميل الملف في الخلفية
      }

      // محاولة تشغيل صامتة لفتح الصلاحية
      audioRef.current.play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          console.log("✅ Audio System Ready & Preloaded");
          // إزالة المستمعين بعد النجاح
          document.removeEventListener("click", prepareAudio);
          document.removeEventListener("touchstart", prepareAudio);
        })
        .catch(err => console.warn("Wait for interaction...", err));
    };

    document.addEventListener("click", prepareAudio);
    document.addEventListener("touchstart", prepareAudio);

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📩 FCM Received:", payload);

      // تشغيل الصوت الجاهز مسبقاً
      if (audioRef.current) {
        // تحديث المصدر إذا تغير في الـ Storage
        const currentStored = sessionStorage.getItem("notification_sound") || FALLBACK_URL;
        console.log(currentStored);

        if (audioRef.current.src !== currentStored) {
          audioRef.current.src = currentStored;
        }

        audioRef.current.play().catch((err) => {
          console.error("❌ Playback failed, trying fallback:", err);
          const fallback = new Audio(FALLBACK_URL);
          fallback.play();
        });
      }

      // تنفيذ تحديث الطلبات
      const isNewOrder = payload.data?.type === "new_order" ||
        payload.notification?.title?.includes("طلب جديد");

      if (isNewOrder) {
        toast.success(payload.notification?.body || "طلب جديد وصل!");
      }
    });

    return () => {
      unsubscribe();
      document.removeEventListener("click", prepareAudio);
      document.removeEventListener("touchstart", prepareAudio);
    };
  }, []);

  return null;
};

export default NotificationListener;