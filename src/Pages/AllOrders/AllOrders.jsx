import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { X } from "lucide-react";

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
      toast.error("An error occurred while connecting to the server", err);
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
      <Dialog open={showModal} onOpenChange={setShowModal}>
<DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* زرار X */}
          <DialogClose
            asChild
            onClick={() => setShowModal(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            <button aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </DialogClose>

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

          {/* Orders Table */}
          <div className="overflow-x-auto rounded-lg shadow-md border">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="border p-3 text-left">Order #</th>
                  <th className="border p-3 text-left">Type</th>
                  <th className="border p-3 text-left">Amount</th>
                  <th className="border p-3 text-left">Status</th>
                  <th className="border p-3 text-left">Branch</th>
                  <th className="border p-3 text-left">Date/Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="border p-3">{order.order_number}</td>
                    <td className="border p-3 capitalize">{order.order_type}</td>
                    <td className="border p-3">{order.amount}</td>
                    <td className="border p-3">
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
                    </td>
                    <td className="border p-3">
                      {order.branch?.name || "—"}
                    </td>
                    <td className="border p-3">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <p className="text-center text-gray-500 mt-6">
              No orders found for this date.
            </p>
          )}
        </>
      )}
    </div>
  );
}
