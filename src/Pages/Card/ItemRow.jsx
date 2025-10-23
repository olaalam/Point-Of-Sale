// ItemRow.jsx
import { toast } from "react-toastify";
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
  handleRemoveFrontOnly
}) => {
  const statusInfo =
    PREPARATION_STATUSES[item.preparation_status] ||
    PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;
  // A safer check for a discount
  const hasDiscount = !!item.originalPrice && item.price < item.originalPrice;
  const isItemLoading = itemLoadingStates[item.temp_id] || false;
  const isDoneItem = item.preparation_status === "done";

  // ✅ Add a check to ensure 'item' exists before continuing.
  // This prevents the whole component from crashing if the item prop is undefined.
  if (!item) {
    return null; // Or return a loading state/error message
  }

  // ✅ Define safe values for price and originalPrice
  const safePrice = item.price || 0;
  const safeOriginalPrice = item.originalPrice || 0;

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
      {
        orderType === "dine_in" && (
          <td className="py-3 px-4 text-center align-top">
            <input
              type="checkbox"
              checked={selectedItems.includes(item.temp_id)}
              onChange={() => toggleSelectItem(item.temp_id)}
              className="w-4 h-4 accent-bg-primary"
            />
          </td>
        )
      }
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span className="text-gray-800 font-medium">
            {item.name}
          </span>
          {/* ... (commented-out variations code) ... */}
        </div>
      </td>
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span
            className={
              hasDiscount ? "text-green-600 font-semibold" : ""
            }
          >
            {/* ✅ Use the safePrice variable */}
            {safePrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <div>
              <span className="text-xs text-gray-500 line-through">
                {/* ✅ Use the safeOriginalPrice variable */}
                {safeOriginalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </td>
<td className="py-3 px-4 text-center align-top">
  {!(item.is_reward || item.is_deal) && allowQuantityEdit && (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => handleDecrease(item.temp_id)}
        disabled={!allowQuantityEdit}
        className={`px-2 py-1 rounded ${
          allowQuantityEdit
            ? "bg-gray-200 hover:bg-gray-300"
            : "bg-gray-100 cursor-not-allowed"
        }`}
      >
        −
      </button>
      <span className="min-w-[24px] text-center">{item.count}</span>
      <button
        onClick={() => handleIncrease(item.temp_id)}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
      >
        +
      </button>
    </div>
  )}
  {(item.is_reward || item.is_deal) && (
    <span className="min-w-[24px] text-center">1 (Fixed)</span>
  )}
</td>
      {orderType === "dine_in" && (
        <td className="py-3 px-4 text-center align-top">
          <div className="flex items-center gap-2">
<button
  onClick={() => {
    console.log("Triggering update for item:", item.temp_id, "Full item:", item);
    if (!item?.temp_id) {
      console.error("item.temp_id is undefined:", item);
      toast.error("Item ID is missing, cannot update status.");
      return;
    }
    handleUpdatePreparationStatus(item.temp_id);
  }}
  title={`Change status to ${
    PREPARATION_STATUSES[statusInfo.nextStatus]?.label || "Pending"
  }`}
  className={`p-2 rounded-full ${statusInfo.color} hover:bg-gray-200 text-center m-auto transition-colors duration-200 ${
    isItemLoading ? "opacity-50 cursor-not-allowed" : ""
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
          {/* ✅ Use the safe values for calculation */}
          {((safePrice * item.count) || 0).toFixed(2)}
        </span>
        {hasDiscount && (
          <div className="text-xs text-gray-500 line-through">
            {/* ✅ Use the safe values for calculation */}
            {((safeOriginalPrice * item.count) || 0).toFixed(2)}
          </div>
        )}
      </td>
      <td className="py-3 px-4 text-center align-top">
        <button
          onClick={() =>
            orderType === "dine_in"
              ? handleVoidItem(item.temp_id)
              : handleRemoveFrontOnly(item.temp_id)
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