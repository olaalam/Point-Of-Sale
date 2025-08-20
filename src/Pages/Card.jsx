// Fixed Card.jsx - Complete component with temp_id solution
import React, { useEffect, useMemo, useState } from "react";

import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import CheckOut from "./CheckOut";
import { Circle, Hourglass, CheckCircle, ChefHat } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { ToastContainer, toast } from "react-toastify";

const TAX_RATE = 0;
const OTHER_CHARGE = 0;

const PREPARATION_STATUSES = {
  pending: {
    label: "Pending",
    icon: Circle,
    color: "text-gray-400",
    nextStatus: "preparing",
    canSendToAPI: false,
  },
  watting: {
    label: "Waiting",
    icon: Circle,
    color: "text-yellow-400",
    nextStatus: "preparing",
    canSendToAPI: false,
  },
  preparing: {
    label: "Preparing",
    icon: Hourglass,
    color: "text-orange-500",
    nextStatus: "pick_up",
    apiValue: "preparing",
    canSendToAPI: true,
  },
  pick_up: {
    label: "Pick Up",
    icon: ChefHat,
    color: "text-blue-500",
    nextStatus: "done",
    apiValue: "pick_up",
    canSendToAPI: true,
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
    nextStatus: "done",
    apiValue: "done",
    canSendToAPI: true,
  },
};

export default function Card({
  orderItems,
  updateOrderItems,
  allowQuantityEdit = true,
  orderType,
  tableId,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [itemLoadingStates, setItemLoadingStates] = useState({});

  const { data } = useGet(`cashier/dine_in_table_order/${tableId}`);
  const { loading: apiLoading, error: apiError, postData } = usePost();

  console.log("Received orderType:", orderType);
  console.log("Card component received tableId:", tableId);
  console.log("Backend response data:", data);

  const isLoading = apiLoading;

  useEffect(() => {
    if (data && Array.isArray(data.success)) {
      const mappedItems = data.success.map((item) => {
        // Generate temp_id for backend items
        const createTempId = () => {
          return `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        };

        const baseItem = {
          id: item.id, // Keep original ID for backend
          temp_id: createTempId(), // Add temp_id for frontend operations
          cart_id: item.cart_id,
          name: item.name ?? "No name",
          price: parseFloat(item.price_after_tax ?? item.price ?? 0),
          originalPrice: parseFloat(item.price ?? 0),
          count: parseInt(item.count ?? 1),
          preparation_status: item.prepration || item.preparation_status || "pending",
          type: "main_item",
          addons: [],
        };

        // Add addons from addons_selected
        if (Array.isArray(item.addons_selected) && item.addons_selected.length > 0) {
          baseItem.addons = item.addons_selected.map((addon) => ({
            id: `${baseItem.temp_id}_addon_${addon.id}`,
            name: addon.name,
            price: parseFloat(addon.price_after_tax ?? addon.price ?? 0),
            originalPrice: parseFloat(addon.price ?? 0),
            count: parseInt(addon.quantity_add ?? 1),
            preparation_status: baseItem.preparation_status,
          }));
        }

        return baseItem;
      });

      console.log("Mapped items with temp_ids:", mappedItems);
      updateOrderItems(mappedItems);
    }
  }, [data]);

  const setItemLoading = (itemTempId, isLoading) => {
    setItemLoadingStates((prev) => ({
      ...prev,
      [itemTempId]: isLoading,
    }));
  };

  const handleUpdatePreparationStatus = async (itemTempId) => {
    setItemLoading(itemTempId, true);

    try {
      const updatedItems = orderItems.map((item) => {
        if (item.temp_id === itemTempId) {
          const currentStatus = item.preparation_status || "pending";
          const nextStatus =
            PREPARATION_STATUSES[currentStatus]?.nextStatus || "preparing";

          console.log("Updating item status:", {
            itemTempId,
            itemId: item.id,
            currentStatus,
            nextStatus,
            cart_id: item.cart_id,
            tableId,
          });

          if (
            nextStatus &&
            nextStatus !== "pending" &&
            nextStatus !== "watting" &&
            item.cart_id &&
            tableId
          ) {
            const formData = new FormData();
            formData.append("table_id", tableId.toString());
            formData.append("preparing[0][cart_id]", item.cart_id.toString());
            formData.append(
              "preparing[0][status]",
              PREPARATION_STATUSES[nextStatus]?.apiValue || nextStatus
            );

            console.log("FormData contents:");
            for (let [key, value] of formData.entries()) {
              console.log(`${key}: ${value}`);
            }

            postData("cashier/preparing", formData)
              .then((responseData) => {
                console.log("Single item backend update successful:", responseData);
                toast.success("Status updated successfully!");
              })
              .catch((err) => {
                console.error("Failed to update single item status:", err);
                
                if (err.response) {
                  console.error("Error response:", err.response.data);
                  console.error("Error status:", err.response.status);
                }
                
                const errorMessage = err.response?.data?.message || 
                                   err.response?.data?.exception ||
                                   "Failed to update status. Please try again.";
                toast.error(errorMessage);
                return;
              })
              .finally(() => {
                setItemLoading(itemTempId, false);
              });
          } else if (nextStatus === "pending" || nextStatus === "watting") {
            console.log("Status changed to pending/waiting - frontend only");
            toast.info(
              `Status changed to ${
                PREPARATION_STATUSES[nextStatus]?.label || nextStatus
              }`
            );
            setItemLoading(itemTempId, false);
          } else {
            console.error("Missing required data:", {
              cart_id: item.cart_id,
              tableId,
              nextStatus,
            });
            toast.error("Missing required data for status update");
            setItemLoading(itemTempId, false);
            return item;
          }

          return { ...item, preparation_status: nextStatus };
        }
        return item;
      });

      updateOrderItems(updatedItems);
      localStorage.setItem("cart", JSON.stringify(updatedItems));
    } catch (error) {
      console.error("Error in handleUpdatePreparationStatus:", error);
      setItemLoading(itemTempId, false);
    }
  };

  const { subTotal, totalTax, totalOtherCharge, totalAmountDisplay } =
    useMemo(() => {
      const itemsToCalculate = Array.isArray(orderItems) ? orderItems : [];

      const calculatedSubTotal = itemsToCalculate.reduce((acc, item) => {
        const itemPrice = item.price || 0;
        const itemCount = item.count || 1;
        return acc + itemPrice * itemCount;
      }, 0);

      const calculatedTax = calculatedSubTotal * TAX_RATE;
      const calculatedTotalDisplay =
        calculatedSubTotal + calculatedTax + OTHER_CHARGE;

      return {
        subTotal: calculatedSubTotal,
        totalTax: calculatedTax,
        totalOtherCharge: OTHER_CHARGE,
        totalAmountDisplay: calculatedTotalDisplay,
      };
    }, [orderItems]);

  const { checkoutItems, amountToPay } = useMemo(() => {
    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];

    if (orderType === "dine_in") {
      const servedItems = safeOrderItems.filter(
        (item) => item.preparation_status === "done"
      );
      const servedSubTotal = servedItems.reduce(
        (acc, item) => acc + item.price * item.count,
        0
      );
      const servedTax = servedSubTotal * TAX_RATE;
      const servedTotal = servedSubTotal + servedTax + OTHER_CHARGE;
      return {
        checkoutItems: servedItems,
        amountToPay: servedTotal,
      };
    }

    return {
      checkoutItems: safeOrderItems,
      amountToPay: totalAmountDisplay,
    };
  }, [orderItems, orderType, totalAmountDisplay]);

  const handleIncrease = (itemTempId) => {
    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const updatedItems = safeOrderItems.map((item) =>
      item.temp_id === itemTempId ? { ...item, count: item.count + 1 } : item
    );
    updateOrderItems(updatedItems);
  };

  const handleDecrease = (itemTempId) => {
    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const updatedItems = safeOrderItems
      .map((item) => {
        if (item.temp_id === itemTempId) {
          const newCount = item.count - 1;
          if (item.preparation_status === "done" && newCount < 1) {
            return item;
          }
          return { ...item, count: newCount };
        }
        return item;
      })
      .filter((item) => item.count > 0 || item.preparation_status === "done");

    updateOrderItems(updatedItems);
  };

  const handleCheckOut = () => {
    if (orderType === "dine_in" && checkoutItems.length === 0) {
      toast.warning(
        "No served items available for checkout. Please serve items first."
      );
      return;
    }
    setShowModal(true);
  };

  const toggleSelectItem = (tempId) => {
    setSelectedItems((prev) =>
      prev.includes(tempId) 
        ? prev.filter((itemTempId) => itemTempId !== tempId) 
        : [...prev, tempId]
    );
  };

  const handleSelectAll = () => {
    const allTempIds = orderItems.map((item) => item.temp_id);
    const isAllSelected = selectedItems.length === allTempIds.length;
    setSelectedItems(isAllSelected ? [] : allTempIds);
  };

  const statusOrder = ["pending", "watting", "preparing", "pick_up", "done"];

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedItems.length === 0) {
      toast.warning("Please select items and choose a status");
      return;
    }

    if (!tableId) {
      toast.error("Table ID is missing");
      return;
    }

    const itemsToUpdateOnBackend = [];

    const updatedItems = orderItems.map((item) => {
      if (!selectedItems.includes(item.temp_id)) return item;

      const currentIndex = statusOrder.indexOf(
        item.preparation_status || "pending"
      );
      const targetIndex = statusOrder.indexOf(bulkStatus);

      if (targetIndex < currentIndex) {
        console.log(
          `Skipping item ${item.temp_id}: target status is before current status`
        );
        return item;
      }

      if (
        bulkStatus !== "pending" &&
        bulkStatus !== "watting" &&
        item.cart_id &&
        PREPARATION_STATUSES[bulkStatus]?.canSendToAPI
      ) {
        itemsToUpdateOnBackend.push({
          cart_id: item.cart_id,
          status: PREPARATION_STATUSES[bulkStatus]?.apiValue || bulkStatus,
        });
      } else if (
        !item.cart_id &&
        bulkStatus !== "pending" &&
        bulkStatus !== "watting"
      ) {
        console.error(`Item ${item.temp_id} is missing cart_id`);
      }

      return { ...item, preparation_status: bulkStatus };
    });

    if (itemsToUpdateOnBackend.length > 0) {
      console.log("Items to update on backend:", itemsToUpdateOnBackend);

      const formData = new FormData();
      formData.append("table_id", tableId.toString());

      itemsToUpdateOnBackend.forEach((item, index) => {
        formData.append(
          `preparing[${index}][cart_id]`,
          item.cart_id.toString()
        );
        formData.append(`preparing[${index}][status]`, item.status);
      });

      console.log("Bulk update payload:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      try {
        const responseData = await postData("cashier/preparing", formData);
        console.log("Bulk backend update successful:", responseData);
        toast.success(
          `Successfully updated ${itemsToUpdateOnBackend.length} items to ${PREPARATION_STATUSES[bulkStatus]?.label}`
        );
      } catch (err) {
        console.error("Failed to apply bulk status:", err);
        
        if (err.response) {
          console.error("Bulk update error response:", err.response.data);
        }
        
        const errorMessage = err.response?.data?.message || 
                           err.response?.data?.exception ||
                           "Failed to update status. Please try again.";
        toast.error(errorMessage);
        return;
      }
    } else if (bulkStatus === "pending" || bulkStatus === "watting") {
      toast.info(
        `Status changed to ${PREPARATION_STATUSES[bulkStatus]?.label}`
      );
    } else {
      toast.warning("No valid items to update");
      return;
    }

    updateOrderItems(updatedItems);
    setSelectedItems([]);
    setBulkStatus("");
  };

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

  useEffect(() => {
    if (apiError) {
      toast.error(`API Error: ${apiError}`);
    }
  }, [apiError]);

  const SummaryRow = ({ label, value }) => (
    <div className="grid grid-cols-2 gap-10 py-2">
      <p>{label}:</p>
      <p>{value.toFixed(2)} EGP</p>
    </div>
  );

  return (
    <div className="overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mb-10 pb-10 ">
      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <Loading />
        </div>
      )}
      <h2 className="text-bg-primary text-3xl font-bold mb-6">Order Details</h2>

      <div className="min-w-full bg-white shadow-md rounded-lg overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {orderType === "dine_in" && (
          <div className="flex items-center justify-start mb-4 gap-4 flex-wrap p-4">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-[200px] border border-gray-300 rounded-md shadow-sm px-4 py-2 text-gray-700 bg-white hover:border-bg-primary focus:outline-none focus:ring-2 focus:ring-bg-primary focus:border-transparent transition ease-in-out duration-150">
                <SelectValue placeholder="-- Choose Status --" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                {Object.entries(PREPARATION_STATUSES)
                  .filter(([key]) => {
                    const isStatusBeforeLowestSelected =
                      statusOrder.indexOf(key) <
                      statusOrder.indexOf(currentLowestSelectedStatus);

                    return !isStatusBeforeLowestSelected;
                  })
                  .map(([key, value]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <value.icon size={16} className={value.color} />
                        <span>{value.label}</span>
                        {!value.canSendToAPI && (
                          <span className="text-xs text-gray-500"></span>
                        )}
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
              Apply Status ({selectedItems.length} selected)
            </Button>
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-100 text-xs sm:text-sm">
            <tr>
              <th className="p-2  text-left text-gray-600 font-semibold">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length > 0 &&
                    selectedItems.length === orderItems.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-bg-primary"
                />
              </th>

              <th className="py-3 px-4 text-left text-gray-600 font-semibold">
                Item
              </th>
              <th className="py-3 px-4 text-left text-gray-600 font-semibold">
                Price
              </th>
              <th className="py-3 px-4 text-left text-gray-600 font-semibold">
                Quantity
              </th>
              {orderType === "dine_in" && (
                <th className="py-3 px-4 text-left text-gray-600 font-semibold">
                  Preparation
                </th>
              )}
              <th className="py-3 px-4 text-right text-gray-600 font-semibold">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {!Array.isArray(orderItems) || orderItems.length === 0 ? (
              <tr>
                <td
                  colSpan={orderType === "dine_in" ? 6 : 5}
                  className="text-center py-4 text-gray-500"
                >
                  No items found for this order.
                </td>
              </tr>
            ) : (
              orderItems.map((item, index) => {
                const statusInfo =
                  PREPARATION_STATUSES[item.preparation_status] ||
                  PREPARATION_STATUSES.pending;
                const StatusIcon = statusInfo.icon;

                const hasDiscount =
                  item.originalPrice && item.price < item.originalPrice;
                const isItemLoading = itemLoadingStates[item.temp_id] || false;

                return (
                  <tr
                    key={item.temp_id || `${item.id}-${index}`}
                    className={`border-b last:border-b-0 hover:bg-gray-50 ${
                      item.type === "addon" ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="py-1 px-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.temp_id)}
                        onChange={() => toggleSelectItem(item.temp_id)}
                        className="w-4 h-4 accent-bg-primary"
                      />
                    </td>

                    <td className="font-small py-1 px-2">
                      <div>
                        <span className=" text-gray-800">{item.name}</span>
                        {item.selectedAddons &&
                          item.selectedAddons.length > 0 && (
                            <div className="pl-4 text-sm text-gray-500">
                              {item.selectedAddons.map((addon) => (
                                <div key={addon.addon_id}>+ {addon.name}</div>
                              ))}
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <div>
                        <span
                          className={
                            hasDiscount ? "text-green-600 font-semibold" : ""
                          }
                        >
                          {item.price.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <div>
                            <span className="text-xs text-gray-500 line-through">
                              {item.originalPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            allowQuantityEdit && handleDecrease(item.temp_id)
                          }
                          disabled={!allowQuantityEdit}
                          className={`px-2 py-1 rounded ${
                            allowQuantityEdit
                              ? "bg-gray-200 hover:bg-gray-300"
                              : "bg-gray-100 cursor-not-allowed"
                          }`}
                        >
                          −
                        </button>
                        <span className="min-w-[24px] text-center">
                          {item.count}
                        </span>
                        <button
                          onClick={() => handleIncrease(item.temp_id)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    {orderType === "dine_in" ? (
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdatePreparationStatus(item.temp_id)
                            }
                            title={`Change status to ${
                              PREPARATION_STATUSES[statusInfo.nextStatus]
                                ?.label || "Pending"
                            }`}
                            className={`p-2 rounded-full ${
                              statusInfo.color
                            } hover:bg-gray-200 text-center m-auto transition-colors duration-200 ${
                              isItemLoading
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            disabled={isItemLoading}
                          >
                            {isItemLoading ? (
                              <div className="w-5 h-5 border-2 border-gray-300 border-t-current rounded-full animate-spin"></div>
                            ) : (
                              <StatusIcon size={20} />
                            )}
                          </button>
                        </div>
                      </td>
                    ) : null}
                    <td className="text-right py-3 px-4">
                      <span className="font-semibold">
                        {(item.price * item.count).toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <div className="text-xs text-gray-500 line-through">
                          {(item.originalPrice * item.count).toFixed(2)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <hr className="my-6 border-t-2 border-gray-200" />

      <div className="my-8 bg-gray-50 p-6 rounded-lg shadow-inner">
        <SummaryRow label="Sub Total" value={subTotal} />
        <SummaryRow label="Tax" value={totalTax} />
        <SummaryRow label="Other Charge" value={totalOtherCharge} />
      </div>

      <hr className="my-6 border-t-2 border-gray-200" />

      {orderType === "dine_in" && (
        <>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <p className="text-gray-600">Total Order Amount:</p>
            <p className="text-right text-lg font-semibold">
              {totalAmountDisplay.toFixed(2)} EGP
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <p className="text-gray-600">
              Served Items ({checkoutItems.length}):
            </p>
            <p className="text-right text-lg font-semibold text-green-600">
              {amountToPay.toFixed(2)} EGP
            </p>
          </div>
          <hr className="my-4 border-t border-gray-300" />
        </>
      )}

      <div className="grid grid-cols-2 gap-4 items-center mb-8">
        <p className="text-bg-primary text-xl font-bold">Amount To Pay:</p>
        <p className="text-right text-2xl font-bold text-green-700">
          {amountToPay.toFixed(2)} EGP
        </p>
      </div>

      <div className="text-center mt-8">
        <Button
          variant="outline"
          className="bg-bg-primary px-8 py-4 text-white hover:bg-red-700 hover:text-white transition-all text-lg font-semibold rounded-md"
          onClick={handleCheckOut}
          disabled={orderType === "dine_in" && checkoutItems.length === 0}
        >
          Check Out{" "}
          {orderType === "dine_in" && checkoutItems.length === 0
            ? "(No Served Items)"
            : ""}
        </Button>
      </div>

      {showModal && (
        <CheckOut
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
        />
      )}
      <ToastContainer />
    </div>
  );
}