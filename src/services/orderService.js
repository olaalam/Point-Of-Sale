// services/orderService.js
import { toast } from "react-toastify";

export const submitItemToBackend = async (postData, product, quantity = 1, orderType) => {
  // This function will only proceed if the order type is 'dine_in'
  if (orderType !== "dine_in") {
    return;
  }

  const cashierId = localStorage.getItem("cashier_id");
  const tableId = localStorage.getItem("table_id");

  const payload = {
    products: [{ product_id: product.id, count: quantity }],
    source: "web",
    financials: [],
    cashier_id: cashierId,
    amount: product.price * quantity,
    total_tax: 0,
    total_discount: 0,
    notes: "Auto-sent at pending stage",
    table_id: tableId,
  };

  try {
    const response = await postData("cashier/dine_in_order", payload);
    toast.success(`${product.name} added to order successfully!`);
    return response;
  } catch (err) {
    console.error("Failed to submit item to backend", err);
    toast.error(
      `Failed to add "${product.name}" to order. Please try again.`
    );
    throw err;
  }
};