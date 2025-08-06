// components/ProductModal.jsx
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

const ProductModal = ({
  isOpen,
  onClose,
  selectedProduct,
  selectedVariation,
  selectedExtras,
  quantity,
  totalPrice,
  onVariationChange,
  onExtraChange,
  onQuantityChange,
  onAddFromModal,
  orderLoading,
}) => {
  if (!selectedProduct) return null; // البحث عن الـ variation الخاص بالـ "Size" أو أي variation مطلوب // هذا يفترض أن هناك variation واحد فقط وهو المطلوب.

  const sizeVariation = selectedProduct.variations?.find(
    (v) => v.name.toLowerCase() === "size"
  );
  const variationOptions = sizeVariation?.options || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      
      <DialogContent className="w-[90vw] !max-w-[500px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
         
        <div className="flex flex-col">
            {/* Top Section: Image and Close Button */} 
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
             
            {selectedProduct.discount && (
              <div className="absolute bottom-4 left-4 bg-white text-red-600 font-bold px-3 py-1 rounded-full text-xs">
                 {selectedProduct.discount.amount}% Off  
                
              </div>
            )}
             
          </div>
            {/* Middle Section: Details, Variations, and Addons */}
          
          <div className="p-4 flex-1">
             
            <div className="flex justify-between items-center mb-2">
                
              <h3 className="text-xl font-bold text-gray-800">
                 {selectedProduct.name}  
              </h3>
                
              <span className="text-xl font-semibold text-red-600">
                 {(totalPrice || 0).toFixed(2)} EGP   
              </span>
               
            </div>
             
            <p className="text-gray-500 text-sm mb-4">
                
              {selectedProduct.description &&
              selectedProduct.description !== "null"
                ? selectedProduct.description
                : "No description available."}
               
            </p>
              {/* Sizes section (from variations data) */} 
            {variationOptions.length > 0 && (
              <div className="mb-4">
                  
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    {sizeVariation.name} (Required)  
                  
                </h4>
                  
                <div className="space-y-2">
                   
                  {variationOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center space-x-2"
                    >
                        
                      <input
                        type="radio"
                        name="variation"
                        value={option.id}
                        checked={selectedVariation === option.id}
                        onChange={() => onVariationChange(option.id)}
                        className="form-radio h-4 w-4 text-red-600"
                      />
                        
                      <span className="text-sm text-gray-700 capitalize">
                           {option.name} -{" "}
                        {(option.price_after_tax ?? option.price).toFixed(2)}{" "}
                        EGP   
                      </span>
                       
                    </label>
                  ))}
                    
                </div>
                  
              </div>
            )}
              {/* Addons section */} 
            {selectedProduct.addons && selectedProduct.addons.length > 0 && (
              <div className="mb-4">
                  
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Addons (Optional)   
                </h4>
                  
                <div className="flex flex-wrap gap-2">
                   
                  {selectedProduct.addons.map((addon) => (
                    <button
                      key={addon.id}
                      onClick={() => onExtraChange(addon.id)}
                      className={`
   flex-col items-center justify-center p-2 rounded-lg border-2 text-sm font-medium
   ${
                        selectedExtras.includes(addon.id)
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                      }
  `}
                    >
                        
                      <span className="capitalize">{addon.name}</span> 
                       
                      <span className="text-xs">
                           (   
                        {(addon.price_after_discount ?? addon.price).toFixed(2)}{" "}
                        EGP    )   
                      </span>
                       
                    </button>
                  ))}
                    
                </div>
                  
              </div>
            )}
              {/* Excludes section */} 
            {selectedProduct.excludes &&
              selectedProduct.excludes.length > 0 && (
                <div className="mb-4">
                   
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Excludes:  
                  </h4>
                   
                  <ul className="flex flex-wrap gap-2 text-xs text-gray-600">
                     
                    {selectedProduct.excludes.map((item) => (
                      <li
                        key={item.id}
                        className="bg-gray-200 rounded-full px-2 py-1"
                      >
                           {item.name}  
                      </li>
                    ))}
                     
                  </ul>
                    
                </div>
              )}
             
          </div>
            {/* Bottom Section: Total and Quantity */} 
          <div className="p-4 border-t border-gray-200">
             
            <div className="flex items-center justify-between mb-4">
                
              <div className="text-lg font-bold">
                 Total   
                <span className="text-red-600">
                    {(totalPrice || 0).toFixed(2)} EGP  
                  
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
                // Create enhanced product object with selected options
                const enhancedProduct = {
                  ...selectedProduct,
                  selectedVariation,
                  selectedExtras,
                  quantity,
                  totalPrice, // Add the individual addon data for better tracking
                  selectedAddons: selectedExtras
                    .map((extraId) =>
                      selectedProduct.addons.find(
                        (addon) => addon.id === extraId
                      )
                    )
                    .filter(Boolean), // Calculate base price per unit (for display purposes)
                  basePricePerUnit:
                    selectedProduct.price_after_discount ??
                    selectedProduct.price, // Calculate addon price per unit
                  addonPricePerUnit: selectedExtras.reduce((total, extraId) => {
                    const addon = selectedProduct.addons.find(
                      (addon) => addon.id === extraId
                    );
                    return (
                      total +
                      (addon ? addon.price_after_discount ?? addon.price : 0)
                    );
                  }, 0), // Override the price with the calculated total price per unit
                  price: totalPrice / quantity,
                };
                onAddFromModal(enhancedProduct);
                onClose();
              }}
              disabled={orderLoading}
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
