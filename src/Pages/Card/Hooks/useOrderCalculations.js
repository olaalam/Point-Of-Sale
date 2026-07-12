import { useMemo } from "react";
import { statusOrder } from "../constants";
import { calculateItemUnitPrice } from "@/Pages/utils/orderPriceUtils";

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
      // استخدام السعر الأساسي قبل الخصم للـ subtotal
      const unitPrice = parseFloat(item.price || 0);

      const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
      const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

      const qty = isWeightProduct
        ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
        : Number(item.count || 1);

      // إضافة سعر الـ extras والـ addons الخارجية
      let extraPrice = 0;
      
      // حساب الـ extras
      const selectedExtras = item.selectedExtras || [];
      if (selectedExtras.length > 0) {
        const allExtrasCatalog = item.allExtras || [];
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => e.id === parseInt(id));
          if (extra) {
            extraPrice += parseFloat(extra.price || extra.final_price || 0);
          }
        });
      }

      // حساب الـ addons
      const storedAddons = item.addons || [];
      storedAddons.forEach(addon => {
        if (addon.addon_id !== undefined) {
          const addonQty = parseFloat(addon.quantity || addon.count || 1);
          extraPrice += parseFloat(addon.price || 0) * addonQty;
        }
      });

      return sum + ((unitPrice + extraPrice) * qty);
    }, 0);

    // ── Taxes Calculation & Details ────────────────────────────────────
    let totalTax = 0;
    let totalDiscount = 0;
    const taxDetailsMap = {};

    items.forEach((item) => {
      const qty = (item.weight_status === 1 || item.weight_status === "1")
        ? Number(item.quantity || 1)
        : Number(item.count || 1);

      // استخدام discount_val مباشرة من الباك إند
      const itemDiscount = Number(item.discount_val || 0);
      totalDiscount += itemDiscount * qty;

      // استخدام tax_only مباشرة من الباك إند
      const itemTax = Number(item.tax_only || 0);
      const totalItemTax = itemTax * qty;
      totalTax += totalItemTax;

      // إضافة تفاصيل الضريبة
      if (totalItemTax > 0 && item.tax_obj) {
        const taxName = item.tax_obj.name || "Tax";
        const taxId = item.tax_obj.id || 'default';

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
    
    // حساب Amount to Pay باستخدام final_price
    let amountToPay = items.reduce((sum, item) => {
      const finalPrice = parseFloat(item.final_price || 0);
      
      const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
      const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

      const qty = isWeightProduct
        ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
        : Number(item.count || 1);

      // إضافة سعر الـ extras والـ addons للـ amount to pay
      let extraPrice = 0;
      
      const selectedExtras = item.selectedExtras || [];
      if (selectedExtras.length > 0) {
        const allExtrasCatalog = item.allExtras || [];
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => e.id === parseInt(id));
          if (extra) {
            extraPrice += parseFloat(extra.final_price || extra.price || 0);
          }
        });
      }

      const storedAddons = item.addons || [];
      storedAddons.forEach(addon => {
        if (addon.addon_id !== undefined) {
          const addonQty = parseFloat(addon.quantity || addon.count || 1);
          extraPrice += parseFloat(addon.price || 0) * addonQty;
        }
      });

      return sum + ((finalPrice + extraPrice) * qty);
    }, 0);

    // إضافة service charge للـ amount to pay
    amountToPay += serviceCharge;

    // 1. حساب مصاريف التوصيل
    if (orderType === "delivery") {
      amountToPay += Number(deliveryFee);
    }

    // 2. معالجة الدفع الجزئي (Dine In)
    if (orderType === "dine_in" && selectedPaymentItems?.length > 0) {
      const selected = items.filter(
        (i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done"
      );

      // حساب الـ subtotal للعناصر المختارة (بالسعر الأساسي)
      const selSub = selected.reduce((s, i) => {
        const unitPrice = parseFloat(i.price || 0);
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? Number(i.quantity || 1)
          : Number(i.count || 1);
        
        let extraPrice = 0;
        
        const selectedExtras = i.selectedExtras || [];
        if (selectedExtras.length > 0) {
          const allExtrasCatalog = i.allExtras || [];
          selectedExtras.forEach(id => {
            const extra = allExtrasCatalog.find(e => e.id === parseInt(id));
            if (extra) {
              extraPrice += parseFloat(extra.price || extra.final_price || 0);
            }
          });
        }

        const storedAddons = i.addons || [];
        storedAddons.forEach(addon => {
          if (addon.addon_id !== undefined) {
            const addonQty = parseFloat(addon.quantity || addon.count || 1);
            extraPrice += parseFloat(addon.price || 0) * addonQty;
          }
        });

        return s + ((unitPrice + extraPrice) * qty);
      }, 0);

      const selTax = selected.reduce((s, i) => {
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? Number(i.quantity || 1)
          : Number(i.count || 1);
        const itemTax = Number(i.tax_only || 0);
        return s + (itemTax * qty);
      }, 0);

      let selSF = applySF
        ? sfType === "precentage"
          ? (selSub + selTax) * (sfAmt / 100)
          : serviceCharge * (subTotal > 0 ? selSub / subTotal : 0)
        : 0;

      // حساب amount to pay للعناصر المختارة (بالـ final_price)
      amountToPay = selected.reduce((s, i) => {
        const finalPrice = parseFloat(i.final_price || 0);
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? Number(i.quantity || 1)
          : Number(i.count || 1);
        
        let extraPrice = 0;
        
        const selectedExtras = i.selectedExtras || [];
        if (selectedExtras.length > 0) {
          const allExtrasCatalog = i.allExtras || [];
          selectedExtras.forEach(id => {
            const extra = allExtrasCatalog.find(e => e.id === parseInt(id));
            if (extra) {
              extraPrice += parseFloat(extra.final_price || extra.price || 0);
            }
          });
        }

        const storedAddons = i.addons || [];
        storedAddons.forEach(addon => {
          if (addon.addon_id !== undefined) {
            const addonQty = parseFloat(addon.quantity || addon.count || 1);
            extraPrice += parseFloat(addon.price || 0) * addonQty;
          }
        });

        return s + ((finalPrice + extraPrice) * qty);
      }, 0);

      amountToPay += selSF;
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
      totalDiscount: Number(totalDiscount.toFixed(2)),
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