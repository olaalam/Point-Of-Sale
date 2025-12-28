// utils/processProductItem.js

/**
 * معالجة عنصر واحد من السلة وتحويله للشكل اللي الـ Backend بيفهمه
 */
export const processProductItem = (item) => {
  // 1. Variations - الهيكل الصحيح
  const variations =
    item.variations?.map((group) => ({
      variation_id: group.id.toString(),
      option_id: Array.isArray(group.selected_option_id)
        ? group.selected_option_id.map(id => id.toString())
        : group.selected_option_id
        ? [group.selected_option_id.toString()]
        : [],
    })).filter(v => v.option_id.length > 0) || [];

  // 2. Addons - مع الـ price المطلوب
  const addons = [];
  if (item.addons && Array.isArray(item.addons)) {
    item.addons.forEach((addon) => {
      if (addon.addon_id && addon.quantity > 0) {
        let addonPrice = 0;
        const sourceAddon = (item.addons_list || []).find(a => a.id === addon.addon_id);
        if (sourceAddon) {
          addonPrice = parseFloat(
            sourceAddon.price_after_discount || 
            sourceAddon.price_after_tax || 
            sourceAddon.price || 
            0
          );
        }
        addons.push({
          addon_id: addon.addon_id.toString(),
          count: addon.quantity.toString(),
          price: addonPrice.toFixed(2),
        });
      }
    });
  }
  
  const extra_id = (item.selectedExtras || [])
    .filter(id => (item.allExtras || []).some(e => e.id === id))
    .map(id => id.toString());

  const exclude_id = (item.selectedExcludes || [])
    .map(id => id.toString())
    .filter(Boolean);

  const note = item.notes?.trim() || "No notes";

  // --- التعديل هنا لضبط الوزن ---
  // نتحقق أولاً هل المنتج يباع بالوزن (weight_status === 1)
  // إذا كان بالوزن نأخذ quantity (التي تقبل كسور مثل 1.5)
  // إذا لم يكن بالوزن نأخذ count العادي
  const finalCount = item.weight_status === 1 || item.weight_status === "1"
    ? (item.quantity || item.count || 1)
    : (item.count || 1);

  return {
    product_id: item.id.toString(),
    count: finalCount.toString(), // سيتم إرسال "1.5" بدلاً من "1"
    note,
    price: parseFloat(item.price || 0).toFixed(2),
    variation: variations,
    addons,
    extra_id,
    exclude_id,
  };
};
/**
 * بناء الـ financials payload - مظبوطة للفيزا والباقي
 */
export const buildFinancialsPayload = (paymentSplits, financialAccounts = []) => {
  return paymentSplits.map((split) => {
    const account = financialAccounts.find(a => a.id === split.accountId);
    const isVisa = account?.name?.toLowerCase().includes("visa");

    const payload = {
      id: split.accountId.toString(),
      amount: parseFloat(split.amount || 0).toFixed(2),
    };

    // آخر 4 أرقام (للفيزا أو أي حساب مفعل description_status)
    if (split.checkout?.trim()) {
      payload.description = split.checkout.trim();
    }

    // رقم العملية (Transaction ID / Approval Code)
    if (split.transition_id?.trim()) {
      payload.transition_id = split.transition_id.trim();
    }

    return payload;
  });
};

/**
 * تحديد الـ Endpoint الصحيح
 */
export const getOrderEndpoint = (orderType, orderItems, totalDineInItems, hasDealItems) => {
  if (hasDealItems) return "cashier/deal/add";

  if (orderType === "dine_in") {
    return orderItems.length < totalDineInItems
      ? "cashier/dine_in_split_payment"
      : "cashier/dine_in_payment";
  }

  if (orderType === "delivery") return "cashier/delivery_order";
  return "cashier/take_away_order";
};


/**
 * بناء الـ Payload الأساسي - مظبوط 100% بدون أخطاء
 */
export const buildOrderPayload = ({
  orderType,
  orderItems,
  amountToPay,
  totalTax,
  totalDiscount,
  notes,
  source,
  financialsPayload,
  cashierId,
  tableId,
  customerPaid,
  due = 0,
  user_id,
  discount_id,
  module_id,
  free_discount,
  service_fees,
  due_module,
  password, // ← جديد: الباسوورد بتاع الـ free_discount
}) => {
  const basePayload = {
    amount: parseFloat(amountToPay).toFixed(2),
    total_tax: parseFloat(totalTax || 0).toFixed(2),
    total_discount: parseFloat(totalDiscount || 0).toFixed(2),
    notes: notes?.trim() || "No notes",
    source,
    financials: financialsPayload,
    cashier_id: cashierId.toString(),
    due: due.toString(),
    order_pending: "0",
  };

  if (service_fees !== undefined && service_fees !== null) {
    basePayload.service_fees = parseFloat(service_fees).toFixed(2);
  }

  // Due Module (المنصة تدفع الباقي)
  if (due_module > 0) {
    basePayload.due_module = parseFloat(due_module).toFixed(2);
  }

  // خصم من القائمة
  if (discount_id) basePayload.discount_id = discount_id.toString();

  // Module ID (للـ Due Module)
  if (module_id && module_id !== "all") {
    basePayload.module_id = module_id.toString();
  }

  // Free Discount + Password
  if (free_discount && free_discount > 0) {
    basePayload.free_discount = free_discount.toString();
    
    // الباسوورد يتبعت فقط لو فيه free_discount
    if (password && password.trim()) {
      basePayload.password = password.trim(); // المفتاح اللي عايزاه بالظبط
    }
  }

  // طلب آجل عادي (مش Due Module)
  if (due === 1 && user_id) {
    basePayload.user_id = user_id.toString();
  }

  const products = orderItems.map(processProductItem);

  // Dine In
  if (orderType === "dine_in") {
    return {
      ...basePayload,
      table_id: tableId.toString(),
      products,
      cart_id: orderItems.map(i => i.cart_id || i.temp_id).filter(Boolean),
    };
  }

  // Delivery
  if (orderType === "delivery") {
    return {
      ...basePayload,
      products,
      address_id: sessionStorage.getItem("selected_address_id") || "",
      user_id: sessionStorage.getItem("selected_user_id") || "",
      cash_with_delivery: customerPaid ? parseFloat(customerPaid).toFixed(2) : "0",
    };
  }

  // Take Away / Pickup
  return {
    ...basePayload,
    products,
  };
};
/**
 * Deal Payload
 */
export const buildDealPayload = (orderItems, financialsPayload) => {
  const deal = orderItems.find(i => i.is_deal);
  return {
    deal_id: deal.deal_id.toString(),
    user_id: deal.deal_user_id?.toString() || "",
    financials: financialsPayload,
  };
};

/**
 * التحقق من الدفع
 */
export const validatePaymentSplits = (paymentSplits, getDescriptionStatus) => {
  let total = 0;

  for (const split of paymentSplits) {
    const amount = parseFloat(split.amount || 0);
    if (amount <= 0) {
      return { valid: false, error: "Please enter a valid amount" };
    }
    total += amount;

    if (getDescriptionStatus(split.accountId)) {
      if (!split.checkout || split.checkout.length !== 4 || !/^\d{4}$/.test(split.checkout)) {
        return { valid: false, error: "Please enter last 4 digits" };
      }
    }
  }

  return { valid: true, totalPaid: total };
};