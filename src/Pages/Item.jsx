import React, { useState, useMemo, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost"; // تأكدي إن usePost يستخدم useCallback
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
  // === State Management ===
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");

  // === Group Product States ===
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [groupProducts, setGroupProducts] = useState([]);
  const [favouriteCategories, setFavouriteCategories] = useState([]);
  const [groupProductsData, setGroupProductsData] = useState(null);

  // === Order Type ===
  const orderType = sessionStorage.getItem("order_type") || "dine_in";

  // === Custom Hooks ===
  const { deliveryUserData, userLoading, userError } = useDeliveryUser(orderType);
  const { postData: postOrder, loading: orderLoading } = usePost();
  const { postData: postFavourite } = usePost();
  const { postData: postProductInCat } = usePost();

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

  // === Branch ID Sync ===
  useEffect(() => {
    const storedBranchId = sessionStorage.getItem("branch_id");
    if (storedBranchId !== branchIdState) {
      setBranchIdState(storedBranchId);
    }
  }, [branchIdState]);

  // === 1. Fetch Group Products (Modules) ===
  const groupEndpoint = branchIdState ? `cashier/group_product` : null;
  const { data: groupData, isLoading: groupLoading, error: groupError } = useGet(groupEndpoint);

  useEffect(() => {
    if (groupData?.group_product) {
      setGroupProducts(groupData.group_product);
    }
  }, [groupData]);

  // === 2. Restore Last Selected Group ===
  useEffect(() => {
    if (groupProducts.length > 0) {
      const saved = sessionStorage.getItem("last_selected_group");
      const validGroup = groupProducts.find(g => g.id === parseInt(saved));
      if (validGroup) {
        setSelectedGroup(validGroup.id.toString());
      } else if (saved && saved !== "all") {
        sessionStorage.removeItem("last_selected_group");
      }
    }
  }, [groupProducts]);

  // === 3. Fetch Favourite Categories ===
  const categoryFavouriteEndpoint = useMemo(() => {
    if (!branchIdState || selectedGroup === "all") return null;
    return `cashier/group_product/favourite`;
  }, [branchIdState, selectedGroup]);

  useEffect(() => {
    if (selectedGroup !== "all" && branchIdState && categoryFavouriteEndpoint) {
      postFavourite(categoryFavouriteEndpoint, {
        group_id: parseInt(selectedGroup),
        branch_id: parseInt(branchIdState),
      })
        .then((res) => {
          setFavouriteCategories(res?.categories || []);
        })
        .catch((err) => {
          console.error("Failed to fetch categories:", err);
          setFavouriteCategories([]);
        });
    } else {
      setFavouriteCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup, branchIdState, categoryFavouriteEndpoint]);

  // === 4. Fetch Products in Category ===
  const productInCategoryEndpoint = useMemo(() => {
    if (!branchIdState || selectedGroup === "all" || selectedCategory === "all") return null;
    return `cashier/group_product/product_in_category/${selectedCategory}`;
  }, [branchIdState, selectedGroup, selectedCategory]);

  useEffect(() => {
    if (selectedGroup !== "all" && selectedCategory !== "all" && productInCategoryEndpoint) {
      postProductInCat(productInCategoryEndpoint, { 
        branch_id: parseInt(branchIdState),
        group_id: parseInt(selectedGroup)  // تم إضافته هنا
      })
        .then((res) => {
          setGroupProductsData(res);
        })
        .catch((err) => {
          console.error("Failed to fetch products:", err);
          setGroupProductsData(null);
        });
    } else {
      setGroupProductsData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedGroup, branchIdState, productInCategoryEndpoint]);

  // === 5. Original Endpoints (All Modules) ===
  const productEndpoint = useMemo(() => {
    if (!branchIdState) return null;
    if (selectedCategory === "all") {
      return fetchEndpoint || `captain/lists?branch_id=${branchIdState}`;
    }
    return `captain/product_category_lists/${selectedCategory}?branch_id=${branchIdState}`;
  }, [branchIdState, selectedCategory, fetchEndpoint]);

  const categoryEndpoint = fetchEndpoint || (branchIdState ? `captain/lists?branch_id=${branchIdState}` : null);
  const { data: categoryData, isLoading: isCategoryLoading, error: categoryError } = useGet(categoryEndpoint);
  const { data: productData, isLoading: isProductLoading, error: productError } = useGet(productEndpoint);

  // === 6. Final Data ===
  const finalCategories = selectedGroup === "all" ? categoryData?.categories || [] : favouriteCategories;

  const allProducts = useMemo(() => {
    if (selectedGroup !== "all" && groupProductsData) {
      return productType === "weight"
        ? groupProductsData.products_weight || []
        : groupProductsData.products || [];
    }
    return productType === "weight"
      ? productData?.products_weight || []
      : productData?.products || [];
  }, [productData, groupProductsData, productType, selectedGroup]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allProducts, searchQuery]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  // === Handlers ===
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const handleProductTypeChange = (type) => {
    setProductType(type);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const handleShowMoreProducts = () => {
    setVisibleProductCount((prev) => prev + PRODUCTS_PER_ROW * INITIAL_PRODUCT_ROWS);
  };

  const handleGroupChange = (groupId) => {
    const id = groupId === "all" ? "all" : groupId.toString();  // تم تعديله للحفاظ على string
    sessionStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setSelectedCategory("all");
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const createTempId = (productId) => {
    return `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // === Handle Add to Order ===
  const handleAddToOrder = async (product, customQuantity = 1) => {
    let productBasePrice = product.price_after_discount ?? product.price ?? 0;
    const allSelectedVariationsData = [];
    const selectedVariations = product.selectedVariation || selectedVariation || {};
    const productSelectedExtras = product.selectedExtras || selectedExtras || [];
    const productSelectedExcludes = product.selectedExcludes || selectedExcludes || [];

    // Variations
    if (product.variations && Object.keys(selectedVariations).length > 0) {
      product.variations.forEach((variation) => {
        if (variation.type === "single" && selectedVariations[variation.id]) {
          const opt = variation.options.find((o) => o.id === selectedVariations[variation.id]);
          if (opt) {
            productBasePrice = opt.price_after_tax ?? opt.price;
            allSelectedVariationsData.push({
              variation_id: variation.id,
              option_id: opt.id,
              variation_name: variation.name,
              option_name: opt.name,
              price: opt.price_after_tax ?? opt.price,
            });
          }
        } else if (variation.type === "multiple" && Array.isArray(selectedVariations[variation.id])) {
          selectedVariations[variation.id].forEach((optId) => {
            const opt = variation.options.find((o) => o.id === optId);
            if (opt) {
              productBasePrice += opt.price_after_tax ?? opt.price;
              allSelectedVariationsData.push({
                variation_id: variation.id,
                option_id: opt.id,
                variation_name: variation.name,
                option_name: opt.name,
                price: opt.price_after_tax ?? opt.price,
              });
            }
          });
        }
      });
    }

    // Extras
    const groupedExtras = () => {
      if (!productSelectedExtras.length) return [];
      const counts = {};
      productSelectedExtras.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
      return Object.entries(counts).map(([id, count]) => ({ addon_id: id, count: count.toString() }));
    };

    let addonsTotalPrice = 0;
    if (productSelectedExtras.length > 0) {
      const counts = {};
      productSelectedExtras.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
      Object.keys(counts).forEach((id) => {
        const addon = (product.addons || []).find((a) => a.id === parseInt(id)) ||
                     (product.allExtras || []).find((e) => e.id === parseInt(id));
        if (addon) {
          const price = addon.price_after_discount ?? addon.price ?? 0;
          addonsTotalPrice += price * counts[id];
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
      productType,
      ...(orderType === "dine_in" && { preparation_status: "pending" }),
    };

    onAddToOrder(orderItem);

    if (orderType === "dine_in") {
      try {
        await submitItemToBackend(postOrder, orderItem, customQuantity, orderType);
        if (refreshCartData) await refreshCartData();
        toast.success(`"${product.name}" added successfully!`);
      } catch (error) {
        console.error("Error submitting item:", error);
        toast.error(`Failed to submit "${product.name}"`);
      }
    } else {
      if (!toast.isActive(product.id)) {
        toast.success(`"${product.name}" added successfully!`, { toastId: product.id });
      }
    }
  };

  const handleAddFromModal = (enhancedProduct) => {
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity);
  };

  // === Loading & Error States ===
  const isAnyLoading = isCategoryLoading || isProductLoading || groupLoading || orderLoading;
  const hasError = categoryError || productError || groupError;

  if (isAnyLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>Error loading data. Please try again later.</p>
      </div>
    );
  }

  if (!branchIdState) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please select a branch to view items.
      </div>
    );
  }

  // === Render UI ===
  return (
    <div className="">
      {/* Select Category + Group Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 my-2">
      <h2 className="text-bg-primary text-2xl font-bold mb-4 flex flex-wrap items-center gap-4">
        Select Category
         </h2>
        <select
          value={selectedGroup}
          onChange={(e) => handleGroupChange(e.target.value)}
          disabled={groupLoading || !branchIdState}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-bg-primary bg-white text-gray-700 font-medium"
        >
          <option value="all">All Modules</option>
          {groupProducts.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
     

      <DeliveryInfo
        orderType={orderType}
        deliveryUserData={deliveryUserData}
        userLoading={userLoading}
        userError={userError}
        onClose={onClose}
      />

      <CategorySelector
        categories={finalCategories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      <div className="my-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h2 className="text-bg-primary text-2xl font-bold">Select Product</h2>
            <select
              value={productType}
              onChange={(e) => handleProductTypeChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-bg-primary bg-white text-gray-700 font-medium"
            >
              <option value="piece">By Piece</option>
              <option value="weight">By Weight</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-bg-primary"
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 px-5 mb-8 rounded-lg max-h-[500px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-8">
              No products found for "
              {selectedCategory === "all"
                ? "All Categories"
                : finalCategories.find((cat) => cat.id === selectedCategory)?.name || "Selected Category"}
              " ({productType === "weight" ? "By Weight" : "By Piece"}).
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
        productType={productType}
      />

      {orderLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Loading />
        </div>
      )}
    </div>
  );
}