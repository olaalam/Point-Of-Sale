{/* Card.jsx */}
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import CheckOut from "../Checkout/CheckOut";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import SummaryRow from "./SummaryRow";
import ItemRow from "./ItemRow";
import VoidItemModal from "./VoidItemModal";
import DoneItemsSection from "./DoneItemsSection";
import {
  TAX_RATE,
  OTHER_CHARGE,
  PREPARATION_STATUSES,
  statusOrder,
} from "./constants";
import { renderItemVariations } from "@/lib/utils";
import { useTranslation } from "react-i18next";
/**
 * @typedef {object} OrderItem
 * @property {string} temp_id - Temporary unique ID for the item.
 * @property {string | number} id - Product ID.
 * @property {string} name - Product name.
 * @property {number} price - Price of a single item.
 * @property {number} count - Quantity of the item.
 * @property {string} [preparation_status] - Current preparation status.
 * @property {string | number | string[]} [cart_id] - Cart ID(s) from the backend.
 * @property {object[]} [addons] - Array of addon objects.
 * @property {string} [selectedVariation] - Selected variation name.
 * @property {boolean} [is_reward=false] - Indicates if the item was obtained via a reward/points system.
 * @property {boolean} [is_deal=false] - Indicates if the item was obtained via a deal.
 * @property {number} [applied_discount=0] - The discount applied to this specific item.
 * @property {string} [notes] - Special instructions for the item.
 */

/**
 * Card component to display and manage a customer's order.
 * @param {object} props
 * @param {OrderItem[]} props.orderItems - Array of order items to display.
 * @param {function(OrderItem[]): void} props.updateOrderItems - Function to update the parent component's order state.
 * @param {boolean} [props.allowQuantityEdit=true] - Whether to allow editing item quantities.
 * @param {string} props.orderType - The type of order (e.g., "dine_in", "take_away").
 * @param {string} [props.tableId] - The ID of the table for dine-in orders.
 */
export default function Card({
  orderItems,
  updateOrderItems,
  allowQuantityEdit = true,
  orderType,
  tableId,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedPaymentItems, setSelectedPaymentItems] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [itemLoadingStates, setItemLoadingStates] = useState({});
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidItemId, setVoidItemId] = useState(null);
  const [managerId, setManagerId] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === "ar";

  // Offers States
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerCode, setOfferCode] = useState("");
  const [pendingOfferApproval, setPendingOfferApproval] = useState(null);

  // Deals States
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealCode, setDealCode] = useState("");
  const [pendingDealApproval, setPendingDealApproval] = useState(null);

  const { loading: apiLoading, postData } = usePost();
  const navigate = useNavigate();

  const isLoading = apiLoading;

  // Memoize all cart IDs for transfer functionality
  const allCartIds = useMemo(() => {
    return orderItems.map((item) => item.cart_id).filter(Boolean);
  }, [orderItems]);

  // Memoize subtotal, tax, and total for performance
  const { subTotal, totalTax, totalOtherCharge, totalAmountDisplay } =
    useMemo(() => {
      const calculatedSubTotal = Array.isArray(orderItems)
        ? orderItems.reduce((acc, item) => {
            const itemPrice = item.price || 0;
            const itemCount = item.count || 1;
            return acc + itemPrice * itemCount;
          }, 0)
        : 0;
      const calculatedTax = calculatedSubTotal * TAX_RATE;
      const calculatedTotal = calculatedSubTotal + calculatedTax + OTHER_CHARGE;
      return {
        subTotal: calculatedSubTotal,
        totalTax: calculatedTax,
        totalOtherCharge: OTHER_CHARGE,
        totalAmountDisplay: calculatedTotal,
      };
    }, [orderItems]);

  // Memoize items with "done" status
  const doneItems = useMemo(() => {
    return Array.isArray(orderItems)
      ? orderItems.filter((item) => item.preparation_status === "done")
      : [];
  }, [orderItems]);

  // Memoize items and total amount for checkout
  const { checkoutItems, amountToPay } = useMemo(() => {
    if (orderType === "dine_in") {
      const itemsToPayFor = doneItems.filter((item) =>
        selectedPaymentItems.includes(item.temp_id)
      );
      const selectedSubTotal = itemsToPayFor.reduce(
        (acc, item) => acc + (item.price || 0) * (item.count || 1),
        0
      );
      const selectedTax = selectedSubTotal * TAX_RATE;
      const selectedTotal = selectedSubTotal + selectedTax + OTHER_CHARGE;
      return {
        checkoutItems: itemsToPayFor,
        amountToPay: selectedTotal,
      };
    }
    return {
      checkoutItems: Array.isArray(orderItems) ? orderItems : [],
      amountToPay: totalAmountDisplay,
    };
  }, [
    orderItems,
    orderType,
    totalAmountDisplay,
    selectedPaymentItems,
    doneItems,
  ]);

  // Memoize the lowest preparation status among selected items
  const currentLowestSelectedStatus = useMemo(() => {
    if (selectedItems.length === 0) return statusOrder[0];
    const selectedItemStatuses = orderItems
      .filter((item) => selectedItems.includes(item.temp_id))
      .map((item) => item.preparation_status || "pending");
    const lowestStatusIndex = Math.min(
      ...selectedItemStatuses.map((status) => statusOrder.indexOf(status))
    );
    return statusOrder[lowestStatusIndex];
  }, [selectedItems, orderItems]);

  // Add temp_id to items if missing
  useEffect(() => {
    const updatedItemsWithTempId = orderItems.map((item) => ({
      ...item,
      temp_id:
        item.temp_id ||
        `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    if (JSON.stringify(updatedItemsWithTempId) !== JSON.stringify(orderItems)) {
      updateOrderItems(updatedItemsWithTempId);
    }
  }, [orderItems, updateOrderItems]);

  // Clear cart function
  const clearCart = () => {
    updateOrderItems([]);
    sessionStorage.removeItem("cart");
    setSelectedItems([]);
    setSelectedPaymentItems([]);
    toast.success(t("Allitemsclearedfromtheorder"));
  };

  // Handle save as pending order
  const handleSaveAsPending = async () => {
    if (orderItems.length === 0) {
      toast.warning(t("Noitemstosaveaspending"));
      return;
    }

    const cashierId = sessionStorage.getItem("cashier_id");
    const token = sessionStorage.getItem("access_token");

    const processProductItem = (item) => {
      const groupedVariations =
        item.allSelectedVariations?.reduce((acc, variation) => {
          const existing = acc.find(
            (v) => v.variation_id === variation.variation_id
          );
          if (existing) {
            existing.option_id = Array.isArray(existing.option_id)
              ? [...existing.option_id, variation.option_id.toString()]
              : [existing.option_id.toString(), variation.option_id.toString()];
          } else {
            acc.push({
              variation_id: variation.variation_id.toString(),
              option_id: [variation.option_id.toString()],
            });
          }
          return acc;
        }, []) || [];

      const realExtrasIds = [];
      const addonItems = [];

      if (item.selectedExtras && item.selectedExtras.length > 0) {
        item.selectedExtras.forEach((extraId) => {
          const isRealExtra = item.allExtras?.some(
            (extra) => extra.id === extraId
          );
          if (isRealExtra) {
            realExtrasIds.push(extraId.toString());
          } else {
            const addon = item.addons?.find((addon) => addon.id === extraId);
            if (addon) {
              addonItems.push({
                addon_id: extraId.toString(),
                count: "1",
              });
            }
          }
        });
      }

      if (item.selectedAddons && item.selectedAddons.length > 0) {
        item.selectedAddons.forEach((addonData) => {
          const alreadyExists = addonItems.some(
            (existing) => existing.addon_id === addonData.addon_id.toString()
          );
          if (!alreadyExists) {
            addonItems.push({
              addon_id: addonData.addon_id.toString(),
              count: (addonData.count || 1).toString(),
            });
          }
        });
      }

      return {
        product_id: item.id.toString(),
        count: item.count.toString(),
        note: (item.notes || "").trim() || t("Nospecialinstructions"), // ✅ تم التصحيح هنا
        addons: addonItems,
        variation: groupedVariations,
        exclude_id: (item.selectedExcludes || []).map((id) => id.toString()),
        extra_id: realExtrasIds,
      };
    };

    const productsToSend = orderItems.map(processProductItem);

    const payload = {
      amount: amountToPay.toString(),
      total_tax: totalTax.toString(),
      total_discount: totalOtherCharge.toString(),
      notes: "Customer requested no plastic bag.",
      source: "web",
      financials: [],
      order_pending: 1,
      cashier_id: cashierId.toString(),
      products: productsToSend,
    };

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await postData("cashier/take_away_order", payload, {
        headers,
      });

      toast.success(t("Ordersavedaspending"));
      clearCart();
    } catch (e) {
      console.error("Pending order error:", e);
      toast.error(e.response?.data?.message || t("Failedtosaveaspending"));
    }
  };

  // Offers Functions
  const handleApplyOffer = async () => {
    if (!offerCode.trim()) {
      toast.warning(t("Pleaseenteranoffercode"));
      return;
    }

    const formData = new FormData();
    formData.append("code", offerCode.trim());

    try {
      const response = await postData("cashier/offer/check_order", formData);
      let offerData = response?.offer || response?.data?.offer;
      if (offerData && !Array.isArray(offerData)) {
        offerData = [offerData];
      }

      const appliedOfferDetails =
        Array.isArray(offerData) && offerData.length > 0 ? offerData[0] : null;

      if (appliedOfferDetails) {
        const offerInfo = appliedOfferDetails.offer;
        const productName = offerInfo?.product || appliedOfferDetails.product;
        const pointsRequired =
          offerInfo?.points || appliedOfferDetails.points || 0;

        if (productName) {
          toast.success(t("OffervalidatedsuccessfullyPleaseconfirm"));
          setPendingOfferApproval({
            offer_order_id: appliedOfferDetails.id,
            user_id: appliedOfferDetails.user_id,
            product: productName,
            points: pointsRequired,
          });
          setShowOfferModal(false);
        } else {
          toast.error(t("Offerdetailsareincompleteintheresponse"));
        }
      } else {
        console.error(
          "❌ Failed check - appliedOfferDetails:",
          appliedOfferDetails
        );
        toast.error(t("Offerdetailsareincompleteintheresponse"));
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        toast.error(
          err.response?.data?.message || t("Failedtofetchdiscountdata")
        );
      } else {
        toast.error(t("FailedtovalidateofferPleasetryagain"));
      }
    }
  };

  const handleApproveOffer = async () => {
    if (!pendingOfferApproval) return;

    const { offer_order_id, user_id, product } = pendingOfferApproval;

    const formData = new FormData();
    formData.append("offer_order_id", offer_order_id.toString());
    formData.append("user_id", user_id.toString());

    try {
      const response = await postData("cashier/offer/approve_offer", formData);
      if (response?.success) {
        toast.success(
  t("RewardAdded", { product })
        );
        const freeItem = {
          temp_id: `reward-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          id: offer_order_id,
          name: product + " (Reward Item)",
          price: 0.0,
          count: 1,
          is_reward: true,
          applied_discount: 0,
        };
        updateOrderItems([...orderItems, freeItem]);
        setPendingOfferApproval(null);
        setOfferCode("");
      } else {
        toast.error(response.message || t("Failedtoapproveoffer"));
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.exception ||
        t("Failedtoapproveoffer");
      toast.error(errorMessage);
    }
  };

  // Deals Functions
  const handleApplyDeal = async () => {
    if (!dealCode.trim()) {
      toast.warning(t("Pleaseenteradealcode"));
      return;
    }

    const formData = new FormData();
    formData.append("code", dealCode.trim());

    try {
      const response = await postData("cashier/deal/deal_order", formData);
      const dealDetails = response?.deal || response?.data?.deal;
      const userDetails = response?.user || response?.data?.user;

      if (dealDetails && userDetails) {
        toast.success(t("DealvalidatedsuccessfullyPleaseconfirm"));
        setPendingDealApproval({
          deal_id: dealDetails.id,
          user_id: userDetails.id,
          deal_title: dealDetails.title,
          deal_price: dealDetails.price,
          description: response?.deal.description,
        });
        setShowDealModal(false);
      } else {
        toast.error(t("Unexpectedresponsefromserverorinvaliddeal"));
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.exception ||
        t("FailedtoapplydealPleasetryagain");
      toast.error(errorMessage);
    }
  };

  const handleApproveDeal = () => {
    if (!pendingDealApproval) return;

    const { deal_id, user_id, deal_title, deal_price } = pendingDealApproval;

  t("DealAdded", { deal_title })
    const dealItem = {
      temp_id: `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      id: deal_id,
      name: deal_title + " (Deal Item)",
      price: deal_price || 0.0,
      count: 1,
      is_deal: true,
      deal_id: deal_id,
      deal_user_id: user_id,
      applied_discount: 0,
    };
    updateOrderItems([...orderItems, dealItem]);
    setPendingDealApproval(null);
    setDealCode("");
  };

  const handleTransferOrder = () => {
    if (!tableId || allCartIds.length === 0) {
      toast.error(t("CannottransferorderTableIDorCartIDsaremissing"));
      return;
    }

    // حفظ البيانات في sessionStorage
    sessionStorage.setItem("transfer_cart_ids", JSON.stringify(allCartIds));
    sessionStorage.setItem("transfer_source_table_id", tableId.toString());
    sessionStorage.setItem("transfer_pending", "true");

    toast.info(t("Pleaseselectanewtabletotransfertheorder"));

    // Navigate مع state واضح
    navigate("/", {
      state: {
        initiateTransfer: true,
        sourceTableId: tableId,
        cartIds: allCartIds,
        timestamp: Date.now(), // عشان نضمن إن الـ state يتغير
      },
      replace: false,
    });
  };

  const handleUpdatePreparationStatus = async (itemTempId) => {
    console.log(
      "Starting update for itemTempId:",
      itemTempId,
      "Current orderItems:",
      orderItems
    );
    if (!itemTempId) {
      console.error("itemTempId is undefined, cannot proceed with update.");
      toast.error(t("Failedtoidentifytheitemtoupdate"));
      return;
    }

    const itemToUpdate = orderItems.find((item) => item.temp_id === itemTempId);
    if (!itemToUpdate || !itemToUpdate.cart_id || !tableId) {
      console.error("Missing required data:", { itemToUpdate, tableId });
      toast.error(t("Missingrequireddatatoupdateitemstatus"));
      return;
    }

    const currentStatus = itemToUpdate.preparation_status || "pending";
    const nextStatus = PREPARATION_STATUSES[currentStatus]?.nextStatus;
    if (!nextStatus || !PREPARATION_STATUSES[nextStatus]?.canSendToAPI) {
      console.warn("Cannot update to next status:", nextStatus);
      toast.info(t("StatuscannotbeupdatedviaAPIatthistime"));
      return;
    }

    console.log(
      "Preparing API request for cart_id:",
      itemToUpdate.cart_id,
      "to status:",
      nextStatus,
      "table_id:",
      tableId
    );

    setItemLoadingStates((prev) => ({ ...prev, [itemTempId]: true }));

    const formData = new FormData();
    formData.append("table_id", tableId.toString());
    formData.append("preparing[0][cart_id]", itemToUpdate.cart_id.toString());
    formData.append(
      "preparing[0][status]",
      PREPARATION_STATUSES[nextStatus]?.apiValue || nextStatus
    );

    try {
      const response = await postData("cashier/preparing", formData);
      console.log("API response:", response);

      const updatedItems = orderItems.map((item) =>
        item.temp_id === itemTempId
          ? { ...item, preparation_status: nextStatus }
          : item
      );
      console.log("Updated orderItems before update:", updatedItems);
      if (
        updatedItems.some(
          (item) =>
            item.temp_id === itemTempId &&
            item.preparation_status === nextStatus
        )
      ) {
        updateOrderItems(updatedItems);
        toast.success(
          `Status updated to ${PREPARATION_STATUSES[nextStatus].label} for item ${itemToUpdate.name}`
        );
      } else {
        console.error("Update failed to apply to the target item.");
        toast.error(t("Failedtoapplythestatusupdatelocally"));
      }
    } catch (err) {
      console.error("Error updating status:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.exception ||
        t("Failedtoupdatestatus");
      toast.error(errorMessage);
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [itemTempId]: false }));
    }
  };

  const handleVoidItem = (itemTempId) => {
    setVoidItemId(itemTempId);
    setShowVoidModal(true);
  };

  const confirmVoidItem = async () => {
    // تحقق من البيانات الأساسية
    const itemToVoid = orderItems.find((item) => item.temp_id === voidItemId);
    if (!itemToVoid?.cart_id || !tableId || !managerId || !managerPassword) {
      setTimeout(() => {
        toast.error(
t("PleasefillinallrequiredfieldsManagerIDandPassword")        );
      }, 100);
      return;
    }

    // بدء الـ loading
    setItemLoadingStates((prev) => ({ ...prev, [voidItemId]: true }));

    const formData = new FormData();
    const cartIds = Array.isArray(itemToVoid.cart_id)
      ? itemToVoid.cart_id
      : typeof itemToVoid.cart_id === "string"
      ? itemToVoid.cart_id.split(",").map((id) => id.trim())
      : [itemToVoid.cart_id];

    cartIds.forEach((id) => formData.append("cart_ids[]", id.toString()));
    formData.append("manager_id", managerId);
    formData.append("manager_password", managerPassword);
    formData.append("table_id", tableId.toString());

    try {
      // نجاح الـ API
      const response = await postData("cashier/order_void", formData);

      const updatedItems = orderItems.filter(
        (item) => item.temp_id !== voidItemId
      );
      updateOrderItems(updatedItems);

      // إظهار toast نجاح
      setTimeout(() => {
        toast.success(t("Itemvoidedsuccessfully"));
      }, 100);

      // إغلاق المودال فقط عند النجاح
      setShowVoidModal(false);
      setManagerId("");
      setManagerPassword("");
      setVoidItemId(null);
    } catch (err) {
      // طباعة الخطأ للـ debug
      console.error("Void Item Error:", err);
      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Response data:", err.response.data);
      }

      // استخراج الرسالة
      let errorMessage = "Failed to void item.";

      if (err.response) {
        const { status, data } = err.response;

        // الأولوية: errors → message → error → حالة خاصة
        if (data?.errors) {
          errorMessage = data.errors; // مثل: "id or password is wrong"
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = data.error;
        } else if ([401, 403, 400].includes(status)) {
          errorMessage = t("InvalidManagerIDorPasswordAccessdenied");
        } else {
          errorMessage = `Server error (${status})`;
        }
      } else if (err.request) {
        errorMessage =
          t("NoresponsefromserverCheckyourinternetconnection");
      } else {
        errorMessage = err.message || t("Anunexpectederroroccurred");
      }

      // إظهار الـ toast مهما كان (حتى لو الـ container اتحمل متأخر)
      setTimeout(() => {
        toast.error(errorMessage);
      }, 100);

      // لا تحذف العنصر، لا تغلق المودال
    } finally {
      // إنهاء الـ loading
      setItemLoadingStates((prev) => ({ ...prev, [voidItemId]: false }));
    }
  };

  const handleIncrease = (itemTempId) => {
    const updatedItems = orderItems.map((item) =>
      item.temp_id === itemTempId
        ? { ...item, count: (item.count || 0) + 1 }
        : item
    );
    updateOrderItems(updatedItems);
  };

  const handleDecrease = (itemTempId) => {
    const updatedItems = orderItems
      .map((item) => {
        if (item.temp_id === itemTempId) {
          const newCount = (item.count || 0) - 1;
          return newCount > 0 || item.preparation_status === "done"
            ? { ...item, count: Math.max(newCount, 1) }
            : null;
        }
        return item;
      })
      .filter(Boolean);
    updateOrderItems(updatedItems);
  };

  const handleCheckOut = () => {
    if (orderType === "dine_in" && selectedPaymentItems.length === 0) {
      toast.warning(t("Pleaseselectitemstopayforfromthedoneitemslist"));
      return;
    }
    setShowModal(true);
  };

  const toggleSelectItem = (tempId) => {
    setSelectedItems((prev) =>
      prev.includes(tempId)
        ? prev.filter((id) => id !== tempId)
        : [...prev, tempId]
    );
  };

  const toggleSelectPaymentItem = (tempId) => {
    setSelectedPaymentItems((prev) =>
      prev.includes(tempId)
        ? prev.filter((id) => id !== tempId)
        : [...prev, tempId]
    );
  };

  const handleSelectAll = () => {
    const allTempIds = orderItems.map((item) => item.temp_id);
    setSelectedItems((prev) =>
      prev.length === allTempIds.length ? [] : allTempIds
    );
  };

  const handleSelectAllPaymentItems = () => {
    const allDoneTempIds = doneItems.map((item) => item.temp_id);
    setSelectedPaymentItems((prev) =>
      prev.length === allDoneTempIds.length ? [] : allDoneTempIds
    );
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedItems.length === 0 || !tableId) {
      toast.warning(
        t('PleaseselectitemschooseastatusandensureaTableIDisset')
      );
      return;
    }

    console.log(
      "Applying bulk status:",
      bulkStatus,
      "to items:",
      selectedItems
    );
    const itemsToUpdate = orderItems.filter((item) =>
      selectedItems.includes(item.temp_id)
    );

    if (itemsToUpdate.length === 0) {
      console.warn("No valid items to update");
      toast.warning(t("Novaliditemstoupdate"));
      return;
    }

    const itemsForApi = itemsToUpdate.filter(
      (item) => PREPARATION_STATUSES[bulkStatus]?.canSendToAPI && item.cart_id
    );

    if (itemsForApi.length > 0) {
      const formData = new FormData();
      formData.append("table_id", tableId.toString());
      itemsForApi.forEach((item, index) => {
        formData.append(
          `preparing[${index}][cart_id]`,
          item.cart_id.toString()
        );
        formData.append(
          `preparing[${index}][status]`,
          PREPARATION_STATUSES[bulkStatus].apiValue
        );
      });
      try {
        const response = await postData("cashier/preparing", formData);
        console.log("Bulk update API response:", response);
        toast.success(
          `Successfully updated ${itemsForApi.length} items to ${PREPARATION_STATUSES[bulkStatus].label}`
        );
      } catch (err) {
        console.error("Bulk update error:", err);
        toast.error(err.response?.data?.message || t("Failedtoupdatestatus"));
        return;
      }
    } else {
      console.warn("No items sent to API, updating locally");
      toast.info(
t("BulkUpdateSuccess", {
    count: itemsForApi.length,
    status: PREPARATION_STATUSES[bulkStatus].label
  })      );
    }

    const updatedItems = orderItems.map((item) =>
      selectedItems.includes(item.temp_id)
        ? { ...item, preparation_status: bulkStatus }
        : item
    );
    updateOrderItems(updatedItems);
    setSelectedItems([]);
    setBulkStatus("");
  };

  const handleRemoveFrontOnly = (temp_id) => {
    const updatedItems = orderItems.filter((item) => item.temp_id !== temp_id);
    updateOrderItems(updatedItems);
    toast.success(t("Itemremovedsuccessfully"));
  };

  const handleClearAllItems = () => {
    if (orderItems.length === 0) {
      toast.warning(t("Noitemstoclear"));
      return;
    }
    setShowClearAllConfirm(true);
  };

  const confirmClearAllItems = () => {
    clearCart();
    setShowClearAllConfirm(false);
  };

  const handleViewOrders = () => navigate("/orders");
  const handleViewPendingOrders = () => navigate("/pending-orders");

  return (
  <div
      className={`flex flex-col h-full ${
        isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >      <div className="flex-shrink-0">
        <h2 className="text-bg-primary text-3xl font-bold mb-6">
          {t("OrderDetails")}
        </h2>
        <div className="!p-4 flex md:flex-row flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
            <Button
              onClick={handleClearAllItems}
              className="bg-bg-primary text-white hover:bg-red-700 text-sm flex items-center justify-center gap-2 py-4"
              disabled={isLoading || orderItems.length === 0}
            >
              {t("ClearAllItems")} ({orderItems.length || 0})
            </Button>
            <Button
              onClick={handleViewOrders}
              className="bg-gray-500 text-white hover:bg-gray-600 text-sm py-4"
              disabled={isLoading}
            >
              {t("ViewOrders")}
            </Button>
            <Button
              onClick={() => setShowOfferModal(true)}
              className="bg-green-600 text-white hover:bg-green-700 text-sm py-4"
              disabled={isLoading}
            >
              {t("ApplyOffer")}
            </Button>
            <Button
              onClick={() => setShowDealModal(true)}
              className="bg-orange-600 text-white hover:bg-orange-700 text-sm py-4"
              disabled={isLoading}
            >
              {t("ApplyDeal")}
            </Button>
          </div>
          {orderType === "take_away" && (
            <div className="flex md:flex-col flex-row items-stretch justify-center">
              <Button
                onClick={handleViewPendingOrders}
                className="bg-yellow-600 text-white hover:bg-yellow-500 text-sm px-6 py-4 md:h-full w-full md:w-36"
              >
                {t("PendingOrders")}
              </Button>
            </div>
          )}
        </div>

        {orderType === "dine_in" && (
          <div className="flex items-center justify-start mb-4 gap-4 flex-wrap p-4 bg-white rounded-lg shadow-md">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-[200px] border-gray-300 rounded-md shadow-sm px-4 py-2 bg-white hover:border-bg-primary focus:ring-2 focus:ring-bg-primary">
                <SelectValue placeholder="-- Choose Status --" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                {Object.entries(PREPARATION_STATUSES)
                  .filter(
                    ([key]) =>
                      statusOrder.indexOf(key) >=
                      statusOrder.indexOf(currentLowestSelectedStatus)
                  )
                  .map(([key, value]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <value.icon size={16} className={value.color} />
                        <span>{value.label}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              onClick={applyBulkStatus}
              className="bg-bg-primary text-white hover:bg-red-700 text-sm"
              disabled={selectedItems.length === 0 || !bulkStatus || isLoading}
            >
  {t("ApplyStatus", { count: selectedItems.length })}
            </Button>
            <Button
              onClick={handleTransferOrder}
              className="bg-red-700 text-white hover:bg-bg-primary text-sm flex items-center gap-1"
              disabled={isLoading || allCartIds.length === 0}
            >
              {t("ChangeTable")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <Loading />
          </div>
        )}
        {showClearAllConfirm && (
          <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t("ConfirmClearAllItems")}
              </h3>
              <p className="text-gray-600 mb-6">
           {t("ConfirmRemoveAll", { count: orderItems?.length || 0 })}

              </p>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowClearAllConfirm(false)}
                  variant="outline"
                >
                  {t("Cancel")}
                </Button>
                <Button
                  onClick={confirmClearAllItems}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {t("ClearAllItems")}
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white shadow-md rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-100 text-xs sm:text-sm sticky top-0 z-10">
              <tr>
                {orderType === "dine_in" && (
                  <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.length > 0 &&
                        selectedItems.length === orderItems.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                  {t("Item")}
                </th>
                <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                  {t("Price")}
                </th>
                <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                  {t("Quantity")}
                </th>
                {orderType === "dine_in" && (
                  <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                    {t("Preparation")}
                  </th>
                )}
                {orderType === "dine_in" && (
                  <th className="py-3 px-4 text-center text-gray-600 font-semibold">
                    {t("Pay")}
                  </th>
                )}
                <th className="py-3 px-4 text-right text-gray-600 font-semibold">
                  {t("Total")}
                </th>
                <th className="py-3 px-4 text-right text-gray-600 font-semibold">
                  {t("Void")}
                </th>
              </tr>
            </thead>
            <tbody>
              {orderItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderType === "dine_in" ? 8 : 6}
                    className="text-center py-4 text-gray-500"
                  >
<p>{t("NoItemsFound")}</p>
                  </td>
                </tr>
              ) : (
                orderItems.map((item, index) => (
                  <ItemRow
                    key={item.temp_id || `${item.id}-${index}`}
                    item={item}
                    orderType={orderType}
                    selectedItems={selectedItems}
                    toggleSelectItem={toggleSelectItem}
                    selectedPaymentItems={selectedPaymentItems}
                    toggleSelectPaymentItem={toggleSelectPaymentItem}
                    handleIncrease={handleIncrease}
                    handleDecrease={handleDecrease}
                    allowQuantityEdit={allowQuantityEdit}
                    itemLoadingStates={itemLoadingStates}
                    handleUpdatePreparationStatus={
                      handleUpdatePreparationStatus
                    }
                    handleVoidItem={handleVoidItem}
                    renderItemVariations={renderItemVariations}
                    handleRemoveFrontOnly={handleRemoveFrontOnly}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {orderType === "dine_in" && doneItems.length > 0 && (
          <div className="mt-6">
            <DoneItemsSection
              doneItems={doneItems}
              selectedPaymentItems={selectedPaymentItems}
              toggleSelectPaymentItem={toggleSelectPaymentItem}
              handleSelectAllPaymentItems={handleSelectAllPaymentItems}
            />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 pt-6 mt-4">
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
          <SummaryRow label={t("SubTotal")} value={subTotal} />
          <SummaryRow label={t("Tax")} value={totalTax} />
          <SummaryRow label={t("OtherCharge")} value={totalOtherCharge} />
        </div>
        {orderType === "dine_in" && (
          <>
            <div className="grid grid-cols-2 gap-4 items-center mb-4">
              <p className="text-gray-600">{t("TotalOrderAmount")}:</p>
              <p className="text-right text-lg font-semibold">
                {totalAmountDisplay.toFixed(2)} {t('EGP')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 items-center mb-4">
              <p className="text-gray-600">
<p>{t("SelectedItems", { count: selectedPaymentItems.length })}</p>
              </p>
              <p className="text-right text-lg font-semibold text-green-600">
                {amountToPay.toFixed(2)} {t("EGP")}
              </p>
            </div>
            <hr className="my-4 border-t border-gray-300" />
          </>
        )}
        <div className="grid grid-cols-2 gap-4 items-center mb-6">
          <p className="text-bg-primary text-xl font-bold">{t("AmountToPay")}</p>
          <p className="text-right text-2xl font-bold text-green-700">
            {amountToPay.toFixed(2)} {t("EGP")}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleCheckOut}
            className="bg-bg-primary text-white hover:bg-red-700 text-lg px-8 py-3"
            disabled={
              isLoading ||
              orderItems.length === 0 ||
              (orderType === "dine_in" && selectedPaymentItems.length === 0)
            }
          >
            {t("Checkout")}
          </Button>
          {orderType === "take_away" && (
            <Button
              onClick={handleSaveAsPending}
              className="bg-orange-600 text-white hover:bg-orange-700 text-lg px-8 py-3"
              disabled={isLoading || orderItems.length === 0}
            >
              {t("SaveasPending")}
            </Button>
          )}
        </div>
      </div>
      <VoidItemModal
        open={showVoidModal}
        onOpenChange={setShowVoidModal}
        managerId={managerId}
        setManagerId={setManagerId}
        managerPassword={managerPassword}
        setManagerPassword={setManagerPassword}
        confirmVoidItem={confirmVoidItem}
        isLoading={isLoading}
      />
      {showModal && (
        <CheckOut
          totalDineInItems={orderItems.length}
          onClose={() => setShowModal(false)}
          amountToPay={amountToPay}
          orderItems={checkoutItems}
          updateOrderItems={updateOrderItems}
          totalTax={totalTax}
          totalDiscount={totalOtherCharge}
          notes="Customer requested no plastic bag."
          source="web"
          orderType={orderType}
          tableId={tableId}
          onClearCart={clearCart}
        />
      )}
      {showOfferModal && (
        <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
  {t("ApplyOfferUsePoints")}

            </h3>
            <p className="text-gray-600 mb-6">
{t("EnterLoyaltyOrRewardCode")}
            </p>
            <Input
              type="text"
              placeholder="Enter Offer Code"
              value={offerCode}
              onChange={(e) => setOfferCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-bg-primary focus:border-bg-primary"
              disabled={isLoading}
            />
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferCode("");
                }}
                variant="outline"
                disabled={isLoading}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleApplyOffer}
                className="bg-bg-primary text-white hover:bg-red-700"
                disabled={isLoading || !offerCode.trim()}
              >
                {isLoading ? <Loading /> : t("CheckCode")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {pendingOfferApproval && (
        <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-bg-primary mb-4">
              {t("ConfirmRewardPurchase")}
            </h3>
            <p className="text-gray-700 mb-2 font-medium">
              {t("UserID")}: **{pendingOfferApproval.user_id}**
            </p>
            <p className="text-gray-700 mb-6">
               {t("ConfirmAddOffer", {
    product: pendingOfferApproval.product,
    points: pendingOfferApproval.points,
  })}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setPendingOfferApproval(null);
                  setOfferCode("");
                }}
                variant="outline"
                disabled={isLoading}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleApproveOffer}
                className="bg-bg-primary text-white hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? <Loading /> : t("ApproveandAddItem")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showDealModal && (
        <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("ApplyDealCode")}
            </h3>
            <p className="text-gray-600 mb-6">
<p>{t("EnterDealCode")}</p>
            </p>
            <Input
              type="text"
              placeholder="Enter Deal Code"
              value={dealCode}
              onChange={(e) => setDealCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-bg-primary focus:border-bg-primary"
              disabled={isLoading}
            />
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowDealModal(false);
                  setDealCode("");
                }}
                variant="outline"
                disabled={isLoading}
              >
                {t('Cancel')}
              </Button>
              <Button
                onClick={handleApplyDeal}
                className="bg-orange-600 text-white hover:bg-orange-700"
                disabled={isLoading || !dealCode.trim()}
              >
                {isLoading ? <Loading /> : t("CheckDeal")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {pendingDealApproval && (
        <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-orange-700 mb-4">
              {t("ConfirmDealAcceptance")}
            </h3>
            <p className="text-gray-700 mb-2 font-medium">
  {t("CustomerUserId", { user_id: pendingDealApproval.user_id })}
            </p>
            <p className="text-gray-700 mb-6">
 {t("ConfirmAddDeal", {
    deal_title: pendingDealApproval.deal_title,
    deal_price: pendingDealApproval.deal_price.toFixed(2),
  })}
            </p>
            <p className="text-gray-700 mb-6">
              {pendingDealApproval.description || "No description available."}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setPendingDealApproval(null);
                  setDealCode("");
                }}
                variant="outline"
                disabled={isLoading}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleApproveDeal}
                className="bg-orange-600 text-white hover:bg-orange-700"
                disabled={isLoading}
              >
                {isLoading ? <Loading /> : "Approve and Add Deal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}