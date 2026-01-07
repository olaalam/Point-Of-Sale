import React from "react";
import { PREPARATION_STATUSES } from "./constants";
import { Trash2, FileText } from "lucide-react";
import ProductDetailModalWrapper from "./ProductDetailModalWrapper";

/**
 * 🟢 دالة حساب الإضافات (Addons + Extras)
 * تم تعديلها لتتعامل مع حالتين: 
 * 1. الإضافات الموجودة مباشرة ككائنات في مصفوفة addons.
 * 2. الـ Extras التي تأتي كـ IDs وتحتاج بحث في allExtras.
 */
const calculateAddonsTotal = (item) => {
  let total = 0;

  // 1. حساب الـ Addons (مثل fries, sauce, etc.)
  if (item.addons && Array.isArray(item.addons)) {
    item.addons.forEach((ad) => {
      // نتحقق أن الإضافة مختارة (بناءً على وجود selected أو كمية أو كونها مضافة يدوياً)
      // في بيانات Margherita الأخيرة كانت الإضافات تظهر بدون selected، لذا نعتمد على الكمية أو منطق الـ UI
      const isSelected = ad.selected === true || (ad.quantity > 0 && ad.price > 0);
      
      if (isSelected) {
        // نستخدم price_after_tax لو وجد، وإلا السعر العادي
        const adPrice = Number(ad.price_after_tax || ad.price || 0);
        total += adPrice * Number(ad.quantity || 1);
      }
    });
  }

  // 2. حساب الـ Extras (مثل Medium Shrimp, etc.)
  if (item.selectedExtras && Array.isArray(item.selectedExtras)) {
    item.selectedExtras.forEach((extraId) => {
      const extraData = item.allExtras?.find((e) => e.id === extraId);
      if (extraData) {
        total += Number(extraData.price_after_tax || extraData.price_after_discount || extraData.price || 0);
      }
    });
  }

  return total;
};

const ItemRow = ({
  item,
  orderType,
  selectedItems,
  toggleSelectItem,
  selectedPaymentItems,
  itemLoadingStates,
  handleUpdatePreparationStatus,
  toggleSelectPaymentItem,
  handleVoidItem,
  handleRemoveFrontOnly,
  updateOrderItems,
  orderItems
}) => {
  if (!item) return null;

  const statusInfo = PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;
  const isItemLoading = itemLoadingStates[item.temp_id] || false;

// ==========================================
// 🟢 حساب الأسعار بدقة (Logic) - النسخة المصححة
// ==========================================

// 1. هل المنتج بالوزن؟
const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
// 2. سعر الوحدة الأساسي (سعر الكيلو أو سعر القطعة الواحدة)
let unitBasePrice = Number(item.price_after_discount || item.price || 0);
// حالة الـ Variation (مثل Large / Small)
const selectedOptionId = item.variations?.[0]?.selected_option_id;
const selectedOption = item.variations?.[0]?.options?.find(opt => opt.id === selectedOptionId);

if (selectedOption) {
  unitBasePrice = Number(
    selectedOption.total_option_price ||
    selectedOption.price_after_tax ||
    selectedOption.price_after_discount ||
    selectedOption.price ||
    0
  );
}

let hasDiscount = false;
let originalUnitBasePrice = Number(item.price || 0);

if (selectedOption) {
  hasDiscount = Number(selectedOption.discount_val || 0) > 0;
  originalUnitBasePrice = hasDiscount
    ? unitBasePrice + Number(selectedOption.discount_val || 0)
    : unitBasePrice;
} else {
  const priceAfterDisc = Number(item.price_after_discount || 0);
  const normalPrice = Number(item.price || 0);
  hasDiscount = priceAfterDisc > 0 && priceAfterDisc < normalPrice;
  originalUnitBasePrice = normalPrice;
}

// 3. حساب الإضافات (addons + extras) → ثابتة في حالة الوزن
const addonsTotal = calculateAddonsTotal(item);
let finalUnitPrice;
// 4. سعر الوحدة النهائي اللي هيظهر في عمود "Price"
//    ──────────────────────────────────────────────────────
if (isWeightProduct) {
  // ────────────────────── الحل المهم ──────────────────────
  // سعر الكيلو + الإضافات الثابتة (مش بتتضرب في الوزن)
  finalUnitPrice = unitBasePrice + addonsTotal;
} else {
  // المنتجات العادية: كل حاجة تتضرب في الكمية لاحقًا
  finalUnitPrice = unitBasePrice + addonsTotal;
}
// 5. الكمية / الوزن
const quantity = isWeightProduct 
  ? Number(item.quantity || 0) 
  : Number(item.count || 1);

  let displayedUnitPrice = isWeightProduct
  ? unitBasePrice  // بس سعر الكيلو الأساسي (بدون إضافات)
  : unitBasePrice + addonsTotal;

  let displayedOriginalUnitPrice = isWeightProduct
  ? originalUnitBasePrice
  : originalUnitBasePrice + addonsTotal;

// 6. الإجمالي النهائي للسطر (اللي في عمود Total)
const totalPrice = isWeightProduct
  ? (unitBasePrice * quantity + addonsTotal).toFixed(2)
  : (displayedUnitPrice * quantity).toFixed(2);



  return (
    <tr className={`border-b last:border-b-0 hover:bg-gray-50 ${item.type === "addon" ? "bg-blue-50" : ""} ${selectedPaymentItems?.includes(item.temp_id) ? "bg-green-50" : ""}`}>
      
      {/* اختيار العنصر (Dine-in) */}
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

      {/* اسم المنتج وتفاصيله */}
      <td className="p-2 text-left align-top">
        <ProductDetailModalWrapper product={item} updateOrderItems={updateOrderItems} orderItems={orderItems}>
          <div className="flex flex-col gap-1">
            <div className="text-gray-800 font-medium hover:text-red-600 cursor-pointer transition-colors leading-tight">
              <span className="text-bg-primary font-bold mr-1.5 bg-red-50 px-1 rounded">
                {item.weight_status === 1 ? `${quantity}kg` : `${quantity}x`}
              </span>
              <span className="text-[14px]">{item.name || item.product_name || "Unknown Product"}</span>
            </div>

            {/* تفاصيل الاختيارات (Variations/Addons/Extras) */}
            <div className="flex flex-wrap gap-1 mt-0.5">
              {selectedOption && (
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">
                  {selectedOption.name}
                </span>
              )}
              {item.addons?.filter(ad => ad.selected || ad.quantity > 0).map((ad, i) => (
                <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                  +{ad.name || item.addons_list?.find(l => l.id === ad.addon_id)?.name || 'Addon'}
                </span>
              ))}
              {item.selectedExtras?.map((exId, i) => (
                <span key={i} className="text-[10px] text-green-600 bg-green-50 px-1 rounded">
                  +{item.allExtras?.find(e => e.id === exId)?.name || 'Extra'}
                </span>
              ))}
            </div>

            {/* ملاحظات المنتج */}
            {item.notes && item.notes.trim() !== "" && (
              <div className="text-[10px] text-orange-600 italic flex items-center gap-1 mt-1">
                <FileText size={10} />
                <span>{item.notes}</span>
              </div>
            )}
          </div>
        </ProductDetailModalWrapper>
      </td>

      {/* عمود سعر الوحدة */}
<td className="py-3 px-4 text-center align-top">
  <div className="flex flex-col items-center">
    <span className={hasDiscount ? "text-red-600 font-bold" : "font-medium"}>
      {displayedUnitPrice.toFixed(2)}
    </span>
    {hasDiscount && (
      <span className="text-xs text-gray-400 line-through">
        {displayedOriginalUnitPrice.toFixed(2)}
      </span>
    )}
  </div>
</td>
      {/* حالة التحضير (Dine-in) */}
      {orderType === "dine_in" && (
        <td className="p-2 text-center align-middle">
          <button
            onClick={() => handleUpdatePreparationStatus(item.temp_id)}
            className={`p-1.5 rounded-full ${statusInfo.color} transition-colors`}
            disabled={isItemLoading}
          >
            {isItemLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent animate-spin rounded-full" />
            ) : (
              <StatusIcon size={16} />
            )}
          </button>
        </td>
      )}
{orderType === "dine_in" && (
  <td className="p-2 text-center align-middle">
    {/* يظهر الـ checkbox فقط إذا كانت الحالة 'done' */}
    {item.preparation_status === "done" ? (
      <input
        type="checkbox"
        checked={selectedPaymentItems?.includes(item.temp_id)}
        onChange={() => toggleSelectPaymentItem(item.temp_id)}
        className="w-5 h-5 accent-green-600 cursor-pointer"
      />
    ) : (
      <span className="text-gray-300 text-xs italic">{("Wait")}</span>
    )}
  </td>
)}
      {/* السعر الإجمالي للعنصر */}
<td className="p-2 text-center align-middle">
  <span className="font-bold text-gray-900 text-sm">{totalPrice}</span>
</td>

      {/* عمليات الحذف */}
      <td className="p-2 text-center align-middle">
        <button
          onClick={() => orderType === "dine_in" ? handleVoidItem(item.temp_id) : handleRemoveFrontOnly(item.temp_id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

export default ItemRow;