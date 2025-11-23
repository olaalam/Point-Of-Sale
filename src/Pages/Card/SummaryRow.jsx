import React from "react";
import { useTranslation } from "react-i18next";

const SummaryRow = ({ label, value }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
// في SummaryRow.jsx
const safeValue = Number(value || 0);
  return (
    <div
      className={`grid grid-cols-2 gap-10 py-2 ${
        isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <p>{label}</p>
      <p>
        {value.toFixed(2)} {isArabic ? "ج.م" : "EGP"}
      </p>
    </div>
  );
};

export default SummaryRow;
