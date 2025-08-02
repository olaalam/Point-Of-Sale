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
  },
  preparing: {
    label: "Preparing",
    icon: Hourglass,
    color: "text-orange-500",
    nextStatus: "pick_up",
  },
  pick_up: {
    label: "Pick Up",
    icon: ChefHat,
    color: "text-blue-500",
    nextStatus: "done",
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
    nextStatus: "done",
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
  const { data } = useGet(`cashier/dine_in_table_order/${tableId}`);
  const { loading: apiLoading, error: apiError, postData } = usePost();

  const isLoading = apiLoading;
  useEffect(() => {
    if (data && Array.isArray(data.success)) {
      const mappedItems = data.success.flatMap((item) => {
        // في حالة وجود allExtras
        if (Array.isArray(item.allExtras) && item.allExtras.length > 0) {
          return item.allExtras.map((extra) => ({
            id: extra.id,
            name: extra.name ?? "No name",
            price: extra.price_after_discount ?? extra.price ?? 0,
            count: 1,
            preparation_status: extra.preparation_status || "pending",
          }));
        }

        // في حالة عدم وجود allExtras نستخدم بيانات المنتج نفسه
        return {
          id: item.id,
          name: item.name ?? "No name",
          price: item.price_after_discount ?? item.price ?? 0,
          count: item.count ?? 1,
          preparation_status: item.preparation_status || "pending",
        };
      });

      updateOrderItems(mappedItems);
    }
  }, [data]);

  const handleUpdatePreparationStatus = async (itemId) => {
    const updatedItems = orderItems.map((item) => {
      if (item.id === itemId) {
        const currentStatus = item.preparation_status || "pending";
        const nextStatus =
          PREPARATION_STATUSES[currentStatus]?.nextStatus || "pending";

        if (nextStatus) {
          const payload = new URLSearchParams();
          payload.append("preparing[0][cart_id]", itemId);
          payload.append("table_id", tableId);
          payload.append("preparing[0][status]", nextStatus);

          // Explicitly send as x-www-form-urlencoded
          postData("cashier/preparing", payload)
            .then((responseData) => {
              console.log(
                "Single item backend update successful:",
                responseData
              );
            })
            .catch((err) => {
              console.error("Failed to update single item status:", err);
            });
        }
        return { ...item, preparation_status: nextStatus };
      }
      return item;
    });

    updateOrderItems(updatedItems);
    localStorage.setItem("cart", JSON.stringify(updatedItems));
  };

  const { subTotal, totalTax, totalOtherCharge, totalAmountDisplay } =
    useMemo(() => {
      const itemsToCalculate = Array.isArray(orderItems) ? orderItems : [];
      const calculatedSubTotal = itemsToCalculate.reduce(
        (acc, item) => acc + item.price * item.count,
        0
      );
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

  const handleIncrease = (id) => {
    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const updatedItems = safeOrderItems.map((item) =>
      item.id === id ? { ...item, count: item.count + 1 } : item
    );
    updateOrderItems(updatedItems);
  };

  const handleDecrease = (id) => {
    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const updatedItems = safeOrderItems
      .map((item) => {
        if (item.id === id) {
          const newCount = item.count - 1;
          // لا تسمح بالوصول لأقل من 1 إذا العنصر في مرحلة done
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
      toast(
        "No served items available for checkout. Please serve items first."
      );
      return;
    }
    setShowModal(true);
  };

  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = orderItems.map((item) => item.id);
    const isAllSelected = selectedItems.length === allIds.length;
    setSelectedItems(isAllSelected ? [] : allIds);
  };

  const statusOrder = ["pending", "preparing", "pick_up", "done"];

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedItems.length === 0) return;

    const itemsToUpdateOnBackend = [];

    const updatedItems = orderItems.map((item) => {
      if (!selectedItems.includes(item.id)) return item;
      const currentIndex = statusOrder.indexOf(
        item.preparation_status || "pending"
      );
      const targetIndex = statusOrder.indexOf(bulkStatus);
      if (targetIndex < currentIndex) return item;

      if (
        bulkStatus === "preparing" ||
        bulkStatus === "pick_up" ||
        bulkStatus === "done"
      ) {
        itemsToUpdateOnBackend.push({
          cart_id: item.id,
          table_id: tableId,
          status: bulkStatus,
        }); // Ensure tableId is not undefined here
      }
      return { ...item, preparation_status: bulkStatus };
    });

    if (itemsToUpdateOnBackend.length > 0) {
      const bulkPayload = new URLSearchParams();
      itemsToUpdateOnBackend.forEach((item, index) => {
        bulkPayload.append(`preparing[${index}][cart_id]`, item.cart_id);
        bulkPayload.append(`preparing[${index}][table_id]`, item.table_id);
        bulkPayload.append(`preparing[${index}][status]`, item.status);
      });

      // Explicitly send as x-www-form-urlencoded
      postData("cashier/preparing", bulkPayload)
        .then((responseData) => {
          console.log("Bulk backend update successful:", responseData);
        })
        .catch((err) => {
          console.error("Failed to apply bulk status:", err);
        });
    }

    updateOrderItems(updatedItems);
    setSelectedItems([]);
  };

  const currentLowestSelectedStatus = useMemo(() => {
    if (selectedItems.length === 0) return statusOrder[0];
    const selectedItemStatuses = orderItems
      .filter((item) => selectedItems.includes(item.id))
      .map((item) => item.preparation_status || "pending");
    const lowestStatusIndex = Math.min(
      ...selectedItemStatuses.map((status) => statusOrder.indexOf(status))
    );
    return statusOrder[lowestStatusIndex];
  }, [selectedItems, orderItems]);

  useEffect(() => {
    if (apiError) {
      toast(`API Error: ${apiError}`);
    }
    // Add a console log to quickly check the tableId prop value
    console.log("Card component received tableId:", tableId);
  }, [apiError, tableId]);

  const SummaryRow = ({ label, value }) => (
    <div className="grid grid-cols-2 gap-10 py-2">
      <p>{label}:</p>
      <p>{value.toFixed(2)} EGP</p>
    </div>
  );

  return (
    <div className="overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mb-10 pb-10 ">
      {isLoading && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
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
                {Object.entries(PREPARATION_STATUSES).map(([key, value]) => {
                  const isStatusBeforeLowestSelected =
                    statusOrder.indexOf(key) <
                    statusOrder.indexOf(currentLowestSelectedStatus);

                  return (
                    <SelectItem
                      key={key}
                      value={key}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                      disabled={isStatusBeforeLowestSelected}
                    >
                      <div className="flex items-center gap-2">
                        <value.icon size={16} className={value.color} />
                        <span>{value.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              onClick={applyBulkStatus}
              className="bg-bg-primary text-white hover:bg-red-700 text-sm"
              disabled={selectedItems.length === 0 || !bulkStatus || isLoading}
            >
              Apply Status
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

                return (
                  <tr
                    key={`${item.id}-${item.preparation_status}-${index}`}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="py-1 px-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 accent-bg-primary"
                      />
                    </td>

                    <td className="font-small py-1 px-2">{item.name}</td>
                    <td className="py-1 px-2">{item.price.toFixed(2)}</td>
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            allowQuantityEdit && handleDecrease(item.id)
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
                          onClick={() => handleIncrease(item.id)}
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
                              handleUpdatePreparationStatus(item.id)
                            }
                            title={`Change status to ${
                              PREPARATION_STATUSES[statusInfo.nextStatus]
                                ?.label || "Pending"
                            }`}
                            className={`p-2 rounded-full ${statusInfo.color} hover:bg-gray-200 text-center m-auto transition-colors duration-200`}
                            disabled={isLoading}
                          >
                            <StatusIcon size={20} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                    <td className="text-right py-3 px-4">
                      {(item.price * item.count).toFixed(2)}
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

      {/* Display additional information for dine_in orders */}
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
