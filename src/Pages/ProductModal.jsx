// ProductModal.jsx
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

const ProductModal = ({
    isOpen,
    onClose,
    selectedProduct,
    selectedVariation = {},
    selectedExtras = [],
    selectedExcludes = [], // إضافة قيمة افتراضية هنا
    quantity,
    totalPrice,
    validationErrors = {},
    hasErrors = false,
    onVariationChange,
    onExtraChange,
    onExclusionChange,
    onQuantityChange,
    onAddFromModal,
    orderLoading,
}) => {
    // FIX: Add a null check for selectedProduct before accessing its properties
    if (!selectedProduct) return null;

    const hasVariations = selectedProduct.variations && selectedProduct.variations.length > 0;
    const hasAddons = selectedProduct.addons && selectedProduct.addons.length > 0;
    const hasExcludes = selectedProduct.excludes && selectedProduct.excludes.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[90vw] !max-w-[500px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-col">
                    <div className="relative">
                        <img
                            src={selectedProduct.image_link || "https://via.placeholder.com/400"}
                            alt={selectedProduct.name}
                            className="w-full h-48 object-cover"
                        />
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4 flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold text-gray-800">{selectedProduct.name}</h3>
                            <span className="text-xl font-semibold text-red-600">
                                {totalPrice.toFixed(2)} EGP
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm mb-4">
                            {selectedProduct.description && selectedProduct.description !== "null"
                                ? selectedProduct.description
                                : "No description available."}
                        </p>

                        {/* Variations section */}
                        {hasVariations && (
                            <div className="mb-4">
                                {selectedProduct.variations.map((variation) => (
                                    <div key={variation.id} className="mb-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                            {variation.name}
                                            {variation.required && <span className="text-red-500 ml-1">*</span>}
                                            {variation.type === 'multiple' && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    (Min: {variation.min_options || 0}, Max: {variation.max_options || '∞'})
                                                </span>
                                            )}
                                        </h4>
                                        {validationErrors[variation.id] && (
                                            <p className="text-red-500 text-xs mb-2">{validationErrors[variation.id]}</p>
                                        )}

                                        {/* Single-select variations (e.g., radio buttons) */}
                                        {/* FIX: Add a check for variation.options before mapping */}
                                        {variation.type === "single" && variation.options && (
                                            <div className="space-y-2">
                                                {variation.options.map((option) => (
                                                    <label key={option.id} className="flex items-center space-x-2">
                                                        <input
                                                            type="radio"
                                                            name={`variation-${variation.id}`}
                                                            value={option.id}
                                                            checked={selectedVariation[variation.id] === option.id}
                                                            onChange={() => onVariationChange(variation.id, option.id)}
                                                            className="form-radio h-4 w-4 text-red-600"
                                                        />
                                                        <span className="text-sm text-gray-700 capitalize">
                                                            {option.name} - {(option.price_after_tax ?? option.price).toFixed(2)} EGP
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {/* Multi-select variations (e.g., checkboxes) */}
                                        {/* FIX: Add a check for variation.options before mapping */}
                                        {variation.type === "multiple" && variation.options && (
                                            <div className="space-y-2">
                                                {variation.options.map((option) => (
                                                    <label key={option.id} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            name={`variation-${variation.id}`}
                                                            value={option.id}
                                                            checked={(selectedVariation[variation.id] || []).includes(option.id)}
                                                            onChange={() => onVariationChange(variation.id, option.id)}
                                                            className="form-checkbox h-4 w-4 text-red-600 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700 capitalize">
                                                            {option.name} - {(option.price_after_tax ?? option.price).toFixed(2)} EGP
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Addons section (your existing code) */}
                        {hasAddons && (
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Addons (Optional)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedProduct.addons.map((addon) => (
                                        <button
                                            key={addon.id}
                                            onClick={() => onExtraChange(addon.id)}
                                            className={`flex-col items-center justify-center p-2 rounded-lg border-2 text-sm font-medium
                                            ${selectedExtras.includes(addon.id)
                                                ? "bg-red-600 text-white border-red-600"
                                                : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                                            }`}
                                        >
                                            <span className="capitalize">{addon.name}</span>
                                            <span className="text-xs"> ({(addon.price_after_discount ?? addon.price).toFixed(2)} EGP)</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Excludes section - FIXED */}
                        {hasExcludes && (
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Exclude (Optional)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedProduct.excludes.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => onExclusionChange(item.id)}
                                            className={`flex items-center justify-center p-2 rounded-lg border-2 text-sm font-medium
                                            ${selectedExcludes.includes(item.id)
                                                ? "bg-gray-700 text-white border-gray-700"
                                                : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                                            }`}
                                        >
                                            <span className="capitalize line-through">{item.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-lg font-bold">
                                Total <span className="text-red-600">{(totalPrice || 0).toFixed(2)} EGP</span>
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