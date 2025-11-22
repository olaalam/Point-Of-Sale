import React, { useState, useMemo, useEffect, useCallback } from "react";
import { usePost } from "@/Hooks/usePost";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useDeliveryUser } from "@/Hooks/useDeliveryUser";
import { useProductModal } from "@/Hooks/useProductModal";
import { submitItemToBackend } from "@/services/orderService";
import DeliveryInfo from "./Delivery/DeliveryInfo";
import CategorySelector from "./CategorySelector";
import ProductCard from "./ProductCard";
import ProductModal, { areProductsEqual } from "./ProductModal";
import { useTranslation } from "react-i18next";
import { buildProductPayload } from "@/services/productProcessor";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://bcknd.food2go.online/";

const getAuthToken = () => sessionStorage.getItem("token");

const apiFetcher = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return res.json();
};

const apiPoster = async (path, body) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to post ${url}: ${res.statusText}`);
  return res.json();
};

const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({
  fetchEndpoint,
  onAddToOrder,
  onClose,
  refreshCartData,
  orderItems = [],
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const { t, i18n } = useTranslation();

  const orderType = sessionStorage.getItem("order_type") || "dine_in";

  const { deliveryUserData, userLoading, userError } = useDeliveryUser(orderType);
  const { postData: postOrder, loading: orderLoading } = usePost();

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

  useEffect(() => {
    const storedBranchId = sessionStorage.getItem("branch_id");
    if (storedBranchId !== branchIdState) {
      setBranchIdState(storedBranchId);
    }
  }, [branchIdState]);

  // ✅ Fetch Group Products (Modules)
  const groupEndpoint = branchIdState ? `cashier/group_product` : null;
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ["groupProducts", branchIdState],
    queryFn: () => apiFetcher(groupEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  const groupProducts = useMemo(() => {
    return groupData?.group_product || [];
  }, [groupData]);

  // ✅ Restore Last Selected Group
  useEffect(() => {
    if (groupProducts.length > 0) {
      const saved = sessionStorage.getItem("last_selected_group");
      const validGroup = groupProducts.find((g) => g.id === parseInt(saved));
      if (validGroup) {
        setSelectedGroup(validGroup.id.toString());
      } else if (saved && saved !== "all") {
        sessionStorage.removeItem("last_selected_group");
      }
    }
  }, [groupProducts]);

  // ✅ Fetch Favourite Categories (when module selected)
  const { data: favouriteCategoriesData, isLoading: isFavCatLoading } = useQuery({
    queryKey: ["favouriteCategories", selectedGroup, branchIdState],
    queryFn: () =>
      apiPoster(`cashier/group_product/favourite`, {
        group_id: parseInt(selectedGroup),
        branch_id: parseInt(branchIdState),
      }),
    enabled: selectedGroup !== "all" && !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  const favouriteCategories = useMemo(() => {
    return favouriteCategoriesData?.categories || [];
  }, [favouriteCategoriesData]);

  // ✅ Fetch All Products (All Modules)
  const allModulesEndpoint = useMemo(() => {
    return `captain/lists?branch_id=${branchIdState}&locale=${i18n.language}`;
  }, [branchIdState, i18n.language]);

  const { data: allModulesData, isLoading: isAllDataLoading, error: allModulesError } = useQuery({
    queryKey: ["allData", branchIdState, i18n.language],
    queryFn: () => apiFetcher(allModulesEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ Categories: All or Favourite
  const finalCategories = useMemo(() => {
    if (selectedGroup === "all") {
      return allModulesData?.categories || [];
    }
    return favouriteCategories;
  }, [selectedGroup, allModulesData, favouriteCategories]);

  // ✅ All Products (based on type)
  const allProducts = useMemo(() => {
    if (!allModulesData) return [];
    return productType === "weight"
      ? allModulesData?.products_weight || []
      : allModulesData?.products || [];
  }, [allModulesData, productType]);

  // ✅ Filter by Module (if not "all")
  const filteredProductsByModule = useMemo(() => {
    if (selectedGroup === "all") return allProducts;

    // Filter products that belong to categories in favouriteCategories
    const favCategoryIds = favouriteCategories.map((cat) => cat.id);
    return allProducts.filter((p) => favCategoryIds.includes(p.category_id));
  }, [allProducts, selectedGroup, favouriteCategories]);

  // ✅ Filter: البحث له الأولوية على الـ Category
// ✅ Filter: البحث له الأولوية على الـ Category
  const filteredProducts = useMemo(() => {
    let productsToFilter = filteredProductsByModule;

    // لو في سيرش، ابحث في كل المنتجات (تجاهل الـ category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return productsToFilter.filter((p) => {
        const matchName = p.name?.toLowerCase().includes(query);
        const matchCode = p.product_code?.toLowerCase().includes(query);
        return matchName || matchCode;
      });
    }

    // لو مفيش سيرش، فلتر حسب الـ category المختار
    if (selectedCategory !== "all") {
      productsToFilter = productsToFilter.filter(
        (p) => p.category_id === parseInt(selectedCategory)
      );
    }

    return productsToFilter;
  }, [filteredProductsByModule, selectedCategory, searchQuery]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

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
    const id = groupId === "all" ? "all" : groupId.toString();
    sessionStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setSelectedCategory("all");
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const createTempId = (productId) =>
    `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// داخل handleAddToOrder (قسم dine_in فقط)
const handleAddToOrder = useCallback(async (product, customQuantity = 1) => {
  // ✅ Calculate correct price (with discount priority)
  const itemPrice = parseFloat(
    product.price_after_discount || 
    product.price || 
    product.originalPrice || 
    0
  );

  // ❌ Block if price is 0 or invalid
  if (itemPrice <= 0) {
    console.error("❌ Invalid product price:", product);
    toast.error(t("InvalidProductPrice"));
    return;
  }

  const quantity = parseInt(customQuantity) || 1;
  const itemTotal = itemPrice * quantity;

  console.log("🛒 Adding product:", {
    name: product.name,
    itemPrice,
    quantity,
    itemTotal,
    orderType
  });

  // ✅ Handle take_away (no API call)
 if (orderType === "take_away" || orderType === "delivery") {
    const newItem = {
      ...product,
      temp_id: createTempId(product.id),
      count: quantity,
      price: itemPrice,
      originalPrice: itemPrice,
      totalPrice: itemTotal,
      preparation_status: "pending",
      notes: product.notes || "",
      allSelectedVariations: product.allSelectedVariations || [],
      selectedExtras: product.selectedExtras || [],
      selectedExcludes: product.selectedExcludes || [],
      selectedAddons: product.selectedAddons || [],
    };
    onAddToOrder(newItem);
    toast.success(t("ProductAddedToCart"));
    return;
  }

  // ✅ Handle dine_in (requires API)
  if (orderType === "dine_in") {
    const tableId = sessionStorage.getItem("table_id");
    if (!tableId) {
      toast.error(t("PleaseSelectTableFirst"));
      return;
    }

    const processedItem = buildProductPayload({
      ...product,
      price: itemPrice,
      count: quantity,
    });

    const payload = {
      table_id: tableId,
      cashier_id: sessionStorage.getItem("cashier_id"),
      amount: itemTotal.toFixed(2),
      total_tax: (itemTotal * 0.14).toFixed(2),
      total_discount: "0.00",
      notes: "Added from POS",
      source: "web",
      products: [processedItem],
    };

    try {
      const response = await postOrder("cashier/dine_in_order", payload, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ API Response:", response);

      // ✅ Extract cart_id from all possible locations
      let cartId = null;

      if (response?.cart_id) cartId = response.cart_id;
      else if (response?.id) cartId = response.id;
      else if (response?.success?.cart_id) cartId = response.success.cart_id;
      else if (response?.data?.cart_id) cartId = response.data.cart_id;
      else if (response?.data?.id) cartId = response.data.id;
      else if (Array.isArray(response?.products) && response.products[0]?.cart_id) {
        cartId = response.products[0].cart_id;
      }
      else if (Array.isArray(response?.data?.products) && response.data.products[0]?.cart_id) {
        cartId = response.data.products[0].cart_id;
      }

      // ✅ If cart_id not found, refresh from server
      if (!cartId) {
        console.error("❌ cart_id not found in response:", response);
        toast.warning("تم إضافة المنتج - جاري التحديث من السيرفر...");
        
        setTimeout(() => {
          refreshCartData?.();
        }, 500);
        return;
      }

      // ✅ Create item with cart_id
      const newItem = {
        ...product,
        temp_id: createTempId(product.id),
        count: quantity,
        price: itemPrice,
        originalPrice: itemPrice,
        totalPrice: itemTotal,
        cart_id: cartId.toString(),
        preparation_status: "pending",
        notes: product.notes || "",
        allSelectedVariations: product.allSelectedVariations || [],
        selectedExtras: product.selectedExtras || [],
        selectedExcludes: product.selectedExcludes || [],
        selectedAddons: product.selectedAddons || [],
      };

      onAddToOrder(newItem);
      toast.success(t("ProductAddedToTable", { table: tableId }));

    } catch (err) {
      console.error("❌ Dine-in order error:", err);
      toast.error(err.response?.data?.message || t("FailedToAddToTable"));
    }
  }
}, [orderType, onAddToOrder, postOrder, t, refreshCartData, createTempId]);

  const handleAddFromModal = (enhancedProduct, options = {}) => {
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity, options);
  };

  const isAnyLoading = isAllDataLoading || groupLoading || isFavCatLoading;

  if (isAnyLoading)
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );

  if (allModulesError)
    return (
      <div className="text-center text-red-500 p-4">
        <p>{t("ErrorLoadingData")}</p>
      </div>
    );

  if (!branchIdState)
    return <div className="text-center text-gray-500 py-8">{t("SelectBranchToViewItems")}</div>;

  const isArabic = i18n.language === "ar";

  return (
    <div
      className={`${isArabic ? "text-right direction-rtl" : "text-left direction-ltr"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Module Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 my-2">
        <h2 className="text-bg-primary text-2xl font-bold mb-4 flex flex-wrap items-center gap-4">
          {t("SelectCategory")}
        </h2>
        <select
          value={selectedGroup}
          onChange={(e) => handleGroupChange(e.target.value)}
          disabled={groupLoading || !branchIdState}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-bg-primary bg-white text-gray-700 font-medium"
        >
          <option value="all">{t("NormalPrices") || "All Modules"}</option>
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
            <h2 className="text-bg-primary text-2xl font-bold">{t("SelectProduct")}</h2>
            <select
              value={productType}
              onChange={(e) => handleProductTypeChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-bg-primary bg-white text-gray-700 font-medium"
            >
              <option value="piece">{t("ByPiece")}</option>
              <option value="weight">{t("ByWeight")}</option>
            </select>
          </div>

          <input
            type="text"
            placeholder={t("SearchByProductName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-bg-primary"
          />
        </div>

        <div className="bg-gray-50 border border-gray-200 px-5 mb-8 rounded-lg max-h-[500px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-8">
              {t("Noproductsfoundfor")} "
              {selectedCategory === "all"
                ? "All Categories"
                : finalCategories.find((cat) => cat.id === selectedCategory)?.name ||
                  t("SelectedCategory")}
              " ({productType === "weight" ? t("ByWeight") : t("ByPiece")}).
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
                    {t("ShowMoreProducts")}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loading />
        </div>
      )}
    </div>
  );
}