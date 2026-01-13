import React from "react";
import ItemRow from "./ItemRow";

export default function OrderTable({
  orderItems,
  orderType,
  selectedItems,
  selectedPaymentItems,
  onToggleSelectItem,
  onToggleSelectPaymentItem,
  onSelectAll,
  onIncrease,
  onDecrease,
  onUpdateStatus,
  onVoidItem,
  onRemoveFrontOnly,
  allowQuantityEdit,
  itemLoadingStates,
  updateOrderItems,
  t,
}) {
  return (
    <div className="bg-white shadow-md rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-100 text-xs sm:text-sm sticky top-0 z-10">
          <tr>
            {orderType === "dine_in" && (
              <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length > 0 &&
                    selectedItems.length === orderItems.length
                  }
                  onChange={onSelectAll}
                />
              </th>
            )}
            <th className="py-3 px-4 text-center text-gray-600 font-semibold">
              {t("Item")}
            </th>
            <th className="py-3 px-4 text-center text-gray-600 font-semibold">
              {t("Price")}
            </th>

            {orderType === "dine_in" && (
              <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                {t("Preparation")}
              </th>
            )}
            {orderType === "dine_in" && (
              <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                {t("Pay")}
              </th>
            )}
            <th className="py-3 px-4 text-right text-gray-600 font-semibold">
              {t("Total")}
            </th>
            <th className="py-3 px-4 text-right text-gray-600 font-semibold">
              {t("Void")}
            </th>
          </tr>
        </thead>
        <tbody>
          {orderItems.length === 0 ? (
            <tr>
              <td
                colSpan={orderType === "dine_in" ? 8 : 6}
                className="text-center py-4 text-gray-500"
              >
                <p>{t("NoItemsFound")}</p>
              </td>
            </tr>
          ) : (
            orderItems.map((item, index) => {
              // ✅ إضافة دعم الوزن هنا (قبل تمرير الـ item للـ ItemRow)
              const isWeightItem = item.weight_status === 1 || item.product_type === "weight";

              // الكمية الصحيحة (count للوزن، quantity للقطعة)
              const effectiveQuantity = isWeightItem
                ? parseFloat(item.count || item.quantity || 0)
                : (item.quantity || item.count || 1);

              // عرض الكمية في عمود "Item"
              const displayQuantityText = isWeightItem
                ? `${effectiveQuantity.toFixed(3)} kg`
                : `${effectiveQuantity}`;

              // حساب التوتال الصحيح (price × الكمية الفعلية)
              const itemTotalPrice = (
                parseFloat(item.final_price || 0) * effectiveQuantity
              ).toFixed(2);

              return (
                <ItemRow
                  key={item.temp_id || `${item.id}-${index}`}
                  item={item}
                  orderType={orderType}
                  selectedItems={selectedItems}
                  toggleSelectItem={onToggleSelectItem}
                  selectedPaymentItems={selectedPaymentItems}
                  toggleSelectPaymentItem={onToggleSelectPaymentItem}
                  handleIncrease={onIncrease}
                  handleDecrease={onDecrease}
                  allowQuantityEdit={allowQuantityEdit}
                  itemLoadingStates={itemLoadingStates}
                  handleUpdatePreparationStatus={onUpdateStatus}
                  handleVoidItem={onVoidItem}
                  handleRemoveFrontOnly={onRemoveFrontOnly}
                  updateOrderItems={updateOrderItems}
                  orderItems={orderItems}
                  // ✅ بروبس جديدة للـ ItemRow عشان يعرض صح
                  isWeightItem={isWeightItem}
                  displayQuantityText={displayQuantityText}
                  itemTotalPrice={itemTotalPrice}
                  effectiveQuantity={effectiveQuantity}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}