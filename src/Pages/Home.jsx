import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine";
import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";
import { usePost } from "@/Hooks/usePost";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

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
  const location = useLocation();
  const [state, setState] = useState(getInitialState);
  const { postData, loading: transferLoading } = usePost();

  // ✅ دالة لجلب بيانات الخصم وتخزينها في sessionStorage
  const fetchDiscount = useCallback(async () => {
    try {
      const branch_id = sessionStorage.getItem("branch_id") || "4"; // الافتراضي 4 لو ماكنش موجود
      const response = await postData(`cashier/discount_module?branch_id=${branch_id}`);
      console.log("Discount API Response:", response);
      const discountData = {
        discount: response?.discount || 0,
        module: response?.module || [],
      };
      // ✅ تخزين بيانات الخصم في sessionStorage
      sessionStorage.setItem("discount_data", JSON.stringify(discountData));
    } catch (error) {
      console.error("Error fetching discount:", error);
      toast.error("Failed to fetch discount data.");
      // في حالة الخطأ، نخزن قيم افتراضية
      sessionStorage.setItem("discount_data", JSON.stringify({ discount: 0, module: [] }));
    }
  }, [postData]);

  // ✅ جلب بيانات الخصم عند تحميل الصفحة
  useEffect(() => {
    fetchDiscount();
  }, [fetchDiscount]);

  // ✅ تحديث الحالة عند تغيير المسار
  useEffect(() => {
    const storedState = getInitialState();
    setState(storedState);
  }, [location.key]);

  const runTransferAPI = useCallback(
    async (newTableId, sourceTableId, cartIds) => {
      if (!newTableId || !sourceTableId || !cartIds || cartIds.length === 0) {
        toast.error("Incomplete transfer data. Cannot complete transfer.");
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
        await postData("cashier/complete_transfer_order", formData);
        toast.success(`Order transferred successfully from table ${sourceTableId} to table ${newTableId}.`);
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
      } catch (error) {
        console.error("Transfer API Failed:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.exception ||
          "Failed to complete transfer. Please try again.";
        toast.error(errorMessage);
        clearTransferData();
        setState((prevState) => ({
          ...prevState,
          isTransferring: false,
          transferSourceTableId: null,
          transferCartIds: null,
        }));
      }
    },
    [postData]
  );

  const handleTabChange = (value) => {
    let newState = {
      tabValue: value,
      orderType: value,
      tableId: null,
      deliveryUserId: null,
      isTransferring: false,
      transferSourceTableId: state.transferSourceTableId,
      transferCartIds: state.transferCartIds,
    };

    if (value === "take_away") {
      sessionStorage.removeItem("table_id");
      sessionStorage.removeItem("delivery_user_id");
      clearTransferData();
    } else if (value === "dine_in") {
      newState.tableId = sessionStorage.getItem("table_id");
      sessionStorage.removeItem("delivery_user_id");
      if (state.isTransferring) {
        newState.tableId = null;
      }
    } else if (value === "delivery") {
      newState.deliveryUserId = sessionStorage.getItem("delivery_user_id");
      sessionStorage.removeItem("table_id");
      clearTransferData();
    }

    setState(newState);
    sessionStorage.setItem("tab", value);
    sessionStorage.setItem("order_type", value);

    // ✅ جلب بيانات الخصم عند تغيير الـ Tab
    fetchDiscount();
  };

  const handleTableSelect = (newTableId) => {
    const { isTransferring, transferSourceTableId, transferCartIds } = state;

    if (isTransferring) {
      runTransferAPI(newTableId, transferSourceTableId, transferCartIds);
    } else {
      setState((prevState) => ({
        ...prevState,
        tableId: newTableId,
        orderType: "dine_in",
        tabValue: "dine_in",
        isTransferring: false,
      }));
      sessionStorage.setItem("table_id", newTableId);
      sessionStorage.setItem("order_type", "dine_in");
      sessionStorage.setItem("tab", "dine_in");
    }
  };

  const handleDeliveryUserSelect = (id) => {
    setState((prevState) => ({
      ...prevState,
      deliveryUserId: id,
      orderType: "delivery",
      tabValue: "delivery",
    }));
    sessionStorage.setItem("delivery_user_id", id);
    sessionStorage.setItem("order_type", "delivery");
    sessionStorage.setItem("tab", "delivery");
  };

  const handleClose = () => {
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_address_id");
    sessionStorage.removeItem("order_type");
    setState({ ...state, deliveryUserId: null, orderType: "delivery", tabValue: "delivery" });
  };

  console.log("Home Component State:", state);

  const dineInContent = (() => {
    if (state.isTransferring || !state.tableId) {
      return <Dine onTableSelect={handleTableSelect} isTransferring={state.isTransferring} />;
    }
    return <OrderPage propOrderType="dine_in" propTableId={state.tableId} />;
  })();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8">
      <Tabs value={state.tabValue} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full flex justify-center gap-6 bg-transparent mb-10 p-0 h-auto">
          <TabsTrigger
            value="take_away"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer p-8"
          >
            TakeAway
          </TabsTrigger>
          <TabsTrigger
            value="delivery"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer p-8"
          >
            Delivery
          </TabsTrigger>
          <TabsTrigger
            value="dine_in"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer p-8"
            disabled={transferLoading}
          >
            Dine In
          </TabsTrigger>
        </TabsList>

        <TabsContent value="take_away" className="mt-8 flex flex-col items-center space-y-6">
          <TakeAway orderType={state.orderType} />
        </TabsContent>

        <TabsContent value="delivery">
          {state.deliveryUserId ? (
            <OrderPage propOrderType="delivery" propUserId={state.deliveryUserId} onClose={handleClose} />
          ) : (
            <Delivery onCustomerSelect={handleDeliveryUserSelect} />
          )}
        </TabsContent>

        <TabsContent value="dine_in">{dineInContent}</TabsContent>
      </Tabs>
      {/* {transferLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-2xl">جاري نقل الطلب...</div>
        </div>
      )} */}
      <ToastContainer />
    </div>
  );
}