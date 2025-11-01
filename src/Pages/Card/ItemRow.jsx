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
  console.log("ItemRow → Rendering item:", item);
  const statusInfo = PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;

  const hasDiscount = item.discount && typeof item.discount === "object";
  const isItemLoading = itemLoadingStates[item.temp_id] || false;
  const isDoneItem = item.preparation_status === "done";

  if (!item) return null;

  // السعر الكلي للوحدة (من ProductModal)
  const safePrice = Number(item.originalPrice)|| 0;
  const addonsTotal = (item.addons || []).reduce((sum, addon) => {
  return sum + (Number(addon.price_after_discount) || 0);
}, 0);
console.log("ItemRow → addonsTotal:", addonsTotal);
const extrasTotal = (item.selectedExtras || []).reduce((sum, extra) => {
  return sum + (Number(extra.price_after_discount) || 0);
}, 0);
console.log("ItemRow → extrasTotal:", extrasTotal);
// السعر قبل الخصم = السعر الأصلي + الإضافات
const safeOriginalPrice = Number(item.price) + addonsTotal + extrasTotal;

  return (
    <tr className={`border-b last:border-b-0 hover:bg-gray-50 ${item.type === "addon" ? "bg-blue-50" : ""} ${selectedPaymentItems.includes(item.temp_id) ? "bg-green-50" : ""}`}>
      {orderType === "dine_in" && (
        <td className="py-3 px-4 text-center align-top">
          <input
            type="checkbox"
            checked={selectedItems.includes(item.temp_id)}
            onChange={() => toggleSelectItem(item.temp_id)}
            className="w-4 h-4 accent-bg-primary"
          />
        </td>
      )}
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span className="text-gray-800 font-medium">{item.name}</span>
          {item.variations?.map((group, i) => {
            const selected = Array.isArray(group.selected_option_id)
              ? group.options?.find(opt => group.selected_option_id.includes(opt.id))
              : group.options?.find(opt => opt.id === group.selected_option_id);
            return selected ? (
              <div key={i} className="text-xs text-gray-600">
                {group.name}: {selected.name}
              </div>
            ) : null;
          })}
        </div>
      </td>
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span className={hasDiscount ? "text-green-600 font-semibold" : ""}>
            {safePrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <div>
              <span className="text-xs text-gray-500 line-through">
                {safeOriginalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-center align-top">
        {!(item.is_reward || item.is_deal) && allowQuantityEdit ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => handleDecrease(item.temp_id)}
              disabled={!allowQuantityEdit}
              className={`px-2 py-1 rounded ${allowQuantityEdit ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-100 cursor-not-allowed"}`}
            >−</button>
            <span className="min-w-[24px] text-center">{item.count}</span>
            <button
              onClick={() => handleIncrease(item.temp_id)}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >+</button>
          </div>
        ) : (
          <span className="min-w-[24px] text-center">1 (Fixed)</span>
        )}
      </td>
      {orderType === "dine_in" && (
        <td className="py-3 px-4 text-center align-top">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!item?.temp_id) {
                  toast.error("Item ID is missing.");
                  return;
                }
                handleUpdatePreparationStatus(item.temp_id);
              }}
              title={`Change status to ${PREPARATION_STATUSES[statusInfo.nextStatus]?.label || "Pending"}`}
              className={`p-2 rounded-full ${statusInfo.color} hover:bg-gray-200 transition-colors ${isItemLoading ? "opacity-50 cursor-not-allowed" : ""}`}
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
              checked={selectedPaymentItems.includes(item.temp_id)}
              onChange={() => toggleSelectPaymentItem(item.temp_id)}
              className="w-4 h-4 accent-green-500"
            />
          )}
        </td>
      )}
      <td className="py-3 px-4 text-center align-top">
        <span className="font-semibold">
          {(safePrice * item.count).toFixed(2)}
        </span>
        {hasDiscount && (
          <div className="text-xs text-gray-500 line-through">
            {(safeOriginalPrice * item.count).toFixed(2)}
          </div>
        )}
      </td>
      <td className="py-3 px-4 text-center align-top">
        <button
          onClick={() => orderType === "dine_in" ? handleVoidItem(item.temp_id) : handleRemoveFrontOnly(item.temp_id)}
          className={`p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors ${isItemLoading && orderType === "dine_in" ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isItemLoading && orderType === "dine_in"}
        >
          <Trash2 size={20} />
        </button>
      </td>
    </tr>
  );
};

export default ItemRow;