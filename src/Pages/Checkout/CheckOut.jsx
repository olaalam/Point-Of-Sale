import React, { useState, useEffect, useMemo, useRef } from "react";
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
  calculateTotalItemDiscounts,
} from "./processProductItem";
import {
  prepareReceiptData,
  printReceiptSilently,
} from "../utils/printReceipt";
import { useTranslation } from "react-i18next";
// import { useIsDueModuleAllowed } from "../utils/dueModuleUtils";
import FreeDiscountPasswordModal from "./FreeDiscountPasswordModal";
import { ChevronDown } from "lucide-react"; // أيقونة السهم
import { cn } from "@/lib/utils";
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
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const isSubmitting = useRef(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const lastSelectedGroup = sessionStorage.getItem("last_selected_group");
  const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);
  const [isCheckoutExpanded, setIsCheckoutExpanded] = useState(false);
  // const [dueModuleAmount, setDueModuleAmount] = useState(0);
  const { data: groupData } = useGet("cashier/group_product"); // الـ API اللي جبته
  const groupProducts = groupData?.group_product || [];
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingFreeDiscountPassword, setPendingFreeDiscountPassword] =
    useState("");
  // في CheckOut.jsx نضيف:
  const [activeDiscountTab, setActiveDiscountTab] = useState(null); // 'select' | 'free' | 'company'
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'cash' | 'visa' | ...
  const [selectedPaymentType, setSelectedPaymentType] = useState(null); // 'full' | 'split' | 'due'
  const isDueModuleAllowed = (() => {
    if (!orderType || !groupProducts || groupProducts.length === 0)
      return false;

    const lastSelectedGroupId = sessionStorage.getItem("last_selected_group");
    if (!lastSelectedGroupId || lastSelectedGroupId === "all") return false;

    const groupId = parseInt(lastSelectedGroupId);
    if (isNaN(groupId)) return false;

    const selectedGroup = groupProducts.find((g) => g.id === groupId);
    return selectedGroup?.due === 1;
  })();
  const { data: discountListData, loading: discountsLoading } = useGet(
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
  const { postData } = usePost();
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
  // 🟢 حساب خصم المنتجات الفردية (item-level discounts)
  const itemDiscountsAmount = useMemo(
    () => calculateTotalItemDiscounts(orderItems),
    [orderItems]
  );
  const { selectedDiscountAmount, finalSelectedDiscountId } = useMemo(() => {
    const discountList = discountListData?.discount_list || [];
    const selectedDiscount = discountList.find(
      (d) => d.id === selectedDiscountId
    );

    if (!selectedDiscount) {
      return { selectedDiscountAmount: 0, finalSelectedDiscountId: null };
    }

    let discountValue = 0;
    if (selectedDiscount.type === "precentage") {
      discountValue = amountToPay * (selectedDiscount.amount / 100);
    } else if (selectedDiscount.type === "value") {
      discountValue = selectedDiscount.amount;
    }

    return {
      selectedDiscountAmount: discountValue,
      finalSelectedDiscountId: selectedDiscount.id,
    };
  }, [discountListData, selectedDiscountId, amountToPay]);
  // 🟢 حساب قيمة الخصم الـ percentage/value (كوبون أو قائمة أو module) - بدون الـ free
  const percentageDiscountAmount = useMemo(() => {
    let val = 0;

    if (appliedDiscount > 0) {
      val = amountToPay * (appliedDiscount / 100);
    } else if (discountData.module.includes(orderType)) {
      val = amountToPay * (discountData.discount / 100);
    } else if (selectedDiscountAmount > 0) {
      val = selectedDiscountAmount;
    }

    return val;
  }, [amountToPay, appliedDiscount, discountData, orderType, selectedDiscountAmount, selectedDiscountAmount]);

  // 🟢 الـ total_discount النهائي اللي هنبعته للباك (item discounts + percentage discounts + أي totalDiscount سابق)
  const finalTotalDiscount = useMemo(() => {
    const previous = parseFloat(totalDiscount || 0);
    return (itemDiscountsAmount + percentageDiscountAmount + previous).toFixed(2);
  }, [itemDiscountsAmount, percentageDiscountAmount, totalDiscount]);
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

  const totalAppliedDiscount = useMemo(() => {
    const additionalDiscount = amountToPay - discountedAmount;
    const previousDiscount = totalDiscount || 0;
    return parseFloat(additionalDiscount + previousDiscount).toFixed(2);
  }, [amountToPay, discountedAmount, totalDiscount]);
  const [deliveryModelOpen, setDeliveryModelOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [isDueOrder, setIsDueOrder] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState(null);
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);

  // CheckOut.jsx (الكود بعد التعديل)
  const requiredTotal = useMemo(() => {
    return discountedAmount;
  }, [discountedAmount]);

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
  // Initialize default payment split - Default to Cash if available
  useEffect(() => {
    if (
      financialAccounts?.length > 0 &&
      paymentSplits.length === 0 &&
      requiredTotal > 0
    ) {
      // 🟢 Updated logic to look for "cash" instead of "visa"
      const cashAccount = financialAccounts.find((acc) =>
        acc.name?.toLowerCase().includes("cash") ||
        acc.name?.includes("كاش") // Added Arabic support just in case
      );

      const defaultAccountId = cashAccount
        ? cashAccount.id
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


  const resetCheckoutState = () => {
    setAppliedDiscount(0);
    setSelectedDiscountId(null);
    setFreeDiscount("");
    setOrderNotes("");
    setCustomerPaid("");
    setSelectedCustomer(null);
    setIsDueOrder(false);
    setPaymentSplits([]);
    setActiveDiscountTab(null);
    setOrderId(null);
    // إذا كان هناك مبالغ أخرى تأتي من Props مثل amountToPay 
    // فيجب تصفيرها من المكون الأب (Parent) عبر دالة onClearCart
  };

  const proceedWithOrderSubmission = async (
    due = 0,
    customer_id = undefined,
    dueModuleValue = 0,
    forcedPassword = null
  ) => {
    // 🟢 1. تفعيل القفل والـ Loading فوراً
    isSubmitting.current = true;
    setLoading(true);

    const handleNavigation = (response) => {
      // 1. فك قفل الزر فوراً
      isSubmitting.current = false;
      setLoading(false);

      // 2. تصفير القيم المطلوبة (Amount / Discount)
      setAppliedDiscount(0);
      setSelectedDiscountId(null);
      setFreeDiscount("");
      setCustomerPaid("");
      setPaymentSplits([]); // لتصفير المبالغ المدفوعة في الـ Split

      if (orderType === "delivery") {
        sessionStorage.removeItem("selected_user_id");
        sessionStorage.removeItem("selected_user_data");
        sessionStorage.removeItem("selected_address_id");
        sessionStorage.removeItem("selected_address_data");
        setDeliveryModelOpen(false);
      }

      // 3. مسح السلة في المكون الأب
      if (orderType === "dine_in" && selectedPaymentItemIds.length > 0) {
        if (typeof clearPaidItemsOnly === 'function') clearPaidItemsOnly();
      } else {
        if (typeof onClearCart === 'function') onClearCart();
      }

      sessionStorage.setItem("last_order_type", orderType);

      if (orderType === "delivery" && response?.success?.id) {
        setOrderId(response.success.id);
        setDeliveryModelOpen(true);
      }
    };

    const freeDiscountValue = parseFloat(freeDiscount) || 0;
    if (freeDiscountValue > 0 && !forcedPassword && !pendingFreeDiscountPassword) {
      setPasswordModalOpen(true);
      isSubmitting.current = false;
      setLoading(false);
      return;
    }

    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const itemsForPayload = safeOrderItems.map((item) => ({
      ...item,
      count: (item.weight_status === 1 || item.weight_status === "1")
        ? (item.quantity || item.count)
        : item.count,
    }));

    const hasDealItems = safeOrderItems.some((item) => item.is_deal);
    const endpoint = getOrderEndpoint(orderType, safeOrderItems, totalDineInItems, hasDealItems);
    const financialsPayload = buildFinancialsPayload(paymentSplits, financialAccounts);
    const moduleId = sessionStorage.getItem("module_id");

    let payload;
    if (hasDealItems) {
      payload = buildDealPayload(safeOrderItems, financialsPayload);
    } else {
      const finalDiscountIdToSend = selectedDiscountAmount > 0 ? finalSelectedDiscountId : selectedDiscountId;
      payload = buildOrderPayload({
        orderType,
        orderItems: itemsForPayload,
        amountToPay: discountedAmount.toFixed(2),
        totalTax,
        totalDiscount: finalTotalDiscount,
        notes: orderNotes.trim() || "No special instructions",
        source,
        financialsPayload,
        cashierId,
        tableId,
        customerPaid: customerPaid || undefined,
        discountCode: appliedDiscount > 0 ? discountCode : undefined,
        due: due,
        user_id: customer_id,
        discount_id: finalDiscountIdToSend,
        module_id: moduleId,
        free_discount: freeDiscountValue > 0 ? freeDiscountValue : undefined,
        due_module: dueModuleValue > 0 ? dueModuleValue.toFixed(2) : undefined,
        service_fees,
        password: forcedPassword || pendingFreeDiscountPassword || undefined,
      });
    }

    try {
      const response = await postData(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response?.success) {
        toast.success(due === 1 ? t("DueOrderCreated") : t("OrderPlaced"));
        setPendingFreeDiscountPassword("");

        if (due === 0) {
          const receiptData = prepareReceiptData(
            itemsForPayload,
            discountedAmount,
            totalTax,
            finalTotalDiscount,
            appliedDiscount,
            discountData,
            orderType,
            requiredTotal,
            response.success,
            response
          );
          printReceiptSilently(receiptData, response, () => {
            handleNavigation(response);
          });
        } else {
          handleNavigation(response);
        }
      } else {
        toast.error(response?.errors || t("FailedToProcessOrder"));
        isSubmitting.current = false;
        setLoading(false);
      }
    } catch (e) {
      console.error("Submit error:", e);
      toast.error(e.response?.data?.errors || e.message || t("SubmissionFailed"));
      isSubmitting.current = false;
      setLoading(false);
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
    // 🟢 أول سطر: لو القفل مقفول اخرج فوراً
    if (isSubmitting.current) return;

    if (!isTotalMet || totalScheduled === 0) {
      return toast.error(t("TotalMustEqual", { amount: requiredTotal.toFixed(2) }));
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
      // إذا كان due order ومختار عميل، كمل العملية
      await proceedWithOrderSubmission(1, selectedCustomer.id);
      return;
    }

    // 🟢 قبل ما تبدأ العملية، اقفل القفل
    isSubmitting.current = true;
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
      resetCheckoutState(); // أضف التصفير هنا

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
    resetCheckoutState(); // أضف التصفير هنا

  };

  return (
    <div className="w-full bg-white mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* 1. Modals - (كاملة كما هي بكل اللوجيك) */}
      <CustomerSelectionModal
        isOpen={customerSelectionOpen}
        onClose={() => {
          setCustomerSelectionOpen(false);
          if (!selectedCustomer) setIsDueOrder(false);
        }}
        onSelectCustomer={(customer) => {
          handleSelectCustomer(customer);
          setCustomerSelectionOpen(false);
        }}
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
      {/* سيكشن الـ Due Module - المنصة تدفع الباقي */}
      {isDueModuleAllowed && remainingAmount > 0.01 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <div className="text-center mb-4">
            <p className="text-lg font-bold text-red-600">
              {t("PlatformWillPayRemaining")} (Due Module):{" "}
              <strong>
                {remainingAmount.toFixed(2)} {t("EGP")}
              </strong>
            </p>
          </div>

          <Button
            className="w-full text-white text-lg font-bold py-6 bg-red-600 hover:bg-red-700"
            disabled={loading}
            onClick={() =>
              proceedWithOrderSubmission(0, undefined, remainingAmount)
            }
          >
            تأكيد الطلب مع Due Module ({remainingAmount.toFixed(2)} {t("EGP")})
          </Button>
        </div>
      )}
      {!deliveryModelOpen && (
        <div className="w-full space-y-4">

          {/* 2. الديزاين المطلوب (Grid) */}
          {/* 2. الديزاين المطور (Accordion Style) */}
          <div className="grid grid-cols-2 border border-gray-300 rounded-lg overflow-hidden transition-all">

            {/* العمود الأيسر: Discount */}
            <div className="border-r border-gray-300 flex flex-col">
              {/* Header قابل للضغط */}
              <div
                onClick={() => setIsDiscountExpanded(!isDiscountExpanded)}
                className="bg-gray-100 p-2 flex items-center justify-center gap-2 cursor-pointer font-bold text-xs border-b border-gray-300 uppercase tracking-wider hover:bg-gray-200 transition-colors"
              >
                {t("Discount")}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", !isDiscountExpanded && "-rotate-90")} />
              </div>

              {/* المحتوى يظهر فقط إذا كان expanded */}
              <div className={cn(
                "flex flex-col flex-grow transition-all duration-300 overflow-hidden",
                isDiscountExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <button
                  onClick={() => setActiveDiscountTab(activeDiscountTab === 'select' ? null : 'select')}
                  className={`flex-1 p-4 border-b border-gray-200 text-sm font-semibold transition-colors ${activeDiscountTab === 'select' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {t("Select")}
                </button>
                <button
                  onClick={() => setActiveDiscountTab(activeDiscountTab === 'free' ? null : 'free')}
                  className={`flex-1 p-4 border-b border-gray-200 text-sm font-semibold transition-colors ${activeDiscountTab === 'free' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {t("Free")}
                </button>
                <button
                  onClick={() => setActiveDiscountTab(activeDiscountTab === 'company' ? null : 'company')}
                  className={`flex-1 p-4 text-sm font-semibold transition-colors ${activeDiscountTab === 'company' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {t("By Company")}
                </button>
              </div>
            </div>

            {/* العمود الأيمن: Checkout */}
            <div className="flex flex-col">
              {/* Header قابل للضغط */}
              <div
                onClick={() => setIsCheckoutExpanded(!isCheckoutExpanded)}
                className="bg-gray-100 p-2 flex items-center justify-center gap-2 cursor-pointer font-bold text-xs border-b border-gray-300 uppercase tracking-wider hover:bg-gray-200 transition-colors"
              >
                {t("Checkout")}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", !isCheckoutExpanded && "-rotate-90")} />
              </div>

              {/* المحتوى يظهر فقط إذا كان expanded */}
              <div className={cn(
                "grid grid-cols-2 flex-grow transition-all duration-300 overflow-hidden",
                isCheckoutExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}>
                {financialAccounts.map((acc, index) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      handleAccountChange(paymentSplits[0]?.id, String(acc.id));
                      setIsDueOrder(false);
                      setSelectedCustomer(null);
                    }}
                    className={`p-4 text-[10px] font-bold transition-all border-gray-200 
          ${index % 2 === 0 ? 'border-r' : ''} 
          ${index < financialAccounts.length - 1 ? 'border-b' : ''}
          ${paymentSplits.length === 1 && paymentSplits[0]?.accountId === String(acc.id) && !isDueOrder ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {acc.name}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setIsDueOrder(true);
                    setCustomerSelectionOpen(true);
                  }}
                  className={`p-4 border-t border-gray-200 text-xs font-black transition-all ${isDueOrder ? 'bg-orange-500 text-white' : 'bg-white text-orange-600 hover:bg-orange-50'}`}
                >
                  {t("Due")}
                </button>

                <button
                  onClick={handleAddSplit}
                  className="p-4 border-t border-l border-gray-200 bg-white text-xs font-black text-blue-600 hover:bg-blue-50"
                >
                  {t("Split")}
                </button>
              </div>
            </div>
          </div>
          {/* Breakdown Section */}
          <div className="space-y-1 border-b pb-3 mb-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>{t("Original Amount")}</span>
              <span>{amountToPay.toFixed(2)} EGP</span>
            </div>

            {/* خصم كود الشركة */}
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t("Company Discount")} ({appliedDiscount}%)</span>
                <span>-{(amountToPay * (appliedDiscount / 100)).toFixed(2)} EGP</span>
              </div>
            )}

            {/* خصم القائمة */}
            {selectedDiscountAmount > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>{t("List Discount")}</span>
                <span>-{selectedDiscountAmount.toFixed(2)} EGP</span>
              </div>
            )}

            {/* الخصم المجاني */}
            {freeDiscount > 0 && (
              <div className="flex justify-between text-purple-600">
                <span>{t("Free Discount")}</span>
                <span>-{parseFloat(freeDiscount).toFixed(2)} EGP</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-orange-600 pt-1 border-t border-dashed mt-1">
              <span>{t("Remaining to Pay")}</span>
              <span>{remainingAmount.toFixed(2)} EGP</span>
            </div>
          </div>
          {/* 3. منطق عرض الـ Splits (المهم جداً لتوزيع المبالغ) */}
          <div className="space-y-3">
            {paymentSplits.map((split, index) => (
              <div key={split.id} className="p-3 bg-gray-50 border rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                  <div className="flex-1">
                    <Select
                      value={String(split.accountId)}
                      onValueChange={(val) => handleAccountChange(split.id, val)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={t("Select Account")} />
                      </SelectTrigger>
                      <SelectContent>
                        {financialAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/3 relative">
                    <Input
                      type="number"
                      value={split.amount === 0 ? "" : split.amount}
                      onChange={(e) => handleAmountChange(split.id, e.target.value)}
                      className="bg-white pl-8"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">EGP</span>
                  </div>
                  {paymentSplits.length > 1 && (
                    <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleRemoveSplit(split.id)}>
                      ×
                    </Button>
                  )}
                </div>

                {/* تفاصيل الفيزا لكل Split */}
                {getDescriptionStatus(split.accountId) && (
                  <div className="flex gap-2 pl-6">
                    <Input
                      placeholder="Last 4 digits"
                      value={split.checkout}
                      onChange={(e) => handleDescriptionChange(split.id, e.target.value)}
                      maxLength={4}
                      className="w-1/4 bg-white"
                    />
                    <Input
                      placeholder={t("TransactionID")}
                      value={split.transition_id}
                      onChange={(e) => handleTransitionIdChange(split.id, e.target.value)}
                      className="flex-1 bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 4. Discount Area Content */}
          {activeDiscountTab && (
            <div className="p-3 border rounded-lg bg-gray-50">
              {activeDiscountTab === 'select' && (
                <Select value={String(selectedDiscountId || "0")} onValueChange={(val) => setSelectedDiscountId(val === "0" ? null : parseInt(val))}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder={t("ChooseDiscount")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("NoDiscount")}</SelectItem>
                    {discountListData?.discount_list?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.amount}{d.type === "precentage" ? "%" : t("EGP")})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {activeDiscountTab === 'free' && (
                <Input type="number" placeholder={t("EnterFreeDiscount")} value={freeDiscount} onChange={(e) => setFreeDiscount(e.target.value)} className="bg-white" />
              )}
              {activeDiscountTab === 'company' && (
                <div className="flex gap-2">
                  <Input placeholder={t("EnterDiscountCode")} value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} className="bg-white" />
                  <Button onClick={handleApplyDiscount} disabled={isCheckingDiscount}>{t("Apply")}</Button>
                </div>
              )}
            </div>
          )}

          {/* 5. Order Notes */}
          <Textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="w-full min-h-[60px] text-sm"
            placeholder={t("Order Notes...")}
          />

          {/* 6. Amount Paid by Customer */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t("Amount Paid by Customer")}</label>
            <div className="relative">
              <Input
                type="number"
                value={customerPaid}
                onChange={(e) => setCustomerPaid(e.target.value)}
                className="pl-12 py-6 text-xl font-bold border-gray-300"
                placeholder="0.00"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">EGP</span>
            </div>
          </div>

          {/* 7. Summary */}
          <div className="bg-gray-100 p-4 rounded-xl">


            <p className="text-4xl text-center m-auto font-black text-red-700">{requiredTotal.toFixed(2)} EGP</p>

            {parseFloat(customerPaid) > requiredTotal && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 text-green-600 font-bold">
                <span>{t("Change")}</span>
                <span>{(parseFloat(customerPaid) - requiredTotal).toFixed(2)} EGP</span>
              </div>
            )}
          </div>

          {/* 8. Final Button (كامل الشروط) */}
          <Button
            className={`w-full py-8 rounded-xl text-xl font-black uppercase tracking-widest
            ${loading || (!isTotalMet && !isDueOrder) || (isDueOrder && !selectedCustomer)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#800000] hover:bg-[#a00000] text-white'}`}
            disabled={loading || (!isTotalMet && !isDueOrder) || (isDueOrder && !selectedCustomer)}
            onClick={handleSubmitOrder}
          >
            {loading ? <Loading /> :
              isDueOrder ? (selectedCustomer ? t("Confirm Due Order") : t("Select Customer")) :
                t("Pay Now")}
          </Button>
        </div>
      )}

      {/* Password Modal */}
      <FreeDiscountPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => { setPasswordModalOpen(false); setFreeDiscount(""); }}
        onConfirm={(password) => {
          setPendingFreeDiscountPassword(password);
          setPasswordModalOpen(false);
          toast.success(t("Password Accepted"));
          proceedWithOrderSubmission(isDueOrder ? 1 : 0, selectedCustomer?.id, remainingAmount > 0.01 && isDueModuleAllowed ? remainingAmount : 0, password);
        }}
      />
    </div>
  );
};

export default CheckOut;
