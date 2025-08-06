// src/components/Home.jsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine";
import { useLocation } from "react-router-dom";
import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";

// ✅ دالة تجلب الحالة الأولية من localStorage
const getInitialState = () => {
  const storedOrderType = localStorage.getItem("order_type") || "take_away";
  const storedTab = localStorage.getItem("tab") || storedOrderType;
  const storedTableId = localStorage.getItem("table_id") || null;
  const storedDeliveryUserId = localStorage.getItem("selected_user_id") || null;

  return {
    tabValue: storedTab,
    orderType: storedOrderType,
    tableId: storedTableId,
    deliveryUserId: storedDeliveryUserId,
  };
};

export default function Home() {
  const location = useLocation();
  // ✅ استخدمنا useState واحد لإدارة كل الحالات
  const [state, setState] = useState(getInitialState);

  useEffect(() => {
    // ✅ في كل مرة يتغير فيها المسار (مثل إعادة تحميل الصفحة)، نقوم بتحديث الحالة
    const storedState = getInitialState();
    setState(storedState);
  }, [location.key]);

  const handleTabChange = (value) => {
    // ✅ سلوك واضح ومفصل لكل Tab
    let newState = {
      tabValue: value,
      orderType: value,
      tableId: null,
      deliveryUserId: null,
    };

    if (value === "take_away") {
      localStorage.removeItem("table_id");
      localStorage.removeItem("delivery_user_id");
    } else if (value === "dine_in") {
      // ✅ عند التحويل لـ dine_in، نُعيد تحميل table_id من localStorage
      newState.tableId = localStorage.getItem("table_id");
      localStorage.removeItem("delivery_user_id");
    } else if (value === "delivery") {
      // ✅ عند التحويل لـ delivery، نُعيد تحميل deliveryUserId من localStorage
      newState.deliveryUserId = localStorage.getItem("delivery_user_id");
      localStorage.removeItem("table_id");
    }

    setState(newState);
    localStorage.setItem("tab", value);
    localStorage.setItem("order_type", value);
  };

  const handleTableSelect = (id) => {
    setState((prevState) => ({
      ...prevState,
      tableId: id,
      orderType: "dine_in",
      tabValue: "dine_in",
    }));
    localStorage.setItem("table_id", id);
    localStorage.setItem("order_type", "dine_in");
    localStorage.setItem("tab", "dine_in");
  };

  const handleDeliveryUserSelect = (id) => {
    setState((prevState) => ({
      ...prevState,
      deliveryUserId: id,
      orderType: "delivery",
      tabValue: "delivery",
    }));
    localStorage.setItem("delivery_user_id", id);
    localStorage.setItem("order_type", "delivery");
    localStorage.setItem("tab", "delivery");
  };

  // ✅ Debugging logs
  console.log("Home Component State:", state);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8">
      <Tabs
        value={state.tabValue}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full flex justify-center gap-6 bg-transparent mb-10 p-0 h-auto">
          <TabsTrigger
            value="take_away"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
          >
            TakeAway
          </TabsTrigger>
          <TabsTrigger
            value="delivery"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
          >
            Delivery
          </TabsTrigger>
          <TabsTrigger
            value="dine_in"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
          >
            Dine In
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="take_away"
          className="mt-8 flex flex-col items-center space-y-6"
        >
          <TakeAway orderType={state.orderType} />
        </TabsContent>

        <TabsContent value="delivery">
          {state.deliveryUserId ? (
            <OrderPage
              propOrderType="delivery"
              propUserId={state.deliveryUserId}
            />
          ) : (
            <Delivery onCustomerSelect={handleDeliveryUserSelect} />
          )}
        </TabsContent>

        <TabsContent value="dine_in">
          {state.tableId ? (
            <OrderPage propOrderType="dine_in" propTableId={state.tableId} />
          ) : (
            <Dine onTableSelect={handleTableSelect} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
