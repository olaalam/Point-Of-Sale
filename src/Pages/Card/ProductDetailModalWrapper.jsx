// src/components/ProductDetailModalWrapper.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { areProductsEqual } from "../ProductModal"; 
import ProductModal from "../ProductModal";
import { usePost } from "@/Hooks/usePost";
import { processProductItem } from "../Checkout/processProductItem";

export default function ProductDetailModalWrapper({ children, product, updateOrderItems, orderItems, orderType, tableId }) {
  console.log(product)
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState({});
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedExcludes, setSelectedExcludes] = useState([]);
  const [notes, setNotes] = useState(""); 
  const [validationErrors, setValidationErrors] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);
  const { postData: postUpdateDineIn } = usePost();

  // حالة للتمييز بين "إضافة جديد" و "تعديل موجود"
  const [isExistingInCart, setIsExistingInCart] = useState(false);

useEffect(() => {
  if (isOpen) {
    // ابحث بالـ temp_id
    const existingItem = orderItems.find(item => item.temp_id === product.temp_id);
    
    if (existingItem) {
      setIsExistingInCart(true);
      setQuantity(existingItem.count || 1);
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
const handleAddToCart = async (enhancedProduct) => {
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
  } else {
    // إضافة جديد
    const duplicateIndex = currentCart.findIndex((item) =>
      areProductsEqual(item, updatedProduct)
    );

    if (duplicateIndex !== -1) {
      // تحديث الكميات في حالة التكرار
      currentCart[duplicateIndex].quantity += updatedProduct.quantity;
      currentCart[duplicateIndex].count = (currentCart[duplicateIndex].count || 0) + updatedProduct.quantity;
    } else {
      currentCart.push(updatedProduct);
    }
  }

  // 🟢 إذا كان النوع dine_in، نبعت التعديلات للـ API
  if (orderType === "dine_in" && tableId) {
    try {
      const formData = new FormData();
      formData.append("table_id", tableId.toString());
      formData.append("amount", "0");
      formData.append("total_tax", "0");
      formData.append("total_discount", "0");
      formData.append("notes", "");

      // 🟢 cart_id مطلوب في الـ root level - نأخذه من المنتج اللي بيتعدل أو من أول منتج في الكارت
      const rootCartId = product.cart_id || currentCart.find(i => i.cart_id)?.cart_id;
      if (rootCartId) {
        formData.append("cart_id", rootCartId.toString());
      }

      // بناء الـ products array من كل المنتجات في الكارت المحدث
      currentCart.forEach((item, index) => {
        const processed = processProductItem(item);
        formData.append(`products[${index}][product_id]`, processed.product_id);
        formData.append(`products[${index}][count]`, processed.count);
        formData.append(`products[${index}][price]`, processed.price);
        if (processed.note) formData.append(`products[${index}][note]`, processed.note);

        // cart_id للمنتج (لو موجود)
        if (item.cart_id) {
          formData.append(`products[${index}][cart_id]`, item.cart_id.toString());
        }

        // Variations
        if (processed.variation && processed.variation.length > 0) {
          processed.variation.forEach((v, vIndex) => {
            formData.append(`products[${index}][variation][${vIndex}][variation_id]`, v.variation_id);
            v.option_id.forEach((optId, optIndex) => {
              formData.append(`products[${index}][variation][${vIndex}][option_id][${optIndex}]`, optId);
            });
          });
        }

        // Addons
        if (processed.addons && processed.addons.length > 0) {
          processed.addons.forEach((addon, aIndex) => {
            formData.append(`products[${index}][addons][${aIndex}][addon_id]`, addon.addon_id);
            formData.append(`products[${index}][addons][${aIndex}][count]`, addon.count);
            formData.append(`products[${index}][addons][${aIndex}][price]`, addon.price);
          });
        }

        // Extra IDs
        if (processed.extra_id && processed.extra_id.length > 0) {
          processed.extra_id.forEach((extId, eIndex) => {
            formData.append(`products[${index}][extra_id][${eIndex}]`, extId);
          });
        }

        // Exclude IDs
        if (processed.exclude_id && processed.exclude_id.length > 0) {
          processed.exclude_id.forEach((exId, exIndex) => {
            formData.append(`products[${index}][exclude_id][${exIndex}]`, exId);
          });
        }
      });

      await postUpdateDineIn("cashier/update_dine_in_order", formData);
      toast.success("تم تحديث الطلب بنجاح");
    } catch (err) {
      console.error("update_dine_in_order error:", err);
      toast.error(err?.response?.data?.message || "فشل تحديث الطلب");
      setOrderLoading(false);
      return; // لو فضل العملية فشلت ما نغلقش الـ dialog
    }
  } else {
    toast.success(existingIndex !== -1 ? "تم تحديث الكارت بنجاح" : "تم الإضافة للكارت");
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