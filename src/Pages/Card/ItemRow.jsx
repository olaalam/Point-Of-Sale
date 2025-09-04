import React, { useState } from "react";
import { PREPARATION_STATUSES } from "./constants";
import { Trash2 } from "lucide-react";
const ItemRow = ({
  item,
  orderType,
  selectedItems,
  toggleSelectItem,
  selectedPaymentItems,
  toggleSelectPaymentItem,
  handleIncrease,
  handleDecrease,
  allowQuantityEdit,
  itemLoadingStates,
  handleUpdatePreparationStatus,
  handleVoidItem,
  renderItemVariations,
  handleRemoveFrontOnly
}) => {
  const statusInfo =
    PREPARATION_STATUSES[item.preparation_status] ||
    PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;
  const hasDiscount =
    item.originalPrice && item.price < item.originalPrice;
  const isItemLoading = itemLoadingStates[item.temp_id] || false;
  const isDoneItem = item.preparation_status === "done";
  const itemVariations = renderItemVariations(item);


  return (
    <tr
      className={`border-b last:border-b-0 hover:bg-gray-50 ${
        item.type === "addon" ? "bg-blue-50" : ""
      } ${
        selectedPaymentItems.includes(item.temp_id)
          ? "bg-green-50"
          : ""
      }`}
    >
      <td className="py-3 px-4 text-center align-top">
        <input
          type="checkbox"
          checked={selectedItems.includes(item.temp_id)}
          onChange={() => toggleSelectItem(item.temp_id)}
          className="w-4 h-4 accent-bg-primary"
        />
      </td>
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span className="text-gray-800 font-medium">
            {item.name}
          </span>
          {itemVariations.length > 0 && (
            <div className="mt-1 text-xs text-gray-500 space-y-1">
              {itemVariations.map((variation, idx) => (
                <div key={idx} className="italic">
                  {variation}
                </div>
              ))}
            </div>
          )}
          {item.selectedAddons &&
            item.selectedAddons.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {item.selectedAddons.map((addon) => (
                  <div key={addon.addon_id} className="italic">
                    + {addon.name}
                  </div>
                ))}
              </div>
            )}
        </div>
      </td>
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span
            className={
              hasDiscount ? "text-green-600 font-semibold" : ""
            }
          >
            {item.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <div>
              <span className="text-xs text-gray-500 line-through">
                {item.originalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-center align-top">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() =>
              allowQuantityEdit && handleDecrease(item.temp_id)
            }
            disabled={!allowQuantityEdit}
            className={`px-2 py-1 rounded ${
              allowQuantityEdit
                ? "bg-gray-200 hover:bg-gray-300"
                : "bg-gray-100 cursor-not-allowed"
            }`}
          >
            −
          </button>
          <span className="min-w-[24px] text-center">
            {item.count}
          </span>
          <button
            onClick={() => handleIncrease(item.temp_id)}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            +
          </button>
        </div>
      </td>
      {orderType === "dine_in" && (
        <td className="py-3 px-4 text-center align-top">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleUpdatePreparationStatus(item.temp_id)
              }
              title={`Change status to ${
                PREPARATION_STATUSES[statusInfo.nextStatus]
                  ?.label || "Pending"
              }`}
              className={`p-2 rounded-full ${
                statusInfo.color
              } hover:bg-gray-200 text-center m-auto transition-colors duration-200 ${
                isItemLoading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={isItemLoading}
            >
              {isItemLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-current rounded-full animate-spin"></div>
              ) : (
                <StatusIcon size={20} />
              )}
            </button>
          </div>
        </td>
      )}
      {orderType === "dine_in" && (
        <td className="py-3 px-4 text-center align-top">
          {isDoneItem && (
            <input
              type="checkbox"
              checked={selectedPaymentItems.includes(
                item.temp_id
              )}
              onChange={() =>
                toggleSelectPaymentItem(item.temp_id)
              }
              className="w-4 h-4 accent-green-500"
              title="Select for payment"
            />
          )}
        </td>
      )}
      <td className="py-3 px-4 text-center align-top">
        <span className="font-semibold">
          {(item.price * item.count).toFixed(2)}
        </span>
        {hasDiscount && (
          <div className="text-xs text-gray-500 line-through">
            {(item.originalPrice * item.count).toFixed(2)}
          </div>
        )}
      </td>
<td className="py-3 px-4 text-center align-top">
  <button
    onClick={() =>
      orderType === "dine_in"
        ? handleVoidItem(item.temp_id) // API
        : handleRemoveFrontOnly(item.temp_id) // Front Only
    }
    className={`p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors duration-200 ${
      isItemLoading && orderType === "dine_in"
        ? "opacity-50 cursor-not-allowed"
        : ""
    }`}
    disabled={isItemLoading && orderType === "dine_in"}
    title={
      orderType === "dine_in"
        ? "Void Item (API)"
        : "Remove Item (Front Only)"
    }
  >
    <Trash2 size={20} />
  </button>
</td>



    </tr>
  );
};

export default ItemRow;