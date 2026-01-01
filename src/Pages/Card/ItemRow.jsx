import React from "react";
import { PREPARATION_STATUSES } from "./constants";
import { Trash2, FileText } from "lucide-react";
import ProductDetailModalWrapper from "./ProductDetailModalWrapper";

// دالة لحساب سعر الإضافات فقط
const calculateAddonsTotal = (item) => {
  let addonsTotal = 0;

  // 1. Variations Addons
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

  // 2. Extras
  if (item.extras && Array.isArray(item.extras)) {
    item.extras.forEach((extra) => {
      addonsTotal += Number(extra.price || 0) * (extra.quantity || 1);
    });
  }

  return addonsTotal;
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
  allowQuantityEdit,
  orderItems
}) => {
  if (!item) return null;

  const statusInfo = PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;
  const isItemLoading = itemLoadingStates[item.temp_id] || false;

  // ==========================================
  // 🟢 1. تصحيح منطق الأسعار (The Fix)
  // ==========================================
  
  // تحويل القيم لأرقام صريحة أولاً لتجنب مشكلة النصوص
  const rawPrice = Number(item.price || 0); 
  const rawDiscountPrice = Number(item.price_after_discount || 0);

  // تحديد هل يوجد خصم فعلي؟ (لازم يكون رقم أكبر من صفر وأقل من السعر الأصلي)
  const hasDiscount = rawDiscountPrice > 0 && rawDiscountPrice < rawPrice;

  // تحديد السعر الأساسي للوحدة (بدون إضافات)
  // لو في خصم نستخدمه، غير كدة نستخدم السعر الأصلي
  const baseUnitPrice = hasDiscount ? rawDiscountPrice : rawPrice;

  // حساب سعر الإضافات (لطلبات الصالة Dine-in)
  const addonsPrice = calculateAddonsTotal(item);

  // السعر النهائي للوحدة (شامل الإضافات لو موجودة)
  const finalUnitPrice = orderType === "dine_in" 
    ? baseUnitPrice + addonsPrice 
    : baseUnitPrice;

  // الكمية
  const quantity = item.weight_status === 1 
    ? Number(item.quantity || item.count || 1)
    : Number(item.count || 1);

  // الإجمالي
  const totalPrice = (finalUnitPrice * quantity).toFixed(2);

  // ==========================================

  return (
    <tr className={`border-b last:border-b-0 hover:bg-gray-50 ${item.type === "addon" ? "bg-blue-50" : ""} ${selectedPaymentItems.includes(item.temp_id) ? "bg-green-50" : ""}`}>
      
      {/* Checkbox for Dine-in */}
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

      {/* Product Name & Details */}
      <td className="p-2 text-left align-top">
        <ProductDetailModalWrapper
          product={item}
          updateOrderItems={updateOrderItems}
          orderItems={orderItems}
        >
          <div className="flex flex-col gap-1">
            <div className="text-gray-800 font-medium hover:text-red-600 cursor-pointer transition-colors leading-tight">
              <span className="text-bg-primary font-bold mr-1.5 bg-red-50 px-1 rounded">
                {item.weight_status === 1 ? `${item.quantity}kg` : `${item.count}x`}
              </span>
{/* التعديل الجوهري لعرض الاسم */}
<span className="text-[14px]">
  {
    item.name || 
    item.product_name || 
    item.product?.[0]?.product?.name || 
    "Unknown Productييي"
  }
</span>
            </div>

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
              
              {item.addons?.map((addon) => 
                addon.options?.filter(opt => opt.selected || opt.quantity > 0).map((opt, idx) => (
                  <span key={idx} className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                    +{opt.name}
                  </span>
                ))
              )}
            </div>

            {item.notes && item.notes.trim() !== "" && (
              <div className="text-[10px] text-orange-600 italic flex items-center gap-1 mt-1">
                <FileText size={10} />
                <span>{item.notes}</span>
              </div>
            )}
          </div>
        </ProductDetailModalWrapper>
      </td>

      {/* Price Column */}
      <td className="py-3 px-4 text-center align-top">
        <div className="flex flex-col items-center">
          {/* عرض السعر المستخدم حالياً (أحمر لو فيه خصم) */}
          <span className={hasDiscount ? "text-red-600 font-bold" : "font-medium"}>
            {finalUnitPrice.toFixed(2)}
          </span>
          
          {/* عرض السعر القديم مشطوب (لو فيه خصم) */}
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {(rawPrice + (orderType === "dine_in" ? addonsPrice : 0)).toFixed(2)}
            </span>
          )}

          {item.tax_obj && (
            <div className="text-[10px] text-blue-600 mt-1">
              {item.taxes === "excluded" ? "+Tax" : "Inc. Tax"}
            </div>
          )}
        </div>
      </td>

      {/* Status (Dine-in only) */}
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

      {/* Total Price */}
      <td className="p-2 text-center align-middle">
        <span className="font-bold text-gray-900 text-sm">
          {totalPrice}
        </span>
      </td>

      {/* Actions */}
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