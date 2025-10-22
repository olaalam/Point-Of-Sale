import React, { useEffect, useState } from "react";
import Card from "./Card/Card";
import Item from "./Item";
import { useLocation, useNavigate } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";

export default function OrderPage({
  fetchEndpoint,
  initialCart = [],
  allowQuantityEdit = true,
  propOrderType,
  propTableId,
  propUserId,
}) {
  const [ordersByTable, setOrdersByTable] = useState({});
  const [ordersByUser, setOrdersByUser] = useState({});
  const [takeAwayItems, setTakeAwayItems] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingOrderLoaded, setPendingOrderLoaded] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const pendingOrder = location.state?.pendingOrder;

  // ✅ CORRECT: Define these variables at the top
  const currentOrderType = propOrderType || location.state?.orderType || sessionStorage.getItem("order_type") || "take_away";
  const currentTableId = propTableId || location.state?.tableId || sessionStorage.getItem("table_id") || null;
  const currentUserId = propUserId || location.state?.delivery_user_id || sessionStorage.getItem("delivery_user_id") || null;

  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;
  const isDelivery = currentOrderType === "delivery" && !!currentUserId;

  const { data: dineInData, loading: dineInLoading, refetch: refetchDineIn } = useGet(
    isDineIn && currentTableId ? `cashier/dine_in_table_order/${currentTableId}` : null
  );

  const { data: deliveryData, loading: deliveryLoading, refetch: refetchDelivery } = useGet(
    isDelivery && currentUserId ? `cashier/delivery_order/${currentUserId}` : null
  );

  // ✅ IMPROVED: This useEffect handles the initial loading of data only once.
  useEffect(() => {
    if (pendingOrder && pendingOrder.orderDetails && !pendingOrderLoaded) {
      console.log("Loading pending order from navigation state:", pendingOrder);
      const mappedItems = pendingOrder.orderDetails.map((detail, index) => ({
        id: detail.product_id || `pending_${index}`,
        temp_id: `pending_${detail.product_id || index}_${Date.now()}`,
        name: detail.product_name || "Unknown Product",
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
          preparation_status: "pending"
        })) : []
      }));
      setTakeAwayItems(mappedItems);
      setPendingOrderLoaded(true);
      sessionStorage.setItem("cart", JSON.stringify(mappedItems));
      sessionStorage.setItem("order_type", "take_away");
      sessionStorage.setItem("pending_order_info", JSON.stringify({
        orderId: pendingOrder.orderId,
        orderNumber: pendingOrder.orderNumber,
        amount: pendingOrder.amount,
        notes: pendingOrder.notes
      }));
    } else if (!pendingOrderLoaded && currentOrderType === "take_away") {
      const storedCartString = sessionStorage.getItem("cart");
      if (storedCartString && storedCartString !== "undefined") {
        try {
          const storedCart = JSON.parse(storedCartString);
          setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
        } catch (error) {
          console.error("Error parsing cart JSON from sessionStorage:", error);
          setTakeAwayItems([]);
        }
      }
    }
  }, [pendingOrder, pendingOrderLoaded, currentOrderType]);
const clearOrderData = () => {
  console.log("Clearing order data...");
  
  if (currentOrderType === "take_away") {
    setTakeAwayItems([]);
    sessionStorage.removeItem("cart");
    sessionStorage.removeItem("pending_order_info");
  } else if (currentOrderType === "dine_in" && currentTableId) {
    // للـ dine_in، مسح البيانات المحلية
    setOrdersByTable((prev) => ({
      ...prev,
      [currentTableId]: [],
    }));
    // يمكن إضافة refresh من الـ API إذا لزم الأمر
  } else if (currentOrderType === "delivery" && currentUserId) {
    setOrdersByUser((prev) => ({
      ...prev,
      [currentUserId]: [],
    }));
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_address_id");
  }
};
  // ✅ Separate useEffect for handling dine-in API data.
  useEffect(() => {
    if (isDineIn && currentTableId && dineInData?.success) {
      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: Array.isArray(dineInData.success) ? dineInData.success : [],
      }));
      console.log("Fetched dine-in order:", dineInData.success);
    }
  }, [isDineIn, currentTableId, dineInData]);

  // ✅ Separate useEffect for handling delivery API data.
  useEffect(() => {
    if (isDelivery && currentUserId && deliveryData?.success) {
      setOrdersByUser((prev) => ({
        ...prev,
        [currentUserId]: Array.isArray(deliveryData.success) ? deliveryData.success : [],
      }));
      console.log("Fetched delivery order:", deliveryData.success);
    }
  }, [isDelivery, currentUserId, deliveryData]);

  const refreshCartData = async () => {
    try {
      setIsLoading(true);
      console.log("Refreshing cart data...");
      
if (isDineIn && currentTableId) {
  if (refetchDineIn) {
    const dineData = await refetchDineIn();
    if (!dineData || typeof dineData !== "object") {
      console.warn("Invalid dine-in response:", dineData);
      return;
    }
  }
}
 else if (isDelivery && currentUserId) {
        if (refetchDelivery) {
          await refetchDelivery();
        }
      } else if (currentOrderType === "take_away") {
        const storedCartString = sessionStorage.getItem("cart");
        if (storedCartString && storedCartString !== "undefined") {
          try {
            const storedCart = JSON.parse(storedCartString);
            setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
          } catch (error) {
            console.error("Error parsing cart JSON:", error);
            setTakeAwayItems([]);
          }
        }
      }
      
      setRefreshTrigger(prev => prev + 1);
      
      console.log("Cart data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing cart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentOrderItems = isDineIn
    ? Array.isArray(ordersByTable[currentTableId]) ? ordersByTable[currentTableId] : []
    : isDelivery
    ? Array.isArray(ordersByUser[currentUserId]) ? ordersByUser[currentUserId] : []
    : Array.isArray(takeAwayItems) ? takeAwayItems : [];

  const updateOrderItems = (newItems) => {
    const safeNewItems = Array.isArray(newItems) ? newItems : [];

    if (isDineIn) {
      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: safeNewItems,
      }));
    } else if (isDelivery) {
      setOrdersByUser((prev) => ({
        ...prev,
        [currentUserId]: safeNewItems,
      }));
    } else {
      setTakeAwayItems(safeNewItems);
      sessionStorage.setItem("cart", JSON.stringify(safeNewItems));
    }
  };

  const handleAddItem = (product) => {
    const safeCurrentItems = Array.isArray(currentOrderItems) ? currentOrderItems : [];

    const existingItemIndex = safeCurrentItems.findIndex(
      (item) =>
        item.id === product.id &&
        item.selectedVariation === product.selectedVariation &&
        JSON.stringify(item.selectedExtras?.sort()) ===
          JSON.stringify(product.selectedExtras?.sort())
    );

    let updatedItems = [...safeCurrentItems];

    if (existingItemIndex !== -1) {
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        count: updatedItems[existingItemIndex].count + product.count,
        addons: [...updatedItems[existingItemIndex].addons, ...product.addons],
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

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 p-4 h-full w-full">
      <div className="w-full lg:w-1/2 sm:overflow-auto">
        <Card
          key={refreshTrigger}
          orderItems={currentOrderItems}
          updateOrderItems={updateOrderItems}
          allowQuantityEdit={allowQuantityEdit}
          orderType={currentOrderType}
           clearOrderData={clearOrderData}
          tableId={currentTableId}
          userId={currentUserId}
          isLoading={dineInLoading || deliveryLoading || isLoading}
        />
      </div>
      <div className="w-full lg:w-1/2 mt-4 lg:mt-0">
        <Item 
          onAddToOrder={handleAddItem} 
          fetchEndpoint={fetchEndpoint} 
          onClose={handleClose}
          refreshCartData={refreshCartData} 
        />
      </div>
    </div>
  );
}