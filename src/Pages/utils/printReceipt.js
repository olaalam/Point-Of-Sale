// src/utils/printReceipt.js

import qz from "qz-tray";
import { toast } from "react-toastify";

// يجب تعديل هذا الاسم ليتناسب مع الاسم الفعلي للطابعة على جهاز POS
const PRINTER_NAME = "xp-80"; 

// -----------------------------------------------------------
// 1. دالة تهيئة بيانات الفاتورة
// -----------------------------------------------------------
export const prepareReceiptData = (
  orderItems,
  amountToPay,
  totalTax,
  totalDiscount,
  appliedDiscount,
  discountData,
  orderType,
  requiredTotal,
  responseSuccess // بيانات الرد من السيرفر
) => {
  // حساب الخصم الكلي
  const finalDiscountValue = appliedDiscount > 0
    ? amountToPay * (appliedDiscount / 100)
    : discountData.module.includes(orderType)
      ? amountToPay * (discountData.discount / 100)
      : totalDiscount;

  return {
    // بيانات أساسية
    invoiceNumber: responseSuccess?.invoice_number || "N/A",
    cashier: sessionStorage.getItem("cashier_name") || "Cashier",
    date: new Date().toLocaleString("ar-EG", {
      year: 'numeric', month: 'numeric', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: false
    }),
    table: sessionStorage.getItem("table_id") || "N/A",
    
    // تفاصيل الحساب
    items: orderItems.map(item => ({
        qty: item.count,
        name: item.name,
        price: item.price,
        total: item.price * item.count
    })),
    subtotal: amountToPay,
    discount: finalDiscountValue,
    tax: totalTax,
    total: requiredTotal,
  };
};

// -----------------------------------------------------------
// 2. دالة تحويل بيانات الفاتورة إلى تنسيق HTML جاهز للطباعة
// ملاحظة: يُفضل استخدام ESC/POS Raw Data للحصول على أقصى سرعة
// -----------------------------------------------------------
const formatReceiptToQZ = (receiptData) => {
    // تنسيق HTML لطابعة 80mm
    let htmlContent = `
    <html>
        <head>
            <style>
                @page { size: 80mm; margin: 0; padding: 0;}
                body { font-family: 'Tahoma', monospace; font-size: 10pt; width: 80mm; margin: 0; padding: 10px; box-sizing: border-box; direction: rtl;}
                .center { text-align: center; }
                .right { text-align: right; }
                .left { text-align: left; }
                .line { border-top: 1px dashed black; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 9pt; }
                th, td { padding: 2px 0; border: none; }
                .total-line { border-top: 2px solid black; padding-top: 5px; margin-top: 5px; font-size: 12pt; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="center">
                <h3>اسم المطعم/المتجر</h3>
                <p style="font-size: 9pt; margin: 2px 0;">الاسكندرية - سيدي جابر</p>
            </div>
            <div class="line"></div>
            <div class="right" style="font-size: 9pt;">
                <p style="margin: 2px 0;"><strong>رقم الفاتورة:</strong> ${receiptData.invoiceNumber}</p>
                <p style="margin: 2px 0;"><strong>الكاشير:</strong> ${receiptData.cashier}</p>
                <p style="margin: 2px 0;"><strong>التاريخ:</strong> ${receiptData.date}</p>
                <p style="margin: 2px 0;"><strong>الطاولة:</strong> ${receiptData.table}</p>
            </div>
            <div class="line"></div>
            <table>
                <thead>
                    <tr>
                        <th class="right" style="width: 50%;">الصنف</th>
                        <th class="center" style="width: 15%;">الكمية</th>
                        <th class="left" style="width: 35%;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${receiptData.items.map(item => `
                        <tr>
                            <td class="right">${item.name}</td>
                            <td class="center">${item.qty}</td>
                            <td class="left">${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="line"></div>
            <div class="right" style="font-size: 10pt;">
                <p style="margin: 2px 0;">الإجمالي الفرعي: ${receiptData.subtotal.toFixed(2)} EGP</p>
                <p style="margin: 2px 0;">الخصم: -${receiptData.discount.toFixed(2)} EGP</p>
                <p style="margin: 2px 0;">الضريبة: ${receiptData.tax.toFixed(2)} EGP</p>
            </div>
            <div class="total-line center">
                الإجمالي النهائي: ${receiptData.total.toFixed(2)} EGP
            </div>
            <div class="center" style="margin-top: 15px;">
                <p>شكراً لزيارتكم</p>
            </div>
        </body>
    </html>
    `;

    // QZ Tray يفضل تمرير البيانات كآرّي (array)
    // نحدد نوع البيانات 'html'
    return [{ type: 'html', format: 'plain', data: htmlContent }];
};


// -----------------------------------------------------------
// 3. دالة الطباعة الصامتة
// -----------------------------------------------------------
export const printReceiptSilently = async (receiptData, callback) => {
  try {
    const isConnected = qz.websocket.isActive();
    if (!isConnected) {
      toast.error("❌ QZ Tray is not connected. Please ensure the service is running and connected.");
      // تنفيذ الكولباك حتى لو فشلت الطباعة للسماح بالانتقال
      callback(); 
      return;
    }

    // 1. تجهيز البيانات للطباعة
    const data = formatReceiptToQZ(receiptData);

    // 2. إعداد و إرسال أمر الطباعة
    const config = qz.configs.create(PRINTER_NAME);
    await qz.print(config, data);

    toast.success("✅ Receipt printed successfully!");
    
    // استدعاء الكولباك بعد الانتهاء من أمر الطباعة
    callback();

  } catch (err) {
    console.error("QZ Tray Printing Error:", err);
    toast.error(`❌ Printing failed: ${err.message || "Check QZ Tray console and printer name."}`);
    // تنفيذ الكولباك حتى بعد الفشل للسماح للعملية بالاستمرار
    callback();
  }
}; 