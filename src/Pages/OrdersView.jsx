import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { Circle, Hourglass, CheckCircle, ChefHat, Truck, Package } from "lucide-react";
import { usePut } from "@/Hooks/usePut";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

// تعريف حالات التحضير لكل نوع طلب
const TAKE_AWAY_STATUSES = {
 done: {
 label: "Done",
 icon: CheckCircle,
 color: "text-green-500",
 },
 pick_up: {
 label: "Pick Up",
 icon: ChefHat,
 color: "text-blue-500",
 },
};

const DELIVERY_STATUSES = {
 done: {
 label: "Done",
 icon: CheckCircle,
 color: "text-green-500",
 },
 ready_for_delivery: {
 label: "Ready for Delivery",
 icon: Package,
 color: "text-blue-500",
 },
 out_for_delivery: {
 label: "Out for Delivery",
 icon: Truck,
 color: "text-purple-500",
 },
 delivered: {
 label: "Delivered",
 icon: CheckCircle,
 color: "text-green-600",
 },
 returned: {
 label: "Returned",
 icon: Circle,
 color: "text-red-500",
 },
};

export default function OrdersView() {
 const { data, error, isLoading: isInitialLoading } = useGet("cashier/home/cashier_data");
 const { putData } = usePut();
 const [search, setSearch] = useState("");
 const orderType = sessionStorage.getItem("last_order_type") || "take_away";

 let orders = [];
 if (orderType === "take_away" && Array.isArray(data?.take_away)) {
 orders = data.take_away;
 } else if (orderType === "dine_in" && Array.isArray(data?.dine_in)) {
 orders = data.dine_in;
 } else if (orderType === "delivery" && Array.isArray(data?.delivery)) {
 orders = data.delivery;
 }
  const { t ,i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

const [statuses, setStatuses] = useState({});
  useEffect(() => {
    if (data) {
      const initialStatuses = orders.reduce((acc, order) => {
        acc[order.id] = order.order_status || "preparing";
        return acc;
      }, {});
      setStatuses(initialStatuses);
    }
  }, [data, orders]);

 const [updatingStatus, setUpdatingStatus] = useState({});

 if (isInitialLoading) return <Loading />;
 if (error)
 return <div className="text-red-500 text-center">Error loading data.</div>;

const filteredOrders = orders.filter((order) => {
 const status = statuses[order.id];
 const isVisible = orderType === "take_away"
 ? status !== "pick_up"
 : orderType === "delivery"
 ? status !== "delivered"
 : true;

 return (
 order.order_number?.toString().includes(search) &&
 isVisible
 );
});


 const handleStatusChange = async (orderId, newStatus) => {
 setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
 
 let url = "";
 let payload = {};

 if (orderType === "take_away") {
 url = `cashier/take_away_status/${orderId}`;
 payload = { take_away_status: newStatus };
 } else if (orderType === "delivery") {
 url = `cashier/order_status/${orderId}`;
 payload = { delivery_status: newStatus };
 }

 if (url) {
 try {
 const response = await putData(url, payload);
 if (response && response.success) {
 setStatuses((prev) => ({
  ...prev,
  [orderId]: newStatus,
 }));
 toast.success(t("Statusupdatedsuccessfully"));
 } else {
 toast.error("Failedtoupdatestatus");
 console.error('Failed to update status:', response);
 }
 } catch (err) {
 toast.error(t("Errorupdatingstatus"));
 console.error('Error updating status:', err);
 } finally {
 setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
 }
 }
 };

 const getAvailableStatuses = () => {
 if (orderType === "take_away") {
 return TAKE_AWAY_STATUSES;
 } else if (orderType === "delivery") {
 return DELIVERY_STATUSES;
 }
 return {};
 };

 const renderStatusBadge = (status) => {
 const availableStatuses = getAvailableStatuses();
 const statusInfo = availableStatuses[status] || {
 label: status,
 icon: Circle,
 color: "text-gray-400"
 };
 const StatusIcon = statusInfo.icon;
 
 return (
 <div className={`flex items-center gap-1 ${statusInfo.color}`}>
 <StatusIcon size={16} />
 <span className="font-semibold">{statusInfo.label}</span>
 </div>
 );
 };



 return (
 <div className="p-6 space-y-6">
 <Input
 type="text"
 placeholder={t("SearchOrderNumber")}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="max-w-md mx-auto"
 />

 <h2 className="text-xl font-semibold mt-6 text-center">
 {t("Orders")}{" "}
 <span className="capitalize"> {orderType==="take_away"?t('take_away'):t("delivery")} </span>
</h2>

 {filteredOrders.length === 0 ? (
 <p className="text-gray-500 text-center">{t("Noordersfound")}</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredOrders.map((order) => (
  <Card
  key={order.id}
  className="border shadow-sm bg-white flex flex-col h-full"
  >
  <CardContent className="p-4 space-y-3 flex-grow">
  <div className="flex justify-between items-center">
  <h3 className="font-semibold text-lg">
  #{order.order_number}
  </h3>
<div className="flex gap-2 flex-wrap">
  {Object.entries(getAvailableStatuses()).map(([key, value]) => {
    const isActive = statuses[order.id] === key;
    return (
      <Button
        key={key}
        size="sm"
        variant={isActive ? "default" : "outline"}
        className={`${value.color}`}
        disabled={updatingStatus[order.id]}
        onClick={() => handleStatusChange(order.id, key)}
      >
        <value.icon size={16} className="mr-1" />
        {value.label}
      </Button>
    );
  })}
</div>

  </div>
  <p className="text-sm text-gray-500">
  {order.order_date} — {order.date}
  </p>
  <div className="space-y-1">
  <p className="text-sm font-medium">{t("Items")}:</p>
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
  </Card>
 ))}
 </div>
 )}
 </div>
 );
}