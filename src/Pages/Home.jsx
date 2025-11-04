import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine";
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
const { t , i18n } = useTranslation();
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

  useEffect(() => {
    const { state: locationState } = location;
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
      const response = await postData(`cashier/discount_module?branch_id=${branch_id}`);
      console.log("Discount API Response:", response);
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
  }, [postData]);

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
        await postData("cashier/complete_transfer_order", formData);
toast.success(
  t("Order transferred successfully from table {{sourceTableId}} to table {{newTableId}}.", {
    sourceTableId,
    newTableId
  })
);
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
          t("FailedtocompletetransferPleasetryagain");
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

  const handleTabChange = useCallback((value) => {
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

    setState((prevState) => (prevState.tabValue === value ? prevState : newState));
    sessionStorage.setItem("tab", value);
    sessionStorage.setItem("order_type", value);

    fetchDiscount();
  }, [state.transferSourceTableId, state.transferCartIds]);

  const handleTableSelect = useCallback((newTableId) => {
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
  }, [state.isTransferring, state.transferSourceTableId, state.transferCartIds, runTransferAPI]);

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
    setState((prevState) => ({ ...prevState, deliveryUserId: null, orderType: "delivery", tabValue: "delivery" }));
  }, []);

  console.log("Home Component State:", state);

  const dineInContent = useMemo(() => {
    if (state.isTransferring || !state.tableId) {
      return <Dine onTableSelect={handleTableSelect} isTransferring={state.isTransferring} />;
    }
    return <OrderPage propOrderType="dine_in" propTableId={state.tableId} />;
  }, [state.isTransferring, state.tableId, handleTableSelect]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8">
      <Tabs value={state.tabValue} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`w-full flex ${isArabic==="ar"?"flex":" flex-row-reverse"}  justify-center gap-6 bg-transparent mb-10 p-0 h-auto`}>

          <TabsTrigger
            value="take_away"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer p-8"
          >
            {t("take_away")}
          </TabsTrigger>

          <TabsTrigger
            value="delivery"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer p-8"
          >
            {t("Delivery")}
          </TabsTrigger>

          <TabsTrigger
            value="dine_in"
            className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
              bg-white text-bg-primary border-2 border-bg-primary
              data-[state=active]:bg-bg-primary data-[state=active]:text-white
              data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer p-8"
            disabled={transferLoading}
          >
            {t("Dinein")}
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
    </div>
  );
}