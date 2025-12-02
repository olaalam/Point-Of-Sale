// src/Pages/EndShiftReportModal.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaClock,
  FaUser,
  FaShoppingCart,
  FaFileInvoiceDollar,
  FaReceipt,
  FaDollarSign,
  FaCreditCard,
  FaCheckCircle // أيقونة للإجمالي النهائي
} from "react-icons/fa";

// ترويسة موحدة لأقسام التقرير
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-gray-600" />
    {title}
  </h3>
);

// بطاقة إحصائية مبسطة
const CompactStatCard = ({ icon: Icon, title, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="p-2 rounded-full bg-gray-100">
      <Icon className="text-xl text-gray-600" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

export default function EndShiftReportModal({ reportData, onClose, onConfirmClose }) {
  const { t ,i18n} = useTranslation();
    const isArabic = i18n.language === "ar";

  if (!reportData) return null;

  const { report_role } = reportData;

  // ─── حالة unactive ─────────────────────────────────────
  if (report_role === "unactive") {
    React.useEffect(() => {
      onConfirmClose();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  }

  // ─── باقي الحالات (financial أو all) ─────────────────────
  const { shift, financial_accounts, expenses, totals, stats } = reportData;
  const showFullReport = report_role === "all";

  // دالة لتنسيق الأرقام
  const formatAmount = (amount, currency = t("EGP")) => {
    return `${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const netCashInDrawer = ((reportData.total_amount || 0) - (reportData.expenses_total || 0));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2" > {/* تقليل الـ padding */}
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[95vh] overflow-y-auto transform transition-all duration-300"
      dir={isArabic ? "rtl" : "ltr"}
      > {/* تقليل max-w */}
        <div className="p-6"> {/* تقليل الـ padding */}

          {/* ─── العنوان ─── */}
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800"> {/* خط أصغر قليلاً */}
            {t("EndShiftReport")}
          </h2>

          {/* ─── معلومات الشيفت العامة ─── */}
          {showFullReport && shift && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"> {/* تقليل الـ gap */}
              <CompactStatCard icon={FaUser} title={t("Employee")} value={shift.employee_name} />
              <CompactStatCard icon={FaClock} title={t("ShiftDuration")} value={shift.duration} />
              <CompactStatCard icon={FaShoppingCart} title={t("TotalOrders")} value={stats?.total_orders ?? 0} />
            </div>
          )}

          {/* ─── الحسابات المالية ─── */}
          <div className="space-y-4 mb-6 pt-4 border-t border-gray-100"> {/* تقليل الـ space-y */}
            <SectionHeader icon={FaMoneyBillWave} title={t("FinancialSummary")} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> {/* تقليل الـ gap */}
              {financial_accounts?.map((acc) => (
                <div
                  key={acc.financial_id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-200 text-sm"
                >
                  <span className="font-medium text-gray-700">{acc.financial_name}</span>
                  <span className="font-bold text-gray-800">
                    {formatAmount(acc.total_amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* إجمالي النقدية في الشيفت */}
            {totals && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-md text-base font-bold">
                  <span>{t("TotalCashInShift")}</span>
                  <span className="text-lg text-gray-800">
                    {formatAmount(totals.grand_total)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ─── الأقسام الكاملة (تظهر فقط في all) ─── */}
          {showFullReport && (
            <div className="mt-8 space-y-8"> {/* تقليل الـ space-y */}

              {/* ─── جدول أنواع الطلبات مع التفاصيل المالية ─── */}
              <div>
                <SectionHeader icon={FaShoppingCart} title={t("OrdersSummaryByType")} />

                <div className="space-y-4"> {/* تقليل الـ space-y */}
                  {(() => {
                    const orderTypes = [
                      { key: "dine_in", label: t("DineIn"), icon: "🍽️", data: reportData.dine_in },
                      { key: "take_away", label: t("TakeAway"), icon: "🥡", data: reportData.take_away },
                      { key: "delivery", label: t("Delivery"), icon: "🚗", data: reportData.delivery },
                      { key: "online", label: t("OnlineOrders"), icon: "💻", data: reportData.online_order },
                    ];

                    let grandTotal = 0;
                    let grandCount = 0;

                    return (
                      <>
                        <div className="space-y-4"> {/* كان grid - رجعناه space-y للتصغير */}
                          {orderTypes.map((type) => {
                            let typeTotal = 0;
                            let typeCount = 0;
                            let paymentMethods = [];

                            if (type.key === "online") {
                              const paid = type.data?.paid || [];
                              const unpaid = type.data?.un_paid || [];
                              typeCount = paid.length + unpaid.length;
                              const allPayments = [...paid, ...unpaid];
                              const methodsMap = {};

                              allPayments.forEach(p => {
                                const methodName = p.payment_method || t("Unknown");
                                if (!methodsMap[methodName]) {
                                  methodsMap[methodName] = { amount: 0, count: 0 };
                                }
                                methodsMap[methodName].amount += p.amount || 0;
                                methodsMap[methodName].count += 1;
                                typeTotal += p.amount || 0;
                              });

                              paymentMethods = Object.entries(methodsMap).map(([name, data]) => ({ name, ...data }));
                            } else {
                              typeCount = type.data?.count || 0;
                              typeTotal = type.data?.amount || 0;

                              if (type.data?.financial_accounts) {
                                paymentMethods = type.data.financial_accounts.map(acc => ({
                                  name: acc.financial_name || acc.payment_method,
                                  amount: acc.total_amount || acc.amount,
                                  count: acc.count || 1
                                }));
                              }
                            }

                            grandTotal += typeTotal;
                            grandCount += typeCount;

                            if (typeCount === 0) return null;

                            return (
                              <div
                                key={type.key}
                                className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                              >
                                {/* Header */}
                                <div className="p-4 bg-gray-100 flex items-center justify-between border-b border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{type.icon}</span>
                                    <div>
                                      <h4 className="font-semibold text-base text-gray-800">{type.label}</h4>
                                      <p className="text-xs text-gray-600">{typeCount} {t("Orders")}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-800">
                                      {formatAmount(typeTotal)}
                                    </p>
                                  </div>
                                </div>

                                {/* Payment Methods Breakdown */}
                                {paymentMethods.length > 0 && (
                                  <div className="p-3 bg-white">
                                    <p className="text-xs font-semibold mb-2 text-gray-500 border-b pb-1">
                                      {t("PaymentMethodsBreakdown")}:
                                    </p>
                                    <div className="space-y-1"> {/* تقليل الـ space-y */}
                                      {paymentMethods.map((method, idx) => (
                                        <div
                                          key={idx}
                                          className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded-sm text-xs"
                                        >
                                          <p className="text-gray-700">{method.name}</p>
                                          <p className="font-medium text-gray-800">
                                            {formatAmount(method.amount)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Grand Total Card */}
                        <div className="mt-4 bg-gray-800 text-white rounded-lg p-5 shadow-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm opacity-80 mb-1">{t("TotalAllOrders")}</p>
                              <p className="text-2xl font-black">{grandCount || 0} {t("Orders")}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm opacity-80 mb-1">{t("TotalAmount")}</p>
                              <p className="text-3xl font-black">
                                {formatAmount(grandTotal, t("EGP"))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* ─── المصروفات ─── */}
              {reportData.expenses?.length > 0 && (
                <div>
                  <SectionHeader icon={FaReceipt} title={`${t("Expenses")} (${reportData.expenses.length})`} />

                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white text-sm"> {/* خط أصغر للجدول */}
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">#</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">{t("Description")}</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">{t("Note")}</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{t("Amount")} ({t("EGP")})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportData.expenses.map((exp, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-right text-gray-600">{idx + 1}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-800">{exp.description || exp.name}</td>
                            <td className="px-4 py-2 text-right text-gray-500">{exp.note || "-"}</td>
                            <td className="px-4 py-2 text-left font-bold text-red-600"> {/* لون أحمر للمصروفات */}
                              -{formatAmount(exp.amount, "")}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-800 text-white font-bold"> {/* لون رمادي داكن للإجمالي */}
                          <td colSpan={3} className="px-4 py-3 text-right text-base">{t("TotalExpenses")}</td>
                          <td className="px-4 py-3 text-left text-lg">
                            -{formatAmount(reportData.expenses_total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── الإجمالي النهائي الصافي */}
              <div className="p-5 bg-gray-800 text-white rounded-lg text-center shadow-lg border border-gray-700">
                <FaCheckCircle className="text-3xl mx-auto mb-2 text-white opacity-90" /> {/* أيقونة للإجمالي */}
                <p className="text-lg font-semibold mb-2">{t("NetCashInDrawer")}</p>
                <p className="text-4xl font-black">
                  {formatAmount(netCashInDrawer)}
                </p>
                <p className="text-xs opacity-80 mt-1">
                  ({t("TotalCashInShift")} - {t("TotalExpenses")})
                </p>
              </div>

              {/* ─── إحصائيات إضافية ─── */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <CompactStatCard icon={FaFileInvoiceDollar} title={t("TotalSales")} value={formatAmount(stats.total_sales, "")} />
                  <CompactStatCard icon={FaDollarSign} title={t("NetCash")} value={formatAmount(stats.net_cash ?? totals?.grand_total, "")} />
                </div>
              )}

            </div>
          )}

          {/* ─── الأزرار ─── */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={onConfirmClose}
              className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition text-sm"
            >
              {t("ConfirmCloseShift")}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}