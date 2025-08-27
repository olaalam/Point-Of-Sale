// useProductModal.js - تحديث لدعم الـ counters للـ extras/addons

import { useState, useEffect } from "react";

export const useProductModal = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]); // Now supports multiple instances
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  const openProductModal = (product) => {
    console.log("Opening product modal:", product);
    console.log("Product addons:", product.addons);
    console.log("Product extras:", product.allExtras);
    
    setSelectedProduct(product);
    const initialSelectedVariations = {};
    if (product.variations && product.variations.length > 0) {
        product.variations.forEach(variation => {
            if (variation.type === 'single' && variation.options.length > 0) {
                initialSelectedVariations[variation.id] = variation.options[0].id;
            } else if (variation.type === 'multiple') {
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
    setSelectedVariation({});
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setQuantity(1);
    setTotalPrice(0);
    setValidationErrors({});
  };
const groupExtrasForBackend = (selectedExtras) => {
  if (!selectedExtras || selectedExtras.length === 0) {
    return [];
  }

  // Count occurrences of each extra/addon ID
  const extraCounts = {};
  selectedExtras.forEach(extraId => {
    const id = extraId.toString(); // Ensure string format
    extraCounts[id] = (extraCounts[id] || 0) + 1;
  });

  // Transform to the desired format
  return Object.keys(extraCounts).map(addonId => ({
    addon_id: addonId,
    count: extraCounts[addonId].toString() // Convert to string if backend expects string
  }));
};
const handleVariationChange = (variationId, optionId) => {
    setSelectedVariation((prev) => {
        const variation = selectedProduct.variations.find(
            (v) => v.id === variationId
        );
        if (!variation) return prev;

        // If the variation is of type 'single', select just one option
        if (variation.type === "single") {
            return { ...prev, [variationId]: [optionId] }; // Store as an array
        }

        // If the variation is of type 'multiple', allow multiple selections
        else if (variation.type === "multiple") {
            const currentOptions = prev[variationId] || [];
            const isSelected = currentOptions.includes(optionId);
            let newOptions;

            if (isSelected) {
                // Remove the option if it's already selected
                newOptions = currentOptions.filter((id) => id !== optionId);
            } else {
                // Add the option if it's not selected
                newOptions = [...currentOptions, optionId];
            }

            return { ...prev, [variationId]: newOptions }; // Store multiple options in an array
        }

        return prev;
    });
};

  const getGroupedExtras = () => {
    return groupExtrasForBackend(selectedExtras);
  };
  // Updated to support multiple instances of the same extra/addon
  const handleExtraChange = (extraId) => {
    console.log("handleExtraChange called with:", extraId);
    console.log("Current selectedExtras:", selectedExtras);
    
    setSelectedExtras((prev) => {
      // Always add (for increment), removal is handled by decrement function
      const newExtras = [...prev, extraId];
      console.log("New selectedExtras:", newExtras);
      return newExtras;
    });
  };

  // New function to handle decrementing extras
  const handleExtraDecrement = (extraId) => {
    console.log("handleExtraDecrement called with:", extraId);
    
    setSelectedExtras((prev) => {
      const index = prev.indexOf(extraId);
      if (index > -1) {
        const newExtras = [...prev];
        newExtras.splice(index, 1);
        console.log("Decremented selectedExtras:", newExtras);
        return newExtras;
      }
      return prev;
    });
  };

  const handleExclusionChange = (excludeId) => {
    setSelectedExcludes((prev) => {
      return prev.includes(excludeId)
        ? prev.filter((id) => id !== excludeId)
        : [...prev, excludeId];
    });
  };

  useEffect(() => {
    if (!selectedProduct) {
      setTotalPrice(0);
      return;
    }

    let basePrice =
      selectedProduct.price_after_discount ?? selectedProduct.price ?? 0;
    let totalVariationsPrice = 0;
    const newErrors = {};

    // Calculate variation pricing and validate constraints
    if (selectedProduct.variations) {
      selectedProduct.variations.forEach((variation) => {
        const selectedOptions = selectedVariation[variation.id];

        if (
          variation.required &&
          (!selectedOptions ||
            (Array.isArray(selectedOptions) && selectedOptions.length === 0))
        ) {
          newErrors[
            variation.id
          ] = `Please select an option for ${variation.name}.`;
        }

        if (variation.type === "single" && selectedOptions) {
          const selectedOption = variation.options.find(
            (opt) => opt.id === selectedOptions
          );
          if (selectedOption) {
            basePrice =
              selectedOption.price_after_tax ??
              selectedOption.price ??
              basePrice;
          }
        } else if (
          variation.type === "multiple" &&
          selectedOptions &&
          selectedOptions.length > 0
        ) {
          if (
            variation.min &&
            selectedOptions.length < variation.min
          ) {
            newErrors[
              variation.id
            ] = `Please select at least ${variation.min} options for ${variation.name}.`;
          }
          if (
            variation.max &&
            selectedOptions.length > variation.max
          ) {
            newErrors[
              variation.id
            ] = `You can select a maximum of ${variation.max} options for ${variation.name}.`;
          }

          selectedOptions.forEach((optionId) => {
            const selectedOption = variation.options.find(
              (opt) => opt.id === optionId
            );
            if (selectedOption) {
              totalVariationsPrice +=
                selectedOption.price_after_tax ?? selectedOption.price ?? 0;
            }
          });
        }
      });
    }

    // UPDATED: Calculate prices for extras with multiple instances support
    let addonsPrice = 0;
    if (selectedExtras.length > 0) {
        // Count occurrences of each extra
        const extraCounts = {};
        selectedExtras.forEach(extraId => {
            extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
        });

        // حساب سعر الـ addons (المدفوعة)
        if (selectedProduct.addons && selectedProduct.addons.length > 0) {
            Object.keys(extraCounts).forEach((extraId) => {
                const addon = selectedProduct.addons.find((addon) => addon.id === parseInt(extraId));
                if (addon) {
                    const addonPrice = addon.price_after_discount ?? addon.price ?? 0;
                    const count = extraCounts[extraId];
                    console.log(`Adding addon price: ${addonPrice} x ${count} for: ${addon.name}`);
                    addonsPrice += addonPrice * count;
                }
            });
        }
        
        // حساب سعر الـ allExtras (قد تكون مجانية أو مدفوعة)
        if (selectedProduct.allExtras && selectedProduct.allExtras.length > 0) {
            Object.keys(extraCounts).forEach((extraId) => {
                const extra = selectedProduct.allExtras.find((extra) => extra.id === parseInt(extraId));
                if (extra) {
                    const extraPrice = extra.price_after_discount ?? extra.price ?? 0;
                    const count = extraCounts[extraId];
                    console.log(`Adding extra price: ${extraPrice} x ${count} for: ${extra.name}`);
                    addonsPrice += extraPrice * count;
                }
            });
        }
        
        console.log("Total addons + extras price:", addonsPrice);
    }

    const pricePerUnit = basePrice + totalVariationsPrice + addonsPrice;
    const calculatedTotalPrice = pricePerUnit * quantity;

    console.log("Price calculation:", {
        basePrice,
        totalVariationsPrice,
        addonsPrice,
        pricePerUnit,
        calculatedTotalPrice,
        quantity,
        selectedExtras
    });

    setTotalPrice(calculatedTotalPrice);
    setValidationErrors(newErrors);
  }, [
    quantity,
    selectedExtras,
    selectedExcludes,
    selectedProduct,
    selectedVariation,
  ]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  return {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    validationErrors,
    hasErrors,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExtraDecrement, // New function for decrementing
    handleExclusionChange,
    setQuantity,
       getGroupedExtras
  };
};