import qz from "qz-tray";
import { toast } from "react-toastify";

// ===================================================================
// 1. HashMap للطابعات
// ===================================================================
const PRINTER_CONFIG = {
  cashier: {
    printerName: "XP-58C",
    type: "cashier",
    printAll: true,
    categories: [],
    design: "full",
  },
  mainKitchen: {
    printerName: "POS-80C (copy 1)",
    type: "kitchen",
    printAll: false,
    categories: [126],
    kitchenId: 5,
    design: "kitchen",
  },
};

// ===================================================================
// 4. تصميم إيصال الكاشير (مطابق للصورة المرفقة)
// ===================================================================

const formatCashierReceipt = (receiptData) => {
  const isArabic = localStorage.getItem("language") === "ar";
  const currentOrderType = (receiptData.orderType || "").toLowerCase();

  let orderTypeLabel = isArabic ? "تيك اواي" : "Takeaway";
  let isDineIn = false;

  if (currentOrderType === "dine_in") {
    orderTypeLabel = isArabic ? "صالة" : "Dine In";
    isDineIn = true;
  } else if (currentOrderType === "delivery") {
    orderTypeLabel = isArabic ? "توصيل" : "Delivery";
  } else if (currentOrderType === "take_away") {
    orderTypeLabel = isArabic ? "تيك أواي" : "Takeaway";
  }

  // صفوف الدفع
  let paymentRowsHTML = "";
  if (receiptData.financials && receiptData.financials.length > 0) {
    paymentRowsHTML = receiptData.financials
      .map(
        (fin) => `
      <tr>
        <td class="label-cell">${fin.name}</td>
        <td class="value-cell">${Number(fin.amount).toFixed(2)}</td>
      </tr>
    `
      )
      .join("");
  }

  const showCustomerInfo =
    currentOrderType === "delivery" ||
    (receiptData.address && Object.keys(receiptData.address).length > 0);

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* 1. إلغاء هوامش الصفحة نفسها (أهم خطوة) */
        @page {
          margin: 0;
          size: auto;
        }

        /* 2. تصفير هوامش الجسم */
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background-color: #fff;
          font-family: 'Arial', 'Tahoma', sans-serif;
          color: #000;
          direction: ${isArabic ? "rtl" : "ltr"};
        }

        /* 3. الحاوية تأخذ العرض بالكامل */
        .container {
          width: 100% !important;
          padding: 0 2px; /* مسافة صغيرة جداً عشان الكلام مايتقطعش */
          margin: 0;
        }

        /* Header */
        .header { text-align: center; margin-bottom: 10px; padding-top: 5px; }
        .header h1 { font-size: 24px; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase; }
        .header p { font-size: 13px; margin: 0; font-weight: bold; color: #333; }

        /* General Info Table */
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .info-table td { padding: 2px 0; vertical-align: top; }
        .label-cell { text-align: ${isArabic ? "right" : "left"}; font-weight: bold; font-size: 14px; color: #333; }
        .value-cell { text-align: ${isArabic ? "left" : "right"}; font-weight: bold; font-size: 16px; color: #000; }

        /* Customer Box (Bordered) */
        .customer-box {
          width: 100%;
          border: 2px solid #000;
          margin: 5px 0 10px 0;
          box-sizing: border-box; /* عشان البوردر مايخرجش برة الصفحة */
        }
        .customer-header {
          background-color: #e0e0e0;
          border-bottom: 2px solid #000;
          text-align: center;
          font-weight: bold;
          padding: 4px;
          font-size: 16px;
        }
        .customer-content { padding: 4px; }
        .cust-table { width: 100%; border-collapse: collapse; }
        .cust-table td { padding: 2px 0; vertical-align: top; font-weight: bold; font-size: 15px; }
        .cust-label { width: 25%; color: #333; }

        /* Items Table */
        .items-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .items-table th {
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 5px 0;
          font-size: 15px;
          text-align: center;
          background-color: #f2f2f2;
        }
        .items-table td {
          padding: 6px 0;
          font-weight: bold;
          font-size: 17px; /* تكبير خط المنتجات */
          text-align: center;
        }
        .item-name-cell {
            text-align: ${isArabic ? "right" : "left"} !important;
            padding-${isArabic ? "right" : "left"}: 5px;
        }

        /* Totals */
        .totals-table { width: 100%; margin-top: 10px; border-collapse: collapse; }
        .totals-table td { padding: 3px 0; font-size: 16px; font-weight: bold; }

        /* Grand Total */
        .grand-total-box {
          border: 3px solid #000;
          padding: 5px;
          margin: 15px auto;
          text-align: center;
          font-size: 30px;
          font-weight: 900;
          width: 70%;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 10px; }
        th { background-color: #eee; border: 1px solid #000; padding: 3px 1px; text-align: center; }
        td { border: 1px solid #000; padding: 2px 1px; text-align: center; vertical-align: middle; }
        .footer { text-align: center; margin-top: 10px; font-size: 12px; font-weight: bold; padding-bottom: 20px;}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${receiptData.restaurantName}</h1>
          <p>${receiptData.restaurantAddress}</p>
        </div>

        <table>
          <tr>
            <td class="label-cell">${isArabic ? "رقم الفاتورة" : "Invoice #"}</td>
            <td class="value-cell" style="font-size: 18px;">${receiptData.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label-cell">${isArabic ? "نوع الطلب" : "Order Type"}</td>
            <td class="value-cell">${orderTypeLabel}</td>
          </tr>
          <tr>
            <td class="label-cell">${isArabic ? "الكاشير" : "Cashier"}</td>
            <td class="value-cell">${receiptData.cashier}</td>
          </tr>
          ${paymentRowsHTML}
          <tr>
            <td class="label-cell">${isArabic ? "التاريخ" : "Date"}</td>
            <td class="value-cell">${receiptData.dateFormatted}</td>
          </tr>
          <tr>
            <td class="label-cell">${isArabic ? "الوقت" : "Time"}</td>
            <td class="value-cell">${receiptData.timeFormatted}</td>
          </tr>
        </table>

        ${
          showCustomerInfo && receiptData.customer
            ? `
            <div class="customer-box">
              <div class="customer-header">${isArabic ? "بيانات العميل" : "Customer Info"}</div>
              <div class="customer-content">
                <table class="cust-table">
                  <tr>
                    <td class="cust-label">${isArabic ? "الاسم:" : "Name:"}</td>
                    <td style="font-size: 16px;">
                      ${receiptData.customer.name || receiptData.customer.f_name}
                    </td>
                  </tr>
                  <tr>
                    <td class="cust-label">${isArabic ? "هاتف:" : "Phone:"}</td>
                    <td style="direction: ltr; text-align: ${isArabic ? "right" : "left"}; font-size: 16px;">
                      ${receiptData.customer.phone || ""}
                    </td>
                  </tr>
                  ${
                    receiptData.address
                      ? `
                  <tr>
                    <td class="cust-label" style="vertical-align: top;">${isArabic ? "العنوان:" : "Addr:"}</td>
                    <td style="font-size: 14px; line-height: 1.3;">
                      ${receiptData.address.address || ""}
                      ${receiptData.address.building_num ? `<br>Bldg: ${receiptData.address.building_num}` : ""}
                      ${receiptData.address.floor_num ? ` - Floor: ${receiptData.address.floor_num}` : ""}
                      ${receiptData.address.apartment ? ` - Apt: ${receiptData.address.apartment}` : ""}
                      ${receiptData.address.additional_data ? `<br>Note: ${receiptData.address.additional_data}` : ""}
                    </td>
                  </tr>`
                      : ""
                  }
                </table>
              </div>
            </div>
            `
            : ""
        }

        <table class="items-table">
          <thead>
            <tr>
              <th width="15%">${isArabic ? "ك" : "Qt"}</th>
              <th width="60%" style="text-align: ${isArabic ? "right" : "left"}; padding-left: 5px;">${isArabic ? "الصنف" : "Item"}</th>
              <th width="25%">${isArabic ? "مجموع" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            ${receiptData.items
              .map((item) => {
                const productName = isArabic
                  ? item.nameAr || item.name_ar || item.name
                  : item.nameEn || item.name_en || item.name;
                return `
              <tr>
                <td>${item.qty}</td>
                <td class="item-name-cell">
                  ${productName}
                  ${item.notes ? `<div style="font-size: 12px; font-weight: normal; color: #555;">(${item.notes})</div>` : ""}
                </td>
                <td>${item.total.toFixed(2)}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="text-align: ${isArabic ? "right" : "left"}">${isArabic ? "المجموع" : "Subtotal"}</td>
            <td style="text-align: ${isArabic ? "left" : "right"}">${receiptData.subtotal}</td>
          </tr>
          ${
            receiptData.discount > 0
              ? `
          <tr>
            <td style="text-align: ${isArabic ? "right" : "left"}">${isArabic ? "الخصم" : "Discount"}</td>
            <td style="text-align: ${isArabic ? "left" : "right"}">-${receiptData.discount}</td>
          </tr>`
              : ""
          }
          ${
            receiptData.deliveryFees > 0
              ? `
          <tr>
            <td style="text-align: ${isArabic ? "right" : "left"}">${isArabic ? "توصيل" : "Delivery"}</td>
            <td style="text-align: ${isArabic ? "left" : "right"}">${receiptData.deliveryFees.toFixed(2)}</td>
          </tr>`
              : ""
          }
        </table>

        <div class="grand-total-box">
          ${receiptData.total}
        </div>

        <div class="footer">
          ${receiptData.receiptFooter}
        </div>
      </div>
    </body>
  </html>
  `;
};

// ===================================================================
// 5. تصميم إيصال المطبخ
// ===================================================================
const formatKitchenReceipt = (receiptData, productsList = []) => {
    const isArabic = localStorage.getItem("language") === "ar";
    const currentOrderType = (receiptData.orderType || "").toLowerCase();
  
    let orderTypeLabel = isArabic ? "سفري" : "Takeaway";
    let displayBigNumber = isArabic ? "سفري" : "To Go";
    let isDineIn = false;
    let tableNumber = receiptData.table;
    
    if (!tableNumber || tableNumber === "N/A" || tableNumber === "null") tableNumber = "";
  
    if (currentOrderType === "dine_in") {
      orderTypeLabel = isArabic ? "صالة" : "Dine In";
      displayBigNumber = tableNumber;
      isDineIn = true;
    } else if (currentOrderType === "delivery") {
      orderTypeLabel = isArabic ? "توصيل" : "Delivery";
      displayBigNumber = isArabic ? "توصيل" : "Delivery";
    } else if (currentOrderType === "take_away") {
      orderTypeLabel = isArabic ? "تيك أواي" : "Takeaway";
      displayBigNumber = isArabic ? "سفري" : "Takeaway";
    }
  
    return `
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body, html { width: 100%; margin: 0; padding: 0; font-family: 'Tahoma', sans-serif; direction: ${isArabic ? "rtl" : "ltr"}; }
          .header-box { border: 3px solid #000; display: flex; margin-bottom: 10px; }
          .box-left { width: 60%; border-${isArabic ? "left" : "right"}: 3px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; }
          .box-right { width: 40%; display: flex; flex-direction: column; justify-content: space-between; }
          .row-label { border-bottom: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; flex-grow: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .row-label:last-child { border-bottom: none; }
          
          .big-number { font-size: ${isDineIn ? "40px" : "24px"}; font-weight: 900; line-height: 1; margin-bottom: 5px; }
          .customer-name { font-size: 18px; font-weight: bold; text-align: center; }
          
          .title-strip { background: #000; color: #fff; text-align: center; font-weight: bold; font-size: 18px; padding: 2px 0; margin-bottom: 5px; }
          
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th { border: 2px solid #000; background: #ddd; padding: 5px; font-size: 16px; }
          td { border: 2px solid #000; padding: 5px; font-weight: bold; font-size: 18px; vertical-align: middle; }
          .qty-col { width: 15%; text-align: center; font-size: 22px; }
          .item-col { text-align: ${isArabic ? "right" : "left"}; }
          
          .footer-info { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="box-left">
            <div class="big-number">${displayBigNumber}</div>
            <div class="customer-name">${isDineIn ? orderTypeLabel : receiptData.customerName || orderTypeLabel}</div>
          </div>
          <div class="box-right">
            <div class="row-label">${isArabic ? "رقم الفاتورة" : "Order #"} ${receiptData.invoiceNumber}</div>
            <div class="row-label">${receiptData.timeFormatted}</div> 
          </div>
        </div>
  
        <div class="title-strip">${orderTypeLabel} ${tableNumber ? "#" + tableNumber : ""}</div>
  
        <table>
          <thead>
            <tr>
              <th>${isArabic ? "العدد" : "Qty"}</th>
              <th>${isArabic ? "الصنف" : "Item"}</th>
            </tr>
          </thead>
          <tbody>
            ${receiptData.items.map((item) => {
                let finalName = item.name;
                if (isArabic && productsList.length > 0) {
                  const original = productsList.find((p) => p.id == item.id);
                  if (original) finalName = original.name_ar || original.nameAr || item.name;
                }
                return `
              <tr>
                <td class="qty-col">${item.qty}</td>
                <td class="item-col">
                  ${finalName}
                  ${item.notes ? `<br><span style="font-size:14px; font-weight:normal;">(${item.notes})</span>` : ""}
                </td>
              </tr>`;
              }).join("")}
          </tbody>
        </table>
  
        <div class="footer-info">
          <span>User: ${receiptData.cashier || "System"}</span>
          <span>Date: ${receiptData.dateFormatted}</span>
        </div>
      </body>
    </html>
    `;
};

// ===================================================================
// 6. تصميم إيصال الباريستا
// ===================================================================
const formatBaristaReceipt = (receiptData) => {
    return `
    <html>
      <head>
        <style>
          body, html { width: 58mm; margin: 0; padding: 5px; font-family: Arial, sans-serif; font-size: 14px; direction: rtl; }
          .center { text-align: center; }
          .line { border-top: 2px dashed black; margin: 5px 0; }
          .bold { font-weight: bold; }
          .item-row { padding: 8px 0; border-bottom: 1px dotted #000; }
        </style>
      </head>
      <body>
          <div class="center bold" style="font-size: 16px;">☕ بار المشروبات</div>
          <div class="line"></div>
          <div class="center">
            <strong># ${receiptData.invoiceNumber}</strong><br>
            ${receiptData.table ? "طاولة: " + receiptData.table : ""}
          </div>
          <div class="line"></div>
          
          ${receiptData.items.map((item) => {
              const productName = item.nameAr || item.name_ar || item.name;
              return `
            <div class="item-row">
              <div class="bold" style="font-size: 16px;">${productName}</div>
              <div>العدد: <span class="bold" style="font-size: 18px;">${item.qty}</span></div>
              ${item.notes ? `<div>ملاحظة: ${item.notes}</div>` : ""}
            </div>
          `;
            }).join("")}
      </body>
    </html>
    `;
};

// ===================================================================
// 7. اختيار التصميم
// ===================================================================
const getReceiptHTML = (receiptData, printerConfig) => {
  switch (printerConfig.design) {
    case "kitchen":
      return formatKitchenReceipt(receiptData, printerConfig.type);
    case "barista":
      return formatBaristaReceipt(receiptData);
    case "full":
    default:
      return formatCashierReceipt(receiptData);
  }
};

// ===================================================================
// 8. تهيئة البيانات
// ===================================================================
export const prepareReceiptData = (
  orderItems,
  amountToPay,
  totalTax,
  totalDiscount,
  appliedDiscount,
  discountData,
  orderType,
  requiredTotal,
  responseSuccess,
  response,
  cashierData = {}
) => {
  const finalDiscountValue =
    appliedDiscount > 0
      ? amountToPay * (appliedDiscount / 100)
      : discountData?.module?.includes(orderType)
      ? amountToPay * (discountData.discount / 100)
      : totalDiscount;

  const hasAddress =
    response?.address && Object.keys(response.address).length > 0;
  const finalOrderType =
    (hasAddress ? "delivery" : null) ||
    orderType ||
    response?.type ||
    response?.kitchen_items?.[0]?.order_type ||
    sessionStorage.getItem("order_type")?.toLowerCase() ||
    "takeaway";

  let finalTotal = requiredTotal;
  let deliveryFees = 0;

  if (finalOrderType === "delivery") {
    deliveryFees = response?.delivery_fees ? Number(response.delivery_fees) : 0;
    if (
      Math.abs(requiredTotal - (amountToPay + deliveryFees - finalDiscountValue)) > 1
    ) {
      finalTotal = requiredTotal + deliveryFees;
    }
  }

  const finalRestaurantName =
    sessionStorage.getItem("resturant_name") ||
    cashierData.branch?.name ||
    "اسم المطعم";
  const finalCashierName =
    response?.caheir_name ||
    cashierData.user_name ||
    sessionStorage.getItem("cashier_name") ||
    "Cashier";

  const itemsSource =
    response && response.success && response.success.length > 0
      ? response.success
      : orderItems;

  const dateObj = response?.date ? new Date(response.date) : new Date();
  const dateFormatted = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const timeFormatted = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    invoiceNumber: response?.order_id || response?.order_number,
    cashier: finalCashierName,
    dateFormatted: dateFormatted,
    timeFormatted: timeFormatted,
    table: sessionStorage.getItem("table_id") || "N/A",
    orderType: finalOrderType,
    financials: response?.financials || [],
    items: itemsSource.map((item) => ({
      qty: item.count,
      name: item.name,
      nameAr: item.name_ar || item.nameAr,
      nameEn: item.name_en || item.nameEn,
      price: Number(item.price),
      total: Number(item.total || item.price * item.count),
      notes: item.notes || "",
      category_id: item.category_id || item.product?.category_id,
    })),
    customer: response?.customer || null,
    address: response?.address || null,
    subtotal: amountToPay,
    deliveryFees: deliveryFees,
    discount: finalDiscountValue,
    tax: totalTax,
    total: finalTotal,
    restaurantName: finalRestaurantName,
    restaurantAddress:
      sessionStorage.getItem("restaurant_address") || "العنوان",
    restaurantPhone: sessionStorage.getItem("restaurant_phone") || "",
    receiptFooter:
      sessionStorage.getItem("receipt_footer") || "شكراً لزيارتكم",
  };
};

// ===================================================================
// 9. دالة الطباعة
// ===================================================================
export const printReceiptSilently = async (
  receiptData,
  apiResponse,
  callback
) => {
  try {
    if (!qz.websocket.isActive()) {
      toast.error("❌ QZ Tray is not connected.");
      callback();
      return;
    }

    const printJobs = [];

    // 1. الكاشير
    try {
      const cashierPrinterName = await qz.printers.getDefault();
      if (!cashierPrinterName) throw new Error("No default printer found.");

      const cashierHtml = getReceiptHTML(receiptData, {
        design: "full",
        type: "cashier",
      });
      const cashierConfig = qz.configs.create(cashierPrinterName);

      printJobs.push(
        qz.print(cashierConfig, [
          { type: "html", format: "plain", data: cashierHtml },
        ])
      );
    } catch (err) {
      console.error(err);
      toast.error("خطأ في طابعة الكاشير");
    }

    // 2. المطبخ
    const kitchens = apiResponse?.kitchen_items || [];
    for (const kitchen of kitchens) {
      if (
        !kitchen.print_name ||
        kitchen.print_status !== 1 ||
        !kitchen.order?.length
      )
        continue;

      const kitchenReceiptData = {
        ...receiptData,
        items: kitchen.order.map((item) => ({
          qty: item.count || "1",
          name: item.name,
          price: 0,
          total: 0,
          notes: item.notes || "",
          category_id: item.category_id,
        })),
      };

      const kitchenHtml = getReceiptHTML(kitchenReceiptData, {
        design: "kitchen",
        type: kitchen.name,
      });
      const config = qz.configs.create(kitchen.print_name);
      printJobs.push(
        qz.print(config, [
          { type: "html", format: "plain", data: kitchenHtml },
        ])
      );
    }

    await Promise.all(printJobs);
    toast.success("✅ تم الطباعة");
    callback();
  } catch (err) {
    console.error(err);
    toast.error("❌ فشل الطباعة");
    callback();
  }
};

export const addPrinterConfig = (key, config) => {
  PRINTER_CONFIG[key] = config;
};
export const getActivePrinters = () => {
  return Object.keys(PRINTER_CONFIG);
};
export const updatePrinterConfig = (key, updates) => {
  if (PRINTER_CONFIG[key])
    PRINTER_CONFIG[key] = { ...PRINTER_CONFIG[key], ...updates };
};