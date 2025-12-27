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
  const [isPrinting, setIsPrinting] = useState(false);

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

  // =========================================================
  // دالة توليد تصميم الفاتورة (نفس تصميم الكود الثاني)
  // =========================================================
  const generateReceiptHTML = (data) => {
    // تجهيز البيانات
    const orderType = data.order_type || "";
    let orderTypeLabel = isArabic ? "تيك اواي" : "TAKEAWAY";
    let tableLabel = "";

    if (orderType === "dine_in") {
      orderTypeLabel = isArabic ? "صالة" : "DINE IN";
      if (data.table) {
        tableLabel = isArabic ? `طاولة: ${data.table}` : `Table: ${data.table}`;
      }
    } else if (orderType === "delivery") {
      orderTypeLabel = isArabic ? "توصيل" : "DELIVERY";
    } else if (orderType === "pickup") {
      orderTypeLabel = isArabic ? "استلام" : "PICKUP";
    }

    const showCustomerInfo = orderType === "delivery" && data.user;
    const restaurantName=sessionStorage.getItem("resturant_name") || (isArabic ? "اسم المطعم" : "Restaurant Name");

    // حساب الإجماليات
    const subtotal = (data.amount - data.total_tax - data.delivery_fees).toFixed(2);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Print Order ${data.order_number}</title>
          <style>
            @page { margin: 0; size: auto; }
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              background-color: #fff;
              font-family: 'Tahoma', 'Arial', sans-serif;
              color: #000;
              direction: ${isArabic ? "rtl" : "ltr"};
              font-size: 12px;
            }
            .container {
              width: 100% !important;
              padding: 5px 2px;
              margin: 0;
              box-sizing: border-box;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { 
              font-size: 24px; font-weight: 900; margin: 0; 
              text-transform: uppercase; letter-spacing: 1px;
            }
            .header p { margin: 2px 0; font-size: 12px; color: #333; }
            .header .phone { font-weight: bold; font-size: 13px; margin-top: 2px;}

            .order-badge {
              border: 2px solid #000; background-color: #000; color: black;
              text-align: center; font-size: 18px; font-weight: 900;
              padding: 5px; margin: 5px 0; border-radius: 4px;
            }
            .table-info { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px; }

            .meta-grid { 
              width: 100%; border-top: 1px dashed #000; border-bottom: 1px dashed #000; 
              margin-bottom: 8px; padding: 5px 0;
            }
            .meta-label { font-size: 10px; color: black; }
            .meta-value { font-size: 14px; font-weight: 900; }

            .section-header {
              background-color: #eee; border-top: 1px solid #000; border-bottom: 1px solid #000;
              color: #000; text-align: center; font-weight: bold; font-size: 12px;
              padding: 3px 0; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase;
            }

            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th { 
              text-align: center; font-size: 11px; border-bottom: 2px solid #000; padding-bottom: 4px;
            }
            .items-table td { 
              padding: 6px 0; border-bottom: 1px dashed #ccc; vertical-align: top;
            }
            .item-qty { font-size: 13px; font-weight: bold; text-align: center; }
            .item-name { font-size: 13px; font-weight: bold; padding: 0 5px; }
            .item-total { font-size: 13px; font-weight: bold; text-align: center; }
            .addon-row { font-size: 11px; color: #444; margin-top: 2px; font-weight: normal; }
            .notes-row { font-size: 11px; font-style: italic; color: #555; }

            .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; font-weight: bold;}
            .grand-total {
              border: 2px solid #000; padding: 8px; margin-top: 8px;
              text-align: center; font-size: 22px; font-weight: 900;
              display: flex; justify-content: space-between; align-items: center;
            }
            .cust-info { font-size: 12px; font-weight: bold; line-height: 1.4; padding: 5px; border: 1px dotted #000; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            
            <div class="header">
              <h1>${restaurantName}</h1>
              <p>${data.branch?.address || ""}</p>
              <div class="phone">${data.branch?.phone || ""}</div>
            </div>

            <div class="order-badge">${orderTypeLabel}</div>
            ${tableLabel ? `<div class="table-info">${tableLabel}</div>` : ""}

            <table class="meta-grid">
              <tr>
                <td width="50%" style="border-${isArabic ? "left" : "right"}: 1px dotted #000; padding: 0 5px;">
                  <div class="meta-label">${isArabic ? "رقم الفاتورة" : "ORDER NO"}</div>
                  <div class="meta-value" style="font-size: 18px;">#${data.order_number}</div>
                </td>
                <td width="50%" style="padding: 0 5px; text-align: ${isArabic ? "left" : "right"};">
                  <div class="meta-label">${isArabic ? "التاريخ / الوقت" : "DATE / TIME"}</div>
                  <div style="font-weight: bold; font-size: 11px;">${data.order_date}</div>
                  <div style="font-weight: bold; font-size: 11px;">${data.order_time}</div>
                </td>
              </tr>
            </table>

            ${showCustomerInfo ? `
              <div class="section-header">${isArabic ? "بيانات العميل" : "CUSTOMER INFO"}</div>
              <div class="cust-info">
                <div>${data.user.name}</div>
                <div style="direction: ltr; text-align: ${isArabic ? "right" : "left"};">${data.user.phone}</div>
                ${data.address ? `
                  <div style="font-weight: normal; margin-top: 3px; border-top: 1px dotted #ccc; padding-top:2px;">
                    ${data.address.address}
                    ${data.address.building_num ? `, B:${data.address.building_num}` : ""}
                    ${data.address.floor_num ? `, F:${data.address.floor_num}` : ""}
                    ${data.address.apartment ? `, Apt:${data.address.apartment}` : ""}
                  </div>
                ` : ""}
              </div>
            ` : ""}

            <div class="section-header">${isArabic ? "الطلبات" : "ITEMS"}</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th width="25%">${isArabic ? "كمية" : "Qt"}</th>
                  <th width="50%" style="text-align: ${isArabic ? "right" : "left"};">${isArabic ? "الصنف" : "Item"}</th>
                  <th width="25%">${isArabic ? "إجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                ${data.order_details.map(item => {
                  const itemTotal = item.product.total_price + (item.addons?.reduce((s, a) => s + Number(a.total), 0) || 0);
                  let addonsHTML = "";
                  if (item.addons && item.addons.length > 0) {
                    addonsHTML = item.addons.map(add => 
                      `<div class="addon-row">+ ${add.name} (${Number(add.price).toFixed(2)})</div>`
                    ).join("");
                  }
                  
                  return `
                    <tr>
                      <td class="item-qty">${item.product.count}</td>
                      <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">
                        ${item.product.name}
                        ${addonsHTML}
                        ${item.notes ? `<div class="notes-row">(${item.notes})</div>` : ""}
                      </td>
                      <td class="item-total">${itemTotal.toFixed(2)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>

            <div style="border-top: 2px solid #000; margin-top: 5px; padding-top: 5px;">
              <div class="totals-row">
                <span>${isArabic ? "المجموع" : "Subtotal"}</span>
                <span>${subtotal}</span>
              </div>
              
              ${data.delivery_fees > 0 ? `
                <div class="totals-row">
                  <span>${isArabic ? "التوصيل" : "Delivery"}</span>
                  <span>${data.delivery_fees.toFixed(2)}</span>
                </div>
              ` : ""}
              
              ${data.total_discount > 0 ? `
                <div class="totals-row">
                  <span>${isArabic ? "الخصم" : "Discount"}</span>
                  <span>-${data.total_discount.toFixed(2)}</span>
                </div>
              ` : ""}

              <div class="grand-total">
                <span style="font-size: 16px;">${isArabic ? "الإجمالي" : "TOTAL"}</span>
                <span>${data.amount.toFixed(2)}</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 15px; font-size: 11px;">
              <p style="margin: 0; font-weight: bold;">
                ${isArabic ? "شكراً لزيارتكم" : "Thank You For Your Visit"}
              </p>
              <p style="margin: 5px 0 0 0;">***</p>
            </div>

          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            }
          </script>
        </body>
      </html>
    `;
  };

  // Handle Print Click - Updated to use generateReceiptHTML
  const handlePrintClick = async (order) => {
    if (isPrinting) return;
    setIsPrinting(true);
    
    try {
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axiosInstance.get(
        `${baseUrl}cashier/orders/order_checkout/${order.id}?locale=${locale}`,
        { headers }
      );

      if (response?.data?.order_checkout) {
        const orderData = response.data.order_checkout;
        
        // توليد HTML للتصميم الجديد
        const receiptHTML = generateReceiptHTML(orderData);

        // إنشاء iframe مخفي للطباعة
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(receiptHTML);
        doc.close();

        // إزالة الـ iframe بعد فترة كافية
        setTimeout(() => {
          document.body.removeChild(iframe);
          setIsPrinting(false);
        }, 2000);

        toast.success(t("Preparingprint") || "جاري الطباعة...");
      }
    } catch (err) {
      toast.error(t("Failedtoloadorderdetails"));
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
    </div>
  );
}