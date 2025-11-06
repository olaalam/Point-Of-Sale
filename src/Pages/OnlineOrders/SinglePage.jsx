import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import Loading from "@/components/Loading";
import { ArrowLeft, Package, MapPin, Clock } from "lucide-react";

export default function SinglePage() {
  const { id } = useParams();
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useGet(`cashier/orders/order_item/${id}`);
  const { putData: updateStatus, loading: updating } = usePut();

  const [status, setStatus] = useState("");

  if (isLoading) return <Loading />;
  if (error) {
    toast.error(t("FailedToFetchOrder") || "Failed to fetch order");
    return null;
  }

  const order = data?.order;
  if (!order) {
    return (
      <div className="text-center py-10 text-gray-500">
        {t("NoOrderFound") || "No order found"}
      </div>
    );
  }

  const statuses = [
    "processing",
    "out_for_delivery",
    "delivered",
    "canceled",
    "confirmed",
    "scheduled",
    "returned",
    "faild_to_deliver",
    "refund",
  ];

  const handleStatusChange = async () => {
    if (!status) {
      toast.warning(t("SelectStatusFirst") || "Please select a status first");
      return;
    }
    try {
      await updateStatus(`cashier/orders/status/${id}?order_status=${status}`);
      toast.success(t("OrderStatusUpdated") || "Order status updated successfully");
      refetch();
    } catch (err) {
      toast.error(t("FailedToUpdateStatus",err) || "Failed to update order status",err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {t("Order")} #{order.order_number}
          </h1>
          <span className="text-sm font-medium text-gray-600 capitalize">
            {order.order_status.replace(/_/g, " ")}
          </span>
        </div>

        {/* 🔹 Status Update Section */}
        <div className="flex items-center gap-3 mb-6">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring focus:ring-blue-200 focus:outline-none"
          >
            <option value="">{t("SelectStatus") || "Select Status"}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <button
            onClick={handleStatusChange}
            disabled={updating}
            className="bg-bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {updating ? t("Updating") || "Updating..." : t("UpdateStatus") || "Update Status"}
          </button>
        </div>

        {/* Customer Info */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-gray-700 mb-1">
              {t("CustomerInfo") || "Customer Info"}
            </h2>
            <p className="text-gray-600">{order.user?.name}</p>
            <p className="text-gray-600">{order.user?.phone}</p>
            <p className="text-gray-600">{order.user?.email}</p>
          </div>

          <div>
            <h2 className="font-semibold text-gray-700 mb-1">
              {t("Branch") || "Branch"}
            </h2>
            <p className="text-gray-600">{order.branch?.name}</p>
            <p className="text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
              {order.branch?.address}
            </p>
          </div>
        </div>

        {/* Order Info */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-gray-700 mb-1">
              {t("OrderDetails") || "Order Details"}
            </h2>
            <p className="text-gray-600">
              {t("Amount") || "Amount"}:{" "}
              <span className="font-medium">{order.amount} EGP</span>
            </p>
            <p className="text-gray-600">
              {t("TotalDiscount") || "Total Discount"}:{" "}
              <span className="font-medium">{order.total_discount} EGP</span>
            </p>
            <p className="text-gray-600 flex items-center">
              <Clock className="w-4 h-4 mr-1 text-gray-400" />
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-gray-700 mb-1">
              {t("DeliveryInfo") || "Delivery Info"}
            </h2>
            <p className="text-gray-600">
              {order.delivery?.f_name} {order.delivery?.l_name}
            </p>
            <p className="text-gray-600">{order.delivery?.phone}</p>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">
            {t("Products") || "Products"}
          </h2>
          <div className="space-y-3">
            {order.order_details.map((detail, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                {detail.product.map((p, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <img
                      src={p.product.image_link}
                      alt={p.product.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {p.product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {p.product.price} EGP × {p.count}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
