import React, { useState, useMemo, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useDeliveryUser } from "@/Hooks/useDeliveryUser";
import { useProductModal } from "@/Hooks/useProductModal";
import { submitItemToBackend } from "@/services/orderService";
import DeliveryInfo from "./Delivery/DeliveryInfo";
import CategorySelector from "./CategorySelector";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";

const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ fetchEndpoint, onAddToOrder, onClose, refreshCartData }) {
  // State management
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));

  // Get order type
  const orderType = sessionStorage.getItem("order_type") || "dine_in";

  // Custom hooks
  const { deliveryUserData, userLoading, userError } = useDeliveryUser(orderType);
  const { postData, loading: orderLoading } = usePost();
  const {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExclusionChange,
    setQuantity,
    handleExtraDecrement,
  } = useProductModal();

  // Branch ID management
  useEffect(() => {
    const storedBranchId = sessionStorage.getItem("branch_id");
    if (storedBranchId !== branchIdState) {
      setBranchIdState(storedBranchId);
    }
  }, [branchIdState]);

  // API endpoint for products
  const productEndpoint = useMemo(() => {
    if (!branchIdState) return null;
    if (selectedCategory === "all") {
      return fetchEndpoint || `captain/lists?branch_id=${branchIdState}`;
    }
    return `captain/product_category_lists/${selectedCategory}?branch_id=${branchIdState}`;
  }, [branchIdState, selectedCategory, fetchEndpoint]);

  // Fetch categories separately (assuming they come from the same or a different endpoint)
  const categoryEndpoint = fetchEndpoint || (branchIdState ? `captain/lists?branch_id=${branchIdState}` : null);
  const { data: categoryData, isLoading: isCategoryLoading, error: categoryError } = useGet(categoryEndpoint);

  // Fetch products
  const { data: productData, isLoading, error } = useGet(productEndpoint);

  // Data processing
  const allProducts = productData?.products || [];
  const categories = categoryData?.categories || [];

  // Filter products by search query (client-side, assuming backend doesn't support search)
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allProducts, searchQuery]);

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

  // Helper function to create temp_id
  const createTempId = (productId) => {
    return `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Handle add to order
  const handleAddToOrder = async (product, customQuantity = 1) => {
    console.log("Adding product to order:", product);

    let productBasePrice = product.price_after_discount ?? product.price ?? 0;
    const allSelectedVariationsData = [];

    const selectedVariations = product.selectedVariation || selectedVariation || {};
    const productSelectedExtras = product.selectedExtras || selectedExtras || [];
    const productSelectedExcludes = product.selectedExcludes || selectedExcludes || [];

    // Handle variations
    if (product.variations && Object.keys(selectedVariations).length > 0) {
      product.variations.forEach((variation) => {
        if (variation.type === "single" && selectedVariations[variation.id]) {
          const selectedOption = variation.options.find(
            (opt) => opt.id === selectedVariations[variation.id]
          );
          if (selectedOption) {
            productBasePrice = selectedOption.price_after_tax ?? selectedOption.price;
            allSelectedVariationsData.push({
              variation_id: variation.id,
              option_id: selectedOption.id,
              variation_name: variation.name,
              option_name: selectedOption.name,
              price: selectedOption.price_after_tax ?? selectedOption.price,
            });
          }
        } else if (
          variation.type === "multiple" &&
          selectedVariations[variation.id] &&
          Array.isArray(selectedVariations[variation.id])
        ) {
          selectedVariations[variation.id].forEach((optionId) => {
            const selectedOption = variation.options.find((opt) => opt.id === optionId);
            if (selectedOption) {
              productBasePrice += selectedOption.price_after_tax ?? selectedOption.price;
              allSelectedVariationsData.push({
                variation_id: variation.id,
                option_id: selectedOption.id,
                variation_name: variation.name,
                option_name: selectedOption.name,
                price: selectedOption.price_after_tax ?? selectedOption.price,
              });
            }
          });
        }
      });
    }

    // Grouped extras format for backend
    const groupedExtras = () => {
      if (!productSelectedExtras || productSelectedExtras.length === 0) {
        return [];
      }

      const extraCounts = {};
      productSelectedExtras.forEach((extraId) => {
        const id = extraId.toString();
        extraCounts[id] = (extraCounts[id] || 0) + 1;
      });

      return Object.keys(extraCounts).map((addonId) => ({
        addon_id: addonId,
        count: extraCounts[addonId].toString(),
      }));
    };

    // Calculate addons price for display
    let addonsTotalPrice = 0;
    const selectedAddonsData = [];

    if (productSelectedExtras.length > 0) {
      const addonCounts = {};
      productSelectedExtras.forEach((extraId) => {
        addonCounts[extraId] = (addonCounts[extraId] || 0) + 1;
      });

      Object.keys(addonCounts).forEach((extraId) => {
        if (product.addons) {
          const addon = product.addons.find((a) => a.id === parseInt(extraId));
          if (addon) {
            const addonPrice = addon.price_after_discount ?? addon.price ?? 0;
            const count = addonCounts[extraId];
            addonsTotalPrice += addonPrice * count;
            selectedAddonsData.push({
              addon_id: addon.id,
              name: addon.name,
              price: addonPrice,
              count: count,
            });
          }
        }

        if (product.allExtras) {
          const extra = product.allExtras.find((e) => e.id === parseInt(extraId));
          if (extra) {
            const extraPrice = extra.price_after_discount ?? extra.price ?? 0;
            const count = addonCounts[extraId];
            addonsTotalPrice += extraPrice * count;
            selectedAddonsData.push({
              addon_id: extra.id,
              name: extra.name,
              price: extraPrice,
              count: count,
            });
          }
        }
      });
    }

    const pricePerUnit = productBasePrice + addonsTotalPrice;
    const finalTotalPrice = pricePerUnit * customQuantity;

    const orderItem = {
      ...product,
      id: product.id,
      temp_id: createTempId(product.id),
      count: customQuantity,
      price: pricePerUnit,
      originalPrice: product.price,
      discountedPrice: product.price_after_discount,
      totalPrice: finalTotalPrice,
      allSelectedVariations: allSelectedVariationsData,
      selectedVariation: selectedVariations,
      selectedAddons: groupedExtras(),
      selectedExtras: groupedExtras(),
      selectedExcludes: productSelectedExcludes,
      ...(orderType === "dine_in" && { preparation_status: "pending" }),
    };

    console.log("Final order item with grouped extras:", orderItem);
    console.log("Grouped extras format:", groupedExtras());

    onAddToOrder(orderItem);

    if (orderType === "dine_in") {
      try {
        await submitItemToBackend(postData, orderItem, customQuantity, orderType);
        console.log("Item submitted to backend successfully");
        if (refreshCartData && typeof refreshCartData === "function") {
          console.log("Refreshing cart data...");
          await refreshCartData();
        }
        toast.success(`"${product.name}" added successfully!`);
      } catch (error) {
        console.error("Error submitting item to backend:", error);
        toast.error(`Failed to submit "${product.name}" to backend`);
      }
    } else {
      toast.success(`"${product.name}" added to cart!`);
    }
  };

  const handleAddFromModal = (enhancedProduct) => {
    console.log("Adding from modal:", enhancedProduct);
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity);
  };

  if (isCategoryLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }

  if (categoryError || error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>Error loading data. Please try again later.</p>
      </div>
    );
  }

  if (!categoryData && !isCategoryLoading && !categoryError && categoryEndpoint === null) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please select a branch to view items.
      </div>
    );
  }

  return (
    <div className="">
      <h2 className="text-bg-primary text-2xl font-bold mb-4">
        Select Category
      </h2>

      <DeliveryInfo
        orderType={orderType}
        deliveryUserData={deliveryUserData}
        userLoading={userLoading}
        userError={userError}
        onClose={onClose}
      />

      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

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

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        selectedProduct={selectedProduct}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        selectedExcludes={selectedExcludes}
        quantity={quantity}
        totalPrice={totalPrice}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onExclusionChange={handleExclusionChange}
        onExtraDecrement={handleExtraDecrement}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddFromModal}
        orderLoading={orderLoading}
      />

      {orderLoading && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <Loading />
        </div>
      )}
    </div>
  );
}