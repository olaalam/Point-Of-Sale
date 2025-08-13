// 2. New useProductModal.js
import { useState, useEffect } from "react";

export const useProductModal = () => {
const [selectedProduct, setSelectedProduct] = useState(null);
const [isProductModalOpen, setIsProductModalOpen] = useState(false);
// Now an object to hold multiple variations: { variationId1: optionId, variationId2: optionId }
const [selectedVariation, setSelectedVariation] = useState({});
const [selectedExtras, setSelectedExtras] = useState([]);
const [quantity, setQuantity] = useState(1);
const [totalPrice, setTotalPrice] = useState(0);

const openProductModal = (product) => {
 console.log("Opening modal for product:", product);
 setSelectedProduct(product);
 
 const initialSelectedVariations = {};
 if (product.variations && product.variations.length > 0) {
 product.variations.forEach(variation => {
  if (variation.type === 'single' && variation.options.length > 0) {
  // Set default for single-select variations
  initialSelectedVariations[variation.id] = variation.options[0].id;
  }
 });
 }
 setSelectedVariation(initialSelectedVariations);
 
 setSelectedExtras([]);
 setQuantity(1);
 setIsProductModalOpen(true);
};

const closeProductModal = () => {
 setIsProductModalOpen(false);
 setSelectedProduct(null);
 setSelectedVariation({});
 setSelectedExtras([]);
 setQuantity(1);
 setTotalPrice(0);
};

const handleVariationChange = (variationId, optionId) => {
 console.log("Variation option changed:", { variationId, optionId });
 setSelectedVariation(prev => ({ ...prev, [variationId]: optionId }));
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

 // Handle variation pricing dynamically
 if (selectedProduct.variations) {
 selectedProduct.variations.forEach(variation => {
  const selectedOptionId = selectedVariation[variation.id];
  if (selectedOptionId) {
  const selectedOption = variation.options.find(opt => opt.id === selectedOptionId);
  if (selectedOption) {
   // If it's a single variation, its price overrides the base price
   if (variation.type === 'single') {
   basePrice = selectedOption.price_after_tax ?? selectedOption.price ?? basePrice;
   } else if (variation.type === 'multiple') {
   // For multiple variations, add their prices
   basePrice += selectedOption.price_after_tax ?? selectedOption.price ?? 0;
   }
  }
  }
 });
 }

 // Add prices from selected extras (same logic as before)
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