// src/Pages/EndShiftReportModal.jsx
import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaClock,
  FaUser,
  FaShoppingCart,
  FaFileInvoiceDollar,
  FaReceipt,
  FaDollarSign,
  FaCheckCircle,
  FaPrint
} from "react-icons/fa";

// ─── ترويسة موحدة لأقسام التقرير ───
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-gray-600" />
    {title}
  </h3>
);

// ─── بطاقة إحصائية مبسطة ───
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

// ─── مكون تقرير الطباعة المنفصل ───
const PrintableReport = React.forwardRef(({ reportData, t, formatAmount, isArabic }, ref) => {
  const { shift, financial_accounts, totals, stats } = reportData;
  const showFullReport = reportData.report_role === "all";
  
  // إصلاح الخطأ الحسابي هنا بإضافة ||
  const netCashInDrawer = ((reportData.total_amount || 0) - (reportData.expenses_total || 0));

  const orderTypes = [
    { key: "dine_in", label: t("DineIn"), icon: "🍽️", data: reportData.dine_in },
    { key: "take_away", label: t("TakeAway"), icon: "🥡", data: reportData.take_away },
    { key: "delivery", label: t("Delivery"), icon: "🚗", data: reportData.delivery },
    { key: "online", label: t("OnlineOrders"), icon: "💻", data: reportData.online_order },
  ];

  let grandTotal = 0;
  let grandCount = 0;

  // حساب الإجماليات للطباعة
  orderTypes.forEach((type) => {
    if (type.key === "online") {
      const paid = type.data?.paid || [];
      const unpaid = type.data?.un_paid || [];
      grandCount += paid.length + unpaid.length;
      [...paid, ...unpaid].forEach(p => {
        grandTotal += p.amount || 0;
      });
    } else {
      grandCount += type.data?.count || 0;
      grandTotal += type.data?.amount || 0;
    }
  });

  return (
    <div ref={ref} className="print-report-container" style={{ display: 'none' }}>
<style>
{`
  @media print {
    @page {
      size: 100% auto;
      margin: 0;
      padding: 0;
    }

    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }

    html, body {
      width: 100% !important;
      min-height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Tahoma', 'Arial', sans-serif;
      font-size: 10px;
      line-height: 1.4;
      direction: ${isArabic ? "rtl" : "ltr"};
      background: white !important;
      color: black !important;
    }

    .print-wrapper {
      width: 100% !important;
      padding: 3mm 2mm !important;
      direction: ${isArabic ? 'rtl' : 'ltr'};
    }

    /* ─── الجدول يأخذ العرض الكامل + ديزاين فاخر ─── */
    .print-table {
      width: 100% !important;
      border-collapse: collapse;
      margin: 6px 0 !important;
      font-size: 9.5px;
      background: white;
    }

    .print-table th,
    .print-table td {
      border: 1px solid #000 !important;
      padding: 6px 4px !important;
      text-align: ${isArabic ? 'right' : 'left'} !important;
    }

    .print-table th {
      background-color: #222 !important;
      color: white !important;
      font-weight: bold;
      font-size: 10px;
      text-align: center !important;
    }

    .print-table td {
      background-color: #fafafa;
    }

    .print-table tbody tr:nth-child(even) td {
      background-color: #f0f0f0 !important;
    }

    .print-table tbody tr:last-child {
      background-color: #222 !important;
      color: white !important;
      font-weight: bold;
      font-size: 11px;
    }

    .print-table tbody tr:last-child td {
      background-color: #222 !important;
      color: white !important;
    }

    /* ─── تحسين باقي العناصر ─── */
    .print-section {
      margin: 8px 0 !important;
    }

    .print-section-title {
      background: #000 !important;
      color: white !important;
      padding: 6px 4px !important;
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      border-radius: 4px;
      margin-bottom: 6px !important;
    }

    .print-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 10px;
      border-bottom: 1px dashed #999;
    }

    .print-row-label { font-weight: normal; }
    .print-row-value { font-weight: bold; }

    .print-divider {
      border-top: 2px dashed #000 !important;
      margin: 10px 0 !important;
    }

    .print-total-box {
      background: #000 !important;
      color: white !important;
      padding: 12px 8px !important;
      text-align: center;
      border: 3px double white;
      border-radius: 6px;
      margin: 12px 0 !important;
    }

    .print-total-label {
      font-size: 11px;
      opacity: 0.9;
    }

    .print-total-value {
      font-size: 22px !important;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .print-header, .print-footer {
      text-align: center;
      padding: 8px 0;
    }

    .print-title {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .print-footer {
      border-top: 3px double #000;
      padding-top: 10px;
      margin-top: 15px;
      font-size: 9px;
    }

    /* إخفاء أي شيء خارج الطباعة */
    .print-report-container {
      display: block !important;
    }
  }

  /* لإخفاء المكون قبل الطباعة */
  .print-report-container {
    position: absolute;
    left: -9999px;
    top: 0;
  }
`}
</style>
      <div className="print-wrapper">
        {/* محتوى التقرير المطبوع */}
        <div className="print-header">
          <div className="print-title">📋 {t("EndShiftReport")}</div>
          <div className="print-subtitle">
            {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')} - {new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* معلومات الشيفت */}
        {showFullReport && shift && (
          <div className="print-section">
            <div className="print-section-title">📊 {t("ShiftInfo")}</div>
            <div className="print-info-grid">
              <div className="print-info-item">
                <span>{t("Employee")}: </span>
                <strong>{shift.employee_name}</strong>
              </div>
              <div className="print-info-item">
                <span>{t("ShiftDuration")}: </span>
                <strong>{shift.duration}</strong>
              </div>
              <div className="print-info-item">
                <span>{t("TotalOrders")}: </span>
                <strong>{stats?.total_orders ?? 0}</strong>
              </div>
            </div>
          </div>
        )}

        {/* الحسابات المالية */}
        <div className="print-section">
          <div className="print-section-title">💰 {t("FinancialSummary")}</div>
          {financial_accounts?.map((acc) => (
            <div key={acc.financial_id} className="print-row">
              <span className="print-row-label">{acc.financial_name}</span>
              <span className="print-row-value">{formatAmount(acc.total_amount)}</span>
            </div>
          ))}
          <div className="print-divider" />
          <div className="print-row" style={{ fontSize: '11px' }}>
            <span><strong>{t("TotalCashInShift")}</strong></span>
            <span><strong>{formatAmount(totals?.grand_total)}</strong></span>
          </div>
        </div>

        {/* تفاصيل الطلبات */}
        {showFullReport && (
          <>
            <div className="print-section">
              <div className="print-section-title">🛒 {t("OrdersSummaryByType")}</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>{t("Type")}</th>
                    <th style={{ textAlign: 'center' }}>{t("Count")}</th>
                    <th>{t("Amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orderTypes.map((type) => {
                    let typeTotal = 0;
                    let typeCount = 0;

                    if (type.key === "online") {
                      const paid = type.data?.paid || [];
                      const unpaid = type.data?.un_paid || [];
                      typeCount = paid.length + unpaid.length;
                      [...paid, ...unpaid].forEach(p => {
                        typeTotal += p.amount || 0;
                      });
                    } else {
                      typeCount = type.data?.count || 0;
                      typeTotal = type.data?.amount || 0;
                    }

                    if (typeCount === 0) return null;

                    return (
                      <tr key={type.key}>
                        <td>{type.icon} {type.label}</td>
                        <td style={{ textAlign: 'center' }}>{typeCount}</td>
                        <td>{formatAmount(typeTotal)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                    <td>{t("Total")}</td>
                    <td style={{ textAlign: 'center' }}>{grandCount}</td>
                    <td>{formatAmount(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* المصروفات */}
            {reportData.expenses?.length > 0 && (
              <div className="print-section">
                <div className="print-section-title">📝 {t("Expenses")}</div>
                {reportData.expenses.map((exp, idx) => (
                  <div key={idx} className="print-expense-row">
                    <span>{exp.description || exp.name}</span>
                    <span>-{formatAmount(exp.amount, "")}</span>
                  </div>
                ))}
                <div className="print-divider" />
                <div className="print-row" style={{ color: '#c00', fontWeight: 'bold' }}>
                  <span>{t("TotalExpenses")}</span>
                  <span>-{formatAmount(reportData.expenses_total)}</span>
                </div>
              </div>
            )}

            {/* الإجمالي النهائي */}
            <div className="print-total-box">
              <div className="print-total-label">✅ {t("NetCashInDrawer")}</div>
              <div className="print-total-value">{formatAmount(netCashInDrawer)}</div>
            </div>

            {/* إحصائيات إضافية */}
            {stats && (
              <div className="print-section">
                <div className="print-row">
                  <span>{t("TotalSales")}</span>
                  <span>{formatAmount(stats.total_sales, "")}</span>
                </div>
                <div className="print-row">
                  <span>{t("NetCash")}</span>
                  <span>{formatAmount(stats.net_cash ?? totals?.grand_total, "")}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* تذييل */}
        <div className="print-footer">
          <div>━━━━━━━━━━━━━━━━━━━━</div>
          <div style={{ margin: '4px 0' }}>🙏 {t("ThankYou") || "شكراً لكم"}</div>
          <div>{t("PoweredBy") || "Powered by POS"}</div>
          <div>━━━━━━━━━━━━━━━━━━━━</div>
        </div>
      </div>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

// ─── المكون الرئيسي ───
export default function EndShiftReportModal({ reportData, onClose, onConfirmClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const printRef = useRef(null);

  useEffect(() => {
    if (reportData && reportData.report_role === "unactive") {
      onConfirmClose();
    }
  }, [reportData, reportData?.report_role, onConfirmClose]);

  if (!reportData || reportData.report_role === "unactive") return null;

  const { report_role, shift, financial_accounts, totals, stats } = reportData;
  const showFullReport = report_role === "all";

  // دالة لتنسيق الأرقام
  const formatAmount = (amount, currency = t("EGP")) => {
    return `${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  // إصلاح الحساب بإضافة || 0
  const netCashInDrawer = ((reportData.total_amount || 0) - (reportData.expenses_total || 0));

  // دالة الطباعة (المعدلة والمبسطة)
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // إنشاء نافذة طباعة جديدة
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    
    // كتابة محتوى الـ HTML مباشرة من المكون المخفي
    // هذا يضمن أن التصميم الموجود في PrintableReport هو ما سيتم طباعته
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${t("EndShiftReport")}</title>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();

    // انتظار تحميل المحتوى ثم الطباعة
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[95vh] overflow-y-auto transform transition-all duration-300"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="p-6">

          {/* ─── العنوان وزر الطباعة ─── */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {t("EndShiftReport")}
            </h2>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              title={t("Print")}
            >
              <FaPrint className="text-lg" />
              <span className="text-sm font-medium">{t("Print") || "طباعة"}</span>
            </button>
          </div>

          {/* ─── معلومات الشيفت العامة ─── */}
          {showFullReport && shift && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <CompactStatCard icon={FaUser} title={t("Employee")} value={shift.employee_name} />
              <CompactStatCard icon={FaClock} title={t("ShiftDuration")} value={shift.duration} />
              <CompactStatCard icon={FaShoppingCart} title={t("TotalOrders")} value={stats?.total_orders ?? 0} />
            </div>
          )}

          {/* ─── الحسابات المالية ─── */}
          <div className="space-y-4 mb-6 pt-4 border-t border-gray-100">
            <SectionHeader icon={FaMoneyBillWave} title={t("FinancialSummary")} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="mt-8 space-y-8">

              {/* ─── جدول أنواع الطلبات مع التفاصيل المالية ─── */}
              <div>
                <SectionHeader icon={FaShoppingCart} title={t("OrdersSummaryByType")} />

                <div className="space-y-4">
                  {(() => {
                    const orderTypesList = [
                      { key: "dine_in", label: t("DineIn"), icon: "🍽️", data: reportData.dine_in },
                      { key: "take_away", label: t("TakeAway"), icon: "🥡", data: reportData.take_away },
                      { key: "delivery", label: t("Delivery"), icon: "🚗", data: reportData.delivery },
                      { key: "online", label: t("OnlineOrders"), icon: "💻", data: reportData.online_order },
                    ];

                    let grandTotal = 0;
                    let grandCount = 0;

                    return (
                      <>
                        <div className="space-y-4">
                          {orderTypesList.map((type) => {
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
                                    <div className="space-y-1">
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
                    <table className="min-w-full bg-white text-sm">
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
                            <td className="px-4 py-2 text-left font-bold text-red-600">
                              -{formatAmount(exp.amount, "")}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-800 text-white font-bold">
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
                <FaCheckCircle className="text-3xl mx-auto mb-2 text-white opacity-90" />
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

      {/* مكون الطباعة المخفي الذي يتم استدعاؤه بواسطة handlePrint */}
      <PrintableReport 
        ref={printRef} 
        reportData={reportData} 
        t={t} 
        formatAmount={formatAmount} 
        isArabic={isArabic}
      />
    </div>
  );
}