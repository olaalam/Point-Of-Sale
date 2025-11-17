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
  return `
  <html>
    <head>
      <style>
        /* [!] الحل 1: لضمان أن البادنج لا يتجاوز عرض الورقة */
        * {
          box-sizing: border-box;
        }
        body, html { 
          width: 80mm; 
          margin: 0; 
          padding: 3px; /* [!] الحل 2: تقليل البادنج الخارجي */
          font-family: Tahoma, sans-serif; 
          font-size: 12px;
          direction: rtl;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .ticket { 
          width: 100%;
          /* [!] الحل 3: السماح للكلمات بالانقسام */
          word-wrap: break-word; 
          overflow-wrap: break-word;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { 
          padding: 2px; /* <-- البادنج القديم */
          /* [!] الحل 3 (مكرر): لضمان انقسام الكلام داخل الخلية */
          word-wrap: break-word; 
          overflow-wrap: break-word;
        }
        .line { border-top: 1px dashed black; margin: 4px 0; }
        .bold { font-weight: bold; }
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
// ===================================================================
// 5. تصميم إيصال المطبخ (مبسط - بدون أسعار)
// ===================================================================
const formatKitchenReceipt = (receiptData, kitchenName) => {
  return `
  <html>
    <head>
      <style>
        /* [!] الحل 1: لضمان أن البادنج لا يتجاوز عرض الورقة */
        * {
          box-sizing: border-box;
        }
        body, html { 
          width: 80mm; 
          margin: 0; 
          padding: 3px; /* [!] الحل 2: تقليل البادنج الخارجي */
          font-family: Tahoma, sans-serif; 
          font-size: 14px;
          direction: rtl;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .ticket { 
          width: 100%;
          /* [!] الحل 3: السماح للكلمات بالانقسام */
          word-wrap: break-word; 
          overflow-wrap: break-word;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { 
          padding: 4px; /* <-- البادنج القديم */
          /* [!] الحل 3 (مكرر): لضمان انقسام الكلام داخل الخلية */
          word-wrap: break-word; 
          overflow-wrap: break-word;
        }
        .line { border-top: 2px solid black; margin: 6px 0; }
        .bold { font-weight: bold; font-size: 16px; }
        .item-row { border-bottom: 1px dashed #ccc; }
        .notes { font-size: 12px; color: #666; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="center bold">
          ${kitchenName || 'المطبخ'}
        </div>
        <div class="line"></div>
        <div class="right">
          <strong>رقم الطلب: ${receiptData.invoiceNumber}</strong><br>
          التاريخ: ${receiptData.date}<br>
          الطاولة: ${receiptData.table}<br>
          النوع: ${receiptData.orderType || 'N/A'}
        </div>
        <div class="line"></div>
        <table>
          <thead>
            <tr>
              <th class="right bold">الصنف</th>
              <th class="center bold">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${receiptData.items.map(item => `
              <tr class="item-row">
                <td class="right">
                  <strong>${item.name}</strong>
                  ${item.notes ? '<br><span class="notes">ملاحظة: ' + item.notes + '</span>' : ''}
                </td>
                <td class="center bold">${item.qty}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="line"></div>
        <div class="center">
          <strong>إجمالي الأصناف: ${receiptData.items.length}</strong>
        </div>
      </div>
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
        ${receiptData.items.map(item => `
          <div class="drink">
            <strong>${item.name}</strong><br>
            الكمية: <strong>${item.qty}</strong>
            ${item.notes ? '<br>ملاحظة: ' + item.notes : ''}
          </div>
        `).join('')}
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