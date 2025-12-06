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
// 4. تصميم إيصال الكاشير (نسخة بريميوم / مودرن)
// ===================================================================

const formatCashierReceipt = (receiptData) => {
  const isArabic = localStorage.getItem("language") === "ar";
  const currentOrderType = (receiptData.orderType || "").toLowerCase();

  // 1. تجهيز النصوص
  let orderTypeLabel = isArabic ? "تيك اواي" : "TAKEAWAY";
  let tableLabel = "";

  if (currentOrderType === "dine_in") {
    orderTypeLabel = isArabic ? "صالة" : "DINE IN";
    if (receiptData.table && receiptData.table !== "N/A") {
      tableLabel = isArabic
        ? `طاولة: ${receiptData.table}`
        : `Table: ${receiptData.table}`;
    }
  } else if (currentOrderType === "delivery") {
    orderTypeLabel = isArabic ? "توصيل" : "DELIVERY";
  } else if (currentOrderType === "take_away") {
    orderTypeLabel = isArabic ? "تيك أواي" : "TAKEAWAY";
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
        /* إعدادات الصفحة الأساسية */
        @page { margin: 0; size: auto; }
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background-color: #fff;
          font-family: 'Tahoma', 'Arial', sans-serif; /* Tahoma أفضل للعربي */
          color: #000;
          direction: ${isArabic ? "rtl" : "ltr"};
          font-size: 12px;
        }
        .container {
          width: 100% !important;
          padding: 5px 2px;
          margin: 0;
          box-sizing: border-box;
        }

        /* 1. ترويسة المطعم */
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { 
            font-size: 24px; 
            font-weight: 900; 
            margin: 0; 
            text-transform: uppercase; 
            letter-spacing: 1px;
        }
        .header p { margin: 2px 0; font-size: 12px; color: #333; }
        .header .phone { font-weight: bold; font-size: 13px; margin-top: 2px;}

        /* 2. شارة نوع الطلب (مميزة جداً) */
        .order-badge {
            border: 2px solid #000;
            color: black;
            text-align: center;
            font-size: 18px;
            font-weight: 900;
            padding: 5px;
            margin: 5px 0;
            border-radius: 4px;
        }
        .table-info { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px; }

        /* 3. شبكة المعلومات العلوية */
        .meta-grid { 
            width: 100%; 
            border-top: 1px dashed #000; 
            border-bottom: 1px dashed #000; 
            margin-bottom: 8px;
            padding: 5px 0;
        }
        .meta-grid td { vertical-align: middle; }
        .meta-label { font-size: 10px; color: #555; }
        .meta-value { font-size: 14px; font-weight: 900; }

        /* 4. فواصل الأقسام (نص أبيض على خلفية سوداء) */
        .section-header {
            background-color: #eee; /* رمادي فاتح بدلاً من الأسود لتوفير الحبر وأناقة */
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            color: #000;
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            padding: 3px 0;
            margin-top: 8px;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        /* 5. جدول المنتجات */
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th { 
            text-align: center; 
            font-size: 11px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 4px;
        }
        .items-table td { 
            padding: 6px 0; 
            border-bottom: 1px dashed #ccc; /* خط فاصل خفيف جداً بين المنتجات */
            vertical-align: top;
        }
        .item-qty { font-size: 13px; font-weight: bold; text-align: center; }
        .item-name { font-size: 13px; font-weight: bold; padding: 0 5px; }
        .item-total { font-size: 13px; font-weight: bold; text-align: center; }
        
        .addon-row { font-size: 11px; color: #444; margin-top: 2px; font-weight: normal; }
        .notes-row { font-size: 11px; font-style: italic; color: #555; }

        /* 6. الحسابات */
        .totals-section { width: 100%; margin-top: 10px; }
        .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; font-weight: bold;}
        
        .grand-total {
            border: 2px solid #000;
            padding: 8px;
            margin-top: 8px;
            text-align: center;
            font-size: 22px;
            font-weight: 900;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        /* بيانات العميل */
        .cust-info { font-size: 12px; font-weight: bold; line-height: 1.4; padding: 5px; border: 1px dotted #000; margin-bottom: 5px; }

      </style>
    </head>
    <body>
      <div class="container">
        
        <div class="header">
          <h1>${receiptData.restaurantName}</h1>
          <p>${receiptData.restaurantAddress}</p>
          <div class="phone">${receiptData.restaurantPhone}</div>
        </div>

        <div class="order-badge">${orderTypeLabel}</div>
        ${tableLabel ? `<div class="table-info">${tableLabel}</div>` : ""}

        <table class="meta-grid">
            <tr>
                <td width="50%" style="border-${isArabic ? "left" : "right"
    }: 1px dotted #000; padding: 0 5px;">
                    <div class="meta-label">${isArabic ? "رقم الفاتورة" : "ORDER NO"
    }</div>
                    <div class="meta-value" style="font-size: 18px;">#${receiptData.invoiceNumber
    }</div>
                    ${receiptData.orderType === "dine_in" &&
      receiptData.preparationNum
      ? `<div style="font-size: 14px;  color: #d00; margin-top: 4px;">
                           Prep: ${receiptData.preparationNum}
                         </div>`
      : ""
    }
                        ${receiptData.orderType === "dine_in" &&
      receiptData.table_number
      ? `<div style="font-size: 14px;  color: #d00; margin-top: 4px;">
                           Prep: ${receiptData.table_number}
                         </div>`
      : ""
    }
                </td>
                <td width="50%" style="padding: 0 5px; text-align: ${isArabic ? "left" : "right"
    };">
                    <div class="meta-label">${isArabic ? "التاريخ / الوقت" : "DATE / TIME"
    }</div>
                    <div style="font-weight: bold; font-size: 11px;">${receiptData.dateFormatted
    }</div>
                    <div style="font-weight: bold; font-size: 11px;">${receiptData.timeFormatted
    }</div>
                </td>
            </tr>
        </table>

        ${showCustomerInfo && receiptData.customer
      ? `
            <div class="section-header">${isArabic ? "بيانات العميل" : "CUSTOMER INFO"
      }</div>
            <div class="cust-info">
                <div>${receiptData.customer.name || receiptData.customer.f_name
      }</div>
                <div style="direction: ltr; text-align: ${isArabic ? "right" : "left"
      };">${receiptData.customer.phone || ""}</div>
                ${receiptData.address
        ? `<div style="font-weight: normal; margin-top: 3px; border-top: 1px dotted #ccc; padding-top:2px;">
                    ${receiptData.address.address || ""} 
                    ${receiptData.address.building_num
          ? `, B:${receiptData.address.building_num}`
          : ""
        }
                    ${receiptData.address.floor_num
          ? `, F:${receiptData.address.floor_num}`
          : ""
        }
                    ${receiptData.address.apartment
          ? `, Apt:${receiptData.address.apartment}`
          : ""
        }
                </div>`
        : ""
      }
            </div>
            `
      : ""
    }

        <div class="section-header">${isArabic ? "الطلبات" : "ITEMS"}</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th width="10%">${isArabic ? "ع" : "Qt"}</th>
                    <th width="65%" style="text-align: ${isArabic ? "right" : "left"
    };">${isArabic ? "الصنف" : "Item"}</th>
                    <th width="25%">${isArabic ? "إجمالي" : "Total"}</th>
                </tr>
            </thead>
            <tbody>
            ${receiptData.items
      .map((item) => {
        const productName = isArabic
          ? item.nameAr || item.name_ar || item.name
          : item.nameEn || item.name_en || item.name;

        // === دالة مساعدة لتحويل أي شيء إلى نص آمن ===
        const safeName = (item) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          if (item.name) return item.name;
          if (item.option) return item.option; // بعض الأنظمة بتبعت option
          if (item.variation) return item.variation;
          return String(item); // آخر حماية
        };

        // Addons
        const addonsHTML = (item.addons || [])
          .map((add) => {
            const name = safeName(add);
            const price = add.price
              ? ` (${Number(add.price).toFixed(2)})`
              : "";
            return name
              ? `<div class="addon-row">+ ${name}${price}</div>`
              : "";
          })
          .filter(Boolean)
          .join("");

        // Extras
        const extrasHTML = (item.extras || [])
          .map((extra) => {
            const name = safeName(extra);
            return name ? `<div class="addon-row">+ ${name}</div>` : "";
          })
          .filter(Boolean)
          .join("");

        // Excludes
        const excludesHTML = (item.excludes || [])
          .map((exc) => {
            const name = safeName(exc);
            return name
              ? `<div class="addon-row" style="color:#d00;">- ${name}</div>`
              : "";
          })
          .filter(Boolean)
          .join("");

        const getVariationsArray = (v) =>
          Array.isArray(v)
            ? v
            : v && typeof v === "object"
              ? Object.values(v).flat()
              : [];

        const variationsHTML = getVariationsArray(item.variations)
          .flatMap((group) =>
            group.options ? [`• ${group.options.join(", ")}`] : []
          )
          .map((text) => `<div class="addon-row">${text}</div>`)
          .join("");

        const modifiersHTML = [
          addonsHTML,
          extrasHTML,
          excludesHTML,
          variationsHTML,
        ]
          .filter(Boolean)
          .join("");

        return `
  <tr>
    <td class="item-qty">${item.qty}</td>
    <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">
      ${productName}
      ${modifiersHTML
            ? `<div style="margin-top:4px;">${modifiersHTML}</div>`
            : ""
          }
      ${item.notes ? `<div class="notes-row">(${item.notes})</div>` : ""}
    </td>
    <td class="item-total">${item.total.toFixed(2)}</td>
  </tr>
  `;
      })
      .join("")}
            </tbody>
        </table>

               <div style="border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; font-size: 13px;">

            <!-- Subtotal -->
            <div class="totals-row">
                <span>${isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
                <span>${Number(receiptData.total).toFixed(2)}</span>
            </div>

            <!-- Discount -->
            ${Number(receiptData.discount) > 0 ? `
            <div class="totals-row" style="color: #d00;">
                <span>${isArabic ? "الخصم" : "Discount"}</span>
                <span>-${receiptData.discount}</span>
            </div>` : ""}

            <!-- Tax -->
            ${Number(receiptData.tax) > 0 ? `
            <div class="totals-row">
                <span>${isArabic ? "الضريبة (VAT)" : "Tax (VAT)"}</span>
                <span>${receiptData.tax}</span>
            </div>` : ""}

            <!-- Delivery Fees -->
            ${receiptData.deliveryFees > 0 ? `
            <div class="totals-row">
                <span>${isArabic ? "رسوم التوصيل" : "Delivery Fee"}</span>
                <span>${receiptData.deliveryFees.toFixed(2)}</span>
            </div>` : ""}
<!-- Service Fees -->
${Number(receiptData.serviceFees) > 0 ? `
<div class="totals-row">
    <span>${isArabic ? "رسوم الخدمة" : "Service Fees"}</span>
    <span>${Number(receiptData.serviceFees).toFixed(2)}</span>
</div>
` : ""}
            <!-- Grand Total -->
            <div class="grand-total">
                <span style="font-size: 18px;">${isArabic ? "الإجمالي الكلي" : "GRAND TOTAL"}</span>
                <span style="font-size: 24px;">${Number(receiptData.subtotal).toFixed(2)}</span>
            </div>

        </div>

        <div style="text-align: center; margin-top: 15px; font-size: 11px;">
            <p style="margin: 0; font-weight: bold;">${receiptData.receiptFooter
    }</p>
            <p style="margin: 5px 0 0 0;">*** شكراً لزيارتكم ***</p>
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
  if (!Array.isArray(productsList)) productsList = [];
  const isArabic = localStorage.getItem("language") === "ar";
  const currentOrderType = (receiptData.orderType || "").toLowerCase();

  let orderTypeLabel = isArabic ? "تيك اواي" : "Takeaway";
  let displayBigNumber = isArabic ? "تيك اواي" : "To Go";
  let isDineIn = false;
  let tableNumber = receiptData.table;

  if (!tableNumber || tableNumber === "N/A" || tableNumber === "null")
    tableNumber = "";

  if (currentOrderType === "dine_in") {
    orderTypeLabel = isArabic ? "صالة" : "Dine In";
    displayBigNumber = tableNumber;
    isDineIn = true;
  } else if (currentOrderType === "delivery") {
    orderTypeLabel = isArabic ? "توصيل" : "Delivery";
    displayBigNumber = isArabic ? "توصيل" : "Delivery";
  } else if (currentOrderType === "take_away") {
    orderTypeLabel = isArabic ? "تيك أواي" : "Takeaway";
    displayBigNumber = isArabic ? "تيك اواي" : "Takeaway";
  }

  return `
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body, html { width: 100%; margin: 0; padding: 0; font-family: 'Tahoma', sans-serif; direction: ${isArabic ? "rtl" : "ltr"
    }; }
          .header-box { border: 3px solid #000; display: flex; margin-bottom: 10px; }
          .box-left { width: 60%; border-${isArabic ? "left" : "right"
    }: 3px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; }
          .box-right { width: 40%; display: flex; flex-direction: column; justify-content: space-between; }
          .row-label { border-bottom: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; flex-grow: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .row-label:last-child { border-bottom: none; }
          
          .big-number { font-size: ${isDineIn ? "40px" : "24px"
    }; font-weight: 900; line-height: 1; margin-bottom: 5px; }
          .customer-name { font-size: 12px; font-weight: bold; text-align: center; }
          
          .title-strip { color: black; text-align: center; font-weight: bold; font-size: 12px; padding: 2px 0; margin-bottom: 5px; }
          
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th { border: 2px solid #000; background: #ddd; padding: 5px; font-size: 10px; }
          td { border: 2px solid #000; padding: 5px; font-weight: bold; font-size: 12px; vertical-align: middle; }
          .qty-col { width: 15%; text-align: center; font-size: 12px; }
          .item-col { text-align: ${isArabic ? "right" : "left"}; }
          
          .footer-info { display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="box-left">
            <div class="big-number">${displayBigNumber}</div>
            <div class="customer-name">${isDineIn
      ? orderTypeLabel
      : receiptData.customerName || orderTypeLabel
    }</div>
          </div>
          <div class="box-right">
            <div class="row-label">${isArabic ? "رقم الفاتورة" : "Order #"} ${receiptData.invoiceNumber
    }</div>
            <div class="row-label">${receiptData.timeFormatted}</div> 
          </div>
        </div>
  
        <div class="title-strip">${orderTypeLabel} ${tableNumber ? "#" + tableNumber : ""
    }</div>
  
        <table>
          <thead>
            <tr>
              <th>${isArabic ? "العدد" : "Qty"}</th>
              <th>${isArabic ? "الصنف" : "Item"}</th>
            </tr>
          </thead>

          <tbody>
${receiptData.items
      .map((item) => {
        let finalName = item.name;
        if (isArabic && productsList.length > 0) {
          const original = productsList.find((p) => p.id == item.id);
          if (original)
            finalName = original.name_ar || original.nameAr || item.name;
        }

        // === دالة مساعدة لتحويل أي شيء إلى نص آمن ===
        const safeName = (item) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          if (item.name) return item.name;
          if (item.option) return item.option; // بعض الأنظمة بتبعت option
          if (item.variation) return item.variation;
          return String(item); // آخر حماية
        };

        // Addons
        const addonsHTML = (item.addons || [])
          .map((add) => {
            const name = safeName(add);
            const price = add.price ? ` (${Number(add.price).toFixed(2)})` : "";
            return name ? `<div class="addon-row">+ ${name}${price}</div>` : "";
          })
          .filter(Boolean)
          .join("");

        // Extras
        const extrasHTML = (item.extras || [])
          .map((extra) => {
            const name = safeName(extra);
            return name ? `<div class="addon-row">+ ${name}</div>` : "";
          })
          .filter(Boolean)
          .join("");

        // Excludes
        const excludesHTML = (item.excludes || [])
          .map((exc) => {
            const name = safeName(exc);
            return name
              ? `<div class="addon-row" style="color:#d00;">- ${name}</div>`
              : "";
          })
          .filter(Boolean)
          .join("");

        const getVariationsArray = (v) =>
          Array.isArray(v)
            ? v
            : v && typeof v === "object"
              ? Object.values(v).flat()
              : [];

        const variationsHTML = getVariationsArray(item.variations)
          .flatMap((g) => (g.options ? [`• ${g.options.join(", ")}`] : []))
          .map((text) => `<div style="font-size:10px;margin:2px 0;">${text}</div>`)
          .join("");

        const allModifiers = [addonsHTML, extrasHTML, excludesHTML, variationsHTML]
          .filter(Boolean)
          .join("");

        return `
  <tr>
    <td class="qty-col" style="vertical-align: top;">${item.qty}</td>
    <td class="item-col">
      ${finalName}
      ${item.notes
            ? `<br><span style="font-size:10px;">(${item.notes})</span>`
            : ""
          }
      ${allModifiers ? `<br>${allModifiers}` : ""}
    </td>
  </tr>`;
      })
      .join("")}
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
          body, html { width: 58mm; margin: 0; padding: 5px; font-family: Arial, sans-serif; font-size: 10px; direction: rtl; }
          .center { text-align: center; }
          .line { border-top: 2px dashed black; margin: 5px 0; }
          .bold { font-weight: bold; }
          .item-row { padding: 8px 0; border-bottom: 1px dotted #000; }
        </style>
      </head>
      <body>
          <div class="center bold" style="font-size: 10px;">☕ بار المشروبات</div>
          <div class="line"></div>
          <div class="center">
            <strong># ${receiptData.invoiceNumber}</strong><br>
            ${receiptData.table ? "طاولة: " + receiptData.table : ""}
          </div>
          <div class="line"></div>
          
          ${receiptData.items
      .map((item) => {
        const productName = item.nameAr || item.name_ar || item.name;
        return `
            <div class="item-row">
              <div class="bold" style="font-size: 12px;">${productName}</div>
              <div>العدد: <span class="bold" style="font-size: 12px;">${item.qty
          }</span></div>
              ${item.notes ? `<div>ملاحظة: ${item.notes}</div>` : ""}
            </div>
          `;
      })
      .join("")}
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
      // التعديل هنا: حذف المعامل الثاني لأنه كان يرسل نصاً بدلاً من القائمة
      return formatKitchenReceipt(receiptData);
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

  // 1. تحديد نوع الطلب بشكل صحيح
  // نأخذ القيمة الخام أولاً من الريسبونس أو السيشن
  let rawType =
    response?.type ||
    orderType ||
    response?.kitchen_items?.[0]?.order_type ||
    sessionStorage.getItem("order_type");

  let detectedType = "take_away"; // Default

  if (rawType) {
    const typeStr = rawType.toLowerCase();
    // التحقق من القيم العربية أو الإنجليزية
    if (typeStr.includes("delivery") || typeStr.includes("توصيل")) {
      detectedType = "delivery";
    } else if (typeStr.includes("dine") || typeStr.includes("صالة")) {
      detectedType = "dine_in";
    } else if (typeStr.includes("take") || typeStr.includes("تيك")) {
      detectedType = "take_away";
    }
  } else {
    // إذا لم يوجد نوع طلب صريح، نتحقق من العنوان كحل أخير
    const hasAddress =
      response?.address &&
      (typeof response.address === "string" ||
        Object.keys(response.address).length > 0);

    if (hasAddress) detectedType = "delivery";
  }

  const finalOrderType = detectedType;

  // حساب التوصيل بناءً على النوع النهائي
  let finalTotal = requiredTotal;
  let deliveryFees = 0;

  if (finalOrderType === "delivery") {
    deliveryFees = response?.delivery_fees ? Number(response.delivery_fees) : 0;
    // (Optional logic for recalculating total if needed matches your original code)
    if (
      Math.abs(
        requiredTotal - (amountToPay + deliveryFees - finalDiscountValue)
      ) > 1
    ) {
      finalTotal = requiredTotal + deliveryFees;
    }
  }

  const finalRestaurantName =
    response?.reaturant_name || // الأولوية الأولى: من الـ API
    response?.restaurant_name || // لو كان الاسم مكتوب صح
    sessionStorage.getItem("resturant_name") ||
    sessionStorage.getItem("restaurant_name") ||
    cashierData.branch?.name ||
    "اسم المطعم";

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
    serviceFees: Number(response?.service_fees || response?.service_fee || 0),
    table_number: response?.table_number || sessionStorage.getItem("table_id") || "N/A",
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
      id: item.id || item.product_id, // Important for kitchen mapping
      // === الجديد هنا ===
      addons: item.addons || [],
      extras: item.extras || [], // زي Medium Crab
      excludes: item.excludes || [],
      variations: item.variations || [], // زي الحجم: كبير
      // ====================
    })),
    customer: response?.customer || null,
    address: response?.address || null,
    subtotal: amountToPay,
    deliveryFees: deliveryFees,
    tax: Number(response?.total_tax || totalTax || 0).toFixed(2),
    discount: Number(
      response?.total_discount || finalDiscountValue || 0
    ).toFixed(2),
    total: finalTotal,
    preparationNum:
      response?.preparation_num || response?.preparation_number || null,
    restaurantName: finalRestaurantName,
    restaurantAddress:
      sessionStorage.getItem("restaurant_address") || "العنوان",

    restaurantPhone: sessionStorage.getItem("restaurant_phone") || "",
    receiptFooter: sessionStorage.getItem("receipt_footer") || "شكراً لزيارتكم",
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
    // 2. المطبخ - مع الحفاظ على كل التفاصيل (addons, extras, variations, excludes)
    const kitchens = apiResponse?.kitchen_items || [];
    for (const kitchen of kitchens) {
      if (
        !kitchen.print_name ||
        kitchen.print_status !== 1 ||
        !kitchen.order?.length
      )
        continue;

      const kitchenReceiptData = {
        ...receiptData, // نأخذ كل البيانات الأساسية من الـ receiptData الأصلي
        items: kitchen.order.map((kitchenItem) => {
          // نجيب الصنف الأصلي من الـ success عشان نجيب معاه كل الـ addons والـ variations
          const originalItem = receiptData.items.find(
            (orig) =>
              orig.id == kitchenItem.id || orig.id == kitchenItem.product_id
          );

          return {
            qty: kitchenItem.count || "1",
            name: kitchenItem.name || originalItem?.name || "غير معروف",
            notes: kitchenItem.notes || originalItem?.notes || "",

            // ننقل كل التفاصيل من الصنف الأصلي
            addons: originalItem?.addons || [],
            extras: originalItem?.extras || [],
            excludes: originalItem?.excludes || [],
            variations: originalItem?.variations || [],

            id: kitchenItem.id || kitchenItem.product_id,
          };
        }),
      };

      const kitchenHtml = getReceiptHTML(kitchenReceiptData, {
        design: "kitchen",
        type: "kitchen",
      });

      const config = qz.configs.create(kitchen.print_name);
      printJobs.push(
        qz.print(config, [{ type: "html", format: "plain", data: kitchenHtml }])
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
