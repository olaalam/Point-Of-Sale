import React, { useState, useMemo, useRef } from "react";
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
import { X, Trash2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import VoidOrderModal from "./VoidOrderModal";
import axiosInstance from "@/Pages/utils/axiosInstance";
export default function AllOrders() {
  const [showModal, setShowModal] = useState(true);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Print States
  const [printOrderData, setPrintOrderData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef();
  
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar" : "en";
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

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

  // Handle Void Click
  const handleVoidClick = (order) => {
    setSelectedOrder(order);
    setShowVoidModal(true);
  };

  // Handle Void Success - Refresh Orders
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

  // Handle Print Click - Fixed Version
  const handlePrintClick = async (order) => {
    if (isPrinting) return; // منع الضغط المتكرر
    
    setIsPrinting(true);
    try {
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axiosInstance.get(
        `${baseUrl}cashier/orders/order_checkout/${order.id}?locale=${locale}`,
        { headers }
      );
      
      if (response?.data?.order_checkout) {
        setPrintOrderData(response.data.order_checkout);
        
        // Wait for state update and DOM render
        setTimeout(() => {
          if (printRef.current) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
              <html>
                <head>
                  <title>Order ${response.data.order_checkout.order_number}</title>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
                    h2 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; }
                    th { background-color: #f0f0f0; }
                    @media print { 
                      body { padding: 0; }
                      button { display: none; }
                    }
                  </style>
                </head>
                <body>
                  ${printRef.current.innerHTML}
                  <script>
                    window.onload = function() {
                      window.print();
                      window.onafterprint = function() {
                        window.close();
                      }
                    }
                  </script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
          setIsPrinting(false);
        }, 100);
        
        toast.success(t("Preparingprint") || "Preparing print...");
      }
    } catch (err) {
      toast.error(t("Failedtoloadorderdetails") || "Failed to load order details");
      console.error("Print Error:", err);
      setIsPrinting(false);
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
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
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
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Print")}
                  </th>
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
                    {/* Print Button */}
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handlePrintClick(order)}
                        disabled={isPrinting}
                        className={`text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50 ${
                          isPrinting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={t("PrintOrder")}
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </td>
                    {/* Void Button */}
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

      {/* Void Order Modal */}
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

{/* Hidden Print Template - تصميم فاتورة احترافي */}
<div style={{ display: "none" }}>
  <div ref={printRef} className="print-area" dir={isArabic ? "rtl" : "ltr"}>
    {printOrderData && (
      <div style={{
        fontFamily: isArabic ? "'Cairo', 'Arial', sans-serif" : "'Roboto', 'Arial', sans-serif",
        margin: "0 auto",
        padding: "2px",
        background: "#fff",
        color: "#000",
        fontSize: "12px",
        lineHeight: "1.4"
      }}>
        {/* Header - اسم المطعم وشعار افتراضي */}
        <div style={{ textAlign: "center", marginBottom: "15px", borderBottom: "2px dashed #000", paddingBottom: "10px" }}>
          <h1 style={{ margin: "0", fontSize: "18px", fontWeight: "bold" }}>
            {isArabic ? "مطعم [اسم المطعم]" : "[Restaurant Name]"}
          </h1>
          <p style={{ margin: "5px 0", fontSize: "11px" }}>
            {printOrderData.branch?.address || "Main Branch"}<br />
            تليفون: {printOrderData.branch?.phone || "01000000000"}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: "10px", color: "#555" }}>
            {isArabic ? "شكرًا لزيارتكم" : "Thank you for your visit"}
          </p>
        </div>

        {/* Order Info */}
        <div style={{ marginBottom: "12px", fontSize: "11px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>{t("OrderNumber") || "Order #"}:</span>
            <strong>{printOrderData.order_number}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>{t("Date") || "Date"}:</span>
            <span>{printOrderData.order_date} {printOrderData.order_time}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>{t("Type") || "Type"}:</span>
            <strong style={{ textTransform: "capitalize" }}>
              {printOrderData.order_type === "delivery" ? (isArabic ? "توصيل" : "Delivery") :
               printOrderData.order_type === "pickup" ? (isArabic ? "استلام" : "Pickup") :
               (isArabic ? "جلوس" : "Dine In")}
            </strong>
          </div>
          {printOrderData.order_type === "delivery" && printOrderData.user && (
            <div style={{ marginTop: "8px", padding: "8px", background: "#f9f9f9", borderRadius: "4px", fontSize: "10px" }}>
              <strong>{isArabic ? "العميل" : "Customer"}:</strong> {printOrderData.user.name}<br />
              <strong>{isArabic ? "الهاتف" : "Phone"}:</strong> {printOrderData.user.phone}<br />
              <strong>{isArabic ? "العنوان" : "Address"}:</strong> {printOrderData.address?.street && `${printOrderData.address.street}, `}
              {printOrderData.address?.building_num && `مبنى ${printOrderData.address.building_num}, `}
              {printOrderData.address?.floor_num && `دور ${printOrderData.address.floor_num}, `}
              {printOrderData.address?.address}
            </div>
          )}
        </div>

        <div style={{ borderTop: "2px #ccc", margin: "10px 0" }}></div>

        {/* Order Items */}
        <table style={{ width: "100%", marginBottom: "10px" }}>
          <tbody>
            {printOrderData.order_details?.map((detail, index) => (
              <tr key={index}>
                <td style={{ padding: "6px 0", verticalAlign: "top" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {detail.product.count}x {detail.product.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
                    {detail.addons?.length > 0 && (
                      <div>
                        {detail.addons.map((addon) => `+ ${addon.name}`).join("، ")}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: isArabic ? "left" : "right", whiteSpace: "nowrap", fontWeight: "bold" }}>
                  {(detail.product.total_price + (detail.addons?.reduce((s, a) => s + a.total, 0) || 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "2px dashed #ccc", margin: "10px 0" }}></div>

        {/* Totals */}
        <table style={{ width: "100%", fontSize: "12px" }}>
          <tbody>
            <tr>
              <td>{t("Subtotal") || "Subtotal"}</td>
              <td style={{ textAlign: isArabic ? "left" : "right" }}>
                {(printOrderData.amount - printOrderData.total_tax - printOrderData.delivery_fees).toFixed(2)}
              </td>
            </tr>
            {printOrderData.delivery_fees > 0 && (
              <tr>
                <td>{t("DeliveryFees") || "Delivery Fees"}</td>
                <td style={{ textAlign: isArabic ? "left" : "right" }}>
                  {printOrderData.delivery_fees.toFixed(2)}
                </td>
              </tr>
            )}
            <tr>
              <td>{t("Tax") || "Tax (14%)"}</td>
              <td style={{ textAlign: isArabic ? "left" : "right" }}>
                {printOrderData.total_tax.toFixed(2)}
              </td>
            </tr>
            {printOrderData.total_discount > 0 && (
              <tr>
                <td>{t("Discount") || "Discount"}</td>
                <td style={{ textAlign: isArabic ? "left" : "right", color: "green" }}>
                  -{printOrderData.total_discount.toFixed(2)}
                </td>
              </tr>
            )}
            <tr style={{ fontWeight: "bold", fontSize: "14px", borderTop: "2px solid #000", marginTop: "5px" }}>
              <td style={{ paddingTop: "8px" }}>{t("Total") || "Total"}</td>
              <td style={{ textAlign: isArabic ? "left" : "right", paddingTop: "8px" }}>
                {printOrderData.amount.toFixed(2)} {isArabic ? "ج.م" : "EGP"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Payment Status
        <div style={{ textAlign: "center", marginTop: "15px", fontWeight: "bold", fontSize: "13px" }}>
          {printOrderData.payment === "Paid" || printOrderData.status_payment === "paid" ?
            <span style={{ color: "green" }}>تم الدفع - Paid</span> :
            <span style={{ color: "red" }}>غير مدفوع - Unpaid</span>
          }
        </div> */}

        {/* Footer
        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "10px", color: "#777", borderTop: "1px dashed #ccc", paddingTop: "10px" }}>
          <p>تم إصدار الفاتورة بواسطة نظام [اسم النظام]</p>
          <p>{new Date().toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
        </div> */}
      </div>
    )}
  </div>
</div>
    </div>
  );
}