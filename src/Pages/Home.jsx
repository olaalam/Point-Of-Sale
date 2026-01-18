import React, { useState, useEffect, useCallback, useMemo } from "react";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine/Dine";
import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";
import { usePost } from "@/Hooks/usePost";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const getInitialState = () => {
  const storedOrderType = sessionStorage.getItem("order_type") || "take_away";
  const storedTab = sessionStorage.getItem("tab") || storedOrderType;
  const storedTableId = sessionStorage.getItem("table_id") || null;
  const storedDeliveryUserId = sessionStorage.getItem("selected_user_id") || null;
  const transferSourceTableId = sessionStorage.getItem("transfer_source_table_id") || null;
  const transferCartIds = JSON.parse(sessionStorage.getItem("transfer_cart_ids")) || null;
  const isTransferring = !!(transferSourceTableId && transferCartIds && transferCartIds.length > 0);

  return {
    tabValue: storedTab,
    orderType: storedOrderType,
    tableId: storedTableId,
    deliveryUserId: storedDeliveryUserId,
    isTransferring,
    transferSourceTableId,
    transferCartIds,
  };
};

const clearTransferData = () => {
  sessionStorage.removeItem("transfer_source_table_id");
  sessionStorage.removeItem("transfer_first_cart_id");
  sessionStorage.removeItem("transfer_cart_ids");
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();
  const [state, setState] = useState(getInitialState);

  const initialState = useMemo(() => getInitialState(), [location.key]);

  useEffect(() => {
    setState((prevState) => {
      const newState = { ...prevState, ...initialState };
      return newState.tabValue === prevState.tabValue ? prevState : newState;
    });
  }, [initialState]);

  // ✅ FIXED: Handle repeated orders from SinglePage and Delivery
  useEffect(() => {
    const { state: locationState } = location;

    // إذا جاي من repeated order (من SinglePage أو Delivery)
    if (locationState?.repeatedOrder && locationState?.tabValue === "take_away") {
      const storedCart = sessionStorage.getItem("cart");
      if (storedCart) {
        console.log("🔄 Loading repeated order cart:", JSON.parse(storedCart));
      }

      setState((prevState) => ({
        ...prevState,
        orderType: "take_away",
        tabValue: "take_away",
      }));
      return;
    }

    // Handle delivery user selection
    if (locationState && locationState.userId) {
      setState((prevState) => ({
        ...prevState,
        deliveryUserId: locationState.userId,
        orderType: locationState.orderType || "delivery",
        tabValue: locationState.orderType || "delivery",
      }));
      sessionStorage.setItem("selected_user_id", locationState.userId);
      sessionStorage.setItem("order_type", locationState.orderType || "delivery");
      sessionStorage.setItem("tab", locationState.orderType || "delivery");
    }
  }, [location]);

  const { postData, loading: transferLoading } = usePost();

  const fetchDiscount = useCallback(async () => {
    const cachedDiscount = sessionStorage.getItem("discount_data");
    if (cachedDiscount) return;

    try {
      const branch_id = sessionStorage.getItem("branch_id") || "4";
      const response = await postData("cashier/discount_module", {
        branch_id: branch_id,
        type: "web", // هنا بنبعت type: web زي ما عاوزة
      }); console.log("Discount API Response:", response);
      const discountData = {
        discount: response?.discount || 0,
        module: response?.module || [],
      };
      sessionStorage.setItem("discount_data", JSON.stringify(discountData));
    } catch (error) {
      console.error("Error fetching discount:", error);
      toast.error(t("Failedtofetchdiscountdata"));
      sessionStorage.setItem("discount_data", JSON.stringify({ discount: 0, module: [] }));
    }
  }, [postData, t]);

  useEffect(() => {
    fetchDiscount();
  }, [fetchDiscount]);

const runTransferAPI = useCallback(
  async (newTableId, sourceTableId, cartIds) => {
    if (!newTableId || !sourceTableId || !cartIds || cartIds.length === 0) {
      toast.error(t("IncompletetransferdataCannotcompletetransfer"));
      clearTransferData();
      return;
    }

    const formData = new FormData();
    formData.append("source_table_id", sourceTableId.toString());
    formData.append("new_table_id", newTableId.toString());
    cartIds.forEach((cart_id, index) => {
      formData.append(`cart_ids[${index}]`, cart_id.toString());
    });

    try {
      console.log("Starting Transfer API call...", { sourceTableId, newTableId, cartIds });
      
      const response = await postData("cashier/complete_transfer_order", formData);

      // ✅ تحديث المعرف الرقمي
      sessionStorage.setItem("table_id", newTableId);

      // ✅ التعديل الأساسي: تحديث رقم الطاولة من الرد القادم من السيرفر
      // إذا كان السيرفر يرسل رقم الطاولة في الاستجابة (مثلاً table_number)
      if (response?.table_number) {
        sessionStorage.setItem("table_number", response.table_number);
      } 
      // ملحوظة: إذا كان السيرفر لا يرسل الرقم، يفضل جلب الرقم من كائن الطاولة المختار قبل مناداة الـ API

      toast.success(t("Order transferred successfully"));
      clearTransferData();
      
      setState((prevState) => ({
        ...prevState,
        tableId: newTableId,
        orderType: "dine_in",
        tabValue: "dine_in",
        isTransferring: false,
        transferSourceTableId: null,
        transferCartIds: null,
      }));

      // إعادة تحميل الصفحة لضمان تحديث كافة مكونات الواجهة (DineInformation, Header.. الخ)
      setTimeout(() => {
          window.location.reload();
      }, 500);

    } catch (error) {
      console.error("Transfer API Failed:", error);
      const errorMessage = error.response?.data?.message || t("FailedtocompletetransferPleasetryagain");
      toast.error(errorMessage);
      clearTransferData();
      setState((prevState) => ({
        ...prevState,
        isTransferring: false,
      }));
    }
  },
  [postData, t]
);



const handleTableSelect = useCallback((tableObj) => {
  // التأكد من استخراج البيانات سواء كان المرسل ID فقط أو Object
  const newTableId = typeof tableObj === 'object' ? tableObj.id : tableObj;
  const newTableNumber = tableObj?.table_number || tableObj?.name; // حسب المسمى عندك في مصفوفة الطاولات

  const sourceTableId = sessionStorage.getItem("transfer_source_table_id");
  const cartIds = JSON.parse(sessionStorage.getItem("transfer_cart_ids"));

  if (state.isTransferring) {
    if (!sourceTableId || !cartIds || cartIds.length === 0) {
      toast.error(t("Cannot transfer order: Table ID or Cart IDs are missing."));
      clearTransferData();
      setState(prev => ({ ...prev, isTransferring: false }));
      return;
    }
    
    // ✅ تخزين رقم الطاولة الجديد فوراً قبل مناداة الـ API لضمان التحديث
    if (newTableNumber) {
      sessionStorage.setItem("table_number", newTableNumber);
    }
    
    runTransferAPI(newTableId, sourceTableId, cartIds);
  } else {
    // المنطق الطبيعي
    setState((prevState) => ({
      ...prevState,
      tableId: newTableId,
      orderType: "dine_in",
      tabValue: "dine_in",
    }));
    sessionStorage.setItem("table_id", newTableId);
    if (newTableNumber) {
      sessionStorage.setItem("table_number", newTableNumber);
    }
    sessionStorage.setItem("order_type", "dine_in");
    sessionStorage.setItem("tab", "dine_in");
  }
}, [state.isTransferring, runTransferAPI, t]);

  const handleDeliveryUserSelect = useCallback((id) => {
    setState((prevState) => ({
      ...prevState,
      deliveryUserId: id,
      orderType: "delivery",
      tabValue: "delivery",
    }));
    sessionStorage.setItem("delivery_user_id", id);
    sessionStorage.setItem("order_type", "delivery");
    sessionStorage.setItem("tab", "delivery");
  }, []);

  const handleClose = useCallback(() => {
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_address_id");
    sessionStorage.removeItem("order_type");
    setState((prevState) => ({
      ...prevState,
      deliveryUserId: null,
      orderType: "delivery",
      tabValue: "delivery"
    }));
  }, []);

  console.log("Home Component State:", state);

  const dineInContent = useMemo(() => {
    if (state.isTransferring || !state.tableId) {
      return <Dine onTableSelect={handleTableSelect} isTransferring={state.isTransferring} />;
    }
    return <OrderPage propOrderType="dine_in" propTableId={state.tableId} />;
  }, [state.isTransferring, state.tableId, handleTableSelect]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* عرض المحتوى بناءً على الـ tab الحالي */}
      {state.tabValue === "take_away" && (
        <TakeAway orderType={state.orderType} />
      )}

      {state.tabValue === "delivery" && (
        <>
          {state.deliveryUserId ? (
            <OrderPage propOrderType="delivery" propUserId={state.deliveryUserId} onClose={handleClose} />
          ) : (
            <Delivery onCustomerSelect={handleDeliveryUserSelect} />
          )}
        </>
      )}

      {state.tabValue === "dine_in" && dineInContent}
    </div>
  );
}