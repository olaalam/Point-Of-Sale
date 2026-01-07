{/* ProductModal.jsx - With Weight Support, Duplicate Check, and Notes */}

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

// Helper function to calculate total price including variations, extras, and addons
const calculateProductTotalPrice = (
  baseProduct,
  selectedVariation = {},
  selectedExtras = [],
  quantity = 1,
  productType = "piece"
) => {
  const isWeightProduct = productType === "weight" || baseProduct.weight_status === 1;

  // 1. السعر الأساسي + المتغيرات (هي اللي هتتضرب في الوزن)
  let mainPrice = parseFloat(baseProduct.price_after_discount || baseProduct.price || 0);

  // إضافة أسعار المتغيرات (Variations)
  if (baseProduct.variations && Object.keys(selectedVariation).length > 0) {
    baseProduct.variations.forEach(variation => {
      const selected = selectedVariation[variation.id];
      if (selected !== undefined) {
        if (variation.type === 'single') {
          const opt = variation.options?.find(o => o.id === selected);
          if (opt) {
            mainPrice += parseFloat(opt.price_after_tax || opt.price || 0);
          }
        } else if (variation.type === 'multiple') {
          const arr = Array.isArray(selected) ? selected : [selected];
          arr.forEach(id => {
            const opt = variation.options?.find(o => o.id === id);
            if (opt) mainPrice += parseFloat(opt.price_after_tax || opt.price || 0);
          });
        }
      }
    });
  }

  // 2. حساب الإضافات (Extras + Addons) → ثابتة في المنتجات بالوزن
  let extrasPrice = 0;
  if (selectedExtras?.length > 0) {
    const counts = {};
    selectedExtras.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });

    Object.entries(counts).forEach(([idStr, count]) => {
      const id = parseInt(idStr);
      let item = baseProduct.allExtras?.find(e => e.id === id) ||
                 baseProduct.addons?.find(a => a.id === id);

      if (item) {
        const price = parseFloat(
          item.price_after_discount ||
          item.price_after_tax ||
          item.price ||
          0
        );
        extrasPrice += price * count;
      }
    });
  }

  // 3. النتيجة النهائية
  if (isWeightProduct) {
    // المنتج + المتغيرات × الوزن + الإضافات (ثابتة)
    return (mainPrice * quantity) + extrasPrice;
  } else {
    // كل شيء × الكمية
    return (mainPrice + extrasPrice) * quantity;
  }
};

// ✅ تحديث دالة المقارنة لتشمل الـ Addons
export const areProductsEqual = (product1, product2) => {
  // 1. فحص الـ ID الأساسي
  if (product1.id !== product2.id) return false;

  // 2. فحص المتغيرات (Variations)
  const vars1 = product1.selectedVariation || {};
  const vars2 = product2.selectedVariation || {};
  if (JSON.stringify(vars1) !== JSON.stringify(vars2)) return false;

  // 3. فحص الملاحظات (Notes)
  if ((product1.notes || "").trim() !== (product2.notes || "").trim()) return false;

  // 4. فحص المحذوفات (Excludes)
  const excl1 = [...(product1.selectedExcludes || [])].sort().join(",");
  const excl2 = [...(product2.selectedExcludes || [])].sort().join(",");
  if (excl1 !== excl2) return false;

  // 5. فحص الإضافات (Extras)
  const ext1 = [...(product1.selectedExtras || [])].sort().join(",");
  const ext2 = [...(product2.selectedExtras || [])].sort().join(",");
  if (ext1 !== ext2) return false;

  // 6. 🔥 الإصلاح المطلوب: فحص الـ Addons
  // نحول الـ addons لشكل نصي مرتب للمقارنة (لأنها مصفوفة أوبجكتات)
  const add1 = JSON.stringify((product1.addons || []).sort((a, b) => a.addon_id - b.addon_id));
  const add2 = JSON.stringify((product2.addons || []).sort((a, b) => a.addon_id - b.addon_id));
  
  if (add1 !== add2) return false;

  return true;
};

const ProductModal = ({
  isOpen,
  onClose,
  selectedProduct,
  selectedVariation = {},
  selectedExtras = [],
  selectedExcludes = [],
  quantity,
  validationErrors = {},
  hasErrors = false,
  onVariationChange,
  onExtraChange,
  onExtraDecrement,
  onExclusionChange,
  onQuantityChange,
  onAddFromModal,
  orderLoading,
  productType = "piece",
}) => {
  // ✅ State for notes
  const [notes, setNotes] = useState("");
const { t , i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  if (!selectedProduct) return null;

  const isWeightProduct = productType === "weight" || selectedProduct.weight_status === 1;

  const totalPrice = calculateProductTotalPrice(
    selectedProduct,
    selectedVariation,
    selectedExtras,
    quantity,
    productType
  );

  const hasVariations =
    selectedProduct.variations && selectedProduct.variations.length > 0;
  const hasAddons = selectedProduct.addons && selectedProduct.addons.length > 0;
  const hasExtras =
    selectedProduct.allExtras && selectedProduct.allExtras.length > 0;
  const hasExcludes =
    selectedProduct.excludes && selectedProduct.excludes.length > 0;

  const getExtraCount = (extraId) => {
    return selectedExtras.filter((id) => id === extraId).length;
  };

  const handleExtraIncrement = (extraId) => {
    onExtraChange(extraId);
  };

  const handleExtraDecrement = (extraId) => {
    if (onExtraDecrement && getExtraCount(extraId) > 0) {
      onExtraDecrement(extraId);
    }
  };

  const getVariationOptionDisplay = (option) => {
    const price = parseFloat(option.price_after_tax || option.price || 0);
    if (price === 0) {
      return `${option.name}`;
    }
    return `${option.name} (+${price.toFixed(2)} EGP)`;
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        onQuantityChange(numValue);
      } else if (value === '') {
        onQuantityChange(0);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      setNotes(""); // Clear notes on close
      onClose();
    }}>
      <DialogContent className="w-[90vw] !max-w-[500px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
          <div className="relative">
            <img
              src={
                selectedProduct.image_link || "https://via.placeholder.com/400"
              }
              alt={selectedProduct.name}
              className="w-full h-48 object-cover"
            />
            <button
              onClick={() => {
                setNotes("");
                onClose();
              }}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4 flex-1">
            <div className="flex justify-between items-center mb-2">
              <DialogTitle className="text-xl font-bold text-gray-800">
                {selectedProduct.name}
              </DialogTitle>
              <span className="text-xl font-semibold text-red-600">
                {totalPrice.toFixed(2)} {t("EGP")}
              </span>
            </div>
            <DialogDescription className="text-gray-500 text-sm mb-4">
              {selectedProduct.description &&
              selectedProduct.description !== "null"
                ? selectedProduct.description
                : t("Nodescriptionavailable")}
            </DialogDescription>

            {/* Variations section */}
            {hasVariations && (
              <div className="mb-4">
                {selectedProduct.variations.map((variation) => (
                  <div key={variation.id} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {variation.name}
                      {variation.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {variation.type === "multiple" && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({t("Min")}: {variation.min || 0}, {t("Max")}: {variation.max || "∞"})
                        </span>
                      )}
                    </h4>
                    {validationErrors[variation.id] && (
                      <p className="text-red-500 text-xs mb-2">
                        {validationErrors[variation.id]}
                      </p>
                    )}

                    {/* Single-select variations */}
{/* Single-select variations - using button style like excludes */}
{variation.type === "single" && variation.options && (
  <div className="flex flex-wrap gap-2">
    {variation.options.map((option) => {
      const isSelected = selectedVariation[variation.id] === option.id;

      return (
        <button
          key={option.id}
          onClick={() => onVariationChange(variation.id, option.id)}
          className={`flex flex-col items-center justify-center px-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
            ${
              isSelected
                ? "bg-red-600 text-white border-red-600 scale-105"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
            }`}
        >
          <span className="capitalize">{option.name}</span>
          {parseFloat(option.price_after_tax || option.price || 0) > 0 && (
            <span className="text-xs">
              +{(option.price_after_tax || option.price).toFixed(2)} EGP
            </span>
          )}
        </button>
      );
    })}
  </div>
)}


                    {/* Multi-select variations - with counters */}
                    {variation.type === "multiple" && variation.options && (
                      <div className="space-y-3">
                        {variation.options.map((option) => {
                          const selectedOptions =
                            selectedVariation[variation.id] || [];
                          const optionCount = selectedOptions.filter(
                            (id) => id === option.id
                          ).length;
                          const totalSelected = selectedOptions.length;

                          const canDecrease =
                            totalSelected > (variation.min || 0);
                          const canIncrease =
                            !variation.max || totalSelected < variation.max;

                          return (
                            <div
                              key={option.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {option.name}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {parseFloat(option.price_after_tax || option.price || 0) === 0 
                                    ? "Free"
                                    : `+${(option.price_after_tax || option.price).toFixed(2)} EGP`
                                  }
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                                  onClick={() =>
                                    onVariationChange(
                                      variation.id,
                                      option.id,
                                      "remove"
                                    )
                                  }
                                  disabled={optionCount === 0 || !canDecrease}
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="text-sm font-semibold w-8 text-center">
                                  {optionCount}
                                </span>
                                <button
                                  className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                                  onClick={() =>
                                    onVariationChange(
                                      variation.id,
                                      option.id,
                                      "add"
                                    )
                                  }
                                  disabled={!canIncrease}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Extras section - with counters */}
            {hasExtras && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
{t("ExtrasOptional")}      
          </h4>
                <div className="space-y-3">
                  {selectedProduct.allExtras.map((extra, index) => {
                    const count = getExtraCount(extra.id);

                    return (
                      <div
                        key={`extra-${index}`}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {extra.name}
                          </span>
                          <div className="text-xs text-gray-500">
                            {extra.price > 0
                              ? `+${(
                                  extra.price_after_discount ??
                                  extra.price ??
                                  0
                                ).toFixed(2)} ${t("EGP")}`
                              : t("Free")}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                            onClick={() => handleExtraDecrement(extra.id)}
                            disabled={count === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">
                            {count}
                          </span>
                          <button
                            className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                            onClick={() => handleExtraIncrement(extra.id)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons section - with counters */}
{hasAddons && (
  <div className="mb-4">
    <h4 className="text-sm font-semibold text-gray-700 mb-3">
      {t("AddonsOptional")} 
    </h4>
    <div className="space-y-3">
      {selectedProduct.addons.map((addon, index) => {
        const count = getExtraCount(addon.id);

        return (
          <div
            key={`addon-${index}`}
            className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
          >
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 capitalize">
                {addon.name}
              </span>
              <div className="text-xs text-gray-500">
                +{(
                  addon.price_after_tax ??     
                  addon.price_after_discount ??
                  addon.price ??
                  0
                ).toFixed(2)}{" "}
                {t('EGP')}
                {addon.tax && (              
                  <span className="ml-1 text-xs text-gray-400">
                    ({t("inclTax")})       
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                onClick={() => handleExtraDecrement(addon.id)}
                disabled={count === 0}
              >
                <Minus size={16} />
              </button>
              <span className="text-sm font-semibold w-8 text-center">
                {count}
              </span>
              <button
                className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                onClick={() => handleExtraIncrement(addon.id)}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

            {/* Excludes section */}
            {hasExcludes && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                 {t("ExcludeOptional")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.excludes.map((item, index) => (
                    <button
                      key={`exclude-${index}`}
                      onClick={() => onExclusionChange(item.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
                        ${
                          selectedExcludes.includes(item.id)
                            ? "bg-red-600 text-white border-red-600 scale-105"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                        }`}
                    >
                      <span className="capitalize line-through">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Notes Section */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
{t("SpecialInstructionsOptional")}
              </h4>
              <Textarea
  placeholder={t("AddSpecialInstructions")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/200 {t("characters")}
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold">
                {t("Total")}{" "}
                <span className="text-red-600">
                  {totalPrice.toFixed(2)} {t("EGP")}
                </span>
              </div>
              
              {/* Quantity selector - different for weight vs piece */}
              {isWeightProduct ? (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t("Weight")} (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity || ''}
                    onChange={handleWeightChange}
                    placeholder="0.00"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-base font-semibold">{quantity}</span>
                  <button
                    className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
<Button
  data-enter
  onClick={() => {
    const totalUnitPrice = calculateProductTotalPrice(
      selectedProduct,
      selectedVariation,
      selectedExtras,
      1
    );

    // 🟦 فلترة الـ extras: IDs موجودة فقط في allExtras
    const filteredExtras = selectedExtras.filter(id => 
      (selectedProduct.allExtras || []).some(e => e.id === id)
    );

    // 🟧 فلترة الـ addons: IDs موجودة فقط في addons_list
    const filteredAddons = selectedExtras.filter(id => 
      (selectedProduct.addons || []).some(a => a.id === id)
    );

    // 🟨 بناء addons للباك إند
    const addonsForBackend = filteredAddons.map(addonId => {
      const src = (selectedProduct.addons || []).find(a => a.id === addonId);
      return {
        addon_id: addonId,
        quantity: 1,
        price: src ? parseFloat(
          src.price_after_discount ||
          src.price_after_tax ||
          src.price ||
          0
        ) : 0,
      };
    });

    // 👇 بناء المنتج النهائي
const enhancedProduct = {
      ...selectedProduct,
      temp_id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      selectedVariation,
      selectedExtras: filteredExtras,
      selectedExcludes,
      quantity,
      notes: notes.trim(),
      
      // ❌ الخطأ كان هنا: كنت ترسل السعر المحسوب (totalUnitPrice) كأنه السعر الأساسي
      // price: totalUnitPrice, 

      // ✅ الصح: أرسل السعر الأصلي للمنتج فقط، ودع Item.jsx يحسب الإضافات
      price: selectedProduct.price_after_discount || selectedProduct.price || 0,

      // يمكنك الاحتفاظ بالسعر المحسوب في متغير آخر لو احتجته للعرض فقط
      modalCalculatedPrice: totalUnitPrice, 
      
      originalPrice: selectedProduct.price,
      totalPrice: totalUnitPrice * quantity, // هذا للعرض فقط
      addons: addonsForBackend,
      allExtras: selectedProduct.allExtras,
      addons_list: selectedProduct.addons,
      variations: (selectedProduct.variations || []).map(group => ({
        ...group,
        selected_option_id: Array.isArray(selectedVariation[group.id])
          ? selectedVariation[group.id]
          : selectedVariation[group.id] || null
      })),
    };

    // إرسال للكارت
    onAddFromModal(enhancedProduct, { checkDuplicate: true });
    setNotes("");
    onClose();
  }}
  disabled={orderLoading || hasErrors || (isWeightProduct && (!quantity || quantity <= 0))}
  className="w-full"
>
  {orderLoading ? t("Adding") : t("AddtoCart")}
</Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;