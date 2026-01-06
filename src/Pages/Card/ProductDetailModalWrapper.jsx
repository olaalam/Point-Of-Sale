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
    const existingItem = orderItems.find(item => item.id === product.id);
    
    if (existingItem) {
      setIsExistingInCart(true);
      setQuantity(existingItem.quantity || 1);
      setNotes(existingItem.notes || "");
      setSelectedVariation(existingItem.selectedVariation || {});
      setSelectedExcludes(existingItem.selectedExcludes || []);

      // مصفوفة تجمع كل الـ IDs المختارة (Extras + Addons)
      const recoveredExtras = [];

      // 1. استعادة الـ Extras العادية
      if (existingItem.selectedExtras && Array.isArray(existingItem.selectedExtras)) {
        existingItem.selectedExtras.forEach(extraId => {
          recoveredExtras.push(extraId);
        });
      }

      // 2. استعادة الـ Addons بناءً على كميتها
      // نستخدم addon_id ونكرره داخل المصفوفة ليظهر العداد في المودال بشكل صحيح
      if (existingItem.addons && Array.isArray(existingItem.addons)) {
        existingItem.addons.forEach(addon => {
          const count = Number(addon.quantity || 0);
          for (let i = 0; i < count; i++) {
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
}, [isOpen, product.id, orderItems]);
const handleAddToCart = (enhancedProduct) => {
  setOrderLoading(true);
  let currentCart = [...orderItems];

  let existingIndex = -1;

  // 1. تحديد طريقة البحث عن المنتج
  if (isExistingInCart) {
    // 🛑 حالة التعديل:
    // بما أننا نعدل منتجاً موجوداً، نبحث عنه بالـ ID فقط
    // حتى لو النوت تغيرت، نريد العثور على مكانه القديم لاستبداله
    existingIndex = currentCart.findIndex(item => item.id === enhancedProduct.id);
  } else {
    // 🟢 حالة الإضافة الجديدة:
    // نبحث عن منتج مطابق تماماً (نفس المواصفات والنوت) لدمج الكمية
    existingIndex = currentCart.findIndex(item => areProductsEqual(item, enhancedProduct));
  }

  if (existingIndex !== -1) {
    if (isExistingInCart) {
      // ✅ سيناريو التعديل (Update):
      // نستبدل المنتج القديم بالجديد (بالنوت الجديدة والكمية الجديدة)
      currentCart[existingIndex] = {
        ...enhancedProduct,
        quantity: Number(enhancedProduct.quantity), // نأخذ الكمية كما هي من المودال
        count: Number(enhancedProduct.quantity)
      };
      toast.success("تم تحديث بيانات المنتج والملاحظات");
    } else {
      // ✅ سيناريو الدمج (Merge):
      // وجدنا منتجاً مطابقاً تماماً، نزيد الكمية فقط
      const oldQty = Number(currentCart[existingIndex].quantity || 0);
      const addedQty = Number(enhancedProduct.quantity || 1);
      
      currentCart[existingIndex] = {
        ...currentCart[existingIndex],
        quantity: (oldQty + addedQty).toString(),
        count: (oldQty + addedQty)
      };
      toast.success("تم دمج الكمية في السلة");
    }
  } else {
    // 🆕 منتج جديد تماماً
    const newProduct = {
      ...enhancedProduct,
      count: enhancedProduct.quantity
    };
    currentCart.push(newProduct);
    toast.success("تم إضافة المنتج للسلة");
  }

  // تحديث السلة والتخزين
  updateOrderItems(currentCart);
  sessionStorage.setItem("cart", JSON.stringify(currentCart));

  setIsOpen(false);
  setOrderLoading(false);
  resetState();
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