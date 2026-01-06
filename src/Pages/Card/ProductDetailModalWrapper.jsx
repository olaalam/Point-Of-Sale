// src/components/ProductDetailModalWrapper.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { areProductsEqual } from "../ProductModal"; 
import ProductModal from "../ProductModal";

export default function ProductDetailModalWrapper({ children, product, updateOrderItems, orderItems }) {
  console.log(product)
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [notes, setNotes] = useState(""); 
  const [validationErrors, setValidationErrors] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);

  // حالة للتمييز بين "إضافة جديد" و "تعديل موجود"
  const [isExistingInCart, setIsExistingInCart] = useState(false);

useEffect(() => {
  if (isOpen) {
    // ابحث بالـ temp_id
    const existingItem = orderItems.find(item => item.temp_id === product.temp_id);
    
    if (existingItem) {
      setIsExistingInCart(true);
      setQuantity(existingItem.quantity || 1);
      setNotes(existingItem.notes || "");
      setSelectedVariation(existingItem.selectedVariation || {});
      setSelectedExcludes(existingItem.selectedExcludes || []);

      // كود استعادة الـ Addons اللي ظبطناه سوا
      const recoveredExtras = [];
      if (existingItem.selectedExtras) {
        existingItem.selectedExtras.forEach(id => recoveredExtras.push(id));
      }
      if (existingItem.addons) {
        existingItem.addons.forEach(addon => {
          for (let i = 0; i < addon.quantity; i++) {
            recoveredExtras.push(addon.addon_id);
          }
        });
      }
      setSelectedExtras(recoveredExtras);
    } else {
      setIsExistingInCart(false);
      resetState();
    }
  }
}, [isOpen, product.temp_id, orderItems]); // التغيير هنا في الاعتماد على temp_id
const handleAddToCart = (enhancedProduct) => {
  setOrderLoading(true);

  const currentCart = [...orderItems];

  // تأكد من تحديث count و quantity معاً لضمان ظهورها في الجدول
  const updatedProduct = {
    ...enhancedProduct,
    quantity: enhancedProduct.quantity,
    count: enhancedProduct.quantity // إضافة هذا السطر ليتوافق مع ItemRow
  };

  const existingIndex = currentCart.findIndex(
    (item) => item.temp_id === product.temp_id
  );

  if (existingIndex !== -1) {
    // تحديث السطر الموجود
    currentCart[existingIndex] = {
      ...updatedProduct,
      temp_id: product.temp_id, 
    };
    toast.success("تم تحديث الكارت بنجاح");
  } else {
    // إضافة جديد
    const duplicateIndex = currentCart.findIndex((item) =>
      areProductsEqual(item, updatedProduct)
    );

    if (duplicateIndex !== -1) {
      // تحديث الكميات في حالة التكرار
      currentCart[duplicateIndex].quantity += updatedProduct.quantity;
      currentCart[duplicateIndex].count = (currentCart[duplicateIndex].count || 0) + updatedProduct.quantity;
      toast.success("تم زيادة الكمية");
    } else {
      currentCart.push(updatedProduct);
      toast.success("تم الإضافة للكارت");
    }
  }

  updateOrderItems(currentCart);
  setIsOpen(false);
  setOrderLoading(false);
};
  const resetState = () => {
    setQuantity(1);
    setSelectedVariation({});
    setSelectedExtras([]);
    setSelectedExcludes([]);
    setNotes("");
    setValidationErrors({});
    setIsExistingInCart(false);
  };

  // دوال التحكم بالإضافات والمتغيرات
  const handleVariationChange = (variationId, optionId, action = "set") => {
    setSelectedVariation(prev => {
      if (action === "add") {
        const current = prev[variationId] || [];
        return { ...prev, [variationId]: [...current, optionId] };
      }
      if (action === "remove") {
        const current = prev[variationId] || [];
        return { ...prev, [variationId]: current.filter(id => id !== optionId) };
      }
      return { ...prev, [variationId]: optionId };
    });
  };

  const handleExtraChange = (extraId) => setSelectedExtras(prev => [...prev, extraId]);
  
  const handleExtraDecrement = (extraId) => setSelectedExtras(prev => {
    const index = prev.indexOf(extraId);
    return index !== -1 ? prev.filter((_, i) => i !== index) : prev;
  });

  const handleExclusionChange = (excludeId) => setSelectedExcludes(prev =>
    prev.includes(excludeId) ? prev.filter(id => id !== excludeId) : [...prev, excludeId]
  );

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {children}
      </div>

      <ProductModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          resetState();
        }}
       selectedProduct={{
    ...product,
    // نضمن أن المودال لديه القائمة الكاملة للأسماء والأسعار
    addons: product.addons_list || product.addons || [] 
  }}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        selectedExcludes={selectedExcludes}
        quantity={quantity}
        notes={notes}
        onNotesChange={setNotes}
        validationErrors={validationErrors}
        hasErrors={Object.keys(validationErrors).length > 0}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onExtraDecrement={handleExtraDecrement}
        onExclusionChange={handleExclusionChange}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddToCart}
        orderLoading={orderLoading}
        productType={product?.weight_status === 1 ? "weight" : "piece"}
      />
    </>
  );
}