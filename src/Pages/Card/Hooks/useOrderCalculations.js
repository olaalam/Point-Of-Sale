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
  deliveryFee = 0,

) {
  return useMemo(() => {
    const items = orderItems ?? [];

    // ── Subtotal Calculation ───────────────────────────────────────────
    const subTotal = items.reduce((sum, item) => {
      const unitPrice = calculateItemUnitPrice(item);

      const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
      const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

      const qty = isWeightProduct
        ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
        : Number(item.count || 1);

      return sum + (unitPrice * qty);
    }, 0);

    // ── Taxes Calculation & Details ────────────────────────────────────
    let totalTax = 0;
    const taxDetailsMap = {};

    items.forEach((item) => {
      const qty = (item.weight_status === 1 || item.weight_status === "1")
        ? Number(item.quantity || 1)
        : Number(item.count || 1);

      // حساب ضريبة الـ variations
      let variationTaxSum = 0;
      if (item.variations) {
        item.variations.forEach(v => {
          const selectedId = v.selected_option_id;
          if (selectedId !== null && selectedId !== undefined) {
            const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
            ids.forEach(optId => {
              const opt = v.options?.find(o => String(o.id) === String(optId));
              if (opt && opt.tax_val) {
                variationTaxSum += Number(opt.tax_val);
              }
            });
          }
        });
      }

      // تحديد قيمة الضريبة للعنصر الواحد
      let itemTax = variationTaxSum > 0 ? variationTaxSum : Number(item.tax_val || 0);

      // إذا كانت الضريبة مشمولة في السعر
      if (item.taxes === "included") {
        const basePrice = Number(item.final_price || item.price || 0);
        const taxRate = item.tax_obj?.amount ? Number(item.tax_obj.amount) / 100 : 0.14;
        itemTax = basePrice - (basePrice / (1 + taxRate));
      }
      const totalItemTax = itemTax * qty;
      totalTax += totalItemTax;

      // التعديل هنا: نتحقق أن هناك ضريبة فعلاً (أكبر من صفر) وأن الـ tax_obj موجود
      if (totalItemTax > 0 && item.tax_obj) {
        const taxName = item.tax_obj.name || "Tax"; // اسم افتراضي إذا كان الاسم فارغاً
        const taxId = item.tax_obj.id || 'default'; // استخدام ID كمفتاح أدق من الاسم

        if (!taxDetailsMap[taxId]) {
          taxDetailsMap[taxId] = {
            name: taxName,
            total: 0,
            amount: item.tax_obj.amount,
            type: item.tax_obj.type
          };
        }
        taxDetailsMap[taxId].total += totalItemTax;
      }
    });

    const taxDetails = Object.values(taxDetailsMap);

    // ── Service Fee (dine_in / take_away) ─────────────────────────────
    const sfAmt = serviceFeeData?.amount ?? 0;
    const sfType = serviceFeeData?.type ?? "precentage";
    const applySF = ["dine_in", "take_away"].includes(orderType) && sfAmt > 0;

    const serviceCharge = applySF
      ? sfType === "precentage"
        ? (subTotal + totalTax) * (sfAmt / 100)
        : sfAmt
      : 0;

    // ── Totals ─────────────────────────────────────────────────────────
    const totalBeforeDelivery = subTotal + totalTax + serviceCharge;
    let amountToPay = totalBeforeDelivery;

    // 1. حساب مصاريف التوصيل
    if (orderType === "delivery") {
      amountToPay += Number(deliveryFee);
    }

    // 2. معالجة الدفع الجزئي (Dine In)
    if (orderType === "dine_in" && selectedPaymentItems?.length > 0) {
      const selected = items.filter(
        (i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done"
      );

      const selSub = selected.reduce((s, i) => {
        return s + calculateItemUnitPrice(i) * (i.count ?? i.quantity ?? 1);
      }, 0);

      const selTax = selected.reduce((s, i) => {
        // نعيد حساب الضريبة للعناصر المختارة فقط بنفس المنطق
        let vTax = 0;
        if (i.variations) {
          i.variations.forEach(v => {
            const ids = Array.isArray(v.selected_option_id) ? v.selected_option_id : [v.selected_option_id];
            ids.forEach(optId => {
              const opt = v.options?.find(o => String(o.id) === String(optId));
              if (opt && opt.tax_val) vTax += Number(opt.tax_val);
            });
          });
        }
        let itmTax = vTax > 0 ? vTax : Number(i.tax_val ?? 0);
        return s + (itmTax * (i.count ?? i.quantity ?? 1));
      }, 0);

      let selSF = applySF
        ? sfType === "precentage"
          ? (selSub + selTax) * (sfAmt / 100)
          : serviceCharge * (subTotal > 0 ? selSub / subTotal : 0)
        : 0;

      amountToPay = selSub + selTax + selSF;
    }

    // ── Helper Values ──────────────────────────────────────────────────
    const doneItems = items.filter((i) => i.preparation_status === "done");

    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems?.length > 0
        ? items.filter((i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done")
        : items;

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
      deliveryFee: orderType === "delivery" ? Number(deliveryFee.toFixed(2)) : 0,
    };
  }, [
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData?.amount,
    serviceFeeData?.type,
    deliveryFee,

  ]);
}