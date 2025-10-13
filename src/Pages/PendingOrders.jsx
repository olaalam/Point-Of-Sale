import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useGet } from "@/Hooks/useGet";
import { ToastContainer, toast } from "react-toastify";
import { ArrowLeft, Clock, Package } from "lucide-react";

export default function PendingOrders() {
  const navigate = useNavigate();
  const { data: pendingOrders, loading, error, refetch } = useGet("cashier/get_pending_orders");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetailsEndpoint, setOrderDetailsEndpoint] = useState(null);

  const { 
    data: orderDetailsData, 
    loading: orderLoading, 
    error: orderError 
  } = useGet(orderDetailsEndpoint);

  useEffect(() => {
    if (error) {
      toast.error(`Error loading pending orders: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (orderError) {
      toast.error(`Error loading order details: ${orderError}`);
      setSelectedOrderId(null);
      setOrderDetailsEndpoint(null);
    }
  }, [orderError]);

  useEffect(() => {
    if (orderDetailsData && orderDetailsData.id) {
      console.log("Found valid order details:", orderDetailsData);
      const order = orderDetailsData; 

      // ✅ Better mapping - extract the actual product data
      const mappedOrderDetails = [];
      
      if (order.order_details && Array.isArray(order.order_details)) {
        order.order_details.forEach(detail => {
          if (detail.product && Array.isArray(detail.product)) {
            // Handle nested product structure
            detail.product.forEach(productItem => {
              if (productItem.product) {
                mappedOrderDetails.push({
                  product_id: productItem.product.id,
                  product_name: productItem.product.name,
                  price: parseFloat(productItem.product.price || 0),
                  count: parseInt(productItem.count || 1),
                  variation_name: productItem.variation_name || null,
                  addons: productItem.addons || []
                });
              }
            });
          } else if (detail.product_name) {
            // Handle direct structure
            mappedOrderDetails.push({
              product_id: detail.product_id || detail.id,
              product_name: detail.product_name,
              price: parseFloat(detail.price || 0),
              count: parseInt(detail.count || 1),
              variation_name: detail.variation_name || null,
              addons: detail.addons || []
            });
          }
        });
      }

      const orderData = {
        orderId: order.id,
        orderDetails: mappedOrderDetails,
        orderNumber: order.order_number,
        amount: order.amount,
        notes: order.notes,
        orderType: "take_away",
        timestamp: new Date().toISOString()
      };
      
      console.log("Mapped order details:", mappedOrderDetails);
      
      toast.success(`Order #${order.order_number} loaded successfully!`);
      
      // ✅ Clear any existing cart data first
      localStorage.removeItem("cart");
      localStorage.removeItem("pending_order_info");
      
      // ✅ Navigate with the pending order data - DON'T clear state immediately
      navigate("/", { 
        state: { 
          activeTab: "takeaway",
          orderType: "take_away",
          pendingOrder: orderData 
        } 
      });
      
      // ✅ Reset selection after navigation
      setTimeout(() => {
        setSelectedOrderId(null);
        setOrderDetailsEndpoint(null);
      }, 500);
      
    } else if (orderDetailsData) {
        console.log("API response does not contain a valid order object:", orderDetailsData);
    }
  }, [orderDetailsData, selectedOrderId, navigate]);

  const handleSelectOrder = (orderId) => {
    if (orderLoading || selectedOrderId) return;
    
    console.log("Selecting order:", orderId);
    setSelectedOrderId(orderId);
    setOrderDetailsEndpoint(`cashier/get_order/${orderId}`);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (err) {
      return dateString;
    }
  };

  const formatOrderItems = (orderDetails) => {
    if (!Array.isArray(orderDetails)) return "No items";
    
    const items = [];
    orderDetails.forEach(orderDetail => {
      if (orderDetail.product && Array.isArray(orderDetail.product)) {
        // Handle nested product structure
        orderDetail.product.forEach(productItem => {
          if (productItem.product && productItem.product.name) {
            items.push(`${productItem.product.name} x${productItem.count || 1}`);
          }
        });
      } else if (orderDetail.product_name) {
        // Handle direct product_name structure
        items.push(`${orderDetail.product_name} x${orderDetail.count || 1}`);
      } else if (orderDetail.name) {
        // Handle name field
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
              Pending Orders
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
            <p className="text-red-600">Error loading pending orders: {error}</p>
            <Button 
              onClick={refetch} 
              variant="outline" 
              className="mt-2"
              disabled={loading}
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!pendingOrders || !Array.isArray(pendingOrders.all_orders) || pendingOrders.all_orders.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-500 text-lg">No pending orders found</p>
  
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
                          Order #{order.order_number || order.id}
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
                        <span className="text-gray-600">Customer:</span>
                        <span className="font-medium">{order.customer_name || order.name || "N/A"}</span>
                      </div>
                      {order.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{order.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold text-green-600">
                          {parseFloat(order.amount || 0).toFixed(2)} EGP
                        </span>
                      </div>
                      {order.notes && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Notes:</span> {order.notes}
                        </div>
                      )}
                    </div>
                    
                    {order.order_details && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-600 mb-1">Items:</p>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {formatOrderItems(order.order_details)}
                        </p>
                      </div>
                    )}
                    
                    {/* ✅ Loading overlay */}
                    {selectedOrderId === order.id && orderLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <Loading />
                          <span className="text-sm text-gray-600 font-medium">Loading order details...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* ✅ Click indicator */}
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
      <ToastContainer position="top-right" />
    </div>
  );
}