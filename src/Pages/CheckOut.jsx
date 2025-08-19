import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { useNavigate } from "react-router-dom";

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,    
  totalTax,
  totalDiscount,
  notes = "Customer requested no plastic bag.",
  source = "web",
  updateOrderItems,
  orderType,
}) => {
  const branch_id = localStorage.getItem("branch_id");
  const cashierId = localStorage.getItem("cashier_id");
  const navigate = useNavigate();

  const {
    data,
    loading: isLoading,
    error: isError,
  } = useGet(`captain/selection_lists?branch_id=${branch_id}`);

  const { postData, loading } = usePost();
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const tableId = localStorage.getItem("table_id") || null;
  const [deliveryModelOpen, setDeliveryModelOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const {
    data: deliveryData,
    loading: deliveryLoading,
    error: deliveryError,
  } = useGet("cashier/delivery_lists");

  const requiredTotal = useMemo(() => {
    if (orderType === "dine_in") {
      return orderItems
        .filter((item) => item.preparation_status === "done")
        .reduce((acc, item) => acc + item.price * item.count, 0);
    } else {
      return amountToPay;
    }
  }, [orderItems, orderType, amountToPay]);

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

  useEffect(() => {
    if (data?.financial_account?.length > 0 && paymentSplits.length === 0) {
      const defaultAccountId = data.financial_account[0]?.id;
      setPaymentSplits([
        {
          id: "split-1",
          accountId: defaultAccountId,
          amount: amountToPay || 0,
        },
      ]);
    }
  }, [data, amountToPay]);

  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].id === "split-1") {
      setPaymentSplits((prev) =>
        prev.map((split) =>
          split.id === "split-1"
            ? { ...split, amount: amountToPay || 0 }
            : split
        )
      );
    }
  }, [amountToPay]);

  const handleAmountChange = (id, value) => {
    const newAmount = parseFloat(value) || 0;
    setPaymentSplits((prevSplits) => {
      const updatedSplits = prevSplits.map((split) =>
        split.id === id ? { ...split, amount: newAmount } : split
      );

      const currentSum = updatedSplits.reduce((acc, s) => acc + s.amount, 0);
      const totalExcludingCurrent = prevSplits.reduce(
        (acc, s) => (s.id === id ? acc : acc + s.amount),
        0
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;

      if (currentSum > requiredTotal) {
        toast.error(`Amount cannot exceed: ${maxAllowed.toFixed(2)} EGP.`);
        return prevSplits.map((split) =>
          split.id === id ? { ...split, amount: maxAllowed } : split
        );
      }
      return updatedSplits;
    });
  };

  const handleAccountChange = (id, accountId) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, accountId: parseInt(accountId) } : split
      )
    );
  };

  const handleAddSplit = () => {
    const defaultAccountId = data.financial_account[0]?.id;
    if (!defaultAccountId) return toast.error("No accounts available.");
    const newId = `split-${Date.now()}`;
    setPaymentSplits((prev) => [
      ...prev,
      {
        id: newId,
        accountId: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
      },
    ]);
  };

  const handleRemoveSplit = (id) => {
    setPaymentSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const getAccountNameById = (accountId) => {
    const acc = data?.financial_account?.find(
      (a) => a.id === parseInt(accountId)
    );
    return acc ? acc.name : "Select Account";
  };

  const isTotalMet = totalScheduled >= requiredTotal;

  const endpoint =
    orderType === "dine_in"
      ? "cashier/dine_in_payment"
      : orderType === "delivery"
      ? "cashier/delivery_order"
      : "cashier/take_away_order";

  const handleSubmitOrder = async () => {
    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(`Total must equal ${requiredTotal.toFixed(2)} EGP.`);
    }

// CheckOut.jsx - Fixed processProductItem function
const processProductItem = (item) => {
  const groupedVariations = item.allSelectedVariations?.reduce((acc, variation) => {
    const existing = acc.find((v) => v.variation_id === variation.variation_id);
    if (existing) {
      existing.option_id = Array.isArray(existing.option_id)
        ? [...existing.option_id, variation.option_id]
        : [existing.option_id, variation.option_id];
    } else {
      acc.push({
        variation_id: variation.variation_id.toString(),
        option_id: [variation.option_id.toString()],
      });
    }
    return acc;
  }, []) || [];

  // FIXED: Separate real extras from addons
  const realExtrasIds = [];
  const addonItems = [];

  if (item.selectedExtras && item.selectedExtras.length > 0) {
    item.selectedExtras.forEach(extraId => {
      // Check if this ID belongs to allExtras (real extras)
      const isRealExtra = item.allExtras?.some(extra => extra.id === extraId);
      
      if (isRealExtra) {
        realExtrasIds.push(extraId.toString());
      } else {
        // It's an addon, find it in the addons array
        const addon = item.addons?.find(addon => addon.id === extraId);
        if (addon) {
          addonItems.push({
            addon_id: extraId.toString(),
            count: "1", // Default count, you might want to make this dynamic
          });
        }
      }
    });
  }

  // Also add any selectedAddons data if it exists
  if (item.selectedAddons && item.selectedAddons.length > 0) {
    item.selectedAddons.forEach(addonData => {
      // Check if this addon is not already added
      const alreadyExists = addonItems.some(existing => existing.addon_id === addonData.addon_id.toString());
      if (!alreadyExists) {
        addonItems.push({
          addon_id: addonData.addon_id.toString(),
          count: (addonData.count || 1).toString(),
        });
      }
    });
  }

  const productData = {
    product_id: item.id.toString(),
    count: item.count.toString(),
    note: item.note || "Product Note",
    addons: addonItems,
    variation: groupedVariations,
    exclude_id: (item.selectedExcludes || []).map(id => id.toString()),
    extra_id: realExtrasIds, // Only real extras, not addons
  };

  console.log("Processed product data:", productData);
  console.log("Real extras:", realExtrasIds);
  console.log("Addons:", addonItems);

  return productData;
};

    let productsToSend;
    let newAmountToPay;

    if (orderType === "dine_in") {
      const doneItems = orderItems.filter((item) => item.preparation_status === "done");
      newAmountToPay = doneItems.reduce((acc, item) => acc + item.price * item.count, 0);
      productsToSend = doneItems.map(processProductItem);
    } else {
      productsToSend = orderItems.map(processProductItem);
      newAmountToPay = amountToPay;
    }

    const payload = {
      amount: newAmountToPay.toString(),
      total_tax: totalTax.toString(),
      total_discount: totalDiscount.toString(),
      notes: notes || "note",
      products: productsToSend,
      source: source,
      financials: paymentSplits.map((s) => ({
        id: s.accountId.toString(),
        amount: s.amount.toString(),
      })),
      cashier_id: cashierId.toString(),
    };

    if (orderType === "dine_in") {
      payload.table_id = tableId;
    } else if (orderType === "delivery") {
      payload.address_id = localStorage.getItem("selected_address_id") || "";
      payload.user_id = localStorage.getItem("selected_user_id") || "";
      payload.cash_with_delivery = (parseFloat(customerPaid) || 0).toString();
    }

    console.log("Payload to send:", JSON.stringify(payload, null, 2));

    try {
      const response = await postData(endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Order Submission Response:", response);
      toast.success("Order placed successfully!");

      localStorage.setItem("last_order_type", orderType);

      if (orderType === "delivery") {
        const newOrderId = response?.success?.id;
        if (newOrderId) {
          setOrderId(newOrderId);
          console.log("New Order ID:", newOrderId);
          setDeliveryModelOpen(true);
        } else {
          toast.error("Order ID not returned from server. Cannot assign delivery.");
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

  const handleAssignDelivery = async () => {
    if (!orderId) {
      toast.error("Order ID is missing. Please try again.");
      return;
    }

    if (!selectedDeliveryId) {
      return toast.error("Please select a delivery person.");
    }

    const payload = {
      delivery_id: selectedDeliveryId,
    };

    try {
      await postData(`cashier/determine_delivery/${orderId}`, payload);
      toast.success("Delivery person assigned successfully!");
      setDeliveryModelOpen(false);
      onClose();
      navigate("/orders");
    } catch (e) {
      console.error("Assign delivery error:", e);
      toast.error(e.message || "Failed to assign delivery person.");
    }
  };

  const handleSkip = () => {
    setDeliveryModelOpen(false);
    onClose();
    navigate("/orders");
  };

  if (isLoading || deliveryLoading) return <Loading />;
  if (isError || deliveryError)
    return (
      <p className="text-red-500">
        {isError?.message || deliveryError?.message}
      </p>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      {deliveryModelOpen && (
        <div className="relative w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors text-xl"
          >
            ×
          </button>
          <h2 className="text-xl font-semibold mb-4 text-bg-primary text-center">
            Assign Delivery Man
          </h2>

          <div className="space-y-4">
            <Select
              className="w-full border rounded-md"
              onValueChange={(val) => setSelectedDeliveryId(val)}
            >
              <SelectTrigger className="border rounded-md w-full">
                <SelectValue placeholder="Select a delivery person" />
              </SelectTrigger>
              <SelectContent>
                {deliveryData?.deliveries?.map((d) => (
                  <SelectItem
                    className="text-bg-primary hover:bg-gray-100"
                    key={d.id}
                    value={String(d.id)}
                  >
                    {d.f_name} {d.l_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex w-full space-x-2">
              <Button
                onClick={handleAssignDelivery}
                className="flex-1 bg-bg-primary text-white hover:bg-bg-secondary focus:bg-bg-secondary rounded-md shadow-sm transition-colors"
              >
                Assign Delivery
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1 border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 transition-colors"
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {!deliveryModelOpen && (
        <div className="relative w-full max-w-2xl bg-white p-8 rounded-2xl shadow-2xl border">
          <ToastContainer position="bottom-right" />
          <button onClick={onClose} className="absolute top-4 right-4 text-xl">
            ×
          </button>
          <h2 className="text-2xl font-semibold mb-6">Process Payment</h2>
          <div className="mb-6 border-b pb-4">
            <div className="flex justify-between mb-2">
              <span>Total Amount:</span>
              <span>{requiredTotal.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Remaining:</span>
              <span
                className={
                  remainingAmount > 0 ? "text-orange-500" : "text-green-600"
                }
              >
                {remainingAmount.toFixed(2)} EGP
              </span>
            </div>
            {changeAmount > 0 && (
              <div className="flex justify-between">
                <span>Change:</span>
                <span className="text-green-600">
                  {changeAmount.toFixed(2)} EGP
                </span>
              </div>
            )}
          </div>
          <div className="space-y-6">
            {paymentSplits.map((split) => (
              <div key={split.id} className="flex items-center space-x-4">
                <div className="w-40">
                  <Select
                    value={String(split.accountId)}
                    onValueChange={(val) => handleAccountChange(split.id, val)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {getAccountNameById(split.accountId)}
                      </SelectValue>
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
                    value={split.amount === 0 ? "" : String(split.amount)}
                    onChange={(e) =>
                      handleAmountChange(split.id, e.target.value)
                    }
                    className="pl-16"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    EGP
                  </span>
                </div>
                {paymentSplits.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSplit(split.id)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {remainingAmount > 0 && (
              <Button
                variant="link"
                onClick={handleAddSplit}
                className="text-sm text-blue-600"
              >
                + Add account split
              </Button>
            )}
            <div className="border-t pt-4">
              <p
                className={`text-xs ${
                  isTotalMet ? "text-green-600" : "text-red-500"
                }`}
              >
                {isTotalMet
                  ? "Total matches required amount."
                  : `Sum Must Equal ${requiredTotal.toFixed(2)} EGP To Proceed`}
              </p>
            </div>
          </div>
          <Button
            className="w-full bg-red-600 text-white mt-6"
            disabled={!isTotalMet || loading}
            onClick={handleSubmitOrder}
          >
            {loading ? "Processing..." : "Confirm & Pay"}
          </Button>
          <div className="mt-6">
            <label className="block text-sm mb-1">
              Amount Paid by Customer
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="Enter amount paid"
                value={customerPaid}
                onChange={(e) => setCustomerPaid(e.target.value)}
                className="pl-16"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                EGP
              </span>
            </div>
            {parseFloat(customerPaid) > requiredTotal && (
              <p className="mt-2 text-green-600 text-sm font-semibold">
                Change Due: {calculatedChange.toFixed(2)} EGP
              </p>
            )}
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default CheckOut;