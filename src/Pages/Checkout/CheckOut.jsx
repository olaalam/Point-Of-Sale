import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { useNavigate } from "react-router-dom";
import CustomerSelectionModal from "./CustomerSelectionModal";
import DuePaymentModal from "./DuePaymentModal";
import DeliveryAssignmentModal from "./DeliveryAssignmentModal";
import { buildFinancialsPayload, getOrderEndpoint, buildOrderPayload, buildDealPayload, validatePaymentSplits } from "./processProductItem";
import { useConfirmDuePayment } from "@/hooks/useConfirmDuePayment";

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

  const { data, loading: isLoading, error: isError } = useGet(`captain/selection_lists?branch_id=${branch_id}`);
  const { data: deliveryData, loading: deliveryLoading } = useGet("cashier/delivery_lists");
  const { postData, loading } = usePost();

  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [isDueOrder, setIsDueOrder] = useState(false);
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [duePaymentOpen, setDuePaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [dueSplits, setDueSplits] = useState([]);
  const [dueAmount, setDueAmount] = useState(0);

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

  // ===== Discount Code State =====
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  // ✅ Memoized discount from sessionStorage
  const discountData = useMemo(() => {
    const storedDiscount = sessionStorage.getItem("discount_data");
    try {
      return storedDiscount ? JSON.parse(storedDiscount) : { discount: 0, module: [] };
    } catch (error) {
      console.error("Error parsing discount data from sessionStorage:", error);
      return { discount: 0, module: [] };
    }
  }, []);

  // ✅ Calculate discounted amount based on applied discount or sessionStorage
  const discountedAmount = useMemo(() => {
    let totalDiscount = 0;
    if (appliedDiscount > 0) {
      totalDiscount = amountToPay * (appliedDiscount / 100);
    } else if (discountData.module.includes(orderType)) {
      totalDiscount = amountToPay * (discountData.discount / 100);
    }
    return amountToPay - totalDiscount;
  }, [amountToPay, orderType, discountData, appliedDiscount]);

  // ✅ Use discountedAmount in requiredTotal
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

  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].id === "split-1" && !isDueOrder) {
      setPaymentSplits((prev) =>
        prev.map((split) =>
          split.id === "split-1" ? { ...split, amount: requiredTotal || 0 } : split
        )
      );
    }
  }, [requiredTotal, isDueOrder]);

  // ===== Handle Discount Code Validation =====
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
        setDiscountError("Invalid or expired discount code.");
        toast.error("Invalid or expired discount code.");
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

  const handlePayLater = () => {
    if (orderType !== "take_away" && orderType !== "delivery") {
      return toast.error("Pay Later is only available for Take-Away and Delivery orders.");
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

  const { handleConfirmDuePayment } = useConfirmDuePayment({
    navigate,
    onClearCart,
    onClose: () => setDuePaymentOpen(false), // Update onClose to close duePaymentOpen
    setDueSplits,
    setDueAmount,
  });

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

  const handleSubmitOrder = async () => {
    if (isDueOrder) {
      if (!selectedCustomer) {
        return toast.error("Please select a customer for a Pay Later order.");
      }
      return;
    }

    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(`Total must equal ${requiredTotal.toFixed(2)} EGP.`);
    }

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
        amountToPay: requiredTotal,
        totalTax,
        totalDiscount: appliedDiscount > 0
          ? amountToPay * (appliedDiscount / 100)
          : discountData.module.includes(orderType)
            ? amountToPay * (discountData.discount / 100)
            : totalDiscount,
        notes,
        source,
        financialsPayload,
        cashierId,
        tableId,
        customerPaid,
        discountCode: appliedDiscount > 0 ? discountCode : undefined,
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
      <DuePaymentModal
        isOpen={duePaymentOpen}
        onClose={() => setDuePaymentOpen(false)}
        customer={selectedCustomer}
        requiredTotal={requiredTotal}
        onConfirm={(splits, dueAmount) => handleConfirmDuePayment(splits, dueAmount, selectedCustomer)} // Pass selectedCustomer here
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
          {/* ===== Discount Code Input ===== */}
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