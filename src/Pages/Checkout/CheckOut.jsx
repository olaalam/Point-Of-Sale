import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { useNavigate } from "react-router-dom";

// استيراد المودالات المنفصلة
import CustomerSelectionModal from "./CustomerSelectionModal";
import DuePaymentModal from "./DuePaymentModal";
import DeliveryAssignmentModal from "./DeliveryAssignmentModal";

// استيراد الدوال المساعدة
import {
  buildFinancialsPayload,
  getOrderEndpoint,
  buildOrderPayload,
  buildDealPayload,
  validatePaymentSplits,
} from "./processProductItem";

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  totalTax,
  totalDiscount,
  notes = "Customer requested no plastic bag.",
  source = "web",
  totalDineInItems,
  orderType,
  onClearCart,
}) => {
  const branch_id = sessionStorage.getItem("branch_id");
  const cashierId = sessionStorage.getItem("cashier_id");
  const tableId = sessionStorage.getItem("table_id") || null;
  const navigate = useNavigate();

  // جلب البيانات من API
  const { data, loading: isLoading, error: isError } = useGet(
    `captain/selection_lists?branch_id=${branch_id}`
  );
  const { data: deliveryData, loading: deliveryLoading } = useGet("cashier/delivery_lists");
  const { postData, loading } = usePost();

  // ===== حالات الدفع العادي =====
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");

  // ===== حالات الدفع الآجل (Due) =====
  const [isDueOrder, setIsDueOrder] = useState(false);
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [duePaymentOpen, setDuePaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [dueSplits, setDueSplits] = useState([]);
  const [dueAmount, setDueAmount] = useState(0);

  // جلب قائمة العملاء المؤجلين
  const {
    data: dueUsersData,
    loading: customerSearchLoading,
    refetch: refetchDueUsers,
  } = useGet(`cashier/list_due_users?search=${customerSearchQuery}`);

  const searchResults = useMemo(() => {
    const users = dueUsersData?.users || [];
    return users.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.phone_2 && c.phone_2.includes(customerSearchQuery))
    );
  }, [dueUsersData, customerSearchQuery]);

  // ===== حالات التوصيل =====
  const [deliveryModelOpen, setDeliveryModelOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [orderId, setOrderId] = useState(null);

  // ===== حالات كود الخصم =====
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState(null);

  // ===== حسابات المبالغ =====
  const baseTotal = useMemo(() => {
    if (orderType === "dine_in") {
      return orderItems.reduce((acc, item) => acc + item.price * item.count, 0);
    }
    return amountToPay;
  }, [orderItems, orderType, amountToPay]);

  const requiredTotal = useMemo(() => {
    return Math.max(0, baseTotal - appliedDiscount);
  }, [baseTotal, appliedDiscount]);

  const { totalScheduled, remainingAmount, changeAmount } = useMemo(() => {
    const sum = paymentSplits.reduce(
      (acc, split) => acc + (parseFloat(split.amount) || 0),
      0
    );
    const calculatedRemaining = requiredTotal - sum;
    const calculatedChange = sum - requiredTotal;

    return {
      totalScheduled: sum,
      remainingAmount: calculatedRemaining > 0 ? calculatedRemaining : 0,
      changeAmount: calculatedChange > 0 ? calculatedChange : 0,
    };
  }, [paymentSplits, requiredTotal]);

  const calculatedChange = useMemo(() => {
    const paid = parseFloat(customerPaid) || 0;
    return paid > requiredTotal ? paid - requiredTotal : 0;
  }, [customerPaid, requiredTotal]);

  const isTotalMet = totalScheduled >= requiredTotal;

  // ===== تهيئة طرق الدفع الافتراضية =====
  useEffect(() => {
    if (data?.financial_account?.length > 0 && paymentSplits.length === 0 && !isDueOrder) {
      const defaultAccountId = data.financial_account[0]?.id;
      setPaymentSplits([
        {
          id: "split-1",
          accountId: defaultAccountId,
          amount: requiredTotal || 0,
          description: "",
        },
      ]);
    }
    if (isDueOrder) {
      setPaymentSplits([]);
    }
  }, [data, requiredTotal, isDueOrder]);

  // تحديث المبلغ تلقائياً عند تغيير requiredTotal
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].id === "split-1" && !isDueOrder) {
      setPaymentSplits((prev) =>
        prev.map((split) =>
          split.id === "split-1" ? { ...split, amount: requiredTotal || 0 } : split
        )
      );
    }
  }, [requiredTotal, isDueOrder]);

  // ===== دالة التحقق من كود الخصم =====
  const handleCheckDiscountCode = async () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code.");
      return;
    }

    try {
      const response = await postData(
        "cashier/check_discount_code",
        { code: discountCode },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.success) {
        const discount = parseFloat(response.discount) || 0;
        if (discount > baseTotal) {
          toast.error("Discount cannot exceed the total amount.");
          return;
        }
        setAppliedDiscount(discount);
        setDiscountError(null);
        toast.success(`Discount of ${discount.toFixed(2)} EGP applied!`);
      } else {
        setDiscountError("Invalid or expired discount code.");
        toast.error("Invalid or expired discount code.");
      }
    } catch (e) {
      setDiscountError(e.message || "Failed to validate discount code.");
      toast.error(e.message || "Failed to validate discount code.");
    }
  };

  // ===== دوال إدارة طرق الدفع =====
  const handleAmountChange = (id, value) => {
    const newAmount = parseFloat(value) || 0;
    if (newAmount < 0) {
      toast.error("Amount cannot be negative.");
      return;
    }

    setPaymentSplits((prevSplits) => {
      const totalExcludingCurrent = prevSplits.reduce(
        (acc, s) => (s.id === id ? acc : acc + s.amount),
        0
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;

      if (newAmount > maxAllowed) {
        toast.error(`Amount cannot exceed: ${maxAllowed.toFixed(2)} EGP.`);
        return prevSplits.map((split) =>
          split.id === id ? { ...split, amount: maxAllowed } : split
        );
      }

      return prevSplits.map((split) =>
        split.id === id ? { ...split, amount: newAmount } : split
      );
    });
  };

  const handleAccountChange = (id, accountId) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id
          ? { ...split, accountId: parseInt(accountId), description: "" }
          : split
      )
    );
  };

  const handleDescriptionChange = (id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, description: value } : split
      )
    );
  };

  const handleAddSplit = () => {
    const defaultAccountId = data.financial_account[0]?.id;
    if (!defaultAccountId) return toast.error("No accounts available.");
    setPaymentSplits((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}`,
        accountId: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
        description: "",
      },
    ]);
  };

  const handleRemoveSplit = (id) => {
    setPaymentSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const getAccountNameById = (accountId) => {
    const acc = data?.financial_account?.find((a) => a.id === parseInt(accountId));
    return acc ? acc.name : "Select Account";
  };

  const getDescriptionStatus = (accountId) => {
    const acc = data?.financial_account?.find((a) => a.id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  // ===== دوال الدفع الآجل =====
  const handlePayLater = () => {
    if (orderType !== "take_away" && orderType !== "delivery") {
      return toast.error("Pay Later is only available for Take-Away or Delivery orders.");
    }
    setIsDueOrder(true);
    setPaymentSplits([]);
    setCustomerPaid("");
    setCustomerSelectionOpen(true);
    refetchDueUsers();
  };

  const handleBackToPayment = () => {
    setIsDueOrder(false);
    setSelectedCustomer(null);
    const defaultAccountId = data.financial_account[0]?.id;
    setPaymentSplits([
      {
        id: "split-1",
        accountId: defaultAccountId,
        amount: requiredTotal || 0,
        description: "",
      },
    ]);
  };

  const handleSelectCustomer = (customer) => {
    if (requiredTotal > customer.can_debit) {
      toast.error(
        `Order amount (${requiredTotal.toFixed(2)} EGP) exceeds customer's debit limit.`
      );
      return;
    }
    setSelectedCustomer(customer);
    setCustomerSelectionOpen(false);
    setDuePaymentOpen(true);
  };

  const handleConfirmDuePayment = async (splits, dueAmt) => {
    setDueSplits(splits);
    setDueAmount(dueAmt);
    setDuePaymentOpen(false);

    const formData = new FormData();
    formData.append("user_id", selectedCustomer.id.toString());
    formData.append("amount", dueAmt.toString());

    splits.forEach((split, index) => {
      formData.append(`financials[${index}][id]`, split.accountId.toString());
      formData.append(`financials[${index}][amount]`, split.amount.toString());
      if (split.description) {
        formData.append(`financials[${index}][description]`, split.description);
      }
    });

    try {
      await postData("cashier/customer/pay_debit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Due order processed successfully!");
      onClearCart();
      onClose();
      navigate("/orders");
    } catch (e) {
      console.error("Due payment error:", e);
      toast.error(e.message || "Failed to process due payment.");
    }
  };

  // ===== دوال التوصيل =====
  const handleAssignDelivery = async () => {
    if (!orderId) return toast.error("Order ID is missing.");
    if (!selectedDeliveryId) return toast.error("Please select a delivery person.");

    try {
      await postData(`cashier/determine_delivery/${orderId}`, {
        delivery_id: selectedDeliveryId,
      });
      toast.success("Delivery person assigned successfully!");
      setDeliveryModelOpen(false);
      onClose();
      navigate("/orders");
    } catch (e) {
      toast.error(e.message || "Failed to assign delivery person.");
    }
  };

  const handleSkip = () => {
    setDeliveryModelOpen(false);
    onClose();
    navigate("/orders");
  };

  // ===== إرسال الطلب =====
  const handleSubmitOrder = async () => {
    // التحقق من الطلبات الآجلة
    if (isDueOrder) {
      if (!selectedCustomer) {
        return toast.error("Please select a customer for a Pay Later order.");
      }
      return;
    }

    // التحقق من المبلغ
    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(`Total must equal ${requiredTotal.toFixed(2)} EGP.`);
    }

    // التحقق من صحة البيانات
    const validation = validatePaymentSplits(paymentSplits, getDescriptionStatus);
    if (!validation.valid) {
      return toast.error(validation.error);
    }

    const hasDealItems = orderItems.some((item) => item.is_deal);
    const endpoint = getOrderEndpoint(orderType, orderItems, totalDineInItems, hasDealItems);
    const financialsPayload = buildFinancialsPayload(paymentSplits);

    let payload;
    if (hasDealItems) {
      payload = buildDealPayload(orderItems, financialsPayload);
    } else {
      payload = buildOrderPayload({
        orderType,
        orderItems,
        amountToPay: requiredTotal, // Use requiredTotal to reflect discount
        totalTax,
        totalDiscount: totalDiscount + appliedDiscount, // Include applied discount
        notes,
        source,
        financialsPayload,
        cashierId,
        tableId,
        customerPaid,
        discountCode: appliedDiscount > 0 ? discountCode : undefined, // Include discount code if applied
      });
    }

    try {
      const response = await postData(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      toast.success("Order placed successfully!");

      if (orderType === "take_away") {
        onClearCart();
      }

      sessionStorage.setItem("last_order_type", orderType);

      if (orderType === "delivery") {
        const newOrderId = response?.success?.id;
        if (newOrderId) {
          setOrderId(newOrderId);
          setDeliveryModelOpen(true);
        } else {
          onClose();
          navigate("/orders");
        }
      } else {
        onClose();
        navigate("/orders");
      }
    } catch (e) {
      console.error("Submit error:", e);
      toast.error(e.message || "Submission failed");
    }
  };

  // ===== العرض =====
  if (isLoading || deliveryLoading) return <Loading />;
  if (isError) return <p className="text-red-500">{isError?.message}</p>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <ToastContainer position="bottom-right" />

      {/* المودالات */}
      <CustomerSelectionModal
        isOpen={customerSelectionOpen}
        onClose={() => setCustomerSelectionOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        searchQuery={customerSearchQuery}
        setSearchQuery={setCustomerSearchQuery}
        customers={searchResults}
        loading={customerSearchLoading}
        requiredTotal={requiredTotal}
      />

      <DuePaymentModal
        isOpen={duePaymentOpen}
        onClose={() => setDuePaymentOpen(false)}
        customer={selectedCustomer}
        requiredTotal={requiredTotal}
        onConfirm={handleConfirmDuePayment}
      />

      <DeliveryAssignmentModal
        isOpen={deliveryModelOpen}
        onClose={handleSkip}
        deliveryList={deliveryData?.deliveries}
        selectedDeliveryId={selectedDeliveryId}
        setSelectedDeliveryId={setSelectedDeliveryId}
        onAssign={handleAssignDelivery}
        onSkip={handleSkip}
      />

      {/* الواجهة الرئيسية */}
      {!deliveryModelOpen && (
        <div className="relative w-full max-w-2xl bg-white p-8 rounded-2xl shadow-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-xl">
            ×
          </button>

          <h2 className="text-2xl font-semibold mb-6">
            Process Payment
            {isDueOrder && selectedCustomer && (
              <span className="text-sm text-red-500 ml-2">
                (Due Order for {selectedCustomer.name})
              </span>
            )}
          </h2>

          {/* إدخال كود الخصم */}
          <div className="mb-6">
            <label className="block text-sm mb-1">Discount Code</label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value);
                  setDiscountError(null); // Clear error on input change
                }}
                disabled={appliedDiscount > 0 || isDueOrder} // Disable if discount applied or due order
              />
              <Button
                onClick={handleCheckDiscountCode}
                disabled={loading || appliedDiscount > 0 || isDueOrder}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Checking..." : "Apply"}
              </Button>
            </div>
            {discountError && (
              <p className="mt-2 text-red-600 text-sm">{discountError}</p>
            )}
            {appliedDiscount > 0 && (
              <p className="mt-2 text-green-600 text-sm">
                Discount Applied: {appliedDiscount.toFixed(2)} EGP
              </p>
            )}
          </div>

          {/* ملخص المبلغ */}
          <div className="mb-6 border-b pb-4">
            <div className="flex justify-between mb-2">
              <span>Base Total:</span>
              <span>{baseTotal.toFixed(2)} EGP</span>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between mb-2">
                <span>Discount:</span>
                <span className="text-green-600">-{appliedDiscount.toFixed(2)} EGP</span>
              </div>
            )}
            <div className="flex justify-between mb-2">
              <span>Total Amount:</span>
              <span>{requiredTotal.toFixed(2)} EGP</span>
            </div>
            {!isDueOrder && (
              <>
                <div className="flex justify-between mb-2">
                  <span>Remaining:</span>
                  <span className={remainingAmount > 0 ? "text-orange-500" : "text-green-600"}>
                    {remainingAmount.toFixed(2)} EGP
                  </span>
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className="text-green-600">{changeAmount.toFixed(2)} EGP</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* معلومات الدفع الآجل */}
          {isDueOrder && selectedCustomer && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
              <p className="font-semibold text-red-800">
                This order is marked as <strong>Pay Later</strong> for{" "}
                <strong>{selectedCustomer.name}</strong>.
              </p>
              <Button
                variant="link"
                onClick={handleBackToPayment}
                className="mt-2 p-0 text-sm text-blue-600"
              >
                Go back to full payment
              </Button>
            </div>
          )}

          {/* طرق الدفع */}
          {!isDueOrder && (
            <div className="space-y-6">
              {paymentSplits.map((split) => (
                <div key={split.id} className="flex items-center space-x-4">
                  <div className="w-40">
                    <Select
                      value={String(split.accountId)}
                      onValueChange={(val) => handleAccountChange(split.id, val)}
                    >
                      <SelectTrigger>
                        <SelectValue>{getAccountNameById(split.accountId)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {data.financial_account.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative flex-grow">
                    <Input
                      type="number"
                      min="0"
                      value={split.amount === 0 ? "" : String(split.amount)}
                      onChange={(e) => handleAmountChange(split.id, e.target.value)}
                      className="pl-16"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">EGP</span>
                  </div>
                  {getDescriptionStatus(split.accountId) && (
                    <Input
                      type="text"
                      placeholder="Last 4 digits"
                      value={split.description}
                      onChange={(e) => handleDescriptionChange(split.id, e.target.value)}
                      maxLength={4}
                      className="w-32"
                    />
                  )}
                  {paymentSplits.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSplit(split.id)}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
              {remainingAmount > 0 && (
                <Button variant="link" onClick={handleAddSplit} className="text-sm text-blue-600">
                  + Add account split
                </Button>
              )}
            </div>
          )}

          {/* المبلغ المدفوع من العميل */}
          {!isDueOrder && (
            <div className="mt-6">
              <label className="block text-sm mb-1">Amount Paid by Customer</label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter amount paid"
                  value={customerPaid}
                  onChange={(e) => setCustomerPaid(e.target.value)}
                  className="pl-16"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2">EGP</span>
              </div>
              {parseFloat(customerPaid) > requiredTotal && (
                <p className="mt-2 text-green-600 text-sm font-semibold">
                  Change Due: {calculatedChange.toFixed(2)} EGP
                </p>
              )}
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="flex space-x-4 mt-6">
            {(orderType === "take_away" || orderType === "delivery") && !isDueOrder && (
              <Button
                className="flex-1 text-white bg-blue-600 hover:bg-blue-700"
                disabled={loading}
                onClick={handlePayLater}
              >
                Pay Later (Due)
              </Button>
            )}
            <Button
              className={`flex-1 text-white ${
                isDueOrder ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={loading || (!isDueOrder && !isTotalMet) || (isDueOrder && !selectedCustomer)}
              onClick={handleSubmitOrder}
            >
              {loading ? "Processing..." : isDueOrder ? "Confirm Due Order" : "Confirm & Pay"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckOut;