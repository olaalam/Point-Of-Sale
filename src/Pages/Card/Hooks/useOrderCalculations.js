import { useMemo } from "react";
import { statusOrder } from "../constants";
import { calculateItemUnitPrice } from "@/Pages/utils/orderPriceUtils";

const getItemBasePrice = (item) => {
  let basePrice = Number(item.final_price || item.price_after_discount || item.price || 0);
  if (item.variations && Array.isArray(item.variations)) {
    item.variations.forEach((v) => {
      if (v.type === 'multiple') return;
      const name = (v.name || "").toLowerCase();
      const isSize = name.includes('size') || name.includes('حجم') || name.includes('maqas') || name.includes('مقاس') || name.includes('وزن') || name.includes('weight');
      const selectedId = v.selected_option_id;
      if (selectedId === null || selectedId === undefined) return;
      const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
      ids.forEach(optId => {
        const opt = v.options?.find(o => o.id === optId);
        if (!opt) return;
        const totalOptPrice = Number(opt.total_option_price || 0);
        if (totalOptPrice > 0 && !item.is_group_priced) {
          basePrice = totalOptPrice;
        } else if (isSize && !item.is_group_priced) {
          const sp = Number(opt.final_price || opt.price_after_tax || 0);
          if (sp > 0) basePrice = sp;
        }
      });
    });
  }
  return basePrice;
};

export function useOrderCalculations(
  orderItems,
  selectedPaymentItems,
  orderType,
  serviceFeeData,
  deliveryFee = 0
) {
  return useMemo(() => {
    // ── Subtotal ───────────────────────────────────────────────────────
    const subTotal = (orderItems ?? []).reduce((sum, item) => {
      const unitPrice = calculateItemUnitPrice(item);

      // توحيد منطق الكمية/الوزن مع الـ ItemRow
      const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
      const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

      const qty = isWeightProduct
        ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
        : Number(item.count || 1);

      return sum + (unitPrice * qty);
    }, 0);

    // ── Taxes ──────────────────────────────────────────────────────────
    let totalTax = 0;
    const taxInfo = {};

    (orderItems ?? []).forEach((item) => {
      const taxVal = Number(item.tax_val ?? 0);
      const qty = item.count ?? item.quantity ?? 1;

      if (taxVal > 0) {
        totalTax += taxVal * qty;

        if (item.tax_obj) {
          const id = item.tax_obj.id;
          taxInfo[id] = taxInfo[id] || {
            name: item.tax_obj.name,
            amount: item.tax_obj.amount,
            type: item.tax_obj.type,
            total: 0,
          };
          taxInfo[id].total += taxVal * qty;
        }
      }
    });

    const taxDetails = Object.values(taxInfo);

    // ── Service Fee (only for dine_in / take_away) ─────────────────────
    const sfAmt = serviceFeeData?.amount ?? 0;
    const sfType = serviceFeeData?.type ?? "precentage";
    const applySF = ["dine_in", "take_away"].includes(orderType) && sfAmt > 0;

    const serviceCharge = applySF
      ? sfType === "precentage"
        ? (subTotal + totalTax) * (sfAmt / 100)
        : sfAmt
      : 0;

    // ── Base total before delivery ─────────────────────────────────────
    const totalBeforeDelivery = subTotal + totalTax + serviceCharge;

    // ── Final amount to pay ────────────────────────────────────────────
    let amountToPay = totalBeforeDelivery;

    // 1. Apply delivery fee for delivery orders
    if (orderType === "delivery") {
      amountToPay += Number(deliveryFee);
    }

    // 2. Handle partial payment (dine_in only) - overrides delivery logic
    if (orderType === "dine_in" && selectedPaymentItems?.length > 0) {
      const selected = (orderItems ?? []).filter(
        (i) =>
          selectedPaymentItems.includes(i.temp_id) &&
          i.preparation_status === "done"
      );

      const selSub = selected.reduce((s, i) => {
        return s + calculateItemUnitPrice(i) * (i.count ?? i.quantity ?? 1);
      }, 0);

      const selTax = selected.reduce(
        (s, i) => s + Number(i.tax_val ?? 0) * (i.count ?? i.quantity ?? 1),
        0
      );

      let selSF = applySF
        ? sfType === "precentage"
          ? (selSub + selTax) * (sfAmt / 100)
          : serviceCharge * (subTotal > 0 ? selSub / subTotal : 0)
        : 0;

      amountToPay = selSub + selTax + selSF;
      // Note: No delivery fee in dine_in → already excluded above
    }

    // ── Other useful values ────────────────────────────────────────────
    const doneItems = (orderItems ?? []).filter(
      (i) => i.preparation_status === "done"
    );

    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems?.length > 0
        ? (orderItems ?? []).filter(
          (i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done"
        )
        : (orderItems ?? []);

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalOtherCharge: Number(serviceCharge.toFixed(2)),
      totalAmountDisplay: Number(totalBeforeDelivery.toFixed(2)),
      amountToPay: Number(amountToPay.toFixed(2)),
      taxDetails,
      doneItems,
      checkoutItems,
      currentLowestSelectedStatus: statusOrder[0],
      // Optional: useful for display in OrderSummary / receipt
      deliveryFee: orderType === "delivery" ? Number(deliveryFee.toFixed(2)) : 0,
    };
  }, [
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData?.amount,
    serviceFeeData?.type,
    deliveryFee,           // ← important!
  ]);
}