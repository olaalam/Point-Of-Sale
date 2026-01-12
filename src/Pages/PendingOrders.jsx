import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";
import { ArrowLeft, Clock, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PendingOrders() {
  const navigate = useNavigate();
  const { data: pendingOrders, loading, error, refetch } = useGet("cashier/get_pending_orders");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetailsEndpoint, setOrderDetailsEndpoint] = useState(null);
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  const { 
    data: orderDetailsData, 
    loading: orderLoading, 
    error: orderError 
  } = useGet(orderDetailsEndpoint);

  useEffect(() => {
    if (error) {
      toast.error(`${t("Errorloadingpendingorders")}: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (orderError) {
      toast.error(`${t("Errorloadingorderdetails")}: ${orderError}`);
      setSelectedOrderId(null);
      setOrderDetailsEndpoint(null);
    }
  }, [orderError]);

// داخل useEffect الخاص بـ orderDetailsData في PendingOrders.jsx
useEffect(() => {
  if (orderDetailsData && orderDetailsData.id) {
    const order = orderDetailsData;
    const mappedOrderDetails = [];

    order.order_details?.forEach((detail) => {
      detail.product?.forEach((productWrapper) => {
        const actualProductData = productWrapper.product;

        if (actualProductData) {
          mappedOrderDetails.push({
            // البيانات التي يتوقعها OrderPage.jsx
            product_id: actualProductData.id,
            product_name: actualProductData.name || "Unknown Product",
            
            // السعر والكمية بتنسيق عددي
            price: parseFloat(actualProductData.price_after_discount || actualProductData.price || 0),
            count: parseInt(productWrapper.count || 1),
            
            // حل مشكلة [object Object] في الإضافات
            // نقوم باستخراج المعرفات فقط أو التأكد من بنية الكائن
            addons: Array.isArray(actualProductData.addons) 
              ? actualProductData.addons.map(addon => ({
                  id: addon.id,
                  name: addon.name,
                  price: addon.price
                })) 
              : [],
            
            // الخيارات (Variations)
            variation_name: detail.variations?.[0]?.name || null,
            
            // حقول إضافية مطلوبة في السلة
            temp_id: `pending_${actualProductData.id}_${Math.random().toString(36).substr(2, 5)}`,
            notes: productWrapper.notes || "",
            preparation_status: "pending",
            type: "main_item"
          });
        }
      });
    });

    const orderData = {
      orderId: order.id,
      orderDetails: mappedOrderDetails,
      orderNumber: order.order_number,
      totalAmount: order.amount,
      notes: order.notes,
      orderType: "take_away"
    };

    // حفظ السلة بالبنية الجديدة
    sessionStorage.setItem("cart", JSON.stringify(mappedOrderDetails));

    navigate("/", { 
      state: { 
        activeTab: "takeaway",
        orderType: "take_away",
        pendingOrder: orderData 
      } 
    });
  }
}, [orderDetailsData, navigate]);

  const handleSelectOrder = (orderId) => {
    if (orderLoading || selectedOrderId) return;
    
    console.log("Selecting order:", orderId);
    setSelectedOrderId(orderId);
    setOrderDetailsEndpoint(`cashier/get_order/${orderId}?locale=${locale}`);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (err) {
      toast.error("Invalid date format",err);
      return dateString;
    }
  };

  const formatOrderItems = (orderDetails) => {
    if (!Array.isArray(orderDetails)) return "No items";
    
    const items = [];
    orderDetails.forEach(orderDetail => {
      if (orderDetail.product && Array.isArray(orderDetail.product)) {
        orderDetail.product.forEach(productItem => {
          if (productItem.product && productItem.product.name) {
            items.push(`${productItem.product.name} x${productItem.count || 1}`);
          }
        });
      } else if (orderDetail.product_name) {
        items.push(`${orderDetail.product_name} x${orderDetail.count || 1}`);
      } else if (orderDetail.name) {
        items.push(`${orderDetail.name} x${orderDetail.count || 1}`);
      }
    });
    
    return items.length > 0 ? items.join(", ") : "No items available";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex m-auto items-center gap-4">

            <h1 className="text-3xl font-bold text-gray-800 flex  items-center gap-2">
              <Clock className="text-orange-600" size={32} />
              {t("PendingOrders")}
            </h1>
          </div>

        </div>

        {loading && (
          <div className="flex justify-center items-center h-40">
            <Loading />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{t("Errorloadingpendingorders")}: {error}</p>
            <Button 
              onClick={refetch} 
              variant="outline" 
              className="mt-2"
              disabled={loading}
            >
              {t("Retry")}
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!pendingOrders || !Array.isArray(pendingOrders.all_orders) || pendingOrders.all_orders.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-500 text-lg">{t("Nopendingordersfound")}</p>
  
              </div>
            ) : (
              pendingOrders.all_orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-md border hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
                    selectedOrderId === order.id 
                      ? 'ring-2 ring-orange-500 bg-orange-50 shadow-xl' 
                      : 'hover:border-orange-200'
                  } ${orderLoading && selectedOrderId === order.id ? 'pointer-events-none opacity-75' : ''}`}
                  onClick={() => handleSelectOrder(order.id)}
                >
                  <div className="p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {t("Order")} #{order.order_number || order.id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created_at || order.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                          {order.status || "Pending"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Customer")}:</span>
                        <span className="font-medium">{order.customer_name || order.name || "N/A"}</span>
                      </div>
                      {order.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("Phone")}:</span>
                          <span className="font-medium">{order.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Total")}:</span>
                        <span className="font-bold text-green-600">
                          {parseFloat(order.amount || 0).toFixed(2)} EGP
                        </span>
                      </div>
                      {order.notes && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">{t("Notes")}:</span> {order.notes}
                        </div>
                      )}
                    </div>
                    
                    {order.order_details && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-600 mb-1">{t("Items")}:</p>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {formatOrderItems(order.order_details)}
                        </p>
                      </div>
                    )}
                    
                    {selectedOrderId === order.id && orderLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <Loading />
                          <span className="text-sm text-gray-600 font-medium">{t("Loadingorderdetails")}</span>
                        </div>
                      </div>
                    )}
                    
                    {!orderLoading && (
                      <div className="absolute bottom-4 right-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}