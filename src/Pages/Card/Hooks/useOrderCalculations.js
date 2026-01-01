import { useMemo } from "react";
import { statusOrder } from "../constants";
import { calculateItemUnitPrice } from "@/Pages/utils/orderPriceUtils";

export function useOrderCalculations(
  orderItems,
  selectedPaymentItems,
  orderType,
  serviceFeeData
) {
  return useMemo(() => {
    console.log("Order items for calculation:", orderItems.map(item => ({
  name: item.name,
  count: item.count ?? item.quantity ?? 1,
  price_after_discount: item.price_after_discount,
  price: item.price,
  extras: "calculated separately"
})));

const subTotal = (orderItems ?? []).reduce((sum, item) => {
  const unitPrice = calculateItemUnitPrice(item);
  const qty = item.count ?? item.quantity ?? 1;
  const itemTotal = unitPrice * qty;
  console.log(`Item: ${item.name} → unit: ${unitPrice} × ${qty} = ${itemTotal}`);
  return sum + itemTotal;
}, 0);

console.log("Final Subtotal:", subTotal);


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

    // ── Service Fee ────────────────────────────────────────────────────
    const sfAmt = serviceFeeData?.amount ?? 0;
    const sfType = serviceFeeData?.type ?? "precentage";
    const applySF = ["dine_in", "take_away"].includes(orderType) && sfAmt > 0;
    let serviceCharge = applySF
      ? sfType === "precentage"
        ? (subTotal + totalTax) * (sfAmt / 100)
        : sfAmt
      : 0;

    const totalAmountDisplay = subTotal + totalTax + serviceCharge;

    // ── Amount to Pay (للـ dine_in مع الدفع الجزئي) ───────────────────
    let amountToPay = totalAmountDisplay;
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
    }

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
      totalAmountDisplay: Number(totalAmountDisplay.toFixed(2)),
      amountToPay: Number(amountToPay.toFixed(2)),
      taxDetails,
      doneItems,
      checkoutItems,
      currentLowestSelectedStatus: statusOrder[0],
    };
  }, [orderItems, selectedPaymentItems, orderType, serviceFeeData?.amount, serviceFeeData?.type]);
}