import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      title: "Food2go",
      profile: "Profile",
      dueUsers: "Due Users",
      closeShift: "Close Shift",
      logout: "Logout",
      exit: "Exit",
      shift: "Shift",
    },
  },
  ar: {
    translation: {
      title: "فود تو جو",
      profile: "الملف الشخصي",
      dueUsers: "العملاء المتأخرين",
      closeShift: "إغلاق الوردية",
      logout: "تسجيل الخروج",
      exit: "خروج",
      shift: "الوردية",
    },
  },
};
lng: localStorage.getItem("language") || "en",

i18n.use(initReactI18next).init({
  resources,
  lng: "en", 
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});


export default i18n;
