// hooks/useProductModal.js (FIXED VERSION)
import { useState, useEffect } from "react";

export const useProductModal = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  // Function to open product modal
  const openProductModal = (product) => {
    console.log("Opening modal for product:", product);
    setSelectedProduct(product);
    
    // If variations exist, set the first one as default
    if (product.variations && product.variations.length > 0) {
      setSelectedVariation(product.variations[0].id);
    } else {
      setSelectedVariation(null);
    }
    
    // Reset extras and quantity
    setSelectedExtras([]);
    setQuantity(1);
    setIsProductModalOpen(true);
  };

  // Function to close product modal
  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
    setSelectedVariation(null);
    setSelectedExtras([]);
    setQuantity(1);
    setTotalPrice(0);
  };

  // Function to handle variation (size) change
const handleVariationChange = (variationId, optionId) => {
  setSelectedVariation({
    variation_id: variationId,
    option_ids: [optionId],
  });
};

  // Function to handle extra (addon) selection change
  const handleExtraChange = (extraId) => {
    console.log("Extra changed:", extraId);
    setSelectedExtras((prev) => {
      const newExtras = prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId];
      console.log("New selected extras:", newExtras);
      return newExtras;
    });
  };

  // useEffect to recalculate total price whenever quantity, variation, or extras change
  useEffect(() => {
    if (!selectedProduct) {
      setTotalPrice(0);
      return;
    }

    console.log("Recalculating price for:", {
      product: selectedProduct.name,
      quantity,
      selectedExtras,
      selectedVariation
    });

    // Start with base product price (after discount if available)
    let basePrice = selectedProduct.price_after_discount ?? selectedProduct.price ?? 0;
    console.log("Base price:", basePrice);

    // Handle variation pricing if needed (currently variations don't seem to have different prices)
    // If variations have different prices, you can add that logic here
    if (selectedVariation && selectedProduct.variations) {
      const selectedVar = selectedProduct.variations.find(v => v.id === selectedVariation);
      if (selectedVar && selectedVar.price) {
        basePrice = selectedVar.price_after_discount ?? selectedVar.price ?? basePrice;
        console.log("Variation price:", basePrice);
      }
    }

    // Add prices from selected extras (addons)
    let addonsPrice = 0;
    if (selectedExtras.length > 0 && selectedProduct.addons) {
      selectedExtras.forEach((extraId) => {
        const addon = selectedProduct.addons.find((addon) => addon.id === extraId);
        if (addon) {
          const addonPrice = addon.price_after_discount ?? addon.price ?? 0;
          addonsPrice += addonPrice;
          console.log(`Added addon ${addon.name}: ${addonPrice}`);
        }
      });
    }

    // Calculate total price per unit
    const pricePerUnit = basePrice + addonsPrice;
    console.log("Price per unit (base + addons):", pricePerUnit);

    // Calculate total price with quantity
    const calculatedTotalPrice = pricePerUnit * quantity;
    console.log("Final total price:", calculatedTotalPrice);

    setTotalPrice(calculatedTotalPrice);
  }, [quantity, selectedExtras, selectedProduct, selectedVariation]);

  return {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    quantity,
    totalPrice,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    setQuantity,
    setIsProductModalOpen,
  };
};