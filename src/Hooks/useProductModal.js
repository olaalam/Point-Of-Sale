// useProductModal.js
import { useState, useEffect } from "react";

export const useProductModal = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedExcludes, setSelectedExcludes] = useState([]); // New state for exclusions
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [validationErrors, setValidationErrors] = useState({}); // New state for validation

  const openProductModal = (product) => {
    
    setSelectedProduct(product);
const initialSelectedVariations = {};
if (product.variations && product.variations.length > 0) {
    product.variations.forEach(variation => {
        if (variation.type === 'single' && variation.options.length > 0) {
            initialSelectedVariations[variation.id] = variation.options[0].id;
        } else if (variation.type === 'multiple') {
            // This is the correct initialization for multi-select
            initialSelectedVariations[variation.id] = []; 
        }
    });
}
setSelectedVariation(initialSelectedVariations);

    setSelectedExtras([]);
    setSelectedExcludes([]); // Reset exclusions
    setQuantity(1);
    setTotalPrice(0);
    setValidationErrors({}); // Reset validation errors
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

  const handleVariationChange = (variationId, optionId) => {
    setSelectedVariation((prev) => {
      const variation = selectedProduct.variations.find(
        (v) => v.id === variationId
      );
      if (!variation) return prev;

      if (variation.type === "single") {
        return { ...prev, [variationId]: optionId };
      } else if (variation.type === "multiple") {
        const currentOptions = prev[variationId] || [];
        const isSelected = currentOptions.includes(optionId);
        let newOptions;

        if (isSelected) {
          newOptions = currentOptions.filter((id) => id !== optionId);
        } else {
          newOptions = [...currentOptions, optionId];
        }
        return { ...prev, [variationId]: newOptions };
      }

      return prev;
    });
  };

  const handleExtraChange = (extraId) => {
    setSelectedExtras((prev) => {
      return prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId];
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
            variation.min_options &&
            selectedOptions.length < variation.min_options
          ) {
            newErrors[
              variation.id
            ] = `Please select at least ${variation.min_options} options for ${variation.name}.`;
          }
          if (
            variation.max_options &&
            selectedOptions.length > variation.max_options
          ) {
            newErrors[
              variation.id
            ] = `You can select a maximum of ${variation.max_options} options for ${variation.name}.`;
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

    // Add prices from selected extras
    let addonsPrice = 0;
    if (selectedExtras.length > 0 && selectedProduct.addons) {
      selectedExtras.forEach((extraId) => {
        const addon = selectedProduct.addons.find(
          (addon) => addon.id === extraId
        );
        if (addon) {
          addonsPrice += addon.price_after_discount ?? addon.price ?? 0;
        }
      });
    }

    const pricePerUnit = basePrice + totalVariationsPrice + addonsPrice;
    const calculatedTotalPrice = pricePerUnit * quantity;

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
    selectedExcludes, // Expose new state
    quantity,
    totalPrice,
    validationErrors, // Expose new state
    hasErrors, // Expose a boolean for easy access
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExclusionChange, // Expose new handler
    setQuantity,
  };
};
