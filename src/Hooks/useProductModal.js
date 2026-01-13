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

  const handleVariationChange = (variationId, optionId) => {
    setSelectedVariation((prev) => {
      const variation = selectedProduct.variations.find((v) => v.id === variationId);
      if (!variation) return prev;

      if (variation.type === "single") {
        return { ...prev, [variationId]: optionId };
      } else {
        const currentOptions = prev[variationId] || [];
        const isSelected = currentOptions.includes(optionId);
        let newOptions;

        if (isSelected) {
          newOptions = currentOptions.filter((id) => id !== optionId);
        } else {
          const maxAllowed = variation.max || Infinity;
          newOptions = currentOptions.length < maxAllowed ? [...currentOptions, optionId] : currentOptions;
        }
        return { ...prev, [variationId]: newOptions };
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

    let basePrice = parseFloat( selectedProduct.final_price ??selectedProduct.price_after_discount ?? 0);
    let extraCharges = 0;

    // 1. حساب الـ Variations
    if (selectedProduct.variations) {
      selectedProduct.variations.forEach((v) => {
        const selected = selectedVariation[v.id];
        if (v.type === "single" && selected) {
          const opt = v.options.find((o) => o.id === selected);
          if (opt) {
            if (opt.total_option_price) {
              extraCharges += (parseFloat(opt.total_option_price) - basePrice);
            } else {
              extraCharges += parseFloat(opt.final_price || opt.price_after_tax || opt.price || 0);
            }
          }
        } else if (v.type === "multiple" && Array.isArray(selected)) {
          selected.forEach((id) => {
            const opt = v.options.find((o) => o.id === id);
            if (opt) extraCharges += parseFloat(opt.final_price || opt.price_after_tax || opt.price || 0);
          });
        }
      });
    }

    // 2. حساب الـ Extras (بناءً على التكرار)
    selectedExtras.forEach((id) => {
      const extra = [...(selectedProduct.allExtras || []), ...(selectedProduct.addons || [])]
                    .find((e) => e.id === parseInt(id));
      if (extra) extraCharges += parseFloat(extra.final_price || extra.price_after_discount || extra.price || 0);
    });

    setTotalPrice((basePrice + extraCharges) * quantity);
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