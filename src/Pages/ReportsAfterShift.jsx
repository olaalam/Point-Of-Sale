// src/Pages/EndShiftReportModal.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { FaMoneyBillWave, FaClock, FaUser } from "react-icons/fa";

export default function EndShiftReportModal({ reportData, onClose, onConfirmClose }) {
  const { t } = useTranslation();

  if (!reportData) return null;

  const { shift, financial_accounts, totals } = reportData;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-bg-primary">
            {t("EndShiftReport")}
          </h2>

          {/* معلومات الشيفت
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <FaUser className="text-gray-600" />
              <div>
                <p className="text-gray-500">{t("Cashier")}</p>
                <p className="font-semibold">{shift?.cashier_name || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FaClock className="text-gray-600" />
              <div>
                <p className="text-gray-500">{t("Duration")}</p>
                <p className="font-semibold">{shift?.duration || "-"}</p>
              </div>
            </div>
          </div> */}

          {/* الحسابات المالية */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FaMoneyBillWave className="text-green-600" />
              {t("FinancialSummary")}
            </h3>

            {financial_accounts?.map((acc) => (
              <div
                key={acc.financial_id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <span className="font-medium">{acc.financial_name}</span>
                <span className="text-xl font-bold text-green-700">
                  {acc.total_amount.toLocaleString()} {t("EGP")}
                </span>
              </div>
            ))}

            {/* الإجمالي الكلي */}
            {totals && (
              <div className="mt-6 pt-4 border-t-2 border-gray-300">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t("TotalCashInShift")}</span>
                  <span className="text-2xl text-bg-primary">
                    {totals.grand_total.toLocaleString()} {t("EGP")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* الأزرار */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={onConfirmClose}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {t("ConfirmCloseShift")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}