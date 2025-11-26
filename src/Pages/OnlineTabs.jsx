"use client";
import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import OnlineOrders from "./OnlineOrders/OnlineOrders";

export default function OnlineTabs() {
  return (
    <div className="w-full p-4">
      <Tabs defaultValue="orders" className="w-full">

        {/* === TABS HEADER === */}
        <TabsList className="w-full flex gap-4 bg-muted p-2 rounded-xl">
          <TabsTrigger
            value="orders"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white py-2 rounded-lg"
          >
            Online Orders
          </TabsTrigger>

          <TabsTrigger
            value="expenses"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white py-2 rounded-lg"
          >
            Expenses
          </TabsTrigger>
        </TabsList>

        {/* === ONLINE ORDERS CONTENT === */}
        <TabsContent value="orders" className="mt-6">
            <OnlineOrders/>
        </TabsContent>

        {/* === EXPENSES CONTENT === */}
        <TabsContent value="expenses" className="mt-6">
          <div className="p-4 border rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Expenses</h2>

            {/* PLACE YOUR CONTENT HERE */}
            <p className="text-sm text-gray-600">
              Display expenses details here...
            </p>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
