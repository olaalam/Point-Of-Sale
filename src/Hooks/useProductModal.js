import { useState, useEffect } from "react";

export const useProductModal = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  const openProductModal = (product) => {
    setSelectedProduct(product);
    const initialSelectedVariations = {};

    if (product.variations && product.variations.length > 0) {
      product.variations.forEach((variation) => {
        if (variation.type === "single" && variation.options.length > 0) {
          // نختار أول خيار افتراضياً للنوع Single
          initialSelectedVariations[variation.id] = variation.options[0].id;
        } else if (variation.type === "multiple") {
          initialSelectedVariations[variation.id] = [];
        }
      });
    }

    setSelectedVariation(initialSelectedVariations);
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setQuantity(1);
    setTotalPrice(0);
    setValidationErrors({});
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  const handleVariationChange = (variationId, optionId, action = "toggle", value = null) => {
    setSelectedVariation((prev) => {
      const variation = selectedProduct.variations.find((v) => v.id === variationId);
      if (!variation) return prev;

      if (variation.type === "single") {
        return { ...prev, [variationId]: optionId };
      } else {
        // للمتغيرات المتعددة
        if (action === "set" && value !== null) {
          // للمتغيرات بالوزن، نحفظ القيمة (يمكن أن تكون string أثناء الكتابة أو number)
          const currentOptions = prev[variationId] || [];
          const existingIndex = currentOptions.findIndex(opt => 
            typeof opt === 'object' ? opt.optionId === optionId : opt === optionId
          );
          
          // إذا كانت القيمة نصية (مثل "0." أو ".5" أثناء الكتابة)، نسمح بها مؤقتًا
          if (typeof value === 'string') {
            // نتحقق إذا كانت تنتهي بنقطة أو تبدأ بنقطة (حالات مؤقتة أثناء الكتابة)
            if (value === '0' || value === '0.' || value === '.' || value.endsWith('.') || value.startsWith('.')) {
              if (existingIndex >= 0) {
                const newOptions = [...currentOptions];
                newOptions[existingIndex] = { optionId, value: value };
                return { ...prev, [variationId]: newOptions };
              } else {
                return { ...prev, [variationId]: [...currentOptions, { optionId, value: value }] };
              }
            }
            
            // محاولة تحويلها لرقم
            const numericValue = parseFloat(value);
            if (isNaN(numericValue) || numericValue <= 0) {
              // إذا كانت القيمة غير صالحة، نحذف الـ option
              if (existingIndex >= 0) {
                const newOptions = [...currentOptions];
                newOptions.splice(existingIndex, 1);
                return { ...prev, [variationId]: newOptions };
              }
              return prev;
            }
            value = numericValue; // نحولها لرقم للحفظ النهائي
          }
          
          // التأكد من أن القيمة رقمية صحيحة
          const numericValue = typeof value === 'number' ? value : parseFloat(value);
          if (isNaN(numericValue) || numericValue <= 0) {
            // إذا كانت القيمة غير صالحة، نحذف الـ option
            if (existingIndex >= 0) {
              const newOptions = [...currentOptions];
              newOptions.splice(existingIndex, 1);
              return { ...prev, [variationId]: newOptions };
            }
            return prev;
          }
          
          if (existingIndex >= 0) {
            // تحديث القيمة الموجودة
            const newOptions = [...currentOptions];
            newOptions[existingIndex] = { optionId, value: numericValue };
            return { ...prev, [variationId]: newOptions };
          } else {
            // إضافة قيمة جديدة
            return { ...prev, [variationId]: [...currentOptions, { optionId, value: numericValue }] };
          }
        }
        
        if (action === "add") {
          const currentOptions = prev[variationId] || [];
          const maxAllowed = variation.max || Infinity;
          return currentOptions.length < maxAllowed 
            ? { ...prev, [variationId]: [...currentOptions, optionId] }
            : prev;
        }
        
        if (action === "remove") {
          const currentOptions = prev[variationId] || [];
          return { ...prev, [variationId]: currentOptions.filter(opt => 
            typeof opt === 'object' ? opt.optionId !== optionId : opt !== optionId
          ) };
        }
        
        // الـ toggle الافتراضي
        const currentOptions = prev[variationId] || [];
        const isSelected = currentOptions.some(opt => 
          typeof opt === 'object' ? opt.optionId === optionId : opt === optionId
        );
        
        if (isSelected) {
          return { ...prev, [variationId]: currentOptions.filter(opt => 
            typeof opt === 'object' ? opt.optionId !== optionId : opt !== optionId
          ) };
        } else {
          const maxAllowed = variation.max || Infinity;
          return currentOptions.length < maxAllowed 
            ? { ...prev, [variationId]: [...currentOptions, optionId] }
            : prev;
        }
      }
    });
  };

  const handleExtraChange = (extraId) => {
    setSelectedExtras((prev) => [...prev, extraId]);
  };

  const handleExtraDecrement = (extraId) => {
    setSelectedExtras((prev) => {
      const index = prev.indexOf(extraId);
      if (index > -1) {
        const newExtras = [...prev];
        newExtras.splice(index, 1);
        return newExtras;
      }
      return prev;
    });
  };

  const handleExclusionChange = (excludeId) => {
    setSelectedExcludes((prev) =>
      prev.includes(excludeId) ? prev.filter((id) => id !== excludeId) : [...prev, excludeId]
    );
  };

  // ✅ الحسابات الرياضية فقط للعرض في المودال
  useEffect(() => {
    if (!selectedProduct) return;

    // استخدام final_price كسعر أساسي
    let currentPrice = parseFloat(selectedProduct.final_price || selectedProduct.price_after_discount || 0);
    let variationCharges = 0;

    // حساب الـ variations
    if (selectedProduct.variations) {
      selectedProduct.variations.forEach((v) => {
        const selected = selectedVariation[v.id];
        if (!selected) return;

        if (v.type === "single") {
          const opt = v.options.find((o) => o.id === selected);
          if (opt) {
            // إذا كان خيار حجم يغير السعر الأساسي
            if (opt.total_option_price > 0) {
              currentPrice = parseFloat(opt.total_option_price);
            } else {
              variationCharges += parseFloat(opt.final_price || opt.price || 0);
            }
          }
        } else if (v.type === "multiple" && Array.isArray(selected)) {
          selected.forEach((item) => {
            let opt, quantity = 1;
            
            if (typeof item === 'object') {
              // للمتغيرات بالوزن
              opt = v.options.find((o) => o.id === item.optionId);
              quantity = item.value || 1;
            } else {
              // للمتغيرات العادية
              opt = v.options.find((o) => o.id === item);
            }
            
            if (opt) {
              // إذا كان الخيار بالوزن، نضرب السعر في الكمية المدخلة
              if (opt.weight === 1) {
                variationCharges += parseFloat(opt.price || 0) * quantity;
              } else {
                // للخيارات العادية، نستخدم السعر النهائي
                variationCharges += parseFloat(opt.final_price || opt.price_after_tax || opt.price || 0) * quantity;
              }
            }
          });
        }
      });
    }

    // حساب الـ Extras الخارجية
    let extraCharges = 0;
    selectedExtras.forEach((id) => {
      const extra = [...(selectedProduct.allExtras || []), ...(selectedProduct.addons || [])]
        .find((e) => e.id === parseInt(id));
      if (extra) extraCharges += parseFloat(extra.final_price || extra.price || 0);
    });

    setTotalPrice((currentPrice + variationCharges + extraCharges) * (parseFloat(quantity) || 0));
  }, [quantity, selectedExtras, selectedProduct, selectedVariation]);

  return {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    validationErrors,
    hasErrors: Object.keys(validationErrors).length > 0,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExtraDecrement,
    handleExclusionChange,
    setQuantity,
  };
};