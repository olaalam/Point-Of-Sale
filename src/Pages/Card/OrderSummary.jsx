import React from "react";
import { Button } from "@/components/ui/button";
import SummaryRow from "./SummaryRow";

export default function OrderSummary({
  orderType,
  subTotal,
  totalTax,
  totalOtherCharge,
  serviceFeeData,
  taxDetails,
  totalAmountDisplay,
  amountToPay,
  selectedPaymentCount,
  onCheckout,
  onSaveAsPending,
  isLoading,
  orderItemsLength,
  t,
}) {
  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 pt-6 mt-4">
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
        <SummaryRow label={t("SubTotal")} value={subTotal} />
        {taxDetails && taxDetails.length > 0 ? (
          taxDetails.map((tax, index) => (
            <SummaryRow
              key={index}
              label={`${tax.name} (${tax.amount}${
                tax.type === "precentage" ? "%" : " EGP"
              })`}
              value={tax.total}
            />
          ))
        ) : (
          <SummaryRow label={t("Tax")} value={totalTax} />
        )}
        {["dine_in", "take_away"].includes(orderType) &&
          totalOtherCharge > 0 && (
            <SummaryRow
              label={`${t("ServiceFee")} (${serviceFeeData.amount}%)`}
              value={totalOtherCharge}
            />
          )}{" "}
      </div>

      {orderType === "dine_in" && (
        <>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <p className="text-gray-600">{t("TotalOrderAmount")}:</p>
            <p className="text-right text-lg font-semibold">
              {totalAmountDisplay.toFixed(2)} {t("EGP")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <p className="text-gray-600">
              {t("SelectedItems", { count: selectedPaymentCount })}
            </p>
            <p className="text-right text-lg font-semibold text-green-600">
              {amountToPay.toFixed(2)} {t("EGP")}
            </p>
          </div>
          <hr className="my-4 border-t border-gray-300" />
        </>
      )}

      <div className="grid grid-cols-2 gap-4 items-center mb-6">
        <p className="text-bg-primary text-xl font-bold">{t("AmountToPay")}</p>
        <p className="text-right text-2xl font-bold text-green-700">
          {amountToPay.toFixed(2)} {t("EGP")}
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={onCheckout}
          className="bg-bg-primary text-white hover:bg-red-700 text-lg px-8 py-3"
          disabled={
            isLoading ||
            orderItemsLength === 0 ||
            (orderType === "dine_in" && selectedPaymentCount === 0)
          }
        >
          {t("Checkout")}
        </Button>
        {orderType === "take_away" && (
          <Button
            onClick={onSaveAsPending}
            className="bg-orange-600 text-white hover:bg-orange-700 text-lg px-8 py-3"
            disabled={isLoading || orderItemsLength === 0}
          >
            {t("SaveasPending")}
          </Button>
        )}
      </div>
    </div>
  );
}
