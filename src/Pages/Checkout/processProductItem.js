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
export const buildFinancialsPayload = (paymentSplits) => {
  return paymentSplits.map((s) => ({
    id: s.accountId.toString(),
    amount: s.amount.toString(),
    description: s.description || undefined,
  }));
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
  due = 0,           // ← هنا المهم: due بيجي من الـ Checkout (0 أو 1)
  user_id,       // ← جديد: للطلبات الآجلة
}) => {
  const basePayload = {
    amount: amountToPay.toString(),
    total_tax: totalTax.toString(),
    total_discount: totalDiscount.toString(),
    notes: notes || "note",
    source: source,
    financials: financialsPayload,
    cashier_id: cashierId.toString(),
    due: due.toString(),                    // ← دايمًا موجود: 0 أو 1
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
      // due و order_pending موجودين في basePayload
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
export const validatePaymentSplits = (paymentSplits, getDescriptionStatus) => {
  for (const split of paymentSplits) {
    if (
      getDescriptionStatus(split.accountId) &&
      (!split.description || !/^\d{4}$/.test(split.description))
    ) {
      return {
        valid: false,
        error: `Please enter exactly 4 digits for the Visa card ending in split ${split.id}.`,
      };
    }
  }
  return { valid: true };
};