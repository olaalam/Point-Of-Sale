// src/utils/printReceipt.js
// النسخة دي بتستخدم HTML printing (وبتصلح hunters)

import qz from "qz-tray";
import { toast } from "react-toastify";

// -----------------------------------------------------------
// 1. دالة تهيئة بيانات الفاتورة (زي ما هي)
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
  responseSuccess ,
  response
) => {
  const finalDiscountValue = appliedDiscount > 0
    ? amountToPay * (appliedDiscount / 100)
    : discountData.module.includes(orderType)
      ? amountToPay * (discountData.discount / 100)
      : totalDiscount;

  return {
    invoiceNumber: response?.order_number || "N/A",
    cashier: sessionStorage.getItem("cashier_name") || "Cashier",
    date: new Date().toLocaleString("ar-EG", {
      year: 'numeric', month: 'numeric', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: false
    }),
    table: sessionStorage.getItem("table_id") || "N/A",
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
    
    // 💡 الإضافة الجديدة لاسترداد بيانات المطعم
    restaurantName: sessionStorage.getItem("resturant_name") || "اسم المطعم",
    restaurantAddress: sessionStorage.getItem("restaurant_address") || "العنوان",
    restaurantPhone: sessionStorage.getItem("restaurant_phone") || "التليفون",
    receiptFooter: sessionStorage.getItem("receipt_footer") || "شكراً لزيارتكم",
    // -----------------------------------------------------------
  };
};

// -----------------------------------------------------------
// 2. دالة تحويل البيانات إلى كود HTML
// -----------------------------------------------------------
// -----------------------------------------------------------
// 2. دالة تحويل البيانات إلى كود HTML
// -----------------------------------------------------------
const formatReceiptToHTML = (receiptData) => {
    return `
    <html>
        <head>
            <style>
                body, html { 
                    width: 80mm; 
                    margin: 0; 
                    padding: 5px; 
                    font-family: Tahoma, sans-serif; 
                    font-size: 12px;
                    direction: rtl;
                }
                .center { text-align: center; }
                .right { text-align: right; }
                .left { text-align: left; }
                .ticket { width: 100%; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 2px; }
                .line { border-top: 1px dashed black; margin: 4px 0; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="center">
                    <strong>${receiptData.restaurantName}</strong><br>
                    ${receiptData.restaurantAddress}<br>
                    ${receiptData.restaurantPhone ? 'تليفون: ' + receiptData.restaurantPhone : ''}
                </div>
                <div class="line"></div>
                <div class="right">
                    رقم الفاتورة: ${receiptData.invoiceNumber}<br>
                    الكاشير: ${receiptData.cashier}<br>
                    التاريخ: ${receiptData.date}<br>
                    الطاولة: ${receiptData.table}
                </div>
                <div class="line"></div>
                <table>
                    <thead>
                        <tr>
                            <th class="right">الصنف</th>
                            <th class="center">الكمية</th>
                            <th class="left">الإجمالي</th>
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
                <div class="right">
                    الإجمالي الفرعي: ${receiptData.subtotal.toFixed(2)} EGP<br>
                    الخصم: -${receiptData.discount.toFixed(2)} EGP<br>
                    الضريبة: ${receiptData.tax.toFixed(2)} EGP<br>
                </div>
                <div class="line"></div>
                <div class="right">
                    <strong>الإجمالي النهائي: ${receiptData.total.toFixed(2)} EGP</strong>
                </div>
                <div class="line"></div>
                <div class="center">
                    <strong>${receiptData.receiptFooter}</strong>
                </div>
            </div>
        </body>
    </html>
    `;
};

// -----------------------------------------------------------
// 3. دالة الطباعة الصامتة (النسخة المعدلة لطباعة HTML)
// -----------------------------------------------------------
export const printReceiptSilently = async (receiptData, callback) => {
  try {
    const isConnected = qz.websocket.isActive();
    if (!isConnected) {
      toast.error("❌ QZ Tray is not connected.");
      callback(); 
      return;
    }

    // ************************************************
    // ******** التصليح هنا    ********
    // ************************************************
    const printerName = await qz.printers.getDefault(); // <-- printers
    if (!printerName) {
        toast.error("❌ No default printer found.");
        callback();
        return;
    }

    const config = qz.configs.create(printerName);
    const htmlData = formatReceiptToHTML(receiptData);

    const dataToPrint = [
        {
            type: 'html',       
            format: 'plain',
            data: htmlData
        }
    ];

    await qz.print(config, dataToPrint);
    
    // ************************************************
    
    toast.success("✅ Receipt printed successfully!");
    
    callback();

  } catch (err) {
    console.error("QZ Tray Printing Error:", err);
    toast.error(`❌ Printing failed: ${err.message || "Check QZ Tray console."}`);
    callback();
  }
};