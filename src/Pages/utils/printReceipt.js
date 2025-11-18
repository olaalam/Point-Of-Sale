import qz from "qz-tray";
import { toast } from "react-toastify";

// ===================================================================
// 1. HashMap للطابعات والأصناف المخصصة لكل طابعة
// ===================================================================
const PRINTER_CONFIG = {
  // الطابعة الرئيسية للكاشير - تطبع كل الأصناف
  cashier: {
    printerName: "XP-58C",
    type: "cashier",
    printAll: true, // تطبع كل الأصناف
    categories: [], // فاضي لأنها بتطبع كل حاجة
    design: "full" // full receipt design
  },
  
  // طابعة المطبخ الرئيسي
  mainKitchen: {
    printerName: "POS-80C (copy 1)",
    type: "kitchen",
    printAll: false,
    categories: [126], // معرفات الفئات المخصصة لهذا المطبخ
    kitchenId: 5, // معرف المطبخ من الباك اند
    design: "kitchen" // kitchen receipt design
  },
  
//   // طابعة مطبخ السمك (مثال)
//   fishKitchen: {
//     printerName: "Fish-Printer-80",
//     type: "kitchen",
//     printAll: false,
//     categories: [101, 102], // فئات الأسماك والمأكولات البحرية
//     kitchenId: 2,
//     design: "kitchen"
//   },
  
//   // طابعة المشويات (مثال)
//   grillKitchen: {
//     printerName: "Grill-Printer-80",
//     type: "kitchen",
//     printAll: false,
//     categories: [103, 104], // فئات المشويات
//     kitchenId: 3,
//     design: "kitchen"
//   },
  
//   // طابعة الباريستا (مثال)
//   barista: {
//     printerName: "Barista-Printer-58",
//     type: "barista",
//     printAll: false,
//     categories: [110, 111], // فئات المشروبات
//     kitchenId: 4,
//     design: "barista"
//   }
};

// ===================================================================
// 2. دالة تصفية الأصناف حسب المطبخ/الطابعة
// ===================================================================
const filterItemsForPrinter = (orderItems, printerConfig) => {
  if (printerConfig.printAll) {
    return orderItems; // الكاشير يطبع كل الأصناف
  }
  
  // فلترة الأصناف حسب الفئات المخصصة للطابعة
  return orderItems.filter(item => {
    const categoryId = item.product?.category_id || item.category_id;
    return printerConfig.categories.includes(categoryId);
  });
};

// ===================================================================
// 3. دالة تصفية الأصناف حسب معرف المطبخ من الباك اند
// ===================================================================
const filterItemsByKitchenId = (orderDetailsData, kitchenId) => {
  const filteredItems = [];
  
  orderDetailsData.forEach(detail => {
    if (detail.product && Array.isArray(detail.product)) {
      detail.product.forEach(productItem => {
        const product = productItem.product;
        const count = productItem.count;
        const notes = productItem.notes;
        
        // تحقق من أن المنتج ينتمي لهذا المطبخ
        // يمكنك تعديل المنطق حسب بيانات الباك اند
        filteredItems.push({
          name: product.name,
          count: count,
          notes: notes,
          category_id: product.category_id,
          price: product.price
        });
      });
    }
  });
  
  return filteredItems;
};


// ===================================================================
// 4. تصميم إيصال الكاشير الكامل (HTML)
// ===================================================================
const formatCashierReceipt = (receiptData) => {
  // 1. التحقق من إعدادات اللغة
  const isArabic = localStorage.getItem('language') === 'ar';

  // 2. التحقق من نوع الطلب
  const storedOrderType = sessionStorage.getItem('order_type') || receiptData.orderType || '';
  
  // تحديد النصوص بناءً على النوع
  let orderTypeLabel = isArabic ? 'تيك اواي' : 'Takeaway';
  let isDineIn = false;

  if (storedOrderType.toLowerCase() === 'dine_in') {
    orderTypeLabel = isArabic ? 'صالة' : 'Dine In';
    isDineIn = true;
  } else if (storedOrderType.toLowerCase() === 'delivery') {
    orderTypeLabel = isArabic ? 'توصيل' : 'Delivery';
  } else if (storedOrderType.toLowerCase() === 'take_away') {
    orderTypeLabel = isArabic ? 'تيك أواي' : 'Takeaway';
  }

  return `
  <html>
    <head>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { 
          width: 100%;
          max-width: 76mm; 
          margin: 0 auto; 
          padding: 2px;
          font-family: 'Arial', 'Tahoma', sans-serif; 
          font-size: 12px;
          direction: ${isArabic ? 'rtl' : 'ltr'}; /* اتجاه النص حسب اللغة */
          color: #000;
        }
        .header { text-align: center; margin-bottom: 5px; }
        .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .header p { font-size: 10px; margin: 1px 0; }
        
        .info-grid {
          margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #000;
        }
        .info-row {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;
        }
        .info-label { font-size: 11px; font-weight: bold; white-space: nowrap; }
        .info-value { font-weight: bold; font-size: 12px; text-align: ${isArabic ? 'left' : 'right'}; }
        .big-number { font-size: 16px; font-weight: bold; }

        .staff-row {
          display: flex; justify-content: space-between; font-size: 10px; margin: 5px 0; font-weight: bold;
        }

        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 10px; }
        th { background-color: #eee; border: 1px solid #000; padding: 3px 1px; text-align: center; }
        td { border: 1px solid #000; padding: 2px 1px; text-align: center; vertical-align: middle; }
        
        .col-item { text-align: ${isArabic ? 'right' : 'left'}; padding: 0 2px; }

        .totals-section { margin-top: 5px; padding-top: 2px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
        .grand-total { font-size: 16px; font-weight: bold; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
        .footer { text-align: center; margin-top: 10px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${receiptData.restaurantName}</h1>
        <p>${receiptData.restaurantAddress}</p>
        <p>${isArabic ? 'نسخة' : 'Copy'}</p>
      </div>

      <div class="info-grid">
        ${isDineIn ? `
        <div class="info-row">
          <span class="info-label">${isArabic ? 'الطاولة' : 'Table'}</span>
          <span class="info-value big-number">${receiptData.table}</span>
        </div>
        ` : ''}
        
        <div class="info-row">
          <span class="info-label">${isArabic ? 'نوع الطلب' : 'Order Type'}</span>
          <span class="info-value">${orderTypeLabel}</span>
        </div>

        <div class="info-row">
          <span class="info-label">${isArabic ? 'طريقة الدفع' : 'Payment'}</span>
          <span class="info-value">${isArabic ? 'نقدي' : 'Cash'}</span>
        </div>

        <div class="info-row">
          <span class="info-label">${isArabic ? 'التاريخ' : 'Date'}</span>
          <span class="info-value" style="direction: ltr;">${receiptData.date}</span>
        </div>

        <div class="info-row" style="margin-top: 5px;">
          <span class="info-label">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</span>
          <span class="info-value big-number">${receiptData.invoiceNumber}</span>
        </div>
      </div>

      <div class="staff-row">
        <span>${isArabic ? 'الكاشير' : 'Cashier'}: ${receiptData.cashier}</span>
        <span>${receiptData.waiterName ? (isArabic ? 'الويتر: ' : 'Waiter: ') + receiptData.waiterName : ''}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 15%">${isArabic ? 'الكمية' : 'Qty'}</th>
            <th style="width: 45%">${isArabic ? 'الوجبة' : 'Item'}</th>
            <th style="width: 20%">${isArabic ? 'سعر' : 'Price'}</th>
            <th style="width: 20%">${isArabic ? 'الاجمالي' : 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          ${receiptData.items.map(item => {
            // ** منطق اختيار اللغة للمنتج **
            const productName = isArabic 
              ? (item.nameAr || item.name_ar || item.name) 
              : (item.nameEn || item.name_en || item.name);

            return `
            <tr>
              <td><strong>${item.qty}</strong></td>
              <td class="col-item">${productName}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>${item.total.toFixed(2)}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="total-row">
          <span>${isArabic ? 'صافي المبلغ' : 'Subtotal'}</span>
          <span>${receiptData.subtotal.toFixed(2)}</span>
        </div>
        ${receiptData.discount > 0 ? `
        <div class="total-row">
          <span>${isArabic ? 'الخصم' : 'Discount'}</span>
          <span>${receiptData.discount.toFixed(2)}</span>
        </div>` : ''}
        <div class="total-row">
          <span>${isArabic ? 'الضريبة' : 'VAT'}</span>
          <span>${receiptData.tax.toFixed(2)}</span>
        </div>
        <div class="total-row grand-total">
          <span>${isArabic ? 'الإجمالي' : 'Total'}</span>
          <span>${receiptData.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        ${receiptData.receiptFooter || (isArabic ? 'شكراً لزيارتكم' : 'Thank You')}
      </div>
    </body>
  </html>
  `;
};
// ===================================================================
// 5. تصميم إيصال المطبخ (مبسط - بدون أسعار)
// ===================================================================
// productsList: دي الليستا الكاملة للمنتجات اللي فيها (id, name_ar, name_en) اللي انت محملها في التطبيق
const formatKitchenReceipt = (receiptData, productsList = []) => {

  const isArabic = localStorage.getItem('language') === 'ar';
  
  // ... (نفس كود تحديد نوع الطلب والـ Header السابق) ...
  const storedOrderType = sessionStorage.getItem('order_type') || receiptData.orderType || '';
  let orderTypeLabel = isArabic ? 'سفري' : 'Takeaway';
  let displayBigNumber = isArabic ? 'سفري' : 'To Go'; 
  let isDineIn = false;
  let tableNumber = receiptData.table;
  if (tableNumber === 'N/A' || tableNumber === 'null' || tableNumber === null) tableNumber = '';

  if (storedOrderType.toLowerCase() === 'dine_in') {
    orderTypeLabel = isArabic ? 'صالة' : 'Dine In';
    displayBigNumber = tableNumber;
    isDineIn = true;
  } else if (storedOrderType.toLowerCase() === 'delivery') {
    orderTypeLabel = isArabic ? 'توصيل' : 'Delivery';
    displayBigNumber = isArabic ? 'توصيل' : 'Delivery';
  } else if (storedOrderType.toLowerCase() === 'take_away') {
    orderTypeLabel = isArabic ? 'تيك أواي' : 'Takeaway';
    displayBigNumber = isArabic ? 'سفري' : 'Takeaway';
  }
  // ... (نهاية جزء الـ Header) ...

  return `
  <html>
    <head>
      <style>
        /* ... نفس الـ Styles السابقة ... */
        * { box-sizing: border-box; }
        body, html { width: 80mm; margin: 0; padding: 2px; font-family: 'Tahoma', sans-serif; font-size: 14px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
        .header-box { border: 2px solid #000; display: flex; margin-bottom: 10px; }
        .box-left { width: 55%; border-${isArabic ? 'left' : 'right'}: 2px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .box-right { width: 45%; display: flex; flex-direction: column; justify-content: space-between; }
        .row-label { border-bottom: 1px solid #000; padding: 2px; text-align: center; font-weight: bold; height: 33%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .row-label:last-child { border-bottom: none; }
        .big-table-num { font-size: ${isDineIn ? '26px' : '20px'}; font-weight: bold; padding: 5px 0; border-bottom: 1px solid #000; width: 100%; text-align: center; }
        .mid-type { font-size: 16px; font-weight: bold; padding: 2px 0; border-bottom: 1px solid #000; width: 100%; text-align: center; }
        .inv-num { font-size: 18px; font-weight: bold; padding: 2px 0; width: 100%; text-align: center; }
        .hall-title { text-align: center; font-weight: bold; font-size: 18px; margin: 5px 0; text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-top: 5px; }
        th { border: 1px solid #000; background-color: #eee; padding: 5px; font-size: 14px; }
        td { border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 15px; vertical-align: middle; }
        .td-qty { text-align: center; width: 15%; font-size: 18px; }
        .td-name { text-align: ${isArabic ? 'right' : 'left'}; width: 65%; }
        .footer-time { margin-top: 10px; text-align: center; font-size: 12px; }
        .cashier-name { text-align: ${isArabic ? 'left' : 'right'}; font-size: 12px; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div class="box-left">
          <div class="big-table-num">${displayBigNumber}</div>
          <div class="mid-type">${isDineIn ? orderTypeLabel : (receiptData.customerName || orderTypeLabel)}</div>
          <div class="inv-num">${receiptData.invoiceNumber}</div>
        </div>
        <div class="box-right">
          <div class="row-label">${isDineIn ? (isArabic ? 'طاوله' : 'Table') : (isArabic ? 'نوع الطلب' : 'Type')}</div>
          <div class="row-label">${isDineIn ? (isArabic ? 'نوع الطلب' : 'Type') : (isArabic ? 'العميل' : 'Client')}</div>
          <div class="row-label">${isArabic ? 'رقم الفاتورة' : 'Order #'}</div>
        </div>
      </div>

      <div class="hall-title">
        ${orderTypeLabel} ${tableNumber ? '(' + tableNumber + ')' : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>${isArabic ? 'الكمية' : 'Qty'}</th>
            <th>${isArabic ? 'الوجبة' : 'Item'}</th>
          </tr>
        </thead>
        <tbody>
          ${receiptData.items.map(item => {
            // ============================================================
            // الحل السحري هنا: البحث عن المنتج الأصلي باستخدام ID
            // ============================================================
            let finalName = item.name; // الافتراضي (انجليزي من الباك اند)
            
            if (isArabic && productsList.length > 0) {
                // البحث عن المنتج في القائمة الكاملة المحملة في التطبيق
                const originalProduct = productsList.find(p => p.id == item.id);
                if (originalProduct) {
                    // محاولة جلب الاسم العربي من المنتج الأصلي
                    finalName = originalProduct.name_ar || originalProduct.nameAr || originalProduct.ar_name || item.name;
                }
            }
            // ============================================================

            return `
            <tr>
              <td class="td-qty">${item.qty}</td>
              <td class="td-name">
                ${finalName}
                ${item.notes ? '<br><span style="font-size:12px; font-weight:normal; font-style:italic;">** ' + item.notes + ' **</span>' : ''}
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="cashier-name">User: ${receiptData.cashier || 'System'}</div>
      <div class="footer-time">${receiptData.date}</div>
    </body>
  </html>
  `;
};  
// ===================================================================
// 6. تصميم إيصال الباريستا (للمشروبات)
// ===================================================================
const formatBaristaReceipt = (receiptData) => {
  return `
  <html>
    <head>
      <style>
        body, html { 
          width: 58mm; 
          margin: 0; 
          padding: 5px; 
          font-family: Arial, sans-serif; 
          font-size: 13px;
          direction: rtl;
        }
        .center { text-align: center; }
        .ticket { width: 100%; }
        .line { border-top: 1px dashed black; margin: 4px 0; }
        .bold { font-weight: bold; font-size: 15px; }
        .drink { padding: 8px 0; border-bottom: 1px dotted #999; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center bold">☕ بار المشروبات ☕</div>
        <div class="line"></div>
        <div class="center">
          <strong>رقم الطلب: ${receiptData.invoiceNumber}</strong><br>
          ${receiptData.date}
        </div>
        <div class="line"></div>
        
        ${receiptData.items.map(item => {
          // استخدام الاسم العربي إذا توفر
          const productName = item.nameAr || item.name_ar || item.name;
          
          return `
          <div class="drink">
            <strong>${productName}</strong><br>
            الكمية: <strong>${item.qty}</strong>
            ${item.notes ? '<br>ملاحظة: ' + item.notes : ''}
          </div>
        `}).join('')}

        <div class="line"></div>
        <div class="center">الطاولة: <strong>${receiptData.table}</strong></div>
      </div>
    </body>
  </html>
  `;
};
// ===================================================================
// 7. اختيار التصميم حسب نوع الطابعة
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
// 8. تهيئة بيانات الإيصال
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
    orderType: orderType,
    items: orderItems.map(item => ({
      qty: item.count,
      name: item.name,
      price: item.price,
      total: item.price * item.count,
      notes: item.notes || "",
      category_id: item.category_id || item.product?.category_id
    })),
    subtotal: amountToPay,
    discount: finalDiscountValue,
    tax: totalTax,
    total: requiredTotal,
    restaurantName: sessionStorage.getItem("resturant_name") || "اسم المطعم",
    restaurantAddress: sessionStorage.getItem("restaurant_address") || "العنوان",
    restaurantPhone: sessionStorage.getItem("restaurant_phone") || "التليفون",
    receiptFooter: sessionStorage.getItem("receipt_footer") || "شكراً لزيارتكم"
  };
};

// ===================================================================
// 9. الدالة الرئيسية للطباعة (تم تعديلها لجلب الطابعة الافتراضية)
// ===================================================================
export const printReceiptSilently = async (receiptData, apiResponse, callback) => {
  try {
    const isConnected = qz.websocket.isActive();
    if (!isConnected) {
      toast.error("❌ QZ Tray is not connected.");
      callback();
      return;
    }

    const printJobs = [];
    let cashierPrinterName; // <-- متغير عشان نشيل فيه اسم الطابعة

    // --- 1. طباعة إيصال الكاشير (ديناميكي على الطابعة الافتراضية) ---
    try {
      // [!] التعديل الجديد: جلب الطابعة الافتراضية من QZ
      cashierPrinterName = await qz.printers.getDefault();
      
      if (!cashierPrinterName) {
        throw new Error("No default printer found.");
      }

      console.log(`✅ Default cashier printer found: ${cashierPrinterName}`);

      // إعداد تصميم إيصال الكاشير
      const cashierDesignConfig = { design: "full", type: "cashier" };
      const cashierHtml = getReceiptHTML(receiptData, cashierDesignConfig);
      const cashierConfig = qz.configs.create(cashierPrinterName); // <-- استخدام الاسم الديناميكي
      const cashierData = [{ type: "html", format: "plain", data: cashierHtml }];
      
      printJobs.push(
        qz.print(cashierConfig, cashierData).catch(err => {
          console.error(`Error printing to ${cashierPrinterName}:`, err); // <-- استخدام الاسم الديناميكي
          toast.error(`فشل الطباعة على طابعة الكاشير: ${cashierPrinterName}`); // <-- استخدام الاسم الديناميكي
          return null; 
        })
      );

    } catch (err) {
      console.error("Failed to get or print to default printer:", err);
      toast.error(err.message || "فشل تحديد طابعة الكاشير الافتراضية");
      // مش هنوقف، هنكمل طباعة المطبخ عادي
    }

    // --- 2. طباعة إيصالات المطبخ (من الـ response الديناميكي) ---
    const kitchens = apiResponse?.kitchen_items || [];
    
    for (const kitchen of kitchens) {
      const itemsToPrint = kitchen.order || [];
      const printerName = kitchen.print_name;
      
      if (!printerName || kitchen.print_status !== 1 || itemsToPrint.length === 0) {
        console.log(`⏭️ Skipping kitchen: ${kitchen.name} (No items or printer offline/not set)`);
        continue;
      }

      const formattedKitchenItems = itemsToPrint.map(item => ({
        qty: item.count || "1",
        name: item.name,
        price: 0,
        total: 0,
        notes: item.notes || "",
        category_id: item.category_id
      }));

      const kitchenReceiptData = {
        ...receiptData,
        items: formattedKitchenItems
      };

      const kitchenDesignConfig = { 
        design: "kitchen", 
        type: kitchen.name
      };
      const kitchenHtml = getReceiptHTML(kitchenReceiptData, kitchenDesignConfig);
      
      const dataToPrint = [{ type: "html", format: "plain", data: kitchenHtml }];
      const config = qz.configs.create(printerName);

      printJobs.push(
        qz.print(config, dataToPrint).catch(err => {
          console.error(`Error printing to ${printerName}:`, err);
          toast.error(`فشل الطباعة على طابعة المطبخ: ${printerName}`);
          return null; 
        })
      );
    }

    // الانتظار حتى تنتهي كل الطابعات
    await Promise.all(printJobs);

    toast.success("✅ تم إرسال أوامر الطباعة!");
    callback();

  } catch (err) {
    console.error("QZ Tray Printing Error:", err);
    toast.error("❌ فشلت الطباعة: " + (err.message || "تحقق من QZ Tray"));
    callback();
  }
};
// ===================================================================
// 10. دالة إضافة طابعة جديدة ديناميكيًا
// ===================================================================
export const addPrinterConfig = (key, config) => {
  PRINTER_CONFIG[key] = config;
};

// ===================================================================
// 11. دالة الحصول على قائمة الطابعات النشطة
// ===================================================================
export const getActivePrinters = () => {
  return Object.keys(PRINTER_CONFIG);
};

// ===================================================================
// 12. دالة تحديث إعدادات طابعة معينة
// ===================================================================
export const updatePrinterConfig = (key, updates) => {
  if (PRINTER_CONFIG[key]) {
    PRINTER_CONFIG[key] = { ...PRINTER_CONFIG[key], ...updates };
  }
};