import React, { useEffect, useState } from "react";
import Card from "./Card";
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
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ استخدم القيم التي تم تمريرها كـ props بشكل أساسي، وإذا لم تكن موجودة استخدم state أو localStorage
  const currentOrderType = propOrderType || location.state?.orderType || localStorage.getItem("order_type") || "take_away";
  const currentTableId = propTableId || location.state?.tableId || localStorage.getItem("table_id") || null;
  const currentUserId = propUserId || location.state?.delivery_user_id || localStorage.getItem("delivery_user_id") || null;

  // ✅ Debugging logs
  console.log("OrderPage Component Props:", { propOrderType, propTableId, propUserId });
  console.log("OrderPage Component State/Props combined:", { currentOrderType, currentTableId, currentUserId });

  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;
  const isDelivery = currentOrderType === "delivery" && !!currentUserId;

  const { data: dineInData, loading: dineInLoading, refetch: refetchDineIn } = useGet(
    isDineIn && currentTableId ? `cashier/dine_in_table_order/${currentTableId}` : null
  );

  const { data: deliveryData, loading: deliveryLoading, refetch: refetchDelivery } = useGet(
    isDelivery && currentUserId ? `cashier/delivery_order/${currentUserId}` : null
  );

  // Function لـ refresh البيانات
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
      
      // Force re-render by updating refresh trigger
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

  // ✅ Load take-away cart from localStorage
  useEffect(() => {
    if (currentOrderType === "take_away") {
      const storedCartString = localStorage.getItem("cart");
      if (storedCartString && storedCartString !== "undefined") {
        try {
          const storedCart = JSON.parse(storedCartString);
          setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
        } catch (error) {
          console.error("Error parsing cart JSON:", error);
          setTakeAwayItems([]);
        }
      } else {
        setTakeAwayItems([]);
      }
    }
  }, [currentOrderType]);

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
      // لو العنصر موجود، زوّد الكمية وأضف الـ addons
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        count: updatedItems[existingItemIndex].count + product.count,
        addons: [...updatedItems[existingItemIndex].addons, ...product.addons],
      };
    } else {
      // لو العنصر جديد، أضفه
      updatedItems.push({
        ...product,
        count: product.count || 1,
        preparation_status: product.preparation_status || "pending",
      });
    }

    updateOrderItems(updatedItems);
  };

  const handleClose = () => {
    // حذف البيانات من localStorage لإلغاء اختيار العميل
    localStorage.removeItem("selected_user_id");
    localStorage.removeItem("selected_address_id");
    localStorage.removeItem("order_type");
    localStorage.removeItem("table_id");
    localStorage.removeItem("delivery_user_id");

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