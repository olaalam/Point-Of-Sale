// Item.jsx - Main Component (Fixed Pricing Logic)
import React, { useState, useMemo, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";

// Import custom hooks and components
import { useDeliveryUser } from "@/hooks/useDeliveryUser";
import { useProductModal } from "@/hooks/useProductModal";
import { submitItemToBackend } from "@/services/orderService";
import DeliveryInfo from "./DeliveryInfo";
import CategorySelector from "./CategorySelector";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";

// Define constants
const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ fetchEndpoint, onAddToOrder }) {
  // State management
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(localStorage.getItem("branch_id"));

  // Get order type
  const orderType = localStorage.getItem("order_type") || "dine_in";

  // Custom hooks
  const { deliveryUserData, userLoading, userError } = useDeliveryUser(orderType);
  const { postData, loading: orderLoading } = usePost();
  
  const {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    quantity,
    totalPrice,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    setQuantity,
  } = useProductModal();

  // Branch ID management
  useEffect(() => {
    const storedBranchId = localStorage.getItem("branch_id");
    if (storedBranchId !== branchIdState) {
      setBranchIdState(storedBranchId);
    }
  }, [branchIdState]);

  // API endpoint
  const requestEndpoint =
    fetchEndpoint ||
    (branchIdState ? `captain/lists?branch_id=${branchIdState}` : null);

  const { data, isLoading, error } = useGet(requestEndpoint);

  // Data processing
  const allProducts = data?.products || [];
  const categories = data?.categories || [];

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchCategory =
        selectedCategory === "all" || product.category_id === selectedCategory;
      const matchSearch = product.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery, allProducts]);

  // Products to display
  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  // Event handlers
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
  };

  const handleShowMoreProducts = () => {
    setVisibleProductCount(
      (prevCount) => prevCount + PRODUCTS_PER_ROW * INITIAL_PRODUCT_ROWS
    );
  };

  // FIXED handleAddToOrder function - Uses correct pricing after discount
  const handleAddToOrder = async (product, customQuantity = 1) => {
    console.log("Adding product to order:", product);
    
    // FIXED: Calculate correct base price (use discounted price if available)
    const productBasePrice = product.price_after_discount ?? product.price ?? 0;
    console.log("Product base price (after discount):", productBasePrice);
    console.log("Original price:", product.price);
    console.log("Discounted price:", product.price_after_discount);

    // Calculate addons price correctly
    let addonsTotalPrice = 0;
    if (product.selectedAddons && product.selectedAddons.length > 0) {
      addonsTotalPrice = product.selectedAddons.reduce((sum, addon) => {
        const addonPrice = addon.price_after_discount ?? addon.price ?? 0;
        console.log(`Addon ${addon.name}: ${addonPrice}`);
        return sum + addonPrice;
      }, 0);
    }
    console.log("Total addons price:", addonsTotalPrice);

    // Calculate final price per unit (base + addons)
    const pricePerUnit = productBasePrice + addonsTotalPrice;
    console.log("Price per unit (base + addons):", pricePerUnit);

    // Calculate total price with quantity
    const finalTotalPrice = pricePerUnit * customQuantity;
    console.log("Final total price:", finalTotalPrice);

    // Create the order item with correct pricing
    const orderItem = {
      ...product,
      count: customQuantity,
      // FIXED: Use the correct price per unit (after discount + addons)
      price: pricePerUnit, 
      // Keep original prices for reference
      originalPrice: product.price,
      discountedPrice: product.price_after_discount,
      // Total price for this line item
      totalPrice: finalTotalPrice,
      // Include addons data
      selectedAddons: product.selectedAddons || [],
      ...(orderType === "dine_in" && { preparation_status: "pending" }),
    };

    console.log("Order item being added:", orderItem);

    // Add item to local state (the cart)
    onAddToOrder(orderItem);

    // Show success message
    const itemName = product.name;
    const addonsText = product.selectedAddons?.length > 0
      ? ` with ${product.selectedAddons.map((addon) => addon.name).join(", ")}`
      : "";

    const priceText = product.price_after_discount 
      ? `${product.price_after_discount} EGP (was ${product.price} EGP)`
      : `${product.price} EGP`;

    toast.success(`${itemName}${addonsText} added to cart! Price: ${priceText}`);

    // Conditionally call the backend submission function
    if (orderType === "dine_in") {
      try {
        await submitItemToBackend(postData, product, customQuantity, orderType);
      } catch (error) {
        console.error("Error submitting item to backend:", error);
        toast.error(`Failed to submit "${product.name}" to backend`);
      }
    }
  };

  // Handle adding to cart from modal - FIXED VERSION
  const handleAddFromModal = (enhancedProduct) => {
    console.log("Adding from modal:", enhancedProduct);
    // Use the enhanced product data from the modal
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity);
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>Error loading categories. Please try again later.</p>
      </div>
    );
  }

  if (!data && !isLoading && !error && requestEndpoint === null) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please select a branch to view items.
      </div>
    );
  }

  // Main render
  return (
    <div className="">
      {/* Select Category Section */}
      <h2 className="text-bg-primary text-2xl font-bold mb-4">
        Select Category
      </h2>

      {/* User Info Section for Delivery Orders */}
      <DeliveryInfo
        orderType={orderType}
        deliveryUserData={deliveryUserData}
        userLoading={userLoading}
        userError={userError}
      />

      {/* Category Selector */}
      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* Select Product Section */}
      <div className="my-8">
        <div className="flex items-center justify-between mb-4 me-3">
          <h2 className="text-bg-primary text-2xl font-bold">Select Product</h2>
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ml-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-bg-primary"
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 px-5 mb-8 rounded-lg max-h-[500px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-500 text-lg">
              No products found for "
              {selectedCategory === "all"
                ? "All Categories"
                : categories.find((cat) => cat.id === selectedCategory)?.name ||
                  "Selected Category"}
              ".
            </div>
          ) : (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 pb-4 py-3">
                {productsToDisplay.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToOrder={handleAddToOrder}
                    onOpenModal={openProductModal}
                    orderLoading={orderLoading}
                  />
                ))}
              </div>

              {/* Show More Button */}
              {visibleProductCount < filteredProducts.length && (
                <div className="flex justify-center my-3">
                  <Button
                    onClick={handleShowMoreProducts}
                    className="bg-bg-primary text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Show More Products
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Product Modal - FIXED VERSION */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        selectedProduct={selectedProduct}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        quantity={quantity}
        totalPrice={totalPrice}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddFromModal}
        orderLoading={orderLoading}
      />

      {/* Show loading indicator if order is being processed */}
      {orderLoading && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <Loading />
        </div>
      )}
    </div>
  );
}