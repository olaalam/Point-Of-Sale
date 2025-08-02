import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";

export default function OrdersView() {
  const { data, error, loading } = useGet("cashier/home/cashier_data");
  const [search, setSearch] = useState("");
  const orderType = localStorage.getItem("last_order_type") || "take_away";

  let orders = [];
  if (orderType === "take_away" && Array.isArray(data?.take_away)) {
    orders = data.take_away;
  } else if (orderType === "dine_in" && Array.isArray(data?.dine_in)) {
    orders = data.dine_in;
  } else if (orderType === "delivery" && Array.isArray(data?.delivery)) {
    orders = data.delivery;
  }

  const [statuses, setStatuses] = useState(() =>
    orders.reduce((acc, order) => {
      acc[order.id] = order.order_status || "waiting";
      return acc;
    }, {})
  );

  if (loading) return <Loading />;
  if (error)
    return <div className="text-red-500 text-center">Error loading data.</div>;

  const filteredOrders = orders.filter((order) =>
    order.order_number?.toString().includes(search)
  );

  const nextStatus = {
    waiting: "preparing",
    preparing: "done",
    done: "pick_up",
    pick_up: "waiting",
  };

  const handleStatusChange = (orderId) => {
    setStatuses((prev) => ({
      ...prev,
      [orderId]: nextStatus[prev[orderId]] || "waiting",
    }));
    // TODO: send update to backend
  };

  const renderStatusBadge = (status) => {
    const colorMap = {
      waiting: "bg-yellow-100 text-yellow-800",
      preparing: "bg-blue-100 text-blue-800",
      done: "bg-green-100 text-green-800",
      pick_up: "bg-purple-100 text-purple-800",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full font-semibold ${
          colorMap[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  const renderPaymentBadge = (payment) => {
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full font-semibold ${
          payment === "paid"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {payment}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <Input
        type="text"
        placeholder="Search Order Number"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mx-auto"
      />

      <h2 className="text-xl font-semibold mt-6 text-center">
        Orders:{" "}
        <span className="capitalize">{orderType.replace("_", " ")}</span>
      </h2>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-500 text-center">No orders found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              // Added flex-col and justify-between to Card
              className="border shadow-sm bg-white flex flex-col h-full"
            >
              <CardContent className="p-4 space-y-3 flex-grow">
                {" "}
                {/* Added flex-grow to CardContent */}
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">
                    #{order.order_number}
                  </h3>
                  {renderStatusBadge(statuses[order.id])}
                </div>
                <p className="text-sm text-gray-500">
                  {order.order_date} — {order.date}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Payment:</span>
                  {renderPaymentBadge(order.status_payment)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Items:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {order.order_details?.map((detail, i) =>
                      detail.product?.map((prod, j) => (
                        <li key={`${i}-${j}`}>
                          {prod.product.name} × {prod.count}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </CardContent>
              {/* Button moved outside CardContent, and added mt-auto */}
              <div className="p-4 pt-0"> {/* Added padding for the button container */}
                <Button
                  onClick={() => handleStatusChange(order.id)}
                  className="w-full mt-auto bg-bg-primary hover:bg-red-700 text-white"
                >
                  Change Status
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}