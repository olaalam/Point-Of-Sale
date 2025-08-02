import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine";
import { useLocation } from "react-router-dom";
import TakeAway from "./TakeAway";

export default function Home() {
  const location = useLocation();

  const [tabValue, setTabValue] = useState("take");
  const [orderType, setOrderType] = useState("take_away");

  useEffect(() => {
    if (location.state?.orderType === "dine_in") {
      setTabValue("take");
      setOrderType("dine_in");
    } else if (location.state?.orderType === "delivery") {
      setTabValue("delivery");
      setOrderType("delivery");
    } else {
      setTabValue("take");
      setOrderType("take_away");
    }
  }, [location.state]);

  const handleTabChange = (value) => {
    setTabValue(value);
    if (value === "take") {
      setOrderType("take_away");
    } else if (value === "delivery") {
      setOrderType("delivery");
    } else if (value === "dine") {
      setOrderType("dine_in");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8">
      <Tabs value={tabValue} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full flex justify-center gap-6 bg-transparent mb-10 p-0 h-auto">
          <TabsTrigger
            value="take"
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
            value="dine"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
          >
            Dine In
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="take"
          className="mt-8 flex flex-col items-center space-y-6"
        >
          <TakeAway orderType={orderType} />
        </TabsContent>

        <TabsContent value="delivery">
          <Delivery orderType={orderType} />
        </TabsContent>

        <TabsContent value="dine">
          <Dine orderType={orderType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
