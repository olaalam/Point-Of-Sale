import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import Loading from "@/components/Loading";
import { ArrowLeft, Package, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SinglePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useGet(`cashier/orders/order_item/${id}`);
  const { putData: updateStatus, loading: updating } = usePut();

  const [status, setStatus] = useState("");

  // NEW: modal for cancel reason
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (isLoading) return <Loading />;
  if (error) {
    toast.error(t("FailedToFetchOrder") || data?.errors);
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

  // NEW: status flow restriction
  const statusOrder = [
    "processing",
    "confirmed",
    "out_for_delivery",
    "delivered",
    "returned",
    "refund",
    "faild_to_deliver",
    "scheduled",
    "canceled",
  ];

  const canChangeStatus = (newStatus) => {
    const currentIndex = statusOrder.indexOf(order.order_status);
    const newIndex = statusOrder.indexOf(newStatus);
    return newIndex >= currentIndex;
  };

  // NEW: shared update function
  const updateStatusNow = async (extraReason = "") => {
    try {
      await updateStatus(
        `cashier/orders/status/${id}?order_status=${status}${
          extraReason ? `&admin_cancel_reason=${extraReason}` : ""
        }`
      );

      toast.success(t("OrderStatusUpdated") || "Order status updated successfully");
      refetch();
    } catch (err) {
      toast.error(t("FailedToUpdateStatus", err) || "Failed to update order status");
    }
  };

  // updated handler
  const handleStatusChange = async () => {
    if (!status) {
      toast.warning(t("SelectStatusFirst") || "Please select a status first");
      return;
    }

    if (!canChangeStatus(status)) {
      toast.error(t("YouCannotRevertStatus") || "You cannot revert to a previous status");
      return;
    }

    if (status === "canceled") {
      setShowCancelDialog(true);
      return;
    }

    await updateStatusNow();
  };

  // ✅ FIXED: Repeat Order Function
  const handleRepeatOrder = () => {
    console.log("🔄 Repeating order from SinglePage:", order);

    // Map order details to cart format
    const mappedItems = order.order_details.map((detail, index) => {
      const product = detail.product && detail.product[0];
      if (!product || !product.product) return null;

      const productData = product.product;
      const count = parseInt(product.count) || 1;
      const notes = product.notes || "";

      // Map addons
      const addons = detail.addons && Array.isArray(detail.addons)
        ? detail.addons.map((addon) => ({
            id: addon.addon_id || addon.id,
            name: addon.name || "Unknown Addon",
            price: parseFloat(addon.price || 0),
            originalPrice: parseFloat(addon.price || 0),
            count: parseInt(addon.count || 1),
            preparation_status: "pending",
          }))
        : [];

      return {
        id: productData.id,
        temp_id: `repeat_single_${productData.id}_${Date.now()}_${index}`,
        name: productData.name || "Unknown Product",
        price: parseFloat(productData.price || 0),
        originalPrice: parseFloat(productData.price || 0),
        count: count,
        notes: notes,
        selectedVariation: detail.variations && detail.variations[0] ? detail.variations[0].name : null,
        selectedExtras: detail.extras || [],
        selectedAddons: addons,
        selectedExcludes: detail.excludes || [],
        preparation_status: "pending",
        type: "main_item",
        addons: addons,
      };
    }).filter(Boolean);

    console.log("📦 Mapped Items for Cart from SinglePage:", mappedItems);

    // Clear any existing order data
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_address_id");
    sessionStorage.removeItem("table_id");
    sessionStorage.removeItem("delivery_user_id");
    
    // Set new order data
    sessionStorage.setItem("cart", JSON.stringify(mappedItems));
    sessionStorage.setItem("order_type", "take_away");
    sessionStorage.setItem("tab", "take_away");

    console.log("✅ SessionStorage updated from SinglePage:", {
      cart: mappedItems,
      order_type: "take_away",
      tab: "take_away"
    });

    // Navigate to home with take_away tab
    navigate("/", {
      state: { 
        orderType: "take_away",
        tabValue: "take_away",
        repeatedOrder: true,
        originalOrderNumber: order.order_number,
        timestamp: Date.now()
      },
      replace: false
    });
  };

  return (
    <>
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

          {/* Repeat Order Button */}
          <div className="flex justify-end mt-6 mb-6">
            <button
              onClick={handleRepeatOrder}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              {t("RepeatOrder") || "Repeat This Order"}
            </button>
          </div>

          {/* Status Update Section */}
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

        {/* NEW: Cancel Reason Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-md rounded-lg p-6">
              <h2 className="font-bold text-lg mb-3">
                {t("CancelReason") || "Reason of Cancellation"}
              </h2>

              <textarea
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-2"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("WriteReasonHere") || "Write the reason..."}
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 rounded-lg border"
                >
                  {t("Close") || "Close"}
                </button>

                <button
                  onClick={async () => {
                    if (!cancelReason.trim()) {
                      toast.warning(t("ReasonRequired") || "Reason is required");
                      return;
                    }

                    await updateStatusNow(cancelReason);
                    setShowCancelDialog(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white"
                >
                  {t("Submit") || "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer style={{ zIndex: 999999 }} />
    </>
  );
}