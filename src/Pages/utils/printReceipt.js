// src/utils/printReceipt.js
import ReactDOM from "react-dom/client";
import { toast } from "react-toastify";

export const printReceiptSilently = (receiptData, onPrinted = () => {}) => {
  console.log("printReceiptSilently CALLED for invoice:", receiptData.invoiceNumber);

  // === طريقة الـ Popup (مضمونة 100%) ===
  const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=no,resizable=yes');

  if (!printWindow) {
    console.error("Popup blocked! Please allow popups for printing.");
    toast.error("Please allow popups to print the receipt.");
    onPrinted();
    return;
  }

  // CSS داخل الـ HTML
  const css = `
    <style>
      body { font-family: 'Courier New', monospace; font-size: 11px; direction: rtl; text-align: right; width: 80mm; margin: 0; padding: 8px; }
      .header { text-align: center; margin-bottom: 8px; }
      .header h1 { font-size: 15px; margin: 0 0 3px; font-weight: bold; }
      .header p { margin: 2px 0; font-size: 10px; }
      .info { margin: 8px 0; font-size: 10px; line-height: 1.4; }
      .info div { display: flex; justify-content: space-between; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
      th, td { padding: 3px 2px; text-align: center; border-bottom: 1px dotted #999; }
      th { font-weight: bold; font-size: 11px; }
      .item-name { text-align: right; padding-right: 4px; }
      .totals { margin-top: 8px; font-size: 11px; }
      .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
      .final { font-weight: bold; font-size: 13px; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
      .footer { text-align: center; margin-top: 12px; font-size: 10px; }
      @media print {
        @page { size: 80mm auto; margin: 0; }
        body { margin: 0; padding: 8px; }
      }
    </style>
  `;

  const itemsHtml = receiptData.items.map(i => `
    <tr>
      <td>${i.qty}</td>
      <td class="item-name">${i.name}</td>
      <td>${i.price.toFixed(2)}</td>
      <td>${i.total.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Receipt #${receiptData.invoiceNumber}</title>
    ${css}
  </head>
  <body>
    <div class="header">
      <h1>كاشير</h1>
      <p>للمشروبات والماكولات</p>
      <p>الاسكندرية - سيدي جابر - شارع المشير</p>
    </div>
    <div class="info">
      <div><strong>نسخة:</strong> <span>${receiptData.copyNumber}</span></div>
      <div><strong>الطاولة:</strong> <span>${receiptData.table}</span></div>
      <div><strong>الكاشير:</strong> <span>${receiptData.cashier}</span></div>
      <div><strong>التاريخ:</strong> <span>${receiptData.date}</span></div>
      <div><strong>رقم الفاتورة:</strong> <span>${receiptData.invoiceNumber}</span></div>
    </div>
    <table>
      <thead><tr><th>الكمية</th><th>الصنف</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
      <div><span>صافي المبيع:</span> <span>${receiptData.subtotal.toFixed(2)}</span></div>
      <div><span>الخصم:</span> <span>${receiptData.discount.toFixed(2)}</span></div>
      <div><span>ضريبة القيمة المضافة:</span> <span>${receiptData.tax.toFixed(2)}</span></div>
      <div class="final"><span>الإجمالي:</span> <span>${receiptData.total.toFixed(2)} EGP</span></div>
    </div>
    <div class="footer"><p>شكراً لزيارتكم</p></div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }, 300);
      };
    </script>
  </body>
  </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // انتظر إغلاق النافذة → نفّذ onPrinted
  const checkClosed = setInterval(() => {
    if (printWindow.closed) {
      clearInterval(checkClosed);
      console.log("PRINT POPUP CLOSED → onPrinted() executed");
      onPrinted();
    }
  }, 500);

  // fallback: لو ما اتقفلش خلال 10 ثواني
  setTimeout(() => {
    if (!printWindow.closed) {
      console.warn("Print window did not close. Forcing onPrinted().");
      printWindow.close();
      onPrinted();
    }
  }, 10000);
};

export const prepareReceiptData = (
  orderItems,
  amountToPay,
  totalTax,
  totalDiscount,
  appliedDiscount,
  discountData,
  orderType,
  requiredTotal,
  orderResponse
) => {
  const cashierName = sessionStorage.getItem("cashier_name") || "كاشير";
  const tableName = sessionStorage.getItem("table_name") || "---";

  const appliedDisc = appliedDiscount > 0
    ? amountToPay * (appliedDiscount / 100)
    : discountData.module.includes(orderType)
      ? amountToPay * (discountData.discount / 100)
      : totalDiscount;

  return {
    copyNumber: "1",
    table: tableName,
    cashier: cashierName,
    date: new Date().toLocaleString("ar-EG", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    invoiceNumber: orderResponse?.id || "N/A",
    items: orderItems.map(item => ({
      qty: item.count,
      name: item.name || item.product_name,
      price: item.price,
      total: item.price * item.count
    })),
    subtotal: amountToPay - totalTax,
    discount: appliedDisc,
    tax: totalTax,
    total: requiredTotal
  };
};