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
          <div className="flex md:flex-col flex-row items-stretch justify-center">
            <Button
              onClick={handleViewPendingOrders}
              className="bg-yellow-600 text-white hover:bg-yellow-500 text-sm px-6 py-4 md:h-full w-full md:w-36"
            >
              {t("PendingOrders")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}