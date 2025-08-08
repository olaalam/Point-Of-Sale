
// 1. this file contains the logic for managing product modal state and interactions
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
    
    // Find size variation and set first option as default
    if (product.variations && product.variations.length > 0) {
      const sizeVariation = product.variations.find(v => v.name.toLowerCase() === "size");
      if (sizeVariation && sizeVariation.options && sizeVariation.options.length > 0) {
        setSelectedVariation(sizeVariation.options[0].id);
        console.log("Set default variation option:", sizeVariation.options[0]);
      } else {
        setSelectedVariation(null);
      }
    } else {
      setSelectedVariation(null);
    }
    
    setSelectedExtras([]);
    setQuantity(1);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
    setSelectedVariation(null);
    setSelectedExtras([]);
    setQuantity(1);
    setTotalPrice(0);
  };

  const handleVariationChange = (optionId) => {
    console.log("Variation option changed to:", optionId);
    setSelectedVariation(optionId);
  };

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

    // Start with base product price
    let basePrice = selectedProduct.price_after_discount ?? selectedProduct.price ?? 0;
    console.log("Base product price:", basePrice);

    // Handle variation pricing (from selected option)
    if (selectedVariation && selectedProduct.variations) {
      const sizeVariation = selectedProduct.variations.find(v => v.name.toLowerCase() === "size");
      if (sizeVariation && sizeVariation.options) {
        const selectedOption = sizeVariation.options.find(opt => opt.id === selectedVariation);
        if (selectedOption) {
          // Use option price instead of base product price
          basePrice = selectedOption.price_after_tax ?? selectedOption.price ?? basePrice;
          console.log("Using variation option price:", basePrice, selectedOption);
        }
      }
    }

    // Add prices from selected extras
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

    const pricePerUnit = basePrice + addonsPrice;
    const calculatedTotalPrice = pricePerUnit * quantity;
    
    console.log("Price calculation:", {
      basePrice,
      addonsPrice,
      pricePerUnit,
      quantity,
      calculatedTotalPrice
    });

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