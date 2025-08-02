import React, { useEffect, useState } from "react";
import Card from "./Card";
import Item from "./Item";
import { useLocation } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";

export default function OrderPage({
  fetchEndpoint,
  initialCart = [],
  allowQuantityEdit = true,
  propOrderType,
  propTableId,
}) {
  const [ordersByTable, setOrdersByTable] = useState({});
  const [takeAwayItems, setTakeAwayItems] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  const currentOrderType =
    propOrderType ||
    location.state?.orderType ||
    localStorage.getItem("orderType") ||
    "take_away";

  const currentTableId = propTableId || location.state?.tableId || null;
  console.log("Current table:", currentTableId);
  
  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;

  const { data, loading } = useGet(
    isDineIn && currentTableId ? `cashier/dine_in_table_order/${currentTableId}` : null
  );

  // ✅ Fetch dine-in order from API response
  useEffect(() => {
    if (isDineIn && currentTableId && data?.success) {
      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: Array.isArray(data.success) ? data.success : [],
      }));
      console.log("Fetched dine-in order:", data.success);
    }
  }, [isDineIn, currentTableId, data]);

  // ✅ Load take-away cart from localStorage
  useEffect(() => {
    if (!isDineIn) {
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
  }, [isDineIn]);

  // ✅ Listen to localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      if (!isDineIn) {
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
  }, [isDineIn]);

  // ✅ Ensure currentOrderItems is always an array
  const currentOrderItems = isDineIn
    ? Array.isArray(ordersByTable[currentTableId]) ? ordersByTable[currentTableId] : []
    : Array.isArray(takeAwayItems) ? takeAwayItems : [];

  const updateOrderItems = (newItems) => {
    // Ensure newItems is always an array
    const safeNewItems = Array.isArray(newItems) ? newItems : [];
    
    if (isDineIn) {
      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: safeNewItems,
      }));
    } else {
      setTakeAwayItems(safeNewItems);
      localStorage.setItem("cart", JSON.stringify(safeNewItems));
    }
  };

  const handleAddItem = (product) => {
    // Double-check that currentOrderItems is an array
    const safeCurrentItems = Array.isArray(currentOrderItems) ? currentOrderItems : [];
    
    const existingIndex = safeCurrentItems.findIndex(
      (item) => item.id === product.id
    );

    let updatedItems = [];

    if (existingIndex !== -1) {
      updatedItems = [...safeCurrentItems];
      updatedItems[existingIndex].count += 1;
    } else {
      updatedItems = [
        ...safeCurrentItems,
        {
          ...product,
          count: 1,
          preparation_status: "pending",
          preparation: "",
        },
      ];
    }

    updateOrderItems(updatedItems);
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-6 h-full w-full px-4">
      <div className="min-w-[31rem] lg:w-[31rem] flex-shrink-0">
        <Card
          orderItems={currentOrderItems}
          updateOrderItems={updateOrderItems}
          allowQuantityEdit={allowQuantityEdit}
          orderType={currentOrderType}
          tableId={currentTableId}
          isLoading={loading || isLoading}
        />
      </div>

      <div className="w-full lg:w-3/5 overflow-auto">
        <Item onAddToOrder={handleAddItem} fetchEndpoint={fetchEndpoint} />
      </div>
    </div>
  );
}