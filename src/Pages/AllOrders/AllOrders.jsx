import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";

export default function AllOrders() {
  const [showModal, setShowModal] = useState(true);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { postData, loading } = usePost();

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return toast.error("Please enter your password");

    try {
      const res = await postData("cashier/orders/point_of_sale", { password });

      if (res?.orders) {
        setOrders(res.orders);
        setShowModal(false);
        toast.success("Access granted successfully");
      } else {
        toast.error("Incorrect password");
      }
    } catch (err) {
      toast.error("An error occurred while connecting to the server",err);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.created_at.split("T")[0];
      const matchDate = orderDate === date;
      const matchSearch = order.order_number.toString().includes(search);
      return matchDate && matchSearch;
    });
  }, [orders, search, date]);

  return (
    <div className="p-4">
      {/* Password Modal */}
      <Dialog open={showModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            onClick={handlePasswordSubmit}
            disabled={loading}
            className="mt-3 w-full"
          >
            {loading ? "Loading..." : "Login"}
          </Button>
        </DialogContent>
      </Dialog>

      {!showModal && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Search by order number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-1/3"
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sm:w-1/3"
            />
          </div>

          {/* Orders Cards */}
          {filteredOrders.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-2xl shadow-md p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-lg">Order #{order.order_number}</h2>
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        order.order_status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.order_status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.order_status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Type:</span> {order.order_type}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Amount:</span> {order.amount}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Branch:</span>{" "}
                    {order.branch?.name || "—"}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Date:</span>{" "}
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-6">
              No orders found for this date.
            </p>
          )}
        </>
      )}
    </div>
  );
}
