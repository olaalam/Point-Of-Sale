//page for handling order submission to the backend (with type = 'dine_in')
import { toast } from "react-toastify";

export const submitItemToBackend = async (postData, product, quantity = 1, orderType) => {
  console.log("Order type:", orderType)
  // This function will only proceed if the order type is 'dine_in'
  if (orderType !== "dine_in") {
    console.log("Skipping backend submission - not dine_in order");
    return;
  }

  const cashierId = localStorage.getItem("cashier_id");
  const tableId = localStorage.getItem("table_id");

  // Validate required data
  if (!cashierId || !tableId ) {
    console.error("Missing required data:", { cashierId, tableId });
    toast.error("Missing cashier or table information");
    return;
  }

  console.log("Submitting item to backend:", { product, quantity, orderType });

  try {
    const formData = new FormData();
    
    // Basic product data
    formData.append("products[0][product_id]", product.id);
    formData.append("products[0][count]", quantity);

    // Handle variations - FIXED: Now properly sends variation data
    if (product.variation && product.variation.variation_id && product.variation.option_id) {
      formData.append("products[0][variation][0][variation_id]", product.variation.variation_id);
      formData.append("products[0][variation][0][option_id][]", product.variation.option_id);
      console.log("Added variation to formData:", {
        variation_id: product.variation.variation_id,
        option_id: product.variation.option_id,
        variation_name: product.variation.variation_name,
        option_name: product.variation.option_name
      });
    } else {
      console.log("No variation data found for product:", product.name);
    }

    // Handle addons - FIXED: Now properly sends addon data
    if (product.selectedAddons && product.selectedAddons.length > 0) {
      product.selectedAddons.forEach((addon, index) => {
        formData.append(`products[0][addons][${index}][addon_id]`, addon.addon_id);
        formData.append(`products[0][addons][${index}][count]`, addon.count);
        console.log(`Added addon ${index}:`, {
          addon_id: addon.addon_id,
          name: addon.name,
          count: addon.count,
          price: addon.price
        });
      });
    } else {
      console.log("No addons found for product:", product.name);
    }

    // Handle excludes if any
    if (product.exclude_id && product.exclude_id.length > 0) {
      product.exclude_id.forEach((excludeId, index) => {
        formData.append(`products[0][exclude_id][${index}]`, excludeId);
      });
      console.log("Added excludes:", product.exclude_id);
    }

    // Handle extras if any (different from addons)
    if (product.extra_id && product.extra_id.length > 0) {
      product.extra_id.forEach((extraId, index) => {
        formData.append(`products[0][extra_id][${index}]`, extraId);
      });
      console.log("Added extras:", product.extra_id);
    }

    // Required fields
    formData.append("source", "web");
    formData.append("cashier_id", cashierId);
    formData.append("table_id", tableId);
    
    // Calculate correct amount with variations and addons
    const calculatedAmount = product.price * quantity;
    formData.append("amount", calculatedAmount);
    formData.append("total_tax", 0);
    formData.append("total_discount", 0);
    formData.append("notes", "Auto-sent at pending stage");

    // Empty financials array for pending orders
    formData.append("financials", "[]");

    // Log all formData entries for debugging
    console.log("FormData being sent to backend:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const response = await postData("cashier/dine_in_order", formData);
    
    // Success message with variation and addon info
    let successMessage = `${product.name}`;
    if (product.variation) {
      successMessage += ` (${product.variation.option_name})`;
    }
    if (product.selectedAddons && product.selectedAddons.length > 0) {
      const addonNames = product.selectedAddons.map(addon => addon.name).join(", ");
      successMessage += ` with ${addonNames}`;
    }
    successMessage += " added to order successfully!";
    
    toast.success(successMessage);
    console.log("Backend submission successful:", response);
    return response;

  } catch (err) {
    console.error("Failed to submit item to backend", err);
    
    // Enhanced error message
    let errorMessage = `Failed to add "${product.name}"`;
    if (product.variation) {
      errorMessage += ` (${product.variation.option_name})`;
    }
    errorMessage += " to order. Please try again.";
    
    toast.error(errorMessage);
    throw err;
  }
};

// Additional helper function to validate product data before submission
export const validateProductForSubmission = (product) => {
  const errors = [];
  
  if (!product.id) {
    errors.push("Product ID is missing");
  }
  
  // Check if variation is properly structured when present
  if (product.selectedVariation && (!product.variation || !product.variation.variation_id || !product.variation.option_id)) {
    errors.push("Variation data is incomplete");
  }
  
  // Check if addons are properly structured when present
  if (product.selectedExtras && product.selectedExtras.length > 0) {
    if (!product.selectedAddons || product.selectedAddons.length === 0) {
      errors.push("Addon data is missing despite selected extras");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to format product for display
export const formatProductDisplay = (product) => {
  let display = product.name || "Unknown Product";
  
  if (product.variation && product.variation.option_name) {
    display += ` (${product.variation.option_name})`;
  }
  
  if (product.selectedAddons && product.selectedAddons.length > 0) {
    const addonNames = product.selectedAddons.map(addon => addon.name).join(", ");
    display += ` + ${addonNames}`;
  }
  
  return display;
};

