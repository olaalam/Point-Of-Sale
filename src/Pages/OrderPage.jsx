// OrderPage.js
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
  const [pendingOrderLoaded, setPendingOrderLoaded] = useState(false); // ✅ New flag to prevent re-loading
  
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Get the pending order data passed from the PendingOrders page
  const pendingOrder = location.state?.pendingOrder;

  // ✅ Use a function to set the initial state, checking for a pending order first
  useEffect(() => {
    if (pendingOrder && pendingOrder.orderDetails && !pendingOrderLoaded) {
      console.log("Loading pending order from navigation state:", pendingOrder);

      // ✅ Improved mapping with better data extraction
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
      setPendingOrderLoaded(true); // ✅ Mark as loaded

      // ✅ Store in localStorage as backup and to persist the data
      localStorage.setItem("cart", JSON.stringify(mappedItems));
      localStorage.setItem("order_type", "take_away");
      
      // ✅ Store pending order info for reference
      localStorage.setItem("pending_order_info", JSON.stringify({
        orderId: pendingOrder.orderId,
        orderNumber: pendingOrder.orderNumber,
        amount: pendingOrder.amount,
        notes: pendingOrder.notes
      }));

      console.log("Pending order loaded successfully with", mappedItems.length, "items");

    } else if (!pendingOrderLoaded && (propOrderType === "take_away" || (!propOrderType && localStorage.getItem("order_type") === "take_away"))) {
      // If there's no pending order, load the take-away cart from localStorage as a fallback
      const storedCartString = localStorage.getItem("cart");
      if (storedCartString && storedCartString !== "undefined") {
        try {
          const storedCart = JSON.parse(storedCartString);
          setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
          console.log("Loaded cart from localStorage:", storedCart);
        } catch (error) {
          console.error("Error parsing cart JSON from localStorage:", error);
          setTakeAwayItems([]);
        }
      }
    }
  }, [pendingOrder, propOrderType, pendingOrderLoaded]);

  // ✅ Use props as primary source, then state, then localStorage
  const currentOrderType = propOrderType || location.state?.orderType || localStorage.getItem("order_type") || "take_away";
  const currentTableId = propTableId || location.state?.tableId || localStorage.getItem("table_id") || null;
  const currentUserId = propUserId || location.state?.delivery_user_id || localStorage.getItem("delivery_user_id") || null;

  // ✅ Debugging logs
  console.log("OrderPage Component Props:", { propOrderType, propTableId, propUserId });
  console.log("OrderPage Component State/Props combined:", { currentOrderType, currentTableId, currentUserId });
  console.log("Current takeaway items:", takeAwayItems);

  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;
  const isDelivery = currentOrderType === "delivery" && !!currentUserId;

  const { data: dineInData, loading: dineInLoading, refetch: refetchDineIn } = useGet(
    isDineIn && currentTableId ? `cashier/dine_in_table_order/${currentTableId}` : null
  );

  const { data: deliveryData, loading: deliveryLoading, refetch: refetchDelivery } = useGet(
    isDelivery && currentUserId ? `cashier/delivery_order/${currentUserId}` : null
  );

  // Function to refresh the data
  const refreshCartData = async () => {
    try {
      setIsLoading(true);
      console.log("Refreshing cart data...");
      
      if (isDineIn && currentTableId) {
        console.log("Refetching dine-in data for table:", currentTableId);
        if (refetchDineIn) {
          await refetchDineIn();
        }
      } else if (isDelivery && currentUserId) {
        console.log("Refetching delivery data for user:", currentUserId);
        if (refetchDelivery) {
          await refetchDelivery();
        }
      } else if (currentOrderType === "take_away") {
        console.log("Refreshing take-away cart from localStorage");
        const storedCartString = localStorage.getItem("cart");
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

  // ✅ Fetch dine-in order from API response
  useEffect(() => {
    if (isDineIn && currentTableId && dineInData?.success) {
      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: Array.isArray(dineInData.success) ? dineInData.success : [],
      }));
      console.log("Fetched dine-in order:", dineInData.success);
    }
  }, [isDineIn, currentTableId, dineInData]);

  // ✅ Fetch delivery order from API response
  useEffect(() => {
    if (isDelivery && currentUserId && deliveryData?.success) {
      setOrdersByUser((prev) => ({
        ...prev,
        [currentUserId]: Array.isArray(deliveryData.success) ? deliveryData.success : [],
      }));
      console.log("Fetched delivery order:", deliveryData.success);
    }
  }, [isDelivery, currentUserId, deliveryData]);

  // ✅ Listen to localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      if (currentOrderType === "take_away") {
        const updatedCartString = localStorage.getItem("cart");
        if (updatedCartString) {
          try {
            const updatedCart = JSON.parse(updatedCartString);
            setTakeAwayItems(Array.isArray(updatedCart) ? updatedCart : []);
          } catch (error) {
            console.error("Error parsing updated cart JSON:", error);
            setTakeAwayItems([]);
          }
        } else {
          setTakeAwayItems([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [currentOrderType]);

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
      localStorage.setItem("cart", JSON.stringify(safeNewItems));
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
    // Delete data from localStorage to unselect the customer
    localStorage.removeItem("selected_user_id");
    localStorage.removeItem("selected_address_id");
    localStorage.removeItem("order_type");
    localStorage.removeItem("table_id");
    localStorage.removeItem("delivery_user_id");
    localStorage.removeItem("cart"); // Clear the cart when closing the order page
    localStorage.removeItem("pending_order_info"); // ✅ Clear pending order info
    
    // ✅ Reset the pending order loaded flag
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