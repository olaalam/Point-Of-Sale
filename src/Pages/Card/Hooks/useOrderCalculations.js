import { useMemo } from "react";
import { statusOrder } from "../constants";

export function useOrderCalculations(
  orderItems,
  selectedPaymentItems,
  orderType,
  serviceFeeData // ممكن يكون undefined أو { type: "precentage" | "fixed", amount: number }
) {
  return useMemo(() => {
    // 1. حساب SubTotal
    const subTotal = Array.isArray(orderItems)
      ? orderItems.reduce((acc, item) => {
          const price = Number(item.price ?? 0);
          const qty =
            item.weight_status === 1
              ? Number(item.quantity ?? 1)
              : Number(item.count ?? 1);
          return acc + price * qty;
        }, 0)
      : 0;

    // 2. حساب الضرائب + تجميع تفاصيلها
    let totalTax = 0;
    const taxInfo = {};

    orderItems?.forEach((item) => {
      const taxPerUnit = Number(item.tax_val ?? 0);
      const qty =
        item.weight_status === 1
          ? Number(item.quantity ?? 1)
          : Number(item.count ?? 1);

      if (taxPerUnit > 0) {
        totalTax += taxPerUnit * qty;

        if (item.tax_obj) {
          const taxId = item.tax_obj.id;
          if (!taxInfo[taxId]) {
            taxInfo[taxId] = {
              name: item.tax_obj.name,
              amount: item.tax_obj.amount,
              type: item.tax_obj.type,
              total: 0,
            };
          }
          taxInfo[taxId].total += taxPerUnit * qty;
        }
      }
    });

    const taxDetails = Object.values(taxInfo);

    // 3. Service Fee (dine_in و take_away فقط)
    const serviceFeeAmount = serviceFeeData?.amount ?? 0;
    const serviceFeeType = serviceFeeData?.type ?? "precentage";
    const applyServiceFee =
      ["dine_in", "take_away"].includes(orderType) && serviceFeeAmount > 0;

    let serviceChargeFull = 0;
    if (applyServiceFee) {
      if (serviceFeeType === "precentage") {
        serviceChargeFull = (subTotal + totalTax) * (serviceFeeAmount / 100);
      } else {
        serviceChargeFull = serviceFeeAmount; // مبلغ ثابت
      }
    }

    // المجموع الكلي للطلب (للعرض)
    const totalAmountDisplay = subTotal + totalTax + serviceChargeFull;

    // 4. حساب amountToPay (المبلغ المطلوب دفعه حاليًا)
    let amountToPay = totalAmountDisplay;

    if (orderType === "dine_in" && selectedPaymentItems.length > 0) {
      const selectedItems = orderItems.filter(
        (item) =>
          selectedPaymentItems.includes(item.temp_id) &&
          item.preparation_status === "done"
      );

      const selectedSubTotal = selectedItems.reduce((acc, item) => {
        const price = Number(
          item.itemPrice ??
            item.itemTotal ??
            item.price_after_discount ??
            item.price ??
            0
        );
        const qty =
          item.weight_status === 1
            ? Number(item.quantity ?? 1)
            : Number(item.count ?? 1);
        return acc + price * qty;
      }, 0);

      const selectedTax = selectedItems.reduce((acc, item) => {
        const taxPerUnit = Number(item.tax_val ?? 0);
        const qty =
          item.weight_status === 1
            ? Number(item.quantity ?? 1)
            : Number(item.count ?? 1);
        return acc + taxPerUnit * qty;
      }, 0);

      let selectedServiceCharge = 0;
      if (applyServiceFee) {
        if (serviceFeeType === "precentage") {
          selectedServiceCharge =
            (selectedSubTotal + selectedTax) * (serviceFeeAmount / 100);
        } else {
          // للمبلغ الثابت: نقسمه بنسبة المبلغ المختار (أكثر عدلاً)
          const ratio = subTotal > 0 ? selectedSubTotal / subTotal : 0;
          selectedServiceCharge = serviceChargeFull * ratio;
        }
      }

      amountToPay = selectedSubTotal + selectedTax + selectedServiceCharge;
    }

    // 5. العناصر الجاهزة
    const doneItems = Array.isArray(orderItems)
      ? orderItems.filter((item) => item.preparation_status === "done")
      : [];

    // 6. العناصر اللي هتدخل الـ checkout
    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems.length > 0
        ? orderItems.filter(
            (item) =>
              selectedPaymentItems.includes(item.temp_id) &&
              item.preparation_status === "done"
          )
        : orderItems;

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalOtherCharge: Number(serviceChargeFull.toFixed(2)), // Service Fee
      totalAmountDisplay: Number(totalAmountDisplay.toFixed(2)),
      amountToPay: Number(amountToPay.toFixed(2)),
      taxDetails,
      doneItems,
      checkoutItems,
      currentLowestSelectedStatus: statusOrder[0],
    };
  }, [
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData?.amount,
    serviceFeeData?.type,
  ]);
}