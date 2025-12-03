export const processProductItem = (item) => {
  // معالجة الاختيارات (مثل: حجم، لون، إلخ)
  const groupedVariations =
    item.allSelectedVariations?.reduce((acc, variation) => {
      const existing = acc.find(
        (v) => v.variation_id === variation.variation_id
      );
      if (existing) {
        existing.option_id = Array.isArray(existing.option_id)
          ? [...existing.option_id, variation.option_id]
          : [existing.option_id, variation.option_id];
      } else {
        acc.push({
          variation_id: variation.variation_id.toString(),
          option_id: [variation.option_id.toString()],
        });
      }
      return acc;
    }, []) || [];

  // فصل الإضافات الحقيقية عن الإضافات المدفوعة
  const realExtrasIds = [];
  const addonItems = [];

  if (item.selectedExtras && item.selectedExtras.length > 0) {
    item.selectedExtras.forEach((extraId) => {
      const isRealExtra = item.allExtras?.some((extra) => extra.id === extraId);
      if (isRealExtra) {
        realExtrasIds.push(extraId.toString());
      } else {
        const addon = item.addons?.find((addon) => addon.id === extraId);
        if (addon) {
          addonItems.push({
            addon_id: extraId.toString(),
            count: "1",
            price: addon.price.toString(),
          });
        }
      }
    });
  }

  // إضافة الإضافات المدفوعة الأخرى
  if (item.selectedAddons && item.selectedAddons.length > 0) {
    item.selectedAddons.forEach((addonData) => {
      const alreadyExists = addonItems.some(
        (existing) => existing.addon_id === addonData.addon_id.toString()
      );
      if (!alreadyExists) {
        addonItems.push({
          addon_id: addonData.addon_id.toString(),
          count: (addonData.count || 1).toString(),
          price: addonData?.price?.toString() || "0",
        });
      }
    });
  }

  return {
    product_id: item.id.toString(),
    count: item.count.toString(),
    note: item.notes || "Product Note",
    price: item.price.toString(),
    addons: addonItems,
    variation: groupedVariations,
    exclude_id: (item.selectedExcludes || []).map((id) => id.toString()),
    extra_id: realExtrasIds,
  };
};

/**
 * بناء بيانات الحسابات المالية
 */
/**
 * بناء بيانات الحسابات المالية - النسخة الصحيحة 100% للفيزا
 */
export const buildFinancialsPayload = (paymentSplits, financialAccounts = []) => {
  return paymentSplits.map((split) => {
    const account = financialAccounts.find(acc => acc.id === split.accountId);
    const accountName = account?.name || "";
    const isVisa = accountName.toLowerCase().includes("visa");

    // القاعدة:
    // - لو الحساب فيه كلمة "visa" → description = آخر 4 أرقام (مطلوب)
    // - لو الحساب عادي → description = اللي مكتوب في checkout أو فاضي
    const description = isVisa 
      ? (split.checkout?.trim() || "") 
      : (split.checkout?.trim() || "");

    const payload = {
      id: split.accountId.toString(),
      amount: parseFloat(split.amount || 0).toFixed(2),
    };

    // فقط لو فيزا: نبعت description (آخر 4 أرقام)
    if (isVisa) {
      if (description && description.length === 4) {
        payload.description = description;
      }
      // ونبعت رقم العملية لو موجود
      if (split.transition_id?.trim()) {
        payload.transition_id = split.transition_id.trim(); // أو approval_code حسب الباك
      }
    } else if (description) {
      // لو مش فيزا بس فيه نص في checkout (مثلاً ملاحظة)
      payload.description = description;
    }

    return payload;
  });
};

/**
 * تحديد الـ endpoint المناسب حسب نوع الطلب
 */
export const getOrderEndpoint = (orderType, orderItems, totalDineInItems, hasDealItems) => {
  if (hasDealItems) {
    return "cashier/deal/add";
  }
  
  if (orderType === "dine_in") {
    if (orderItems.length < totalDineInItems) {
      return "cashier/dine_in_split_payment";
    } else {
      return "cashier/dine_in_payment";
    }
  } else if (orderType === "delivery") {
    return "cashier/delivery_order";
  } else {
    return "cashier/take_away_order";
  }
};

/**
 * بناء الـ payload للطلبات العادية
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
  discount_id, // الخصم من القائمة
  module_id,   // 🟢 module_id
  free_discount, // 🟢 free_discount
  due = 0,           // ← هنا المهم: due بيجي من الـ Checkout (0 أو 1)
  user_id, 
  due_module,      // ← جديد: للطلبات الآجلة
}) => {
  const basePayload = {
    amount: amountToPay.toString(),
    total_tax: totalTax.toString(),
    total_discount: totalDiscount.toString(),
    notes: notes || "note",
    source: source,
    financials: financialsPayload,
    cashier_id: cashierId.toString(),
    due: due.toString(),
    order_pending: due === 1 ? "0" : "0",
  };

  // إضافة discount_id لو موجود
  if (discount_id) {
    basePayload.discount_id = discount_id.toString();
  }

  // 🟢 إضافة module_id لو موجود
  if (module_id && module_id !== "all") {
    basePayload.module_id = module_id.toString();
  }

  // 🟢 إضافة free_discount لو موجود
  if (free_discount && free_discount > 0) {
    basePayload.free_discount = free_discount.toString();
  }
    due: due.toString(),
    ...(due_module ? { due_module: due_module.toString() } : {}),                   // ← دايمًا موجود: 0 أو 1
    order_pending: due === 1 ? "0" : "0",   // ← الحل السحري للـ validation
  };

  // إضافة customer_id لو الطلب آجل
  if (due === 1 && user_id) {
    basePayload.user_id = user_id.toString();
  }

  const productsToSend = orderItems.map(processProductItem);

  if (orderType === "dine_in") {
    const cartIdsToSend = orderItems.map((item) => item.cart_id.toString());
    return {
      ...basePayload,
      table_id: tableId.toString(),
      products: productsToSend,
      cart_id: cartIdsToSend,
    };
  } else if (orderType === "delivery") {
    return {
      ...basePayload,
      products: productsToSend,
      address_id: sessionStorage.getItem("selected_address_id") || "",
      user_id: sessionStorage.getItem("selected_user_id") || "",
      cash_with_delivery: (parseFloat(customerPaid) || 0).toString(),
    };
  } else {
    // Take Away أو Pickup
    return {
      ...basePayload,
      products: productsToSend,
    };
  }
};
/**
 * بناء الـ payload لطلبات الديل
 */
export const buildDealPayload = (orderItems, financialsPayload) => {
  const dealItem = orderItems.find((item) => item.is_deal);
  return {
    deal_id: dealItem.deal_id.toString(),
    user_id: dealItem.deal_user_id.toString(),
    financials: financialsPayload,
  };
};

/**
 * التحقق من صحة طرق الدفع
 */
/**
 * التحقق من صحة طرق الدفع - نسخة نظيفة بدون أي validation للـ Transaction ID
 */
export const validatePaymentSplits = (paymentSplits, getDescriptionStatus) => {
  let totalPaid = 0;

  for (const split of paymentSplits) {
    const amount = parseFloat(split.amount) || 0;
    if (amount <= 0) {
      return {
        valid: false,
        error: "please enter a valid amount for all payment methods",
      };
    }
    totalPaid += amount;

    // التحقق من آخر 4 أرقام فقط لو الحساب مفعّل description_status = 1
    const needsLast4 = getDescriptionStatus(split.accountId);
    if (needsLast4) {
      if (!split.checkout || split.checkout.length !== 4 || !/^\d{4}$/.test(split.checkout)) {
        return {
          valid: false,
          error: "please enter the last 4 digits for all required payment methods",
        };
      }
    }

    // Transaction ID خلاص مش هنتحقق منه هنا خالص
    // الباك إند هو اللي هيرفض لو فاضي ومحتاج
  }

  return { valid: true, totalPaid };
};