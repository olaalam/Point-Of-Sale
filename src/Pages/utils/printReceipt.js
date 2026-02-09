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
    if (receiptData.table_number && receiptData.table_number !== "N/A") {
      tableLabel = isArabic
        ? `طاولة: ${receiptData.table}`
        : `Table: ${receiptData.table}`;
    }
  } else if (currentOrderType === "delivery") {
    orderTypeLabel = isArabic ? "توصيل" : "DELIVERY";
  } else if (currentOrderType === "take_away") {
    orderTypeLabel = isArabic ? "تيك أواي" : "TAKEAWAY";
  }

  const receiptDesignStr = sessionStorage.getItem("receipt_design") || "{}";
  const receiptDesign = JSON.parse(receiptDesignStr);

  const design = {
    logo: receiptDesign.logo ?? 1,
    name: receiptDesign.name ?? 1,
    address: receiptDesign.address ?? 1,
    branch: receiptDesign.branch ?? 0,
    phone: receiptDesign.phone ?? 1,
    cashier_name: receiptDesign.cashier_name ?? 1, // ✅ تصليح الإملاء (cashier_name)
    footer: receiptDesign.footer ?? 1,
    taxes: receiptDesign.taxes ?? 1,
    services: receiptDesign.services ?? 1,
    preparation_num: receiptDesign.preparation_num ?? 1,
    table_num: receiptDesign.table_num ?? 1,
  };
  const restaurantLogo = sessionStorage.getItem("resturant_logo") || "";

  // ✅ جلب اسم الكاشير الصحيح (من sessionStorage أو من الـ response لو موجود)
  const loggedCashier = JSON.parse(sessionStorage.getItem("user") || "{}");
  const cashierName =
    receiptData.cashierName ||
    loggedCashier.name ||
    loggedCashier.user_name ||
    "Cashier";

  // ✅ حساب الإجمالي الكلي (للـ Grand Total الصحيح)
  const grandTotal = (Number(receiptData.subtotal)).toFixed(2);

  const showCustomerInfo =
    currentOrderType === "delivery" ||
    (receiptData.address && Object.keys(receiptData.address).length > 0);
  const moduleOrderNumber = receiptData.moduleOrderNumber || null;
  const moduleLabel = isArabic ? "رقم طلب الموديول:" : "Module Order No:";
  const moduleLine = moduleOrderNumber
    ? `<div class="table-info" style="font-size: 16px; font-weight: 900; margin: 5px 0;">
       ${moduleLabel} ${moduleOrderNumber}
     </div>`
    : "";
  // 🟢 الإضافة الجديدة: الجملة اللي عاوزاها قبل الـ footer مباشرة
  const poweredByLine = `
    <div style="text-align: center; font-weight: bold; font-size: 14px; margin: 15px 0 10px 0; padding: 8px 0; ">
      Powered by Food2Go - food2go.online
    </div>
  `;

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

        /* Cancelled Branding */
        .cancelled-banner {
            background-color: #d00;
            color: #fff;
            text-align: center;
            font-size: 30px;
            font-weight: 900;
            padding: 10px 0;
            margin: 10px 0;
            transform: scale(1.05);
            border: 4px double #fff;
            outline: 4px solid #d00;
        }

      </style>
    </head>
    <body>
      <div class="container">
        
<div class="header">
  ${design.logo === 1 && restaurantLogo
      ? `<div style="text-align: center; margin-bottom: 8px;">
         <img src="${restaurantLogo}" style="max-width: 120px; max-height: 80px; object-fit: contain;" alt="Logo"/>
       </div>`
      : ""
    }

  ${design.name === 1 ? `<h1>${receiptData.restaurantName}</h1>` : ""}

  ${design.address === 1 && receiptData.restaurantAddress
      ? `<p>${receiptData.restaurantAddress}</p>`
      : ""
    }

  ${design.phone === 1 && receiptData.restaurantPhone
      ? `<div class="phone">${receiptData.restaurantPhone}</div>`
      : ""
    }
</div>

        <div class="order-badge">${orderTypeLabel}</div>
        ${receiptData.isCancelled
      ? `<div class="cancelled-banner">${isArabic ? "ملغي" : "CANCELLED"}</div>`
      : ""
    }
        ${tableLabel ? `<div class="table-info">${tableLabel}</div>` : ""}
${moduleLine}
<table class="meta-grid">
  <tr>
    <td width="50%" style="border-${isArabic ? "left" : "right"
    }: 1px dotted #000; padding: 0 5px;">
      <div class="meta-label">${isArabic ? "رقم الفاتورة" : "ORDER NO"}</div>
      <div class="meta-value" style="font-size: 18px;">#${receiptData.invoiceNumber
    }</div>

      ${receiptData.orderType === "dine_in" &&
      design.preparation_num === 1 &&
      receiptData.preparationNum
      ? `<div style="font-size: 14px; color: #d00; margin-top: 4px;">Prep: ${receiptData.preparationNum}</div>`
      : ""
    }

      ${receiptData.orderType === "dine_in" &&
      design.table_num === 1 &&
      receiptData.table &&
      receiptData.table !== "N/A"
      ? `<div style="font-size: 14px; color: #d00; margin-top: 4px;">Table: ${receiptData.table}</div>`
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

      <!-- ✅ اسم الكاشير -->
      ${design.cashier_name === 1
      ? `<div style="margin-top: 8px; font-size: 12px;">
             <span class="meta-label">${isArabic ? "الكاشير" : "Cashier"
      }:</span>
             <span style="font-weight: bold;">${cashierName}</span>
           </div>`
      : ""
    }
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
                    ${receiptData.address.zone_name
          ? `<div style="font-weight: bold; margin-top: 2px;">المنطقة: ${receiptData.address.zone_name}</div>`
          : ""
        }
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
            ${receiptData.orderNote
      ? `<div class="order-note-box">
                 ${isArabic ? " ملاحظة الطلب:" : " Order Note:"} ${receiptData.orderNote
      }
               </div>`
      : ""
    }

        <div class="section-header">${isArabic ? "الطلبات" : "ITEMS"}</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th width="15%">${isArabic ? "ع" : "Qt"}</th>
                    <th width="55%" style="text-align: ${isArabic ? "right" : "left"
    };">${isArabic ? "الصنف" : "Item"}</th>
                     <th width="25%">${isArabic ? "السعر" : "price"}</th>
                    <th width="25%">${isArabic ? "إجمالي" : "Total"}</th>
                </tr>
            </thead>
<tbody>
  ${receiptData.items
      .map((item) => {
        const productName = isArabic
          ? item.nameAr || item.name_ar || item.name
          : item.nameEn || item.name_en || item.name;

        // ✅ حساب إجمالي الـ addons (لأنها لها total أو price منفصل)
        const addonsTotal = (item.addons || []).reduce((sum, add) => {
          return sum + Number(add.total || add.price || 0);
        }, 0);

        // إجمالي المنتج بعد الـ addons (extras و variations نفترض سعرهم مضاف في item.total بالفعل، لأنهم بدون price منفصل)
        const calculatedTotal = Number(item.total || item.price * item.qty) + addonsTotal;

        // سعر الوحدة بعد الـ addons
        const calculatedUnitPrice = item.qty > 0
          ? (calculatedTotal / Number(item.qty)).toFixed(2)
          : Number(item.price).toFixed(2);

        // === دالة مساعدة لتحويل أي شيء إلى نص آمن ===
        const safeName = (addon) => {
          if (!addon) return "";
          if (typeof addon === "string") return addon;
          if (addon.name) return addon.name;
          if (addon.option) return addon.option;
          if (addon.variation) return addon.variation;
          return String(addon);
        };

        // Addons مع السعر (مثل الـ API)
        const addonsHTML = (item.addons || [])
          .map((add) => {
            const name = safeName(add);
            const price = add.price || add.total
              ? ` (${Number(add.price || add.total).toFixed(2)})`
              : "";
            return name
              ? `<div class="addon-row">+ ${name}${price}</div>`
              : "";
          })
          .filter(Boolean)
          .join("");

        // Extras (بدون سعر منفصل في الـ API → نطبع الاسم فقط)
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

        // Variations (بدون سعر منفصل → نطبع الخيار فقط)
        const variationsHTML = (() => {
          const getVariationsArray = (v) =>
            Array.isArray(v)
              ? v
              : v && typeof v === "object"
                ? Object.values(v).flat()
                : [];

          return getVariationsArray(item.variations)
            .flatMap((group) => {
              if (!group || !group.options) return [];
              const optionText = group.options.join(", ");
              return [`• ${optionText}`];
            })
            .map((text) => `<div class="addon-row">${text}</div>`)
            .join("");
        })();

        const modifiersHTML = [
          addonsHTML,
          extrasHTML,
          excludesHTML,
          variationsHTML,
        ]
          .filter(Boolean)
          .join("");

        const notesHTML = item.notes
          ? `<div style="margin-top: 6px; font-weight: bold; font-size: 13px; color: #d00;">(${item.notes})</div>`
          : "";

        return `
<tr>
  <td class="item-qty">${item.qty}</td>
  <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">
    ${productName}
    ${modifiersHTML ? `<div style="margin-top:4px;">${modifiersHTML}</div>` : ""}
    ${notesHTML}
  </td>
  <!-- ✅ السعر الآن شامل الـ addons (و extras/variations مضافين أصلاً في price المنتج) -->
  <td class="item-total">${calculatedUnitPrice}</td>
  <!-- ✅ الإجمالي شامل الـ addons -->
  <td class="item-total">${calculatedTotal.toFixed(2)}</td>
</tr>
`;
      })
      .join("")}
</tbody>
        </table>

<div style="border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; font-size: 13px;">


  <!-- Discount -->
  ${Number(receiptData.discount) > 0
      ? `<div class="totals-row" style="color: #d00;">
         <span>${isArabic ? "الخصم" : "Discount"}</span>
         <span>-${receiptData.discount}</span>
       </div>`
      : ""
    }

  <!-- Tax -->
  ${Number(receiptData.tax) > 0 && design.taxes === 1
      ? `<div class="totals-row">
         <span>${isArabic ? "الضريبة (VAT)" : "Tax (VAT)"}</span>
         <span>${receiptData.tax}</span>
       </div>`
      : ""
    }

  <!-- Delivery Fees -->
  ${receiptData.deliveryFees > 0
      ? `<div class="totals-row">
         <span>${isArabic ? "رسوم التوصيل" : "Delivery Fee"}</span>
         <span>${receiptData.deliveryFees.toFixed(2)}</span>
       </div>`
      : ""
    }

  <!-- Service Fees -->
  ${Number(receiptData.serviceFees) > 0 && design.services === 1
      ? `
       <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px;">
    <span>${receiptData?.serviceTitle}:</span>
    <span>${Number(receiptData.serviceFees).toFixed(2)}</span>
  </div>`
      : ""
    }

  <!-- Grand Total (الإجمالي النهائي الصحيح) -->
  <div class="grand-total">
    <span style="font-size: 18px;">${isArabic ? "الإجمالي الكلي" : "GRAND TOTAL"
    }</span>
    <span style="font-size: 24px;">${grandTotal}</span>
  </div>

  <!-- ✅ طرق الدفع (Financials) -->
  ${receiptData.financials && receiptData.financials.length > 0
      ? `
  <div class="section-header" style="margin-top: 12px;">${isArabic ? "طرق الدفع" : "Payment Methods"
      }</div>
  ${receiptData.financials
        .map(
          (f) => `
  <div class="totals-row">
    <span>${f.name}</span>
    <span>${Number(f.amount).toFixed(2)}</span>
  </div>
  `
        )
        .join("")}
  `
      : ""
    }
</div>
${poweredByLine}
<div style="text-align: center; margin-top: 15px; font-size: 11px;">
  <p style="margin: 5px 0 0 0;">*** شكراً لزيارتكم ***</p>
</div>

      </div>
    </body>
  </html>
  `;
};
// ===================================================================
// 10. تصميم إيصال بسيط لنسخة العميل (Take Away فقط)
// ===================================================================
// ===================================================================
// 10. تصميم إيصال بسيط لنسخة العميل (Take Away فقط) - مشابه لديزاين المطبخ
// ===================================================================
const formatSimpleCustomerCopy = (receiptData) => {
  const isArabic = localStorage.getItem("language") === "ar";
  const restaurantLogo = sessionStorage.getItem("resturant_logo") || "";

  const receiptDesignStr = sessionStorage.getItem("receipt_design") || "{}";
  const receiptDesign = JSON.parse(receiptDesignStr);

  // نستخدم نفس المنطق لتحديد النص الكبير زي الكيتشن (لكن هنا Take Away دائمًا)
  const displayBigNumber = isArabic ? "تيك أواي" : "Takeaway";

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        body, html { 
          width: 100%; 
          margin: 0; 
          padding: 10px 5px; 
          font-family: 'Tahoma', sans-serif; 
          direction: ${isArabic ? "rtl" : "ltr"}; 
          font-size: 14px;
        }

        /* اللوجو في الأعلى (إذا مفعّل) */
        .logo-top {
          text-align: center;
          margin-bottom: 15px;
        }
        .logo-top img {
          max-width: 140px;
          max-height: 90px;
          object-fit: contain;
        }

        /* نفس الهيدر المستخدم في الكيتشن */
        .header-box { 
          border: 3px solid #000; 
          display: flex; 
          margin-bottom: 20px; 
          min-height: 120px;
        }
        .box-left { 
          width: 45%; 
          border-${isArabic ? "left" : "right"}: 3px solid #000; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          padding: 5px; 
        }
        .box-right { 
          width:55%; 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
        }
        .row-label { 
          border-bottom: 1px solid #000; 
          padding: 8px; 
          text-align: center; 
          font-weight: bold; 
          flex-grow: 1; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 16px; 
        }
        .row-label:last-child { border-bottom: none; }

        /* رقم الأوردر كبير جدًا في المنتصف (بدلاً من الرقم الصغير في الكيتشن) */
        .big-order-number { 
          font-size: 48px; 
          font-weight: 900; 
          line-height: 1; 
          margin-bottom: 10px; 
          color: #000;
        }

        /* نوع الطلب الكبير (Take Away) */
        .big-type { 
          font-size: 28px; 
          font-weight: 900; 
          line-height: 1; 
        }

        /* نص نسخة العميل */
        .customer-copy-label {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 30px 0 20px;
          padding: 10px;
          border: 2px dashed #000;
        }

        /* شكرًا في الأسفل */
        .thank-you {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <!-- اللوجو في الأعلى إذا موجود ومفعّل -->
      ${receiptDesign.logo === 1 && restaurantLogo
      ? `<div class="logo-top">
             <img src="${restaurantLogo}" alt="Logo"/>
           </div>`
      : ""
    }

      <!-- الهيدر نفس ديزاين الكيتشن -->
      <div class="header-box">
        <div class="box-left">
         <div class="row-label">${isArabic ? "رقم الفاتورة" : "Order #"} ${receiptData.invoiceNumber
    }</div>
        </div>
        <div class="box-right">
                   <div class="big-type">${displayBigNumber}</div>

          <div class="row-label">${receiptData.timeFormatted}<br>${receiptData.dateFormatted
    }</div>
        </div>
      </div>



      <!-- شكرًا في الأسفل -->
      <div class="thank-you">
        *** ${isArabic ? "شكراً لزيارتكم" : "Thank you for your visit"} ***
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
  const poweredByLine = `
    <div style="text-align: center; font-weight: bold; font-size: 14px; margin: 15px 0 10px 0; padding: 8px 0; ">
      Powered by Food2Go - food2go.online
    </div>
  `;
  // ✅ إجمالي الأصناف (orderCount) لو موجود في الـ receiptData
  const totalItems = receiptData.orderCount || 0;

  return `
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body, html { width: 100%; margin: 0; padding: 0; font-family: 'Tahoma', sans-serif; direction: ${isArabic ? "rtl" : "ltr"
    }; }
          .header-box { border: 3px solid #000; display: flex; margin-bottom: 10px; min-height: 140px; }
          .cancelled-banner {
            background-color: #d00;
            color: #fff;
            text-align: center;
            font-size: 32px;
            font-weight: 900;
            padding: 10px 0;
            margin-bottom: 10px;
            border: 4px double #fff;
            outline: 4px solid #d00;
          }
          .box-left { width: 60%; border-${isArabic ? "left" : "right"
    }: 3px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; }
          .box-right { width: 40%; display: flex; flex-direction: column; justify-content: space-between; }
          .row-label { 
            border-bottom: 1px solid #000; 
            padding: 8px; 
            text-align: center; 
            font-weight: bold; 
            flex-grow: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px; 
          }
          .row-label:last-child { border-bottom: none; }
          
          .big-number { font-size: ${isDineIn ? "40px" : "24px"
    }; font-weight: 900; line-height: 1; margin-bottom: 5px; }
          
          .title-strip { color: black; text-align: center; font-weight: bold; font-size: 12px; padding: 2px 0; margin-bottom: 5px; }
          
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th { border: 2px solid #000; background: #ddd; padding: 5px; font-size: 10px; }
          td { border: 2px solid #000; padding: 5px; font-weight: bold; font-size: 12px; vertical-align: middle; }
          .qty-col { width: 15%; text-align: center; font-size: 12px; }
          .item-col { text-align: ${isArabic ? "right" : "left"}; }
          
          .footer-info { display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px; font-weight: bold; }
          .order-note-box { 
            border: 2px solid #d00; 
            background: #ffe6e6; 
            padding: 8px; 
            margin: 10px 0; 
            text-align: center; 
            font-weight: bold; 
            font-size: 14px;
            color: #d00;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="box-left">
            <div class="big-number">${displayBigNumber}</div>
          </div>
          <div class="box-right">
            <div class="row-label">${isArabic ? "رقم الفاتورة" : "Order #"} ${receiptData.invoiceNumber
    }</div>
            <div class="row-label">${receiptData.timeFormatted}<br>${receiptData.dateFormatted}</div>
            <!-- ✅ إضافة إجمالي الأصناف -->
            <div class="row-label">${isArabic ? "إجمالي الأصناف" : "Total Items"}: ${totalItems}</div>
          </div>
        </div>
        ${receiptData.isCancelled
      ? `<div class="cancelled-banner">${isArabic ? "ملغي" : "CANCELLED"}</div>`
      : ""
    }
  
        ${receiptData.orderNote
      ? `<div class="order-note-box">
                 ${isArabic ? " ملاحظة الطلب:" : " Order Note:"} ${receiptData.orderNote
      }
               </div>`
      : ""
    }
  
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

        const safeName = (item) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          if (item.name) return item.name;
          if (item.option) return item.option;
          if (item.variation) return item.variation;
          return String(item);
        };

        const addonsHTML = (item.addons || [])
          .map((add) => {
            const name = safeName(add);
            const price = add.price ? ` (${Number(add.price).toFixed(2)})` : "";
            return name ? `<div class="addon-row">+ ${name}${price}</div>` : "";
          })
          .filter(Boolean)
          .join("");

        const extrasHTML = (item.extras || [])
          .map((extra) => {
            const name = safeName(extra);
            return name ? `<div class="addon-row">+ ${name}</div>` : "";
          })
          .filter(Boolean)
          .join("");

        const excludesHTML = (item.excludes || [])
          .map((exc) => {
            const name = safeName(exc);
            return name
              ? `<div class="addon-row" style="color:#d00;">- ${name}</div>`
              : "";
          })
          .filter(Boolean)
          .join("");



        // في دالة formatKitchenReceipt، استبدل كل الـ variationsHTML block بالكود ده بالكامل:

        const variationsHTML = (item.variations || item.variation_selected || [])
          .map((group) => {
            // لو مفيش group أو name، نتخطاه
            if (!group || !group.name) return "";

            // نستخرج أسماء الـ options الداخلية فقط (اللي هي الاختيارات الفعلية)
            const optionsText = (group.options || [])
              .map((opt) => opt.name || opt.option || String(opt)) // نأخذ الـ name أولاً
              .filter(Boolean) // نتخلص من أي فارغ
              .join(", ");

            // لو مفيش options مختارة، نتخطاه
            if (!optionsText) return "";

            // نرجع النص النهائي: اسم الـ group + الـ options
            return `• ${group.name}: ${optionsText}`;
          })
          .filter(Boolean) // نتخلص من أي فارغ
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
        ${poweredByLine}
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
    response && response.success && Array.isArray(response.success)
      ? response.success
      : response && response.products && Array.isArray(response.products)
        ? response.products
        : Array.isArray(orderItems)
          ? orderItems
          : [];

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
    serviceTitle: response?.service_fees_title,
    table_number:
      response?.table_number || sessionStorage.getItem("table_number") || "N/A",
    dateFormatted: dateFormatted,
    timeFormatted: timeFormatted,
    table: sessionStorage.getItem("table_number") || "N/A",
    orderType: finalOrderType,
    financials: response?.financials || [],
    orderNote: response?.order_note || "", // ✅ إضافة ملاحظة الأوردر على مستوى الـ receiptData
    items: itemsSource.map((item) => ({
      qty: item.count,
      name: item.name,
      nameAr: item.name_ar || item.nameAr,
      nameEn: item.name_en || item.nameEn,
      price: Number(item.price || item.final_price || 0),
      total: Number(item.total || (Number(item.price || item.final_price || 0) * Number(item.count || item.qty || 1))),
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
    address: response?.address ? {
      ...response.address,
      zone_name: response.address.zone?.zone || "" // سحب اسم المنطقة من object الـ zone
    } : null,
    subtotal: response?.subtotal || amountToPay,
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
    moduleOrderNumber: sessionStorage.getItem("module_order_number") || null,
    restaurantPhone: sessionStorage.getItem("restaurant_phone") || "",
    receiptFooter: "شكراً لزيارتكم",
    isCancelled: !!response?.isCancelled,
  };
};

// ===================================================================
// 9. دالة طباعة المطبخ فقط (Case 2: Prepare & Pending)
// ===================================================================
export const printKitchenOnly = async (receiptData, apiResponse, callback) => {
  try {
    if (!qz.websocket.isActive()) {
      toast.error("❌ QZ Tray is not connected.");
      if (callback) callback();
      return;
    }

    const printJobs = [];
    const kitchens = apiResponse?.kitchen_items || [];

    for (const kitchen of kitchens) {
      if (
        !kitchen.print_name ||
        kitchen.print_status !== 1 ||
        !kitchen.order?.length
      )
        continue;

      // === التجميع حسب id + notes + selected variation options + addons + extras + excludes ===
      const grouped = new Map();

      const getModifierKey = (item) => {
        const stringifySimple = (arr) => {
          if (!Array.isArray(arr)) return "";
          return arr
            .map((o) => o.id || o.name || o.option || o.variation || String(o))
            .filter(Boolean)
            .sort()
            .join(",");
        };

        const addons = stringifySimple(item.addons_selected || item.addons || []);
        const extras = stringifySimple(item.extras || []);
        const excludes = stringifySimple(item.excludes || []);

        const variationOptions = (item.variation_selected || item.variations || [])
          .flatMap((group) => {
            if (!group || !Array.isArray(group.options)) return [];
            return group.options.map((opt) => opt.id || opt.name || "");
          })
          .filter(Boolean)
          .sort()
          .join(",");

        return `${variationOptions}|${addons}|${extras}|${excludes}`;
      };

      kitchen.order.forEach((item) => {
        const modifierKey = getModifierKey(item);
        const baseKey = `${item.id || item.product_id || "unknown"}|${item.notes || "no-notes"}`;
        const fullKey = `${baseKey}|${modifierKey}`;

        if (!grouped.has(fullKey)) {
          grouped.set(fullKey, {
            ...item,
            qty: 0,
          });
        }

        const entry = grouped.get(fullKey);
        entry.qty += Number(item.count || item.qty || 1);
      });

      const kitchenItems = Array.from(grouped.values()).map((group) => {
        const original = receiptData.items.find(
          (o) => o.id == group.id || o.id == group.product_id
        );

        return {
          qty: group.qty,
          name: group.name || original?.name || "غير معروف",
          notes: group.notes || original?.notes || "",
          addons: group.addons_selected || original?.addons || [],
          extras: group.extras || original?.extras || [],
          excludes: group.excludes || original?.excludes || [],
          variations: group.variation_selected || original?.variations || [],
          id: group.id || group.product_id,
        };
      });

      const kitchenReceiptData = {
        ...receiptData,
        items: kitchenItems,
        orderCount: kitchen.order_count ?? kitchenItems.reduce((sum, item) => sum + item.qty, 0),
        orderNote: apiResponse?.order_note || receiptData.orderNote || "",
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

    if (printJobs.length > 0) {
      await Promise.all(printJobs);
      toast.success("✅ تم طباعة إيصالات المطبخ");
    }

    if (callback) callback();
  } catch (err) {
    console.error("❌ Kitchen Print Error:", err);
    toast.error("❌ فشل طباعة المطبخ");
    if (callback) callback();
  }
};

// ===================================================================
// 10. دالة الطباعة الرئيسية
// ===================================================================
export const printReceiptSilently = async (
  receiptData,
  apiResponse,
  callback,
  options = {}
) => {
  const { shouldSkipKitchenPrint = false } = options;
  try {
    if (!qz.websocket.isActive()) {
      toast.error("❌ QZ Tray is not connected. Please make sure QZ Tray is running.");
      return;
    }

    const printJobs = [];

    // 1. الكاشير
    // 1. الكاشير - الإيصال الكامل
    try {
      const cashierPrinterName = await qz.printers.getDefault();
      if (!cashierPrinterName) throw new Error("No default printer found.");

      const cashierHtml = getReceiptHTML(receiptData, {
        design: "full",
        type: "cashier",
      });
      const cashierConfig = qz.configs.create(cashierPrinterName);

      // طباعة إيصال الكاشير الأساسي (دائمًا مرة واحدة على الأقل)
      printJobs.push(
        qz.print(cashierConfig, [
          { type: "html", format: "plain", data: cashierHtml },
        ])
      );

      // ==== الجديد: طباعة إضافية حسب نوع الطلب ====
      const orderType = receiptData.orderType?.toLowerCase();

      if (orderType === "delivery") {
        // Delivery → طباعة إيصال الكاشير مرة ثانية
        printJobs.push(
          qz.print(cashierConfig, [
            { type: "html", format: "plain", data: cashierHtml },
          ])
        );
      } else if (orderType === "take_away" || orderType === "takeaway") {
        const shouldPrintDouble = localStorage.getItem("print_double_takeaway") === "true";
        // Take Away → طباعة إيصال بسيط (نسخة العميل)
        if (shouldPrintDouble) {
          const simpleHtml = formatSimpleCustomerCopy(receiptData);
          printJobs.push(
            qz.print(cashierConfig, [
              { type: "html", format: "plain", data: simpleHtml },
            ])
          );
        }
      }
      // Dine In أو غيره → لا طباعة إضافية
    } catch (err) {
      console.error(err);
      toast.error("خطأ في طابعة الكاشير");
    }

    // 2. المطبخ - مع الحفاظ على كل التفاصيل (addons, extras, variations, excludes)
    // Skip kitchen printing if already printed (Case 2: Prepare & Pending)
    if (!shouldSkipKitchenPrint) {
      const kitchens = apiResponse?.kitchen_items || [];
      for (const kitchen of kitchens) {
        if (
          !kitchen.print_name ||
          kitchen.print_status !== 1 ||
          !kitchen.order?.length
        )
          continue;

        console.log("Kitchen:", kitchen.name);
        console.log("Raw kitchen.order:", kitchen.order);

        // === التجميع حسب id + notes + selected variation options + addons + extras + excludes ===
        const grouped = new Map();

        const getModifierKey = (item) => {
          // دالة بسيطة لـ addons/extras/excludes (arrays بسيطة أو objects)
          const stringifySimple = (arr) => {
            if (!Array.isArray(arr)) return "";
            return arr
              .map((o) => o.id || o.name || o.option || o.variation || String(o))
              .filter(Boolean)
              .sort()
              .join(",");
          };

          const addons = stringifySimple(item.addons_selected || item.addons || []);
          const extras = stringifySimple(item.extras || []);
          const excludes = stringifySimple(item.excludes || []);

          // المهم هنا: نستخرج الـ selected options الداخلية فقط (اللي بتميز الvariation)
          const variationOptions = (item.variation_selected || item.variations || [])
            .flatMap((group) => {
              if (!group || !Array.isArray(group.options)) return [];
              return group.options.map((opt) => opt.id || opt.name || "");
            })
            .filter(Boolean)
            .sort()
            .join(",");

          return `${variationOptions}|${addons}|${extras}|${excludes}`;
        };

        kitchen.order.forEach((item) => {
          const modifierKey = getModifierKey(item);
          const baseKey = `${item.id || item.product_id || "unknown"}|${item.notes || "no-notes"}`;
          const fullKey = `${baseKey}|${modifierKey}`;

          if (!grouped.has(fullKey)) {
            grouped.set(fullKey, {
              ...item,       // نحتفظ بكل الdata الأصلية (بما فيها variation_selected كامل)
              qty: 0,
            });
          }

          const entry = grouped.get(fullKey);
          entry.qty += Number(item.count || item.qty || 1);  // أضفنا item.qty كـ fallback
        });

        const kitchenItems = Array.from(grouped.values()).map((group) => {
          const original = receiptData.items.find(
            (o) => o.id == group.id || o.id == group.product_id
          );

          return {
            qty: group.qty,
            name: group.name || original?.name || "غير معروف",
            notes: group.notes || original?.notes || "",
            addons: group.addons_selected || original?.addons || [],
            extras: group.extras || original?.extras || [],
            excludes: group.excludes || original?.excludes || [],
            variations: group.variation_selected || original?.variations || [],
            id: group.id || group.product_id,
          };
        });

        const kitchenReceiptData = {
          ...receiptData,
          items: kitchenItems,
          orderCount: kitchen.order_count ?? kitchenItems.reduce((sum, item) => sum + item.qty, 0),
          orderNote: apiResponse?.order_note || receiptData.orderNote || "", // ✅ إضافة order_note
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
