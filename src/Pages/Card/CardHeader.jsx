import React from "react";
import { Button } from "@/components/ui/button";

export default function CardHeader({
  orderType,
  orderItems,
  handleClearAllItems,
  handleViewOrders,
  handleViewPendingOrders,
  onShowOfferModal,
  onShowDealModal,
  isLoading,
  onSaveAsPending,
  t,
}) {
  return (
    <div className="flex-shrink-0">
      <div className="!p-4 flex md:flex-row flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
          <Button
            onClick={handleClearAllItems}
            className="bg-bg-primary text-white hover:bg-red-700 text-sm flex items-center justify-center gap-2 py-4"
            disabled={isLoading || orderItems.length === 0}
          >
            {t("ClearItems")} ({orderItems.length || 0})
          </Button>
          <Button
            onClick={handleViewOrders}
            className="bg-gray-500 text-white hover:bg-gray-600 text-sm py-4"
            disabled={isLoading}
          >
            {t("ViewOrders")}
          </Button>

          {orderType !== "delivery" && (
            <>
              <Button
                onClick={onShowOfferModal}
                className="bg-green-600 text-white hover:bg-green-700 text-sm py-4"
                disabled={isLoading}
              >
                {t("ApplyOffer")}
              </Button>
              <Button
                onClick={onShowDealModal}
                className="bg-orange-600 text-white hover:bg-orange-700 text-sm py-4"
                disabled={isLoading}
              >
                {t("ApplyDeal")}
              </Button>
            </>
          )}
        </div>
        {orderType === "take_away" && (
          /* الحاوية الأساسية: جعلناها flex-1 لتأخذ المساحة المتاحة و w-full لضمان العرض الكامل */
          <div className="flex md:flex-col flex-row items-stretch overflow-hidden rounded-md w-full md:w-40 flex-shrink-0">
            <Button
              onClick={handleViewPendingOrders}
              // flex-1 تضمن أن الزر يأخذ نصف المساحة بالضبط
              className="flex-1 bg-yellow-600 text-white hover:bg-yellow-500 text-[10px] sm:text-xs px-1 py-4 h-full rounded-none border-r border-white/20"
            >
              {t("PendingOrders")}
            </Button>

            <Button
              onClick={onSaveAsPending}
              // flex-1 تضمن أن الزر يأخذ النصف الثاني
              className="flex-1 bg-orange-600 text-white hover:bg-orange-700 text-[10px] sm:text-xs px-1 py-4 h-full rounded-none"
            >
              {t("SaveasPending")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}