// Inside Item.jsx - Modified version with Product Modal
import { useGet } from "@/Hooks/useGet";
import React, { useState, useMemo, useEffect } from "react";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { Minus, Plus } from "lucide-react";

// Define how many products to show initially and how many to add per click
const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ fetchEndpoint, onAddToOrder }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const orderType = localStorage.getItem("order_type") || "dine_in";
  const [visibleProductCount, setVisibleProductCount] = useState(
    PRODUCTS_TO_SHOW_INITIALLY
  );

  // Add states for product modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  // Add usePost hook for sending orders
  const { postData, loading: orderLoading } = usePost();

  // Manage branch_id in state for consistent hook calls
  const [branchIdState, setBranchIdState] = useState(
    localStorage.getItem("branch_id")
  );

  useEffect(() => {
    const storedBranchId = localStorage.getItem("branch_id");
    if (storedBranchId !== branchIdState) {
      setBranchIdState(storedBranchId);
    }
  }, [branchIdState]);

  const requestEndpoint =
    fetchEndpoint ||
    (branchIdState ? `captain/lists?branch_id=${branchIdState}` : null);

  const { data, isLoading, error } = useGet(requestEndpoint);

  const allProducts = data?.products || [];

  // Filter products based on selectedCategory
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

  // Function to open product modal
  const openProductModal = (product) => {
    setSelectedProduct(product);
    // If variations exist, set the first one as default and calculate initial price
    if (product.variations && product.variations.length > 0) {
      setSelectedVariation(product.variations[0].id);
      setTotalPrice(
        product.variations[0].price_after_discount ??
          product.variations[0].price
      );
    } else {
      setSelectedVariation(null);
      setTotalPrice(product.price_after_discount ?? product.price);
    }
    setSelectedExtras([]);
    setQuantity(1);
    setIsProductModalOpen(true);
  };

  // Function to close product modal
  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
    setSelectedVariation(null);
    setSelectedExtras([]);
    setQuantity(1);
  };

  // Function to handle variation (size) change
  const handleVariationChange = (variationId) => {
    setSelectedVariation(variationId);
  };

  // Function to handle extra (addon) selection change
  const handleExtraChange = (extraId) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId]
    );
  };

  // useEffect to recalculate total price whenever quantity, variation, or extras change
  useEffect(() => {
    // This is the key fix: only run the calculation if selectedProduct is not null
    if (!selectedProduct) {
      setTotalPrice(0);
      return;
    }

    let currentPrice = 0;

    // Calculate base price from selected variation or main product price
    if (selectedVariation) {
      const variation = selectedProduct.variations.find(
        (v) => v.id === selectedVariation
      );
      if (variation) {
        currentPrice += variation.price_after_discount ?? variation.price;
      }
    } else {
      currentPrice +=
        selectedProduct.price_after_discount ?? selectedProduct.price;
    }

    // Add prices from selected extras
    selectedExtras.forEach((extraId) => {
      const addon = selectedProduct.addons.find(
        (addon) => addon.id === extraId
      );
      if (addon) {
        currentPrice += addon.price_after_discount ?? addon.price;
      }
    });

    setTotalPrice(currentPrice * quantity);
  }, [quantity, selectedVariation, selectedExtras, selectedProduct]);

  // Function to submit item to backend
  const submitItemToBackend = async (product, quantity = 1) => {
    const cashierId = localStorage.getItem("cashier_id");
    const tableId = localStorage.getItem("table_id");

    const endpoint =
      orderType === "dine_in"
        ? "cashier/dine_in_order"
        : orderType === "delivery"
        ? "cashier/delivery_order"
        : "cashier/take_away_order";

    const payload = {
      products: [{ product_id: product.id, count: quantity }],
      source: "web",
      financials: [],
      cashier_id: cashierId,
      amount: product.price * quantity,
      total_tax: 0,
      total_discount: 0,
      notes:
        orderType === "dine_in"
          ? "Auto-sent at pending stage"
          : "Customer order",
      ...(orderType === "dine_in" && { table_id: tableId }),
    };

    try {
      const response = await postData(endpoint, payload);
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

  // Modified handleAddToOrder function
  const handleAddToOrder = async (product, customQuantity = 1) => {
    onAddToOrder({
      ...product,
      count: customQuantity,
      ...(orderType === "dine_in" && { preparation_status: "pending" }),
    });

    try {
      await submitItemToBackend(product, customQuantity);
      toast.success(`${product.name} added to order successfully!`);
    } catch (error) {
      console.error("Error submitting item to backend:", error);
      toast.error(`Failed to submit "${product.name}" to backend`);
    }
  };

  // Handle adding to cart from modal
  const handleAddFromModal = () => {
    if (selectedProduct) {
      handleAddToOrder(selectedProduct, quantity);
      closeProductModal();
    }
  };

  // Handle loading and error states
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

  const categories = data?.categories || [];

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
  };

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  const handleShowMoreProducts = () => {
    setVisibleProductCount(
      (prevCount) => prevCount + PRODUCTS_PER_ROW * INITIAL_PRODUCT_ROWS
    );
  };

  return (
    <div className="">
      {/* Select Category Section */}
      <h2 className="text-bg-primary text-2xl font-bold mb-4">
        Select Category
      </h2>

      {categories.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No categories found.
        </div>
      ) : (
        <div className="flex flex-nowrap w-[100%] space-x-4 pb-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ">
          {/* "All" button */}
          <div className="flex-shrink-0">
            <Button
              onClick={() => handleCategorySelect("all")}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[80px] h-[100px] transition-all ${
                selectedCategory === "all"
                  ? "bg-bg-primary text-white hover:bg-red-700"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="w-10 h-10 mb-1 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-bg-primary font-bold">🍽️</span>
              </div>
              <span className="text-sm font-semibold">All</span>
            </Button>
          </div>

          {/* Dynamic categories */}
          {categories.map((category) => (
            <div key={category.id} className="flex-shrink-0">
              <Button
                onClick={() => handleCategorySelect(category.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[80px] h-[100px] transition-all ${
                  selectedCategory === category.id
                    ? "bg-bg-primary text-white hover:bg-red-700"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <img
                  src={category.image_link || "https://via.placeholder.com/40"}
                  alt={category.name}
                  className="w-10 h-10 mb-1 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/40";
                  }}
                />
                <span className="text-sm font-semibold capitalize text-center">
                  {category.name}
                </span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Select Product Section */}
      <div className="my-8 ">
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
              {/* Modified div for grid layout of products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 pb-4 py-3">
                {productsToDisplay.map((product) => (
                  <div
                    className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 relative pb-16"
                    key={product.id}
                  >
                    {/* Clickable image and name - NOW OPENS MODAL */}
                    <div
                      onClick={() => openProductModal(product)}
                      className="cursor-pointer"
                    >
                      <img
                        src={
                          product.image_link ||
                          "https://via.placeholder.com/150"
                        }
                        alt={product.name}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3">
                        <h3 className="text-base font-semibold text-gray-800 truncate">
                          {product.name}
                        </h3>
                      </div>
                    </div>

                    {/* Description button that opens modal */}
                    {product.description && product.description !== "null" && (
                      <div className="px-3 -mt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="text-xs text-bg-primary underline mt-1">
                              Description
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Description</DialogTitle>
                              <DialogDescription>
                                {product.description}
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {/* Price */}
                    <div className="px-3">
                      <div className="mt-1 text-sm font-bold text-bg-primary">
                        {product.price_after_discount !== null &&
                        product.price_after_discount < product.price ? (
                          <>
                            <span className="text-red-600 line-through mr-1">
                              {product.price} EGP
                            </span>
                            <span>{product.price_after_discount} EGP</span>
                          </>
                        ) : (
                          <span>{product.price} EGP</span>
                        )}
                      </div>
                    </div>

                    {/* Add to Order - Updated with loading state */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-white">
                      <button
                        onClick={() => handleAddToOrder(product)}
                        disabled={orderLoading}
                        className={`w-full py-1 px-2 text-sm rounded transition-colors ${
                          orderLoading
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-bg-primary text-white hover:bg-red-700"
                        }`}
                      >
                        {orderLoading ? "Adding..." : "Add to Order"}
                      </button>
                    </div>
                  </div>
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

{/* Product Modal */}
<Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
  <DialogContent className="w-[90vw] !max-w-[500px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
    {selectedProduct && (
      <div className="flex flex-col">
        {/* Top Section: Image and Close Button */}
        <div className="relative">
          <img
            src={
              selectedProduct.image_link ||
              "https://via.placeholder.com/400"
            }
            alt={selectedProduct.name}
            className="w-full h-48 object-cover"
          />
          <button
            onClick={closeProductModal}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {selectedProduct.discount && (
            <div className="absolute bottom-4 left-4 bg-white text-red-600 font-bold px-3 py-1 rounded-full text-xs">
              {selectedProduct.discount.amount}% Off
            </div>
          )}
        </div>

        {/* Middle Section: Details, Variations, and Addons */}
        <div className="p-4 flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-gray-800">
              {selectedProduct.name}
            </h3>
            <span className="text-xl font-semibold text-red-600">
              {/* The fix is to ensure totalPrice is a number before calling toFixed */}
              ${(totalPrice || 0).toFixed(2)} EGP
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            {selectedProduct.description &&
            selectedProduct.description !== "null"
              ? selectedProduct.description
              : "No description available."}
          </p>

          {/* Sizes section (from variations data) */}
          {selectedProduct.variations &&
            selectedProduct.variations.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Size (Required)
                </h4>
                <div className="space-y-2">
                  {selectedProduct.variations.map((variation) => (
                    <label
                      key={variation.id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="radio"
                        name="variation"
                        value={variation.id}
                        checked={selectedVariation === variation.id}
                        onChange={() =>
                          handleVariationChange(variation.id)
                        }
                        className="form-radio h-4 w-4 text-red-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {variation.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

          {/* Addons section - MODIFIED */}
          {selectedProduct.addons &&
            selectedProduct.addons.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Addons (Optional)
                </h4>
                <div className="flex flex-wrap gap-2"> {/* Added `flex-wrap` here */}
                  {selectedProduct.addons.map((addon) => (
                    <button
                      key={addon.id}
                      onClick={() => handleExtraChange(addon.id)}
                      className={`
                        flex-col items-center justify-center p-2 rounded-lg border-2 text-sm font-medium
                        ${
                          selectedExtras.includes(addon.id)
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                        }
                      `}
                    >
                      <span className="capitalize">{addon.name}</span>
                      <span className="text-xs">
                        ($
                        {(
                          addon.price_after_discount ?? addon.price
                        ).toFixed(2)}
                        )
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Excludes section */}
          {selectedProduct.excludes &&
            selectedProduct.excludes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Excludes:
                </h4>
                <ul className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {selectedProduct.excludes.map((item) => (
                    <li
                      key={item.id}
                      className="bg-gray-200 rounded-full px-2 py-1"
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* Bottom Section: Total and Quantity */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold">
              Total{" "}
              <span className="text-red-600">
                ${(totalPrice || 0).toFixed(2)} EGP
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors"
                onClick={() =>
                  setQuantity((prev) => Math.max(1, prev - 1))
                }
              >
                <Minus size={16} />
              </button>
              <span className="text-base font-semibold">{quantity}</span>
              <button
                className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                onClick={() => setQuantity((prev) => prev + 1)}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <Button
            className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors"
            onClick={handleAddFromModal}
            disabled={orderLoading}
          >
            Update Cart
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>

      {/* Show loading indicator if order is being processed */}
      {orderLoading && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <Loading />
        </div>
      )}
    </div>
  );
}
