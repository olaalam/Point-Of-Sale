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
  FaPrint,
  FaBan
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

  const netCashInDrawer = ((reportData.total_amount || 0));

  // ✅ نفس المنطق من الـ UI الأصلي
  const orderTypes = [
    { key: "dine_in", label: t("DineIn"), icon: "🍽️", data: reportData.dine_in },
    { key: "take_away", label: t("TakeAway"), icon: "🥡", data: reportData.take_away },
    { key: "delivery", label: t("Delivery"), icon: "🚗", data: reportData.delivery },
    { key: "online", label: t("OnlineOrders"), icon: "💻", data: reportData.online_order },
  ];

  return (
    <div ref={ref} className="print-report-container" style={{ display: 'none' }}>
      <style>
        {`
  @media print {
    @page {
      size: A4;
      margin: 10mm;
    }

    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }

    html, body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Tahoma', 'Arial', sans-serif;
      font-size: 11px;
      line-height: 1.5;
      direction: ${isArabic ? "rtl" : "ltr"};
      background: white !important;
      color: black !important;
    }

    .print-wrapper {
      width: 100% !important;
      padding: 5mm !important;
    }

    /* ─── الجدول ─── */
    .print-table {
      width: 100% !important;
      border-collapse: collapse;
      margin: 8px 0 !important;
      font-size: 10px;
    }

    .print-table th,
    .print-table td {
      border: 1px solid #333 !important;
      padding: 6px 8px !important;
      text-align: ${isArabic ? 'right' : 'left'} !important;
    }

    .print-table th {
      background: white !important;
      color: black !important;
      font-weight: bold;
      text-align: center !important;
      border: 2px solid #333 !important;
    }

    /* ✅ إزالة الخلفية السوداء من آخر صف */
    .print-table tbody tr:last-child {
      background: white !important;
      color: black !important;
      font-weight: bold;
      border: 2px solid #333 !important;
    }

    .print-table tbody tr:last-child td {
      border: 2px solid #333 !important;
    }

    /* ─── بطاقة نوع الطلب ─── */
    .print-order-card {
      border: 2px solid #333;
      margin: 8px 0;
      page-break-inside: avoid;
    }

    .print-order-header {
      background: white !important;
      color: black !important;
      padding: 8px;
      border-bottom: 2px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
    }

    .print-payment-breakdown {
      padding: 6px 8px;
      background: white;
    }

    .print-payment-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 9px;
      border-bottom: 1px dashed #ccc;
    }

    /* ─── باقي العناصر ─── */
    .print-section {
      margin: 10px 0 !important;
      page-break-inside: avoid;
    }

    /* ✅ إزالة الخلفية السوداء من العناوين */
    .print-section-title {
      background: white !important;
      color: black !important;
      padding: 6px 8px !important;
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 8px !important;
      border: 2px solid #333 !important;
      text-transform: uppercase;
    }

    .print-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 10px;
      border-bottom: 1px dashed #999;
    }

    .print-divider {
      border-top: 2px solid #333 !important;
      margin: 8px 0 !important;
    }

    /* ✅ إزالة الخلفية السوداء من صندوق الإجمالي */
    .print-total-box {
      background: white !important;
      color: black !important;
      padding: 12px !important;
      text-align: center;
      margin: 12px 0 !important;
      page-break-inside: avoid;
      border: 3px solid #333 !important;
    }

    .print-total-value {
      font-size: 20px !important;
      font-weight: bold;
      color: black !important;
    }

    .print-header {
      text-align: center;
      padding: 8px 0;
      border-bottom: 2px solid #333;
      margin-bottom: 10px;
    }

    .print-title {
      font-size: 18px;
      font-weight: bold;
      color: black !important;
    }

    .print-footer {
      border-top: 2px solid #333;
      padding-top: 10px;
      margin-top: 15px;
      text-align: center;
      font-size: 9px;
      color: black !important;
    }

    /* ✅ جدول المصروفات بدون خلفية سوداء */
    .print-expense-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
    }

    .print-expense-table th,
    .print-expense-table td {
      border: 1px solid #333;
      padding: 6px;
      text-align: center;
      background: white !important;
      color: black !important;
    }

    .print-expense-table th {
      font-weight: bold;
      border: 2px solid #333 !important;
    }

    .print-expense-total {
      background: white !important;
      color: black !important;
      font-weight: bold;
      border: 2px solid #333 !important;
    }

    .print-expense-total td {
      border: 2px solid #333 !important;
    }

    /* ✅ إزالة أي opacity */
    * {
      opacity: 1 !important;
    }
  }
`}
      </style>

      <div className="print-wrapper">
        {/* Header */}
        <div className="print-header">
          <div className="print-title">📋 {t("EndShiftReport")}</div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')} - {new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Shift Info */}
        {showFullReport && shift && (
          <div className="print-section">
            <div className="print-section-title">📊 {t("ShiftInfo")}</div>
            <div className="print-row">
              <span>{t("Employee")}:</span>
              <strong>{shift.employee_name}</strong>
            </div>
            <div className="print-row">
              <span>{t("ShiftDuration")}:</span>
              <strong>{shift.duration}</strong>
            </div>
            <div className="print-row">
              <span>{t("TotalOrders")}:</span>
              <strong>{reportData?.order_count || 0}</strong>
            </div>
          </div>
        )}

        {/* Financial Accounts */}
        <div className="print-section">
          <div className="print-section-title">💰 {t("FinancialSummary")}</div>
          {financial_accounts?.map((acc) => {
            const total =
              (acc.total_amount_dine_in || 0) +
              (acc.total_amount_take_away || 0) +
              (acc.total_amount_delivery || 0);

            return (
              <div key={acc.financial_id} style={{ marginBottom: '8px', border: '1px solid #333', padding: '6px' }}>
                <div className="print-row" style={{ fontWeight: 'bold', borderBottom: 'none' }}>
                  <span>{acc.financial_name}</span>
                  <span>{formatAmount(total)}</span>
                </div>
                {(acc.total_amount_dine_in > 0 || acc.total_amount_take_away > 0 || acc.total_amount_delivery > 0) && (
                  <div style={{ fontSize: '9px', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #ccc' }}>
                    {acc.total_amount_dine_in > 0 && (
                      <div className="print-row" style={{ padding: '2px 0' }}>
                        <span>Dine In</span>
                        <span>{formatAmount(acc.total_amount_dine_in)}</span>
                      </div>
                    )}
                    {acc.total_amount_take_away > 0 && (
                      <div className="print-row" style={{ padding: '2px 0' }}>
                        <span>Take Away</span>
                        <span>{formatAmount(acc.total_amount_take_away)}</span>
                      </div>
                    )}
                    {acc.total_amount_delivery > 0 && (
                      <div className="print-row" style={{ padding: '2px 0' }}>
                        <span>Delivery</span>
                        <span>{formatAmount(acc.total_amount_delivery)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* إضافة الضرائب والخدمة في الطباعة */}
          <div className="print-row">
            <span>{t("TotalTax")}:</span>
            <strong>{formatAmount(reportData.total_tax)}</strong>
          </div>
          <div className="print-row">
            <span>{t("ServiceFees")}:</span>
            <strong>{formatAmount(reportData.service_fees)}</strong>
          </div>
          <div className="print-divider" />
          <div className="print-row" style={{ fontSize: '12px', fontWeight: 'bold' }}>
            <span>{t("TotalCashInShift")}</span>
            <span>{formatAmount(totals?.grand_total)}</span>
          </div>
        </div>
        {/* Void Orders Section in Print */}
        {reportData.void_order_count > 0 && (
          <div className="print-section">
            <div className="print-section-title">🚫 {t("VoidOrders")}</div>
            <table className="print-void-table">
              <thead>
                <tr>
                  <th>{t("VoidOrdersCount")}</th>
                  <th>{t("VoidOrdersTotal")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="print-void-total">
                  <td>{reportData.void_order_count}</td>
                  <td>-{formatAmount(reportData.void_order_sum)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Orders by Type with Payment Methods */}
        {showFullReport && (
          <>
            <div className="print-section">
              <div className="print-section-title">🛒 {t("OrdersSummaryByType")}</div>

              {orderTypes.map((type) => {
                let typeTotal = 0;
                let typeCount = 0;
                let paymentMethods = [];

                // ✅ نفس المنطق من الـ UI
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

                if (typeCount === 0) return null;

                return (
                  <div key={type.key} className="print-order-card">
                    <div className="print-order-header">
                      <div>
                        <span style={{ marginRight: '4px' }}>{type.icon}</span>
                        <strong>{type.label}</strong>
                        <span style={{ fontSize: '9px', marginLeft: '6px' }}>({typeCount} {t("Orders")})</span>
                      </div>
                      <strong>{formatAmount(typeTotal)}</strong>
                    </div>

                    {paymentMethods.length > 0 && (
                      <div className="print-payment-breakdown">
                        {paymentMethods.map((method, idx) => (
                          <div key={idx} className="print-payment-row">
                            <span>{method.name}</span>
                            <span>{formatAmount(method.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expenses */}
            {reportData.expenses?.length > 0 && (
              <div className="print-section">
                <div className="print-section-title">📝 {t("Expenses")}</div>
                <table className="print-expense-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t("Description")}</th>
                      <th>{t("Category")}</th>
                      <th>{t("Amount")}</th>

                    </tr>
                  </thead>
                  <tbody>
                    {reportData.expenses.map((exp, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{exp.financial_account}</td>
                        <td>{exp.category || t("N/A")}</td>
                        <td>-{formatAmount(exp.total, "")}</td>
                      </tr>
                    ))}
                    <tr className="print-expense-total">
                      <td colSpan="3">{t("TotalExpenses")}</td>
                      <td>-{formatAmount(reportData.expenses_total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Net Cash */}
            <div className="print-total-box">
              <div style={{ fontSize: '11px', marginBottom: '6px' }}>✅ {t("NetCashInDrawer")}</div>
              <div className="print-total-value">{formatAmount(netCashInDrawer)}</div>
              <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.8 }}>
                ({t("TotalCashInShift")})
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="print-footer">
          <div>━━━━━━━━━━━━━━━━━━━━</div>
          <div style={{ margin: '4px 0' }}>🙏 {t("ThankYou") || "شكراً لكم"}</div>
          <div>{t("Powered by Food2Go - food2go.online")}</div>
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
  const netCashInDrawer = ((reportData.total_amount || 0));

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
          {/* ─── الحسابات المالية مع التفاصيل ─── */}
          <div className="space-y-4 mb-6 pt-4 border-t border-gray-100">
            <SectionHeader icon={FaMoneyBillWave} title={t("FinancialSummary")} />

            <div className="space-y-4">
              {financial_accounts?.map((acc) => {
                const total =
                  (acc.total_amount_dine_in || 0) +
                  (acc.total_amount_take_away || 0) +
                  (acc.total_amount_delivery || 0);

                const hasDetails = total > 0 && (
                  acc.total_amount_dine_in > 0 ||
                  acc.total_amount_take_away > 0 ||
                  acc.total_amount_delivery > 0
                );

                return (
                  <div
                    key={acc.financial_id}
                    className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                  >
                    {/* الصف الرئيسي للحساب */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow">
                          <FaMoneyBillWave className="text-lg text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{acc.financial_name}</h4>
                          {acc.count !== undefined && (
                            <p className="text-xs text-gray-600">{acc.count} {t("Orders")}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">
                          {formatAmount(total)}
                        </p>
                      </div>
                    </div>

                    {/* التفاصيل الفرعية (Dine In, Take Away, Delivery) */}
                    {hasDetails && (
                      <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {acc.total_amount_dine_in > 0 && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600">Dine In</p>
                              <p className="font-semibold text-gray-800">
                                {formatAmount(acc.total_amount_dine_in)}
                              </p>
                            </div>
                          )}
                          {acc.total_amount_take_away > 0 && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600">Take Away</p>
                              <p className="font-semibold text-gray-800">
                                {formatAmount(acc.total_amount_take_away)}
                              </p>
                            </div>
                          )}
                          {acc.total_amount_delivery > 0 && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600">Delivery</p>
                              <p className="font-semibold text-gray-800">
                                {formatAmount(acc.total_amount_delivery)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
{/* إجمالي النقدية في الشيفت والحسابات الإضافية */}
  <div className="mt-6 space-y-3">
    {/* عرض الضرائب والخدمة */}
    <div className="grid grid-cols-2 gap-3">
      <div className="flex justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
        <span className="text-xs text-gray-600">{t("TotalTax")}</span>
        <span className="text-sm font-bold text-gray-800">{formatAmount(reportData.total_tax)}</span>
      </div>
      <div className="flex justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
        <span className="text-xs text-gray-600">{t("ServiceFees")}</span>
        <span className="text-sm font-bold text-gray-800">{formatAmount(reportData.service_fees)}</span>
      </div>
    </div>

    {/* الصف القديم الخاص بالإجمالي (إذا أردت تفعيله)
    {totals && (
      <div className="pt-2">
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg text-lg font-bold">
          <span>{t("TotalCashInShift")}</span>
          <span className="text-2xl">
            {formatAmount(totals.grand_total)}
          </span>
        </div>
      </div>
    )} */}
  </div>
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
                          <div className="flex items-center justify-center">
                            <div>
                              <p className="text-sm opacity-80 mb-1">{t("TotalAllOrders")}</p>
                              <p className="text-2xl font-black"> {t("Orders")} {reportData?.order_count || 0} </p>
                            </div>
                            {/* <div className="text-right">
                              <p className="text-sm opacity-80 mb-1">{t("TotalAmount")}</p>
                              <p className="text-3xl font-black">
                                {formatAmount(grandTotal, t("EGP"))}
                              </p>
                            </div> */}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              {/* ─── الطلبات الملغاة (Void Orders) ─── */}
              {reportData.void_order_count > 0 && (
                <div className="mt-6">
                  <SectionHeader
                    icon={FaBan}
                    title={`${t("VoidOrders")} (${reportData.void_order_count})`}
                  />

                  <div className="overflow-x-auto rounded-xl border border-gray-300 shadow-sm">
                    <table className="min-w-full bg-white text-sm">
                      <thead className="bg-red-50 border-b border-gray-300">
                        <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:uppercase text-xs text-gray-700">
                          <th className="text-center">{t("VoidOrdersCount")}</th>
                          <th className="text-center">{t("VoidOrdersTotal")} ({t("EGP")})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="bg-red-800 text-white font-bold">
                          <td className="px-4 py-3 text-center text-base">
                            {reportData.void_order_count}
                          </td>
                          <td className="px-4 py-3 text-center text-lg">
                            -{formatAmount(reportData.void_order_sum)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── المصروفات ─── */}
              {reportData.expenses?.length > 0 && (
                <div className="mt-6">
                  <SectionHeader
                    icon={FaReceipt}
                    title={`${t("Expenses")} (${reportData.expenses.length})`}
                  />

                  <div className="overflow-x-auto rounded-xl border border-gray-300 shadow-sm">
                    <table className="min-w-full bg-white text-sm">

                      {/* Header */}
                      <thead className="bg-gray-100 border-b border-gray-300">
                        <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:uppercase text-xs text-gray-700">
                          <th className="text-center w-16">#</th>
                          <th className="text-center">{t("Description")}</th>
                          <th className="text-center">{t("Category")}</th>
                          <th className="text-center">{t("Amount")} ({t("EGP")})</th>
                        </tr>
                      </thead>

                      {/* Body */}
                      <tbody className="divide-y divide-gray-100">
                        {reportData.expenses.map((exp, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 transition-colors duration-150 [&>td]:px-4 [&>td]:py-3"
                          >
                            <td className="text-center text-gray-700">{idx + 1}</td>

                            <td className="text-center font-medium text-gray-800">
                              {exp.financial_account}
                            </td>

                            <td className="text-center font-medium text-gray-800">
                              {exp.category || t("N/A")}
                            </td>
                            <td className="text-center font-bold text-red-600">
                              -{formatAmount(exp.total, "")}
                            </td>
                          </tr>
                        ))}

                        {/* Total Row 👉 الآن مضبوط 100% */}
                        <tr className="bg-gray-800 text-white font-semibold">
                          <td colSpan={3} className="px-4 py-3 text-center text-base">
                            {t("TotalExpenses")}
                          </td>
                          <td className="px-4 py-3 text-center text-lg font-bold">
                            {formatAmount(reportData.expenses_total)}
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
                  ({t("TotalCashInShift")} - {t("TotalExpenses")} - {t("VoidOrdersTotal")})
                </p>
              </div>

              {/* ─── إحصائيات إضافية ─── */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <CompactStatCard icon={FaFileInvoiceDollar} title={t("TotalSales")} value={formatAmount(stats.total_amount, "")} />
                  <CompactStatCard icon={FaDollarSign} title={t("NetCash")} value={formatAmount(stats.net_cash ?? totals?.grand_total, "")} />
                </div>
              )}

            </div>
          )}

          {/* ─── الأزرار ─── */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-gray-200">

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