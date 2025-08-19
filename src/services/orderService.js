//page for handling order submission to the backend (with type = 'dine_in')

// page for handling order submission to the backend (with type = 'dine_in')
import { toast } from "react-toastify";

export const submitItemToBackend = async (postData, product, quantity = 1, orderType) => {
  console.log("Order type:", orderType);

  if (orderType !== "dine_in") {
    console.log("Skipping backend submission - not dine_in order");
    return;
  }

  const cashierId = localStorage.getItem("cashier_id");
  const tableId = localStorage.getItem("table_id");

  if (!cashierId || !tableId) {
    console.error("Missing required data:", { cashierId, tableId });
    toast.error("Missing cashier or table information");
    return;
  }

  console.log("Submitting item to backend:", { product, quantity, orderType });

  try {
    const calculatedAmount = product.price * quantity;

    // --- Start: The Correct processProductItem function ---
const processProductItem = (item) => {
  // تجميع الـ Variations (التعديلات) بشكل صحيح
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

  // فصل الـ Extras عن الـ Addons
  const realExtrasIds = [];
  const addonItems = [];

  if (item.selectedExtras && item.selectedExtras.length > 0) {
    item.selectedExtras.forEach(extraId => {
      // تحقق من أن الـ Extra هو فعلاً من ضمن الـ Extras الحقيقية
      const isRealExtra = item.allExtras?.some(extra => extra.id === extraId);
      
      if (isRealExtra) {
        realExtrasIds.push(extraId.toString());
      } else {
        // إذا كان عنصرًا إضافيًا (Addon) وليس من الـ Extras الحقيقية
        const addon = item.addons?.find(addon => addon.id === extraId);
        if (addon) {
          addonItems.push({
            addon_id: extraId.toString(),
            count: "1", // يمكن تغيير الكمية حسب الحاجة
          });
        }
      }
    });
  }

  // إضافة الـ Addons إذا كانت موجودة
  if (item.selectedAddons && item.selectedAddons.length > 0) {
    item.selectedAddons.forEach(addonData => {
      // تحقق إذا كان هذا الـ Addon مضافًا بالفعل
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
    note: item.note || "Product Note",  // يمكن تعديل هذا حسب الحاجة
    addons: addonItems,  // إضافة الـ Addons
    variation: groupedVariations,
    exclude_id: (item.selectedExcludes || []).map(id => id.toString()),
    extra_id: realExtrasIds, // إرسال الـ Extras الحقيقية فقط
  };

  console.log("Processed product data:", productData);
  console.log("Real extras:", realExtrasIds);
  console.log("Addons:", addonItems);

  return productData;
};

    // --- End: The Correct processProductItem function ---

    const productPayload = processProductItem(product);

    const payload = {
      amount: calculatedAmount.toFixed(2).toString(),
      total_tax: "10", 
      total_discount: "10",
      notes: "note",
      products: [productPayload],
      source: "web",
      financials: [
        {
          id: "1",
          amount: calculatedAmount.toFixed(2).toString(),
        },
      ],
      cashier_id: cashierId.toString(),
      table_id: tableId.toString(),
    };

    console.log("Payload to send:", JSON.stringify(payload, null, 2));

    const response = await postData("cashier/dine_in_order", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    let successMessage = `${product.name} added to order successfully!`;
    toast.success(successMessage);
    console.log("Backend submission successful:", response);
    return response;

  } catch (err) {
    console.error("Failed to submit item to backend", err);
    let errorMessage = `Failed to add "${product.name}" to order. Please try again.`;
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

