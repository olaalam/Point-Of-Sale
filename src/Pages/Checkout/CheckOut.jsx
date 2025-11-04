import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { useNavigate } from "react-router-dom";
import CustomerSelectionModal from "./CustomerSelectionModal";
import DeliveryAssignmentModal from "./DeliveryAssignmentModal";
import { buildFinancialsPayload, getOrderEndpoint, buildOrderPayload, buildDealPayload, validatePaymentSplits } from "./processProductItem";
import { prepareReceiptData, printReceiptSilently } from "../utils/printReceipt";

// استيراد الطباعة الصامتة

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  totalTax,
  totalDiscount,
  source = "web",
  totalDineInItems,
  orderType,
  onClearCart,
}) => {
  const branch_id = sessionStorage.getItem("branch_id");
  const cashierId = sessionStorage.getItem("cashier_id");
  const tableId = sessionStorage.getItem("table_id") || null;
  const navigate = useNavigate();

  const { data, loading: isLoading, error: isError } = useGet(`captain/selection_lists?branch_id=${branch_id}`);
  const { data: deliveryData, loading: deliveryLoading } = useGet("cashier/delivery_lists");
  const { postData, loading } = usePost();

  // State for order notes
  const [orderNotes, setOrderNotes] = useState("");
  
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const { data: dueUsersData, loading: customerSearchLoading, refetch: refetchDueUsers } = useGet(
    `cashier/list_due_users?search=${customerSearchQuery}`
  );

  const searchResults = useMemo(() => {
    const users = dueUsersData?.users || [];
    return users.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.phone_2 && c.phone_2.includes(customerSearchQuery))
    );
  }, [dueUsersData, customerSearchQuery]);

  const [deliveryModelOpen, setDeliveryModelOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  
  // Due checkbox state
  const [isDueOrder, setIsDueOrder] = useState(false);

  // Discount Code State
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  // Memoized discount from sessionStorage
  const discountData = useMemo(() => {
    const storedDiscount = sessionStorage.getItem("discount_data");
    try {
      return storedDiscount ? JSON.parse(storedDiscount) : { discount: 0, module: [] };
    } catch (error) {
      console.error("Error parsing discount data from sessionStorage:", error);
      return { discount: 0, module: [] };
    }
  }, []);

  // Calculate discounted amount
  const discountedAmount = useMemo(() => {
    let totalDiscount = 0;
    if (appliedDiscount > 0) {
      totalDiscount = amountToPay * (appliedDiscount / 100);
    } else if (discountData.module.includes(orderType)) {
      totalDiscount = amountToPay * (discountData.discount / 100);
    }
    return amountToPay - totalDiscount;
  }, [amountToPay, orderType, discountData, appliedDiscount]);

  // Required Total
  const requiredTotal = useMemo(() => {
    if (orderType === "dine_in") {
      return orderItems.reduce((acc, item) => acc + item.price * item.count, 0);
    }
    return discountedAmount;
  }, [orderItems, orderType, discountedAmount]);

  const { totalScheduled, remainingAmount, changeAmount } = useMemo(() => {
    const sum = paymentSplits.reduce((acc, split) => acc + (parseFloat(split.amount) || 0), 0);
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

  // Initialize default payment split
  useEffect(() => {
    if (data?.financial_account?.length > 0 && paymentSplits.length === 0) {
      const defaultAccountId = data.financial_account[0]?.id;
      setPaymentSplits([
        {
          id: "split-1",
          accountId: defaultAccountId,
          amount: requiredTotal || 0,
          checkout: "",
        },
      ]);
    }
  }, [data, requiredTotal, paymentSplits.length]);

  // Auto-update single split amount
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].id === "split-1") {
      setPaymentSplits((prev) => {
        if (prev.length === 1 && prev[0].id === "split-1" && prev[0].amount !== requiredTotal) {
          return prev.map((split) =>
            split.id === "split-1" ? { ...split, amount: requiredTotal || 0 } : split
          );
        }
        return prev;
      });
    }
  }, [requiredTotal]);

  // Handle Discount Code
  const handleApplyDiscount = async () => {
    if (!discountCode) {
      toast.error("Please enter a discount code.");
      return;
    }

    setIsCheckingDiscount(true);
    setDiscountError(null);

    try {
      const response = await postData("cashier/check_discount_code", { code: discountCode });
      if (response.success) {
        setAppliedDiscount(response.discount);
        toast.success(`Discount of ${response.discount}% applied!`);
      } else {
        setAppliedDiscount(0);
        setDiscountError("Invalid or Off discount code.");
        toast.error("Invalid or Off discount code.");
      }
    } catch (e) {
      setAppliedDiscount(0);
      setDiscountError(e.message || "Failed to validate discount code.");
      toast.error(e.message || "Failed to validate discount code.");
    } finally {
      setIsCheckingDiscount(false);
    }
  };

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
          ? { ...split, accountId: parseInt(accountId), checkout: "" }
          : split
      )
    );
  };

  const handleDescriptionChange = (id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, checkout: value } : split
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
        checkout: "",
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

  // دالة إرسال الطلب + الطباعة الصامتة
  const proceedWithOrderSubmission = async (due = 0, customer_id = undefined) => {
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
        amountToPay: requiredTotal,
        totalTax,
        totalDiscount: appliedDiscount > 0
          ? amountToPay * (appliedDiscount / 100)
          : discountData.module.includes(orderType)
            ? amountToPay * (discountData.discount / 100)
            : totalDiscount,
        notes: orderNotes.trim() || "No special instructions",
        source,
        financialsPayload,
        cashierId,
        tableId,
        customerPaid,
        discountCode: appliedDiscount > 0 ? discountCode : undefined,
        due,
        customer_id,
      });
    }

    try {
      const response = await postData(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response?.success) {
        toast.success(due === 1 ? "Due order created successfully!" : "Order placed successfully!");

        // تحضير بيانات الفاتورة
        const receiptData = prepareReceiptData(
          orderItems,
          amountToPay,
          totalTax,
          totalDiscount,
          appliedDiscount,
          discountData,
          orderType,
          requiredTotal,
          response.success
        );

        // طباعة صامتة (بدون واجهة)
        printReceiptSilently(receiptData, () => {
          console.log("PRINTING COMPLETED → Proceeding to navigation");
          onClearCart();
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
            navigate(due === 1 ? "/due" : "/orders");
          }
        });

      } else {
        toast.error(response?.message || "Failed to process order.");
      }
    } catch (e) {
      console.error("Submit error:", e);
      toast.error(e.message || "Submission failed");
    }
  };

  // اختيار العميل → إرسال الطلب فورًا
  const handleSelectCustomer = async (customer) => {
    if (requiredTotal > customer.can_debit) {
      toast.error(`Order amount (${requiredTotal.toFixed(2)} EGP) exceeds customer's debit limit.`);
      return;
    }

    setSelectedCustomer(customer);
    setCustomerSelectionOpen(false);

    await proceedWithOrderSubmission(1, customer.id);
  };

  // الضغط على Confirm & Pay
  const handleSubmitOrder = async () => {
    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(`Total must equal ${requiredTotal.toFixed(2)} EGP.`);
    }

    const validation = validatePaymentSplits(paymentSplits, getDescriptionStatus);
    if (!validation.valid) {
      return toast.error(validation.error);
    }

    if (isDueOrder) {
      if (!selectedCustomer) {
        setCustomerSelectionOpen(true);
        refetchDueUsers();
        return;
      }
      return;
    }

    await proceedWithOrderSubmission(0);
  };

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

  if (isLoading || deliveryLoading) return <Loading />;
  if (isError) return <p className="text-red-500">{isError?.message}</p>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
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

      <DeliveryAssignmentModal
        isOpen={deliveryModelOpen}
        onClose={handleSkip}
        deliveryList={deliveryData?.deliveries}
        selectedDeliveryId={selectedDeliveryId}
        setSelectedDeliveryId={setSelectedDeliveryId}
        onAssign={handleAssignDelivery}
        onSkip={handleSkip}
      />

      {!deliveryModelOpen && (
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl h-auto flex flex-col">
          <div className="bg-white p-4 border-b flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Process Payment</h2>
            <button
              onClick={onClose}
              className="text-4xl p-2 rounded-full hover:bg-gray-100"
            >
              X
            </button>
          </div>

          <div className="p-8 overflow-y-auto max-h-[calc(90vh-6rem)]">
            <div className="mb-6 border-b pb-4">
              <div className="flex justify-between mb-2">
                <span>Original Amount:</span>
                <span>{amountToPay.toFixed(2)} EGP</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between mb-2">
                  <span>Discount ({appliedDiscount}%):</span>
                  <span>-{(amountToPay * (appliedDiscount / 100)).toFixed(2)} EGP</span>
                </div>
              )}
              {discountData.module.includes(orderType) && appliedDiscount === 0 && (
                <div className="flex justify-between mb-2">
                  <span>Discount ({discountData.discount}%):</span>
                  <span>-{(amountToPay * (discountData.discount / 100)).toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span>Total Amount:</span>
                <span>{requiredTotal.toFixed(2)} EGP</span>
              </div>
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
            </div>

            {/* Order Notes Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Order Notes (Optional)</label>
              <Textarea
                placeholder="Add any special instructions or notes for this order..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {orderNotes.length}/500 characters
              </p>
            </div>

            {/* Discount Code */}
            <div className="mb-6">
              <label className="block text-sm mb-1">Discount by Company</label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Enter discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  disabled={isCheckingDiscount}
                />
                <Button
                  onClick={handleApplyDiscount}
                  disabled={isCheckingDiscount || !discountCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCheckingDiscount ? "Checking..." : "Apply"}
                </Button>
              </div>
              {discountError && (
                <p className="mt-2 text-red-500 text-sm">{discountError}</p>
              )}
              {appliedDiscount > 0 && (
                <p className="mt-2 text-green-600 text-sm">
                  Discount of {appliedDiscount}% applied successfully!
                </p>
              )}
            </div>

            {/* Payment Splits */}
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
                      value={split.checkout}
                      onChange={(e) => handleDescriptionChange(split.id, e.target.value)}
                      maxLength={4}
                      className="w-32"
                    />
                  )}
                  {paymentSplits.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSplit(split.id)}>
                      [Remove]
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

            {/* Amount Paid */}
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

            {/* Due Order Checkbox */}
            <div className="mt-6 flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <input
                type="checkbox"
                id="isDueOrder"
                checked={isDueOrder}
                onChange={(e) => {
                  setIsDueOrder(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedCustomer(null);
                  }
                }}
                className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="isDueOrder" className="text-sm font-medium text-gray-700 cursor-pointer">
                Mark as Due Order (Customer will pay later)
              </label>
            </div>

            {/* الأزرار */}
            <div className="flex space-x-4 mt-6">
              <Button
                className="flex-1 text-white bg-green-600 hover:bg-green-700"
                disabled={loading || !isTotalMet}
                onClick={handleSubmitOrder}
              >
                {loading
                  ? "Processing..."
                  : isDueOrder
                    ? selectedCustomer
                      ? "Due Order Ready"
                      : "Select Customer"
                    : "Confirm & Pay"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckOut;