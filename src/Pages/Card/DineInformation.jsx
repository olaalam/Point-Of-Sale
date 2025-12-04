import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Table2, Timer } from "lucide-react"; // ⬅️ استخدمنا أيقونة Timer

const DineInformation = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const hallName = sessionStorage.getItem("hall_name");
  const tableNumber = sessionStorage.getItem("table_number");
  const orderType = sessionStorage.getItem("order_type");
  const preparationNumber = sessionStorage.getItem("preparation_number"); // 🟢 رقم التحضير

  // 🛑 إخفاء المكوّن خارج dine in
  if (orderType !== "dine_in") return null;

  // 🛑 لو مفيش داتا خالص
  if (!hallName && !tableNumber && !preparationNumber) return null;

  return (
    <div
      className={`bg-gradient-to-r from-gray-50 to-gray-100
      rounded-xl shadow-md p-5 mb-5 flex items-center justify-center gap-10
      border border-gray-200 transition-all`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Hall */}
      {hallName && (
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary text-white p-2 rounded-lg shadow-sm">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("CurrentHall")}</p>
            <p className="text-xl font-bold text-gray-900">{hallName}</p>
          </div>
        </div>
      )}

      {/* Divider */}
      {tableNumber && <div className="w-px h-10 bg-red-300" />}

      {/* Table */}
      {tableNumber && (
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary text-white p-2 rounded-lg shadow-sm">
            <Table2 size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("Table")}</p>
            <p className="text-xl font-bold text-gray-900">{tableNumber}</p>
          </div>
        </div>
      )}

      {/* Divider */}
      {preparationNumber && <div className="w-px h-10 bg-red-300" />}

      {/* Preparation Number */}
      {preparationNumber && (
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary text-white p-2 rounded-lg shadow-sm">
            <Timer size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("PrepNumber")}</p>
            <p className="text-xl font-bold text-gray-900">
              {preparationNumber}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DineInformation;
