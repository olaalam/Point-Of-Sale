import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import qz from "qz-tray";
import CustomerSelectionModal from "./CustomerSelectionModal";
import DeliveryAssignmentModal from "./DeliveryAssignmentModal";
import {
  buildFinancialsPayload,
  getOrderEndpoint,
  buildOrderPayload,
  buildDealPayload,
  validatePaymentSplits,
} from "./processProductItem";
import {
  prepareReceiptData,
  printReceiptSilently,
} from "../utils/printReceipt";
import { useTranslation } from "react-i18next";
import { useIsDueModuleAllowed } from "../utils/dueModuleUtils";

const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  totalTax,
  totalDiscount,
  source = "web",
  totalDineInItems,
  orderType,
  selectedPaymentItemIds = [],
  clearPaidItemsOnly,
  onClearCart,
   service_fees,
}) => {
  const cashierId = sessionStorage.getItem("cashier_id");
  const tableId = sessionStorage.getItem("table_id") || null;
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { t } = useTranslation();
  const lastSelectedGroup = sessionStorage.getItem("last_selected_group") 
  const [dueModuleAmount, setDueModuleAmount] = useState(0);
  const { data: groupData } = useGet("cashier/group_product"); // الـ API اللي جبته
const groupProducts = groupData?.group_product || [];

const isDueModuleAllowed = (() => {
  if (!orderType || !groupProducts || groupProducts.length === 0) return false;

  const lastSelectedGroupId = sessionStorage.getItem("last_selected_group");
  if (!lastSelectedGroupId || lastSelectedGroupId === "all") return false;

  const groupId = parseInt(lastSelectedGroupId);
  if (isNaN(groupId)) return false;

  const selectedGroup = groupProducts.find(g => g.id === groupId);
  return selectedGroup?.due === 1;
})();  const { data: discountListData, loading: discountsLoading } = useGet(
    "captain/discount_list"
  );
  const [selectedDiscountId, setSelectedDiscountId] = useState(null);
  
  // 🟢 إضافة state للـ free_discount
  const [freeDiscount, setFreeDiscount] = useState("");

  // === QZ Tray Connection ===
  useEffect(() => {
    qz.security.setCertificatePromise(function (resolve, reject) {
      fetch("/point-of-sale/digital-certificate.txt")
        .then((response) => response.text())
        .then(resolve)
        .catch(reject);
    });

    qz.security.setSignatureAlgorithm("SHA512");

    qz.security.setSignaturePromise(function (toSign) {
      return function (resolve, reject) {
        const apiUrl = `${baseUrl}api/sign-qz-request?request=${toSign}`;

        fetch(apiUrl)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}`);
            }
            return response.text();
          })
          .then(resolve)
          .catch(reject);
      };
    });

    qz.websocket
      .connect()
      .then(() => {
        console.log("✅ Connected to QZ Tray");
      })
      .catch((err) => {
        console.error("❌ QZ Tray connection error:", err);
        toast.error(t("QZTrayNotRunning"));
      });

    return () => {
      qz.websocket.disconnect();
    };
  }, []);

  const { data: deliveryData } = useGet("cashier/delivery_lists");
  const { postData, loading } = usePost();

  const [orderNotes, setOrderNotes] = useState("");
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

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
  
  const { selectedDiscountAmount, finalSelectedDiscountId } = useMemo(() => {
    const discountList = discountListData?.discount_list || [];
    const selectedDiscount = discountList.find(
      (d) => d.id === selectedDiscountId
    );

    if (!selectedDiscount) {
      return { selectedDiscountAmount: 0, finalSelectedDiscountId: null };
    }

    let discountValue = 0;
    if (selectedDiscount.type === "percentage") {
      discountValue = amountToPay * (selectedDiscount.amount / 100);
    } else if (selectedDiscount.type === "value") {
      discountValue = selectedDiscount.amount;
    }

    return {
      selectedDiscountAmount: discountValue,
      finalSelectedDiscountId: selectedDiscount.id,
    };
  }, [discountListData, selectedDiscountId, amountToPay]);

  const [deliveryModelOpen, setDeliveryModelOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [isDueOrder, setIsDueOrder] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  const discountData = useMemo(() => {
    const storedDiscount = sessionStorage.getItem("discount_data");
    try {
      return storedDiscount
        ? JSON.parse(storedDiscount)
        : { discount: 0, module: [] };
    } catch (error) {
      console.error("Error parsing discount data from sessionStorage:", error);
      return { discount: 0, module: [] };
    }
  }, []);

  // 🟢 حساب المبلغ بعد الخصم (مع إضافة free_discount)
  const discountedAmount = useMemo(() => {
    let totalDiscountValue = 0;

    // 1. تطبيق الخصم بالرمز (إذا كان مطبقاً)
    if (appliedDiscount > 0) {
      totalDiscountValue = amountToPay * (appliedDiscount / 100);
    }
    // 2. تطبيق الخصم الثابت بالـ module (إذا لم يكن هناك خصم بالرمز)
    else if (discountData.module.includes(orderType)) {
      totalDiscountValue = amountToPay * (discountData.discount / 100);
    }
    // 3. تطبيق الخصم المختار من القائمة (إذا لم يتم تطبيق خصم بالرمز أو خصم module)
    else if (selectedDiscountAmount > 0) {
      totalDiscountValue = selectedDiscountAmount;
    }

    // 4. 🟢 خصم الـ free_discount من المبلغ النهائي
    const afterPercentageDiscount = amountToPay - totalDiscountValue;
    const freeDiscountValue = parseFloat(freeDiscount) || 0;
    
    return Math.max(0, afterPercentageDiscount - freeDiscountValue);
  }, [
    amountToPay,
    orderType,
    discountData,
    appliedDiscount,
    selectedDiscountAmount,
    freeDiscount,
  ]);

  const requiredTotal = useMemo(() => {
    if (orderType !== "dine_in") {
      return discountedAmount;
    }

    if (selectedPaymentItemIds.length > 0) {
      const selectedItems = orderItems.filter((item) =>
        selectedPaymentItemIds.includes(item.temp_id)
      );
      return selectedItems.reduce((acc, item) => {
        const quantity = item.count ?? item.quantity ?? 1;
        return acc + item.price * quantity;
      }, 0);
    }

    return discountedAmount;
  }, [orderItems, orderType, discountedAmount, selectedPaymentItemIds]);

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

  const financialAccounts = useMemo(() => {
    try {
      const stored = sessionStorage.getItem("financial_account");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error parsing financial_account:", e);
      return [];
    }
  }, []);

  // Initialize default payment split - اختيار Visa كافتراضي لو موجود
  useEffect(() => {
    if (
      financialAccounts?.length > 0 &&
      paymentSplits.length === 0 &&
      requiredTotal > 0
    ) {
      const visaAccount = financialAccounts.find((acc) =>
        acc.name?.toLowerCase().includes("visa")
      );

      const defaultAccountId = visaAccount
        ? visaAccount.id
        : financialAccounts[0].id;

      setPaymentSplits([
        {
          id: "split-1",
          accountId: defaultAccountId,
          amount: requiredTotal,
          checkout: "",
          transition_id: "",
        },
      ]);
    }
  }, [financialAccounts, requiredTotal, paymentSplits.length]);

  // Auto-update single split amount
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].id === "split-1") {
      setPaymentSplits((prev) => {
        if (
          prev.length === 1 &&
          prev[0].id === "split-1" &&
          prev[0].amount !== requiredTotal
        ) {
          return prev.map((split) =>
            split.id === "split-1"
              ? { ...split, amount: requiredTotal || 0 }
              : split
          );
        }
        return prev;
      });
    }
  }, [requiredTotal]);

  const handleApplyDiscount = async () => {
    if (!discountCode) {
      toast.error(t("PleaseEnterDiscountCode"));
      return;
    }

    setIsCheckingDiscount(true);
    setDiscountError(null);

    try {
      const response = await postData("cashier/check_discount_code", {
        code: discountCode,
      });
      if (response.success) {
        setAppliedDiscount(response.discount);
        toast.success(t("DiscountApplied", { discount: response.discount }));
      } else {
        setAppliedDiscount(0);
        setDiscountError("Invalid or Off discount code.");
        toast.error(t("InvalidOrOffDiscountCode"));
      }
    } catch (e) {
      setAppliedDiscount(0);
      setDiscountError(e.message || "Failed to validate discount code.");
      toast.error(e.message || t("FailedToValidateDiscountCode"));
    } finally {
      setIsCheckingDiscount(false);
    }
  };

  const handleAmountChange = (id, value) => {
    const newAmount = parseFloat(value) || 0;
    if (newAmount < 0) {
      toast.error(t("AmountCannotBeNegative"));
      return;
    }

    setPaymentSplits((prevSplits) => {
      const totalExcludingCurrent = prevSplits.reduce(
        (acc, s) => (s.id === id ? acc : acc + s.amount),
        0
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;

      if (newAmount > maxAllowed) {
        toast.error(t("AmountExceedsLimit", { amount: maxAllowed.toFixed(2) }));
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
          ? {
              ...split,
              accountId: parseInt(accountId),
              checkout: "",
              transition_id: "",
            }
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

  const handleTransitionIdChange = (id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, transition_id: value } : split
      )
    );
  };

  const handleAddSplit = () => {
    if (!financialAccounts?.length) {
      return toast.error(t("NoFinancialAccounts"));
    }

    const defaultAccountId = financialAccounts[0].id;
    setPaymentSplits((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}`,
        accountId: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
        checkout: "",
        transition_id: "",
      },
    ]);
  };

  const handleRemoveSplit = (id) => {
    setPaymentSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const getAccountNameById = (accountId) => {
    const acc = financialAccounts?.find((a) => a.id === parseInt(accountId));
    return acc ? acc.name : "Select Account";
  };

  const getDescriptionStatus = (accountId) => {
    const acc = financialAccounts?.find((a) => a.id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  const isVisaAccount = (accountId) => {
    const acc = financialAccounts?.find((a) => a.id === parseInt(accountId));
    return acc?.name?.toLowerCase().includes("visa");
  };

  const proceedWithOrderSubmission = async (
    due = 0,
    customer_id = undefined,
    dueModuleValue = 0
  ) => {
    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];

    const isDineIn = orderType === "dine_in";
    const hasSelectedItems = selectedPaymentItemIds.length > 0;
    const totalItemsCount = orderItems.length;
    const allItemsSelected =
      hasSelectedItems && selectedPaymentItemIds.length === totalItemsCount;

    const isPartialPayment = isDineIn && hasSelectedItems && !allItemsSelected;

    const hasDealItems = safeOrderItems.some((item) => item.is_deal);
    const endpoint = getOrderEndpoint(
      orderType,
      safeOrderItems,
      totalDineInItems,
      hasDealItems
    );
    const financialsPayload = buildFinancialsPayload(
      paymentSplits,
      financialAccounts
    );

    // 🟢 جلب module_id من sessionStorage
    const moduleId = sessionStorage.getItem("module_id");

    let payload;
    if (hasDealItems) {
      payload = buildDealPayload(safeOrderItems, financialsPayload);
    } else {
      const finalDiscountId =
        selectedDiscountAmount > 0 ? finalSelectedDiscountId : null;
      payload = buildOrderPayload({
        orderType,
        orderItems: safeOrderItems,
        amountToPay: requiredTotal,
        totalTax,
        totalDiscount:
          appliedDiscount > 0
            ? amountToPay * (appliedDiscount / 100)
            : discountData.module.includes(orderType)
            ? amountToPay * (discountData.discount / 100)
            : totalDiscount,
        notes: orderNotes.trim() || "No special instructions",
        source,
        financialsPayload,
        cashierId,
        tableId,
        customerPaid: customerPaid || undefined,
        discountCode: appliedDiscount > 0 ? discountCode : undefined,
        due: due,
        user_id: customer_id,
        discount_id: selectedDiscountId,
        module_id: moduleId, // 🟢 إضافة module_id
        free_discount: freeDiscount ? parseFloat(freeDiscount) : undefined, // 🟢 إضافة free_discount
        due_module: dueModuleValue > 0 ? dueModuleValue.toFixed(2) : undefined,
         service_fees,
      });
    }

    try {
      const response = await postData(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response?.success) {
        toast.success(due === 1 ? t("DueOrderCreated") : t("OrderPlaced"));

        const handleNavigation = () => {
          if (orderType === "delivery") {
            sessionStorage.removeItem("selected_user_id");
            sessionStorage.removeItem("selected_user_data");
            sessionStorage.removeItem("selected_address_id");
            sessionStorage.removeItem("selected_address_data");
            setDeliveryModelOpen(false);
          }

          if (orderType === "dine_in" && selectedPaymentItemIds.length > 0) {
            clearPaidItemsOnly();
          } else {
            onClearCart();
          }

          sessionStorage.setItem("last_order_type", orderType);

          if (orderType === "delivery" && response?.success?.id) {
            setOrderId(response.success.id);
            setDeliveryModelOpen(true);
          } else {
            onClose();
          }
        };

        if (due === 0) {
          const receiptData = prepareReceiptData(
            safeOrderItems,
            amountToPay,
            totalTax,
            totalDiscount,
            appliedDiscount,
            discountData,
            orderType,
            requiredTotal,
            response.success,
            response
          );

          printReceiptSilently(receiptData, response, () => {
            handleNavigation();
          });
        } else {
          handleNavigation();
        }
      } else {
        toast.error(response?.message || t("FailedToProcessOrder"));
      }
    } catch (e) {
      console.error("Submit error:", e);
      toast.error(e.message || t("SubmissionFailed"));
    }
  };

  const handleSelectCustomer = async (customer) => {
    if (requiredTotal > customer.can_debit) {
      toast.error(
        t("OrderExceedsDebitLimit", { amount: requiredTotal.toFixed(2) })
      );
      return;
    }

    setSelectedCustomer(customer);
    setCustomerSelectionOpen(false);

    await proceedWithOrderSubmission(1, customer.id);
  };

  const handleSubmitOrder = async () => {
    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(
        t("TotalMustEqual", { amount: requiredTotal.toFixed(2) })
      );
    }

    const validation = validatePaymentSplits(
      paymentSplits,
      getDescriptionStatus
    );
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
    if (!orderId) return toast.error(t("OrderIdMissing"));
    if (!selectedDeliveryId) return toast.error(t("SelectDeliveryPerson"));

    try {
      await postData(`cashier/determine_delivery/${orderId}`, {
        delivery_id: selectedDeliveryId,
      });
      toast.success(t("DeliveryPersonAssigned"));
      setDeliveryModelOpen(false);
      onClose();
    } catch (e) {
      toast.error(e.message || t("FailedToAssignDeliveryPerson"));
    }
  };

  const handleSkip = () => {
    sessionStorage.removeItem("selected_user_id");
    sessionStorage.removeItem("selected_user_data");
    sessionStorage.removeItem("selected_address_id");
    sessionStorage.removeItem("selected_address_data");
    setDeliveryModelOpen(false);
    onClose();
  };

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
            <h2 className="text-2xl font-semibold">{t("ProcessPayment")}</h2>
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
                <span>{t("OriginalAmount")}</span>
                <span>
                  {amountToPay.toFixed(2)} {t("EGP")}
                </span>
              </div>

              {/* عرض الخصم المُطبق من الـ Discount Code */}
              {appliedDiscount > 0 && (
                <div className="flex justify-between mb-2">
                  <span>
                    {t("Discount")} ({appliedDiscount}%):
                  </span>
                  <span>
                    -{(amountToPay * (appliedDiscount / 100)).toFixed(2)}{" "}
                    {t("EGP")}
                  </span>
                </div>
              )}

              {/* عرض الخصم المُطبق من الـ Module */}
              {discountData.module.includes(orderType) &&
                appliedDiscount === 0 &&
                selectedDiscountAmount === 0 && (
                  <div className="flex justify-between mb-2">
                    <span>
                      {t("Discount")} ({discountData.discount}%):
                    </span>
                    <span>
                      -
                      {(amountToPay * (discountData.discount / 100)).toFixed(2)}{" "}
                      {t("EGP")}
                    </span>
                  </div>
                )}

              {/* عرض الخصم المُطبق من الـ Discount List */}
              {selectedDiscountAmount > 0 &&
                appliedDiscount === 0 &&
                !discountData.module.includes(orderType) && (
                  <div className="flex justify-between mb-2 text-blue-600 font-medium">
                    <span>{t("ListDiscount")}:</span>
                    <span>
                      -{selectedDiscountAmount.toFixed(2)} {t("EGP")}
                    </span>
                  </div>
                )}

              {/* 🟢 عرض الخصم المجاني (free_discount) */}
              {freeDiscount && parseFloat(freeDiscount) > 0 && (
                <div className="flex justify-between mb-2 text-purple-600 font-medium">
                  <span>{t("FreeDiscount")}:</span>
                  <span>
                    -{parseFloat(freeDiscount).toFixed(2)} {t("EGP")}
                  </span>
                </div>
              )}

              <div className="flex justify-between mb-2 font-bold text-lg">
                <span>{t("TotalAmount")}</span>
                <span>
                  {requiredTotal.toFixed(2)} {t("EGP")}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span>{t("Remaining")}</span>
                <span
                  className={
                    remainingAmount > 0 ? "text-orange-500" : "text-green-600"
                  }
                >
                  {remainingAmount.toFixed(2)} {t("EGP")}
                </span>
              </div>
              {changeAmount > 0 && (
                <div className="flex justify-between">
                  <span>{t("Change")}:</span>
                  <span className="text-green-600">
                    {changeAmount.toFixed(2)} {t("EGP")}
                  </span>
                </div>
              )}
            </div>
{/* Due Module - الباقي كله للمنصة (الطريقة اللي عايزها الكاشير) */}
{isDueModuleAllowed && remainingAmount > 0.01 && (
  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="text-center mb-4">
      <p className="text-lg font-bold text-red-600">
        المنصة هتدفع الباقي (Due Module): <strong>{remainingAmount.toFixed(2)} {t("EGP")}</strong>
      </p>
    </div>

    <Button
      className="w-full text-white text-lg font-bold py-6 bg-red-600 hover:bg-red-700"
      disabled={loading}
      onClick={() => proceedWithOrderSubmission(0, undefined, remainingAmount)}
    >
      تأكيد الطلب مع Due Module ({remainingAmount.toFixed(2)} {t("EGP")})
    </Button>
  </div>
)}
            {/* Order Notes Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                {t("OrderNotes")}
              </label>
              <Textarea
                placeholder={t("OrderNotesPlaceholder")}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {orderNotes.length}/500 {t("characters")}
              </p>
            </div>

            {/* 🟢 حقل الخصم المجاني (Free Discount) */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                {t("FreeDiscount")} ({t("EGP")})
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t("EnterFreeDiscount")}
                value={freeDiscount}
                onChange={(e) => setFreeDiscount(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("FreeDiscountHint")}
              </p>
            </div>

            {/* Discount Code */}
            <div className="mb-6">
              <label className="block text-sm mb-1">
                {t("DiscountbyCompany")}
              </label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder={t("EnterDiscountCode")}
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  disabled={isCheckingDiscount}
                />
                <Button
                  onClick={handleApplyDiscount}
                  disabled={isCheckingDiscount || !discountCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCheckingDiscount ? t("Checking") : t("Apply")}
                </Button>
              </div>
              {discountError && (
                <p className="mt-2 text-red-500 text-sm">{discountError}</p>
              )}
              {appliedDiscount > 0 && (
                <p className="mt-2 text-green-600 text-sm">
                  {t("DiscountAppliedSuccess", { appliedDiscount })}
                </p>
              )}
            </div>

            {/* اختيار الخصم من القائمة (Discount List) */}
            <div className="mb-6">
              <label className="block text-sm mb-1">
                {t("SelectDiscountFromList")}
              </label>
              <Select
                value={String(selectedDiscountId || "0")}
                onValueChange={(val) => {
                  const id = val === "0" ? null : parseInt(val);
                  setSelectedDiscountId(id);
                }}
                disabled={
                  discountsLoading || !discountListData?.discount_list?.length
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("ChooseDiscount")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="none" value="0">
                    {t("NoDiscount")}
                  </SelectItem>
                  {discountListData?.discount_list?.map((discount) => (
                    <SelectItem key={discount.id} value={String(discount.id)}>
                      {discount.name} ({discount.amount}
                      {discount.type === "percentage" ? "%" : t("EGP")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {discountsLoading && (
                <p className="mt-2 text-sm text-gray-500">
                  {t("LoadingDiscounts")}
                </p>
              )}
              {!discountListData?.discount_list?.length &&
                !discountsLoading && (
                  <p className="mt-2 text-sm text-gray-500">
                    {t("NoDiscountsAvailable")}
                  </p>
                )}
            </div>

            {/* Payment Splits */}
            <div className="space-y-6">
              {paymentSplits.map((split) => (
                <div key={split.id} className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-40">
                      <Select
                        value={String(split.accountId)}
                        onValueChange={(val) =>
                          handleAccountChange(split.id, val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {getAccountNameById(split.accountId)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {financialAccounts.map((acc) => (
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
                        onChange={(e) =>
                          handleAmountChange(split.id, e.target.value)
                        }
                        className="pl-16"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        {t("EGP")}
                      </span>
                    </div>
                    {getDescriptionStatus(split.accountId) && (
                      <Input
                        type="text"
                        placeholder="Last 4 digits"
                        value={split.checkout}
                        onChange={(e) =>
                          handleDescriptionChange(split.id, e.target.value)
                        }
                        maxLength={4}
                        className="w-32"
                      />
                    )}
                    {paymentSplits.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSplit(split.id)}
                      >
                        {t("Remove")}
                      </Button>
                    )}
                  </div>

                  {/* حقل رقم العملية لو الحساب Visa */}
                  {isVisaAccount(split.accountId) && (
                    <div className="ml-44 flex items-center gap-2">
                      <label className="text-sm text-gray-600 whitespace-nowrap">
                        {t("TransactionID")}:
                      </label>
                      <Input
                        type="text"
                        placeholder={t("EnterTransactionID")}
                        value={split.transition_id || ""}
                        onChange={(e) =>
                          handleTransitionIdChange(split.id, e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                </div>
              ))}
              {remainingAmount > 0 && (
                <Button
                  variant="link"
                  onClick={handleAddSplit}
                  className="text-sm text-blue-600"
                >
                  {t("AddAccountSplit")}
                </Button>
              )}
            </div>

            {/* Amount Paid */}
            <div className="mt-6">
              <label className="block text-sm mb-1">
                {t("AmountPaidByCustomer")}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  placeholder={t("EnterAmountPaid")}
                  value={customerPaid}
                  onChange={(e) => setCustomerPaid(e.target.value)}
                  className="pl-16"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  {t("EGP")}
                </span>
              </div>
              {parseFloat(customerPaid) > requiredTotal && (
                <p className="mt-2 text-green-600 text-sm font-semibold">
                  {t("ChangeDue", { value: calculatedChange.toFixed(2) })}
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
              <label
                htmlFor="isDueOrder"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                {t("MarkAsDueOrder")}
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
                  ? t("Processing")
                  : isDueOrder
                  ? selectedCustomer
                    ? t("DueOrderReady")
                    : t("SelectCustomer")
                  : t("ConfirmAndPay")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckOut;