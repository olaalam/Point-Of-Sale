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
import { X, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import VoidOrderModal from "./VoidOrderModal"; // 🟢 Import

export default function AllOrders() {
  const [showModal, setShowModal] = useState(true);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // 🟢 Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const { postData, loading } = usePost();

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return toast.error(t("Pleaseenteryourpassword"));

    try {
      const res = await postData("cashier/orders/point_of_sale", { password });

      if (res?.orders) {
        setOrders(res.orders);
        setShowModal(false);
        toast.success(t("Accessgrantedsuccessfully"));
      } else {
        toast.error(t("Incorrectpassword"));
      }
    } catch (err) {
      toast.error(t("totheserver"));
      console.error(err);
    }
  };

  // 🟢 Handle Void Click
  const handleVoidClick = (order) => {
    setSelectedOrder(order);
    setShowVoidModal(true);
  };

  // 🟢 Handle Void Success - Refresh Orders
  const handleVoidSuccess = async () => {
    try {
      const res = await postData("cashier/orders/point_of_sale", { password });
      if (res?.orders) {
        setOrders(res.orders);
        toast.success(t("Ordersrefreshedsuccessfully"));
      }
    } catch (err) {
      console.error("Refresh Error:", err);
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
    <div className="p-4" dir={isArabic ? "rtl" : "ltr"}>
      {/* Password Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
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
            <DialogTitle>{t("EnterPassword")}</DialogTitle>
          </DialogHeader>

          <Input
            type="password"
            placeholder={t("Password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            onClick={handlePasswordSubmit}
            disabled={loading}
            className="mt-3 w-full"
          >
            {loading ? t("Loading") : t("Login")}
          </Button>
        </DialogContent>
      </Dialog>

      {!showModal && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder={t("SearchByOrderNumber")}
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
          <div className="overflow-x-auto rounded-lg shadow-md border" dir={isArabic ? "rtl" : "ltr"}>
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("OrderNumber")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Type")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Amount")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Status")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Branch")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("DateTime")}
                  </th>
                  {/* 🟢 New Void Column */}
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Void")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.order_number}
                    </td>
                    <td className={`border p-3 capitalize ${isArabic ? "text-right" : "text-left"}`}>
                      {order.order_type}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.amount}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
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
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.branch?.name || "—"}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {new Date(order.created_at).toLocaleString(isArabic ? "ar-EG" : "en-US")}
                    </td>
                    {/* 🟢 Void Button */}
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleVoidClick(order)}
                        className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title={t("VoidOrder")}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <p className="text-center text-gray-500 mt-6">
              {t("NoOrdersFoundForThisDate")}
            </p>
          )}
        </>
      )}

      {/* 🟢 Void Order Modal */}
      <VoidOrderModal
        isOpen={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setSelectedOrder(null);
        }}
        orderId={selectedOrder?.id}
        orderNumber={selectedOrder?.order_number}
        onSuccess={handleVoidSuccess}
      />
    </div>
  );
}