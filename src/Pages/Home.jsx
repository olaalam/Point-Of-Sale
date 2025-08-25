// src/components/Home.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine";
import { useLocation } from "react-router-dom";
import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";
import { usePost } from "@/Hooks/usePost"; // ✅ Import usePost hook
import { toast, ToastContainer } from "react-toastify"; // ✅ Import for notifications

// ✅ دالة تجلب الحالة الأولية من localStorage
const getInitialState = () => {
    const storedOrderType = localStorage.getItem("order_type") || "take_away";
    const storedTab = localStorage.getItem("tab") || storedOrderType;
    const storedTableId = localStorage.getItem("table_id") || null;
    const storedDeliveryUserId = localStorage.getItem("selected_user_id") || null;
    
    // ✅ قراءة بيانات النقل من localStorage
    const transferSourceTableId = localStorage.getItem("transfer_source_table_id") || null;
    const transferCartIds = JSON.parse(localStorage.getItem("transfer_cart_ids")) || null;
    
    // تحديد ما إذا كان المكون في وضع النقل
    const isTransferring = !!(transferSourceTableId && transferCartIds && transferCartIds.length > 0);

    return {
        tabValue: storedTab,
        orderType: storedOrderType,
        tableId: storedTableId,
        deliveryUserId: storedDeliveryUserId,
        isTransferring: isTransferring, // ✅ حالة جديدة لتحديد وضع النقل
        transferSourceTableId: transferSourceTableId,
        transferCartIds: transferCartIds,
    };
};

// ✅ دالة لمسح بيانات النقل من localStorage
const clearTransferData = () => {
    localStorage.removeItem("transfer_source_table_id");
    localStorage.removeItem("transfer_first_cart_id");
    localStorage.removeItem("transfer_cart_ids");
};

export default function Home() {
    const location = useLocation();
    const [state, setState] = useState(getInitialState);
    const { postData, loading: transferLoading } = usePost(); // ✅ استخدام usePost

    // ✅ Effect لتحديث الحالة عند تغيير المسار (لإعادة القراءة بعد التنقل)
    useEffect(() => {
        const storedState = getInitialState();
        setState(storedState);
    }, [location.key]);

    // ✅ دالة جديدة لتشغيل API النقل
    const runTransferAPI = useCallback(async (newTableId, sourceTableId, cartIds) => {
        if (!newTableId || !sourceTableId || !cartIds || cartIds.length === 0) {
            toast.error("بيانات النقل غير مكتملة. لا يمكن إتمام عملية النقل.");
            clearTransferData();
            return;
        }

        const formData = new FormData();
        formData.append("source_table_id", sourceTableId.toString()); // الطاولة المصدر
        formData.append("new_table_id", newTableId.toString());     // الطاولة الجديدة
        
        cartIds.forEach((cart_id, index) => {
            formData.append(`cart_ids[${index}]`, cart_id.toString());
        });

        try {
            console.log("Starting Transfer API call...", { sourceTableId, newTableId, cartIds });
            await postData("cashier/complete_transfer_order", formData); // ⚠️ تأكد من اسم الـ API الصحيح
            
            toast.success(`تم نقل الطلب بنجاح من طاولة ${sourceTableId} إلى طاولة ${newTableId}.`);
            
            // مسح بيانات النقل بعد النجاح
            clearTransferData();
            
            // تحديث الحالة للتحول إلى صفحة الطلب للطاولة الجديدة
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
            const errorMessage = error.response?.data?.message || 
                                 error.response?.data?.exception ||
                                 "فشل في إتمام عملية النقل. يرجى المحاولة مرة أخرى.";
            toast.error(errorMessage);
            
            // مسح البيانات والسماح للمستخدم بالبقاء على شاشة اختيار الطاولات
            clearTransferData();
            setState((prevState) => ({
                ...prevState,
                isTransferring: false,
                transferSourceTableId: null,
                transferCartIds: null,
            }));
        }
    }, [postData]);


    const handleTabChange = (value) => {
        let newState = {
            tabValue: value,
            orderType: value,
            tableId: null,
            deliveryUserId: null,
            isTransferring: false, // ✅ مسح حالة النقل عند تغيير التاب
            transferSourceTableId: state.transferSourceTableId, // الاحتفاظ ببيانات النقل حتى يتم مسحها في الدالة الأخرى
            transferCartIds: state.transferCartIds,
        };

        if (value === "take_away") {
            localStorage.removeItem("table_id");
            localStorage.removeItem("delivery_user_id");
            clearTransferData(); // ✅ مسح بيانات النقل عند التحويل إلى TakeAway
        } else if (value === "dine_in") {
            newState.tableId = localStorage.getItem("table_id");
            localStorage.removeItem("delivery_user_id");
            // إذا كانت هناك بيانات نقل موجودة، يجب عرض شاشة اختيار الطاولات (Dine)
            if (state.isTransferring) {
                newState.tableId = null; 
            }
        } else if (value === "delivery") {
            newState.deliveryUserId = localStorage.getItem("delivery_user_id");
            localStorage.removeItem("table_id");
            clearTransferData(); // ✅ مسح بيانات النقل عند التحويل إلى Delivery
        }

        setState(newState);
        localStorage.setItem("tab", value);
        localStorage.setItem("order_type", value);
    };

    const handleTableSelect = (newTableId) => {
        const { isTransferring, transferSourceTableId, transferCartIds } = state;

        if (isTransferring) {
            // ✅ الحالة: عملية نقل الطاولة
            // يتم تشغيل API النقل فوراً
            runTransferAPI(newTableId, transferSourceTableId, transferCartIds);
            
        } else {
            // ✅ الحالة: عملية Dine In عادية (فتح طلب جديد أو استكمال طلب موجود)
            setState((prevState) => ({
                ...prevState,
                tableId: newTableId,
                orderType: "dine_in",
                tabValue: "dine_in",
                isTransferring: false,
            }));
            localStorage.setItem("table_id", newTableId);
            localStorage.setItem("order_type", "dine_in");
            localStorage.setItem("tab", "dine_in");
        }
    };
    
    // ... الدوال الأخرى (handleDeliveryUserSelect, handleClose) تبقى كما هي

    const handleDeliveryUserSelect = (id) => {
        setState((prevState) => ({
            ...prevState,
            deliveryUserId: id,
            orderType: "delivery",
            tabValue: "delivery",
        }));
        localStorage.setItem("delivery_user_id", id);
        localStorage.setItem("order_type", "delivery");
        localStorage.setItem("tab", "delivery");
    };

    const handleClose = () => {
        localStorage.removeItem("selected_user_id");
        localStorage.removeItem("selected_address_id");
        localStorage.removeItem("order_type");
        setState({ ...state, deliveryUserId: null, orderType: "delivery", tabValue: "delivery" });
    };

    // ✅ Debugging logs
    console.log("Home Component State:", state);

    // تحديد محتوى Dine In بناءً على حالة النقل والطاولة
    const dineInContent = (() => {
        if (state.isTransferring || !state.tableId) {
            // عرض شاشة اختيار الطاولة في الحالتين:
            // 1. إذا كنا في وضع النقل (isTransferring = true)
            // 2. إذا لم يتم اختيار طاولة بعد (!state.tableId)
            return <Dine onTableSelect={handleTableSelect} isTransferring={state.isTransferring} />;
        }
        
        // عرض صفحة الطلب إذا تم اختيار طاولة (ولسنا في وضع النقل)
        return (
            <OrderPage 
                propOrderType="dine_in" 
                propTableId={state.tableId} 
            />
        );
    })();
    
    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-8">
            <Tabs
                value={state.tabValue}
                onValueChange={handleTabChange}
                className="w-full"
            >
                <TabsList className="w-full flex justify-center gap-6 bg-transparent mb-10 p-0 h-auto">
                    <TabsTrigger
                        value="take_away"
                        className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
                            bg-white text-bg-primary border-2 border-bg-primary
                            data-[state=active]:bg-bg-primary data-[state=active]:text-white
                            data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
                    >
                        TakeAway
                    </TabsTrigger>
                    <TabsTrigger
                        value="delivery"
                        className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
                            bg-white text-bg-primary border-2 border-bg-primary
                            data-[state=active]:bg-bg-primary data-[state=active]:text-white
                            data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
                    >
                        Delivery
                    </TabsTrigger>
                    <TabsTrigger
                        value="dine_in"
                        className="flex-1 max-w-[200px] text-lg font-semibold h-12 rounded-full
                            bg-white text-bg-primary border-2 border-bg-primary
                            data-[state=active]:bg-bg-primary data-[state=active]:text-white
                            data-[state=active]:shadow-lg transition-colors duration-200 cursor_pointer"
                        disabled={transferLoading} // تعطيل الزر أثناء النقل
                    >
                        Dine In
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    value="take_away"
                    className="mt-8 flex flex-col items-center space-y-6"
                >
                    <TakeAway orderType={state.orderType} />
                </TabsContent>

                <TabsContent value="delivery">
                    {state.deliveryUserId ? (
                        <OrderPage
                            propOrderType="delivery"
                            propUserId={state.deliveryUserId}
                            onClose={handleClose}
                        />
                    ) : (
                        <Delivery onCustomerSelect={handleDeliveryUserSelect} />
                    )}
                </TabsContent>

                <TabsContent value="dine_in">
                    {dineInContent}
                </TabsContent>
            </Tabs>
            {transferLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-2xl">جاري نقل الطلب...</div>
                </div>
            )}
            <ToastContainer />
        </div>
    );
}