import React, { useEffect, useState } from "react";
import Card from "./Card/Card";
import Item from "./Item";
import { useLocation, useNavigate } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { areProductsEqual } from "./ProductModal";
import { useTranslation } from "react-i18next";

export default function OrderPage({
  fetchEndpoint,
  initialCart = [],
  allowQuantityEdit = true,
  propOrderType,
  propTableId,
  propUserId,
  onClose,
  discountData = { discount: 0, module: [] },
}) {
   const { i18n } = useTranslation()
  const locale = i18n.language === "ar" ? "ar" : "en";
      const isArabic = i18n.language === "ar";
  const [ordersByTable, setOrdersByTable] = useState({});
  const [ordersByUser, setOrdersByUser] = useState({});
  const [takeAwayItems, setTakeAwayItems] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingOrderLoaded, setPendingOrderLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pendingOrder = location.state?.pendingOrder;

  const currentOrderType = propOrderType || location.state?.orderType || sessionStorage.getItem("order_type") || "take_away";
  const currentTableId = propTableId || location.state?.tableId || sessionStorage.getItem("table_id") || null;
  const currentUserId = propUserId || location.state?.delivery_user_id || sessionStorage.getItem("delivery_user_id") || null;

  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;
  const isDelivery = currentOrderType === "delivery" && !!currentUserId;

  const { data: dineInData, loading: dineInLoading, refetch: refetchDineIn } = useGet(
    isDineIn && currentTableId ? `cashier/dine_in_table_order/${currentTableId}?locale=${locale}` : null
  );

  // ✅ FIXED: تحميل الطلب المتكرر من sessionStorage للـ take_away
  useEffect(() => {
    if (pendingOrder && pendingOrder.orderDetails && !pendingOrderLoaded) {
      const mappedItems = pendingOrder.orderDetails.map((detail, index) => ({
        id: detail.product_id || `pending_${index}`,
        temp_id: `pending_${detail.product_id || index}_${Date.now()}`,
        name:     detail.name || 
    detail.product_name || 
    detail.product?.[0]?.product?.name || 
    "Unknown Productييي",
        price: parseFloat(detail.price || 0),
        originalPrice: parseFloat(detail.price || 0),
        count: parseInt(detail.count || 1),
        selectedVariation: detail.variation_name || null,
        selectedExtras: Array.isArray(detail.addons) ? detail.addons : [],
        selectedVariations: detail.variation_name ? [detail.variation_name] : [],
        selectedExcludes: [],
        preparation_status: "pending",
        type: "main_item",
        addons: Array.isArray(detail.addons) ? detail.addons.map((addon, addonIndex) => ({
          id: `addon_${addonIndex}_${Date.now()}`,
          name: addon.name || "Unknown Addon",
          price: parseFloat(addon.price || 0),
          originalPrice: parseFloat(addon.price || 0),
          count: parseInt(addon.count || 1),
          preparation_status: "pending",
        })) : [],
      }));
      setTakeAwayItems(mappedItems);
      setPendingOrderLoaded(true);
      sessionStorage.setItem("cart", JSON.stringify(mappedItems));
      sessionStorage.setItem("order_type", "take_away");
      sessionStorage.setItem("pending_order_info", JSON.stringify({
        orderId: pendingOrder.orderId,
        orderNumber: pendingOrder.orderNumber,
        amount: pendingOrder.amount,
        notes: pendingOrder.notes,
      }));
    } else if (!pendingOrderLoaded && currentOrderType === "take_away") {
      const storedCartString = sessionStorage.getItem("cart");
      if (storedCartString && storedCartString !== "undefined") {
        try {
          const storedCart = JSON.parse(storedCartString);
          console.log("📦 Loading cart from sessionStorage in OrderPage:", storedCart);
          setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
        } catch (error) {
          console.error("Error parsing cart JSON from sessionStorage:", error);
          setTakeAwayItems([]);
        }
      }
    }
  }, [pendingOrder, pendingOrderLoaded, currentOrderType]);

  // dine-in: أضف originalPrice و temp_id
  useEffect(() => {
    if (isDineIn && currentTableId && dineInData?.success) {
      const mappedItems = Array.isArray(dineInData.success)
        ? dineInData.success.map((item) => ({
            ...item,
            originalPrice: item.originalPrice ?? item.price ?? 0,
            temp_id: item.temp_id || `dinein_${item.id}_${Date.now()}`,
            count: parseInt(item.count || 1),
            price: parseFloat(item.price || 0),
            preparation_status: item.prepration || item.preparation_status || "pending",
          }))
        : [];

      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: mappedItems,
      }));
    }
  }, [isDineIn, currentTableId, dineInData]);

  // delivery: أضف originalPrice و temp_id
  useEffect(() => {
    if (isDelivery && currentUserId && dineInData?.success) {
      const mappedItems = Array.isArray(dineInData.success)
        ? dineInData.success.map((item) => ({
            ...item,
            originalPrice: item.originalPrice ?? item.price ?? 0,
            temp_id: item.temp_id || `delivery_${item.id}_${Date.now()}`,
            count: parseInt(item.count || 1),
            price: parseFloat(item.price || 0),
            preparation_status: item.prepration || item.preparation_status || "pending",
          }))
        : [];

      setOrdersByUser((prev) => ({
        ...prev,
        [currentUserId]: mappedItems,
      }));
    }
  }, [isDelivery, currentUserId, dineInData]);

  const clearOrderData = () => {
    if (currentOrderType === "take_away") {
      setTakeAwayItems([]);
      sessionStorage.removeItem("cart");
      sessionStorage.removeItem("pending_order_info");
    } else if (currentOrderType === "dine_in" && currentTableId) {
      setOrdersByTable((prev) => ({ ...prev, [currentTableId]: [] }));
    } else if (currentOrderType === "delivery" && currentUserId) {
      setOrdersByUser((prev) => ({ ...prev, [currentUserId]: [] }));
      sessionStorage.removeItem("selected_user_id");
      sessionStorage.removeItem("selected_address_id");
    }
  };

  const refreshCartData = async () => {
    try {
      setIsLoading(true);
      if (isDineIn && currentTableId && refetchDineIn) {
        await refetchDineIn();
      } else if (currentOrderType === "take_away") {
        const storedCartString = sessionStorage.getItem("cart");
        if (storedCartString && storedCartString !== "undefined") {
          try {
            const storedCart = JSON.parse(storedCartString);
            console.log("🔄 Refreshing cart from sessionStorage:", storedCart);
            setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
          } catch (error) {
            console.error("Error parsing cart JSON:", error);
            setTakeAwayItems([]);
          }
        }
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error refreshing cart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentOrderItems = isDineIn
    ? ordersByTable[currentTableId] || []
    : isDelivery
    ? ordersByUser[currentUserId] || []
    : takeAwayItems;

const updateOrderItems = (newItems) => {
    const safeNewItems = Array.isArray(newItems) ? newItems : [];
    
    // 1. تحديث الـ State حسب النوع
    if (isDineIn) {
      setOrdersByTable((prev) => ({ ...prev, [currentTableId]: safeNewItems }));
    } else if (isDelivery) {
      setOrdersByUser((prev) => ({ ...prev, [currentUserId]: safeNewItems }));
    } else {
      setTakeAwayItems(safeNewItems);
    }

    // 2. 🟢 المزامنة مع sessionStorage لكل الحالات لضمان وجود cart_id دائماً
    // هذا السطر يضمن أن أي موديول آخر (مثل تغيير الحالة) يجد البيانات
    sessionStorage.setItem("cart", JSON.stringify(safeNewItems));
    
    console.log("💾 Updated cart in sessionStorage (All Modes):", safeNewItems);
  };

  const handleAddItem = (product, options = {}) => {
    const safeCurrentItems = Array.isArray(currentOrderItems) ? currentOrderItems : [];

    if (options.updateExisting && options.index !== undefined) {
      const updatedItems = [...safeCurrentItems];
      updatedItems[options.index] = product;
      updateOrderItems(updatedItems);
      return;
    }

    const existingItemIndex = safeCurrentItems.findIndex((item) => areProductsEqual(item, product));
    let updatedItems = [...safeCurrentItems];

    if (existingItemIndex !== -1) {
      const existingItem = updatedItems[existingItemIndex];
      const newCount = existingItem.count + (product.count || 1);
      updatedItems[existingItemIndex] = {
        ...existingItem,
        count: newCount,
        totalPrice: existingItem.price * newCount,
      };
    } else {
      updatedItems.push({
        ...product,
        count: product.count || 1,
        preparation_status: product.preparation_status || "pending",
      });
    }

    updateOrderItems(updatedItems);
  };

const handleClose = () => {
    // إذا تم تمرير onClose من الأب (Home.jsx)، نستخدمها
    // لأنها تحتوي على المنطق الصحيح للعودة لقائمة الديليفري دون تغيير التبويب
    if (onClose) {
      onClose();
      return; 
    }

    // هذا الكود الاحتياطي يعمل فقط إذا لم يتم تمرير onClose
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_address_id");
    sessionStorage.removeItem("order_type");
    sessionStorage.removeItem("table_id");
    sessionStorage.removeItem("delivery_user_id");
    sessionStorage.removeItem("cart");
    sessionStorage.removeItem("pending_order_info");
    setPendingOrderLoaded(false);
    navigate("/");
  };

  console.log("📋 OrderPage Current Items:", currentOrderItems);
  console.log("🎯 OrderPage Order Type:", currentOrderType);

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 p-4 h-full  w-full" dir={isArabic ? "ltr" : "rtl"}>
      <div className="w-full lg:w-1/3 sm:overflow-auto">
        <Card
          key={refreshTrigger}
          onClose={onClose}
          orderItems={currentOrderItems}
          updateOrderItems={updateOrderItems}
          allowQuantityEdit={allowQuantityEdit}
          orderType={currentOrderType}
          clearOrderData={clearOrderData}
          tableId={currentTableId}
          userId={currentUserId}
          isLoading={dineInLoading || isLoading}
          discountData={discountData}
        />
      </div>
      <div className="w-full lg:w-3/4  lg:mt-0">
        <Item
          onAddToOrder={handleAddItem}
          fetchEndpoint={fetchEndpoint}
          onClose={handleClose}
          refreshCartData={refreshCartData}
          orderItems={currentOrderItems}
        />
      </div>
    </div>
  );
}