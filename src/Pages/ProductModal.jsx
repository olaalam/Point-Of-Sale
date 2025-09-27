// ProductModal.jsx - Fixed version with proper decrement handling

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

// Helper function to calculate total price including variations, extras, and addons
const calculateProductTotalPrice = (
  baseProduct,
  selectedVariation = {},
  selectedExtras = [],
  quantity = 1
) => {
  let totalPrice = parseFloat(baseProduct.price || 0);

  // Add variation prices
  if (baseProduct.variations && Object.keys(selectedVariation).length > 0) {
    baseProduct.variations.forEach(variation => {
      const selectedOptions = selectedVariation[variation.id];
      
      if (selectedOptions !== undefined) {
        if (variation.type === 'single') {
          // For single select, selectedOptions is a single option ID
          const selectedOption = variation.options?.find(opt => opt.id === selectedOptions);
          if (selectedOption) {
            totalPrice += parseFloat(selectedOption.price_after_tax || selectedOption.price || 0);
          }
        } else if (variation.type === 'multiple') {
          // For multiple select, selectedOptions is an array of option IDs
          const optionsArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
          optionsArray.forEach(optionId => {
            const option = variation.options?.find(opt => opt.id === optionId);
            if (option) {
              totalPrice += parseFloat(option.price_after_tax || option.price || 0);
            }
          });
        }
      }
    });
  }

  // Add extras and addons prices
  if (selectedExtras && selectedExtras.length > 0) {
    // Count occurrences of each extra
    const extraCounts = {};
    selectedExtras.forEach(extraId => {
      extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
    });

    // Calculate price for each extra
    Object.entries(extraCounts).forEach(([extraId, count]) => {
      // Check in allExtras first
      let extraItem = baseProduct.allExtras?.find(extra => extra.id === parseInt(extraId));
      
      // If not found, check in addons
      if (!extraItem) {
        extraItem = baseProduct.addons?.find(addon => addon.id === parseInt(extraId));
      }

      if (extraItem) {
        const extraPrice = parseFloat(
          extraItem.price_after_discount || 
          extraItem.price_after_tax || 
          extraItem.price || 
          0
        );
        totalPrice += extraPrice * count;
      }
    });
  }

  return totalPrice * quantity;
};

// Updated ProductModal component with proper price calculation
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
}) => {
  if (!selectedProduct) return null;

  // ✅ Calculate total price dynamically
  const totalPrice = calculateProductTotalPrice(
    selectedProduct,
    selectedVariation,
    selectedExtras,
    quantity
  );

  const hasVariations =
    selectedProduct.variations && selectedProduct.variations.length > 0;
  const hasAddons = selectedProduct.addons && selectedProduct.addons.length > 0;
  const hasExtras =
    selectedProduct.allExtras && selectedProduct.allExtras.length > 0;
  const hasExcludes =
    selectedProduct.excludes && selectedProduct.excludes.length > 0;

  // Helper function to get extra count
  const getExtraCount = (extraId) => {
    return selectedExtras.filter((id) => id === extraId).length;
  };

  // Helper function to handle extra increment
  const handleExtraIncrement = (extraId) => {
    onExtraChange(extraId);
  };

  // Helper function to handle extra decrement
  const handleExtraDecrement = (extraId) => {
    if (onExtraDecrement && getExtraCount(extraId) > 0) {
      onExtraDecrement(extraId);
    }
  };

  // ✅ Helper function to get variation option price display
  const getVariationOptionDisplay = (option) => {
    const price = parseFloat(option.price_after_tax || option.price || 0);
    if (price === 0) {
      return `${option.name}`;
    }
    return `${option.name} (+${price.toFixed(2)} EGP)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              onClick={onClose}
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
                {totalPrice.toFixed(2)} EGP
              </span>
            </div>
            <DialogDescription className="text-gray-500 text-sm mb-4">
              {selectedProduct.description &&
              selectedProduct.description !== "null"
                ? selectedProduct.description
                : "No description available."}
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
                          (Min: {variation.min || 0}, Max: {variation.max || "∞"})
                        </span>
                      )}
                    </h4>
                    {validationErrors[variation.id] && (
                      <p className="text-red-500 text-xs mb-2">
                        {validationErrors[variation.id]}
                      </p>
                    )}

                    {/* Single-select variations */}
                    {variation.type === "single" && variation.options && (
                      <div className="space-y-2">
                        {variation.options.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="radio"
                              name={`variation-${variation.id}`}
                              value={option.id}
                              checked={
                                selectedVariation[variation.id] === option.id
                              }
                              onChange={() =>
                                onVariationChange(variation.id, option.id)
                              }
                              className="form-radio h-4 w-4 !text-red-600"
                            />
                            <span
                              className={`text-sm capitalize flex-1 ${
                                selectedVariation[variation.id] === option.id
                                  ? "!text-red-600 font-semibold"
                                  : "!text-gray-700"
                              }`}
                            >
                              {getVariationOptionDisplay(option)}
                            </span>
                          </label>
                        ))}
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

                          // Check min/max constraints
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
                  Extras (Optional)
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
                                ).toFixed(2)} EGP`
                              : "Free"}
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
                  Addons (Optional)
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
                              addon.price_after_discount ??
                              addon.price ??
                              0
                            ).toFixed(2)}{" "}
                            EGP
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
                  Exclude (Optional)
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
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold">
                Total{" "}
                <span className="text-red-600">
                  {totalPrice.toFixed(2)} EGP
                </span>
              </div>
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
            </div>
            <Button
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors"
              onClick={() => {
                const enhancedProduct = {
                  ...selectedProduct,
                  selectedVariation,
                  selectedExtras,
                  selectedExcludes,
                  quantity,
                  totalPrice,
                  price: totalPrice / quantity,
                };
                onAddFromModal(enhancedProduct);
                onClose();
              }}
              disabled={orderLoading || hasErrors}
            >
              {orderLoading ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
