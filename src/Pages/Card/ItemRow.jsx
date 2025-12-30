// ItemRow.jsx - نسخة معدلة: الكمية مدمجة مع الاسم وتصميم مبسط
import React from "react";
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

  // حساب الـ Extras
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
  itemLoadingStates,
  handleUpdatePreparationStatus,
  handleVoidItem,
  handleRemoveFrontOnly,
  updateOrderItems,
  handleIncrease,
  handleDecrease,
  allowQuantityEdit,
  orderItems
}) => {
  console.log("ItemRow → Rendering item:", item);
  const statusInfo = PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;

  const hasDiscount = item.discount && typeof item.discount === "object";
  const isItemLoading = itemLoadingStates[item.temp_id] || false;
  const isDoneItem = item.preparation_status === "done";

  if (!item) return null;

  // حساب السعر النهائي للوحدة
  const finalUnitPrice = orderType === "dine_in"
    ? calculatePriceWithAddons(item)  
    : Number(item.price) || 0;       

  const safePrice = Number(finalUnitPrice.toFixed(2));
    const safeOriginalPrice = Number(item.originalPrice || item.price || 0).toFixed(2);


  // الكمية المستخدمة في الحساب
  const quantityForCalc = item.weight_status === 1 
    ? Number(item.quantity || item.count || 1)
    : Number(item.count || 1);

  // إجمالي السعر النهائي للسطر
  const totalPrice = (safePrice * quantityForCalc).toFixed(2);

  return (
    <tr className={`border-b last:border-b-0 hover:bg-gray-50 ${item.type === "addon" ? "bg-blue-50" : ""} ${selectedPaymentItems.includes(item.temp_id) ? "bg-green-50" : ""}`}>
      
      {/* 1. اختيار العناصر (Dine-in Only) */}
      {orderType === "dine_in" && (
        <td className="p-2 text-center align-middle">
          <input
            type="checkbox"
            checked={selectedItems.includes(item.temp_id)}
            onChange={() => toggleSelectItem(item.temp_id)}
            className="w-4 h-4 accent-bg-primary"
          />
        </td>
      )}

      {/* 2. اسم المنتج مدمج معه الكمية والـ Addons */}
      <td className="p-2 text-left align-top">
        <ProductDetailModalWrapper
          product={item}
          updateOrderItems={updateOrderItems}
          orderItems={orderItems}
        >
          <div className="flex flex-col gap-1">
            <div className="text-gray-800 font-medium hover:text-red-600 cursor-pointer transition-colors leading-tight">
              {/* عرض الكمية بجانب الاسم مباشرة */}
              <span className="text-bg-primary font-bold mr-1.5 bg-red-50 px-1 rounded">
                {item.weight_status === 1 ? `${item.quantity}kg` : `${item.count}x`}
              </span>
              <span className="text-[14px]">{item.name}</span>
            </div>

            {/* Variations & Addons في سطر واحد صغير لتوفير المساحة */}
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.variations?.map((group, i) => {
                const selected = Array.isArray(group.selected_option_id)
                  ? group.options?.find(opt => group.selected_option_id.includes(opt.id))
                  : group.options?.find(opt => opt.id === group.selected_option_id);
                return selected ? (
                  <span key={i} className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">
                    {selected.name}
                  </span>
                ) : null;
              })}
              
              {/* عرض الـ Addons المختارة */}
              {item.addons?.map((addon) => 
                addon.options?.filter(opt => opt.selected || opt.quantity > 0).map((opt, idx) => (
                  <span key={idx} className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                    +{opt.name}
                  </span>
                ))
              )}
            </div>

            {/* الملاحظات بصورة مصغرة */}
            {item.notes && item.notes.trim() !== "" && (
              <div className="text-[10px] text-orange-600 italic flex items-center gap-1 mt-1">
                <FileText size={10} />
                <span>{item.notes}</span>
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


      {/* 3. حالة التحضير (Dine-in Only) */}
      {orderType === "dine_in" && (
        <td className="p-2 text-center align-middle">
          <button
            onClick={() => handleUpdatePreparationStatus(item.temp_id)}
            className={`p-1.5 rounded-full ${statusInfo.color} hover:bg-opacity-80 transition-colors ${isItemLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isItemLoading}
          >
            {isItemLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-current rounded-full animate-spin"></div>
            ) : (
              <StatusIcon size={16} />
            )}
          </button>
        </td>
      )}

      {/* 4. السعر الإجمالي (Total) */}
      <td className="p-2 text-center align-middle">
        <div className="flex flex-col items-center">
          <span className="font-bold text-gray-900 text-sm">
            {totalPrice}
          </span>
          {/* إظهار علامة الضريبة لو وجدت بشكل مصغر */}
          {item.tax_val > 0 && (
            <span className="text-[9px] text-blue-500">inc. tax</span>
          )}
        </div>
      </td>

      {/* 5. حذف أو Void */}
      <td className="p-2 text-center align-middle">
        <button
          onClick={() => orderType === "dine_in" ? handleVoidItem(item.temp_id) : handleRemoveFrontOnly(item.temp_id)}
          className={`p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors ${isItemLoading && orderType === "dine_in" ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isItemLoading && orderType === "dine_in"}
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

export default ItemRow;