// ItemRow.jsx - تم إصلاح مشكلة عدم احتساب Addons في Dine-in
import { toast } from "react-toastify";
import { PREPARATION_STATUSES } from "./constants";
import { Trash2, FileText } from "lucide-react";
import ProductDetailModalWrapper from "./ProductDetailModalWrapper";

// دالة لحساب السعر مع الإضافات (Addons + Extras) - خاصة بـ Dine-in
const calculatePriceWithAddons = (item) => {
  let basePrice = Number(item.originalPrice || item.price || 0);

  let addonsTotal = 0;

  // حساب الـ Addons
  if (item.addons && Array.isArray(item.addons)) {
    item.addons.forEach((addonGroup) => {
      if (addonGroup.options && Array.isArray(addonGroup.options)) {
        addonGroup.options.forEach((option) => {
          if (option.selected || option.quantity > 0) {
            const qty = option.quantity || 1;
            addonsTotal += Number(option.price || 0) * qty;
          }
        });
      }
    });
  }

  // حساب الـ Extras (لو موجودة بنفس الطريقة)
  if (item.extras && Array.isArray(item.extras)) {
    item.extras.forEach((extra) => {
      addonsTotal += Number(extra.price || 0) * (extra.quantity || 1);
    });
  }

  return basePrice + addonsTotal;
};

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
  handleRemoveFrontOnly,
  updateOrderItems,
  orderItems
}) => {
  console.log("ItemRow → Rendering item:", item);
  const statusInfo = PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;

  const hasDiscount = item.discount && typeof item.discount === "object";
  const isItemLoading = itemLoadingStates[item.temp_id] || false;
  const isDoneItem = item.preparation_status === "done";

  if (!item) return null;

  // الحل السحري: نحسب السعر الصحيح في Dine-in بنفسنا
  const finalUnitPrice = orderType === "dine_in"
    ? calculatePriceWithAddons(item)  // نحسب Addons يدويًا
    : Number(item.price) || 0;        // في Takeaway/Delivery السعر جاي مظبوط أصلًا

  const safePrice = Number(finalUnitPrice.toFixed(2));
  const safeOriginalPrice = Number(item.originalPrice || item.price || 0).toFixed(2);

  // للمنتجات بالوزن (مثل اللحوم)
  const displayQuantity = item.weight_status === 1 
    ? `${item.count} kg` 
    : item.count;

  // الكمية المستخدمة في الحساب (weight أو count)
  const quantityForCalc = item.weight_status === 1 
    ? Number(item.quantity || item.count || 1)
    : Number(item.count || 1);

  // إجمالي السعر بعد الكمية
  const totalPrice = (safePrice * quantityForCalc).toFixed(2);
  const totalOriginalPrice = hasDiscount 
    ? (Number(safeOriginalPrice) * quantityForCalc).toFixed(2)
    : null;

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

      {/* Product Name + Variations + Notes */}
      <td className="py-3 px-4 text-left align-top">
        <ProductDetailModalWrapper
          product={item}
          updateOrderItems={updateOrderItems}
          orderItems={orderItems}
        >
          <div className="flex flex-col gap-1">
            <span className="text-gray-800 font-medium hover:underline hover:text-red-600 cursor-pointer transition-colors">
              {item.name}
            </span>

            {/* Variations */}
            {item.variations?.map((group, i) => {
              const selected = Array.isArray(group.selected_option_id)
                ? group.options?.find(opt => group.selected_option_id.includes(opt.id))
                : group.options?.find(opt => opt.id === group.selected_option_id);
              return selected ? (
                <div key={i} className="text-xs text-gray-600">
                  {group.name}: <span className="font-medium">{selected.name}</span>
                </div>
              ) : null;
            })}

            {/* Notes */}
            {item.notes && item.notes.trim() !== "" && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs italic text-orange-700 flex items-start gap-1.5">
                <FileText size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="font-semibold">Note:</strong> {item.notes}
                </span>
              </div>
            )}
          </div>
        </ProductDetailModalWrapper>
      </td>

      {/* Price per Unit - الآن مظبوط في Dine-in و Takeaway */}
      <td className="py-3 px-4 text-center align-top">
        <div>
          <span className={hasDiscount ? "text-green-600 font-semibold" : "font-medium"}>
            {safePrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <div>
              <span className="text-xs text-gray-500 line-through">
                {safeOriginalPrice}
              </span>
            </div>
          )}
          {item.tax_obj && (
            <div className="text-xs text-blue-600 mt-1">
              {item.taxes === "excluded" ? "Tax Excluded" : "Tax Included"}
              {item.tax_val > 0 && ` (+${item.tax_val.toFixed(2)})`}
            </div>
          )}
        </div>
      </td>

      {/* Quantity */}
      <td className="py-3 px-4 text-center align-top">
        {item.weight_status === 1 ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => {
                const newQty = Math.max(0.25, (Number(item.quantity) || 0) - 0.25);
                const updatedItems = orderItems.map((i) =>
                  i.temp_id === item.temp_id ? { ...i, quantity: newQty } : i
                );
                updateOrderItems(updatedItems);
              }}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              −
            </button>
            <input
              type="text"
              value={Number(item.quantity || 0).toFixed(2)}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  const numVal = val === "" ? 0 : Number(val);
                  if (numVal >= 0.25) {
                    const updatedItems = orderItems.map((i) =>
                      i.temp_id === item.temp_id ? { ...i, quantity: numVal } : i
                    );
                    updateOrderItems(updatedItems);
                  }
                }
              }}
              className="w-16 text-center font-medium border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-bg-primary"
            />
            <span className="text-xs text-gray-600">kg</span>
            <button
              onClick={() => {
                const newQty = (Number(item.quantity) || 0) + 0.25;
                const updatedItems = orderItems.map((i) =>
                  i.temp_id === item.temp_id ? { ...i, quantity: newQty } : i
                );
                updateOrderItems(updatedItems);
              }}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              +
            </button>
          </div>
        ) : !(item.is_reward || item.is_deal) && allowQuantityEdit ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => handleDecrease(item.temp_id)}
              disabled={!allowQuantityEdit}
              className={`px-2 py-1 rounded ${allowQuantityEdit ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-100 cursor-not-allowed"}`}
            >
              −
            </button>
            <span className="min-w-[24px] text-center font-medium">{item.count}</span>
            <button
              onClick={() => handleIncrease(item.temp_id)}
              className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              +
            </button>
          </div>
        ) : (
          <span className="min-w-[24px] text-center font-medium">1 (ثابت)</span>
        )}
      </td>

      {/* Preparation Status */}
      {orderType === "dine_in" && (
        <td className="py-3 px-4 text-center align-top">
          <div className="flex items-center justify-center gap-2">
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

      {/* Payment Selection */}
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

      {/* Total - الآن مظبوط تمامًا في Dine-in */}
      <td className="py-3 px-4 text-center align-top">
        <span className="font-semibold">
          {totalPrice}
        </span>
        {hasDiscount && totalOriginalPrice && (
          <div className="text-xs text-gray-500 line-through">
            {totalOriginalPrice}
          </div>
        )}
      </td>

      {/* Delete Item */}
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