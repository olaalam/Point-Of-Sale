import React, { useState, useMemo, useEffect, useCallback } from "react";
import { usePost } from "@/Hooks/usePost";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useDeliveryUser } from "@/Hooks/useDeliveryUser";
import { useProductModal } from "@/Hooks/useProductModal";
import DeliveryInfo from "./Delivery/DeliveryInfo";
import CategorySelector from "./CategorySelector";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
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
  onAddToOrder,
  onClose,
  refreshCartData,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [showCategories, setShowCategories] = useState(false); // التحكم في ظهور قائمة التصنيفات
  
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

  const groupEndpoint = branchIdState ? `cashier/group_product` : null;
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ["groupProducts", branchIdState],
    queryFn: () => apiFetcher(groupEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  const groupProducts = useMemo(() => groupData?.group_product || [], [groupData]);

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

  const allModulesEndpoint = useMemo(() => {
    return `captain/lists?branch_id=${branchIdState}&locale=${i18n.language}`;
  }, [branchIdState, i18n.language]);

  const { data: allModulesData, isLoading: isAllDataLoading, error: allModulesError } = useQuery({
    queryKey: ["allData", branchIdState, i18n.language],
    queryFn: () => apiFetcher(allModulesEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  const finalCategories = useMemo(() => {
    if (selectedGroup === "all" || !favouriteCategoriesData) {
      return allModulesData?.categories || [];
    }
    return favouriteCategoriesData.categories || [];
  }, [selectedGroup, allModulesData, favouriteCategoriesData]);

  const favouriteProducts = useMemo(() => {
    if (!allModulesData) return [];
    if (productType === "weight") {
      return allModulesData.favourite_products_weight || [];
    }
    return allModulesData.favourite_products || [];
  }, [allModulesData, productType]);

  const allProducts = useMemo(() => {
    if (!allModulesData) return [];
    return productType === "weight"
      ? allModulesData?.products_weight || []
      : allModulesData?.products || [];
  }, [allModulesData, productType]);

  const productsSource = useMemo(() => {
    if (selectedGroup !== "all") {
      return favouriteProducts;
    }
    if (selectedCategory === "all") {
      return favouriteProducts;
    } else {
      return allProducts;
    }
  }, [selectedGroup, selectedCategory, favouriteProducts, allProducts]);

  const filteredProducts = useMemo(() => {
    let products = productsSource;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      products = products.filter((p) => {
        const name = p.name?.toLowerCase() || "";
        const code = p.product_code?.toString().toLowerCase() || "";
        return name.includes(query) || code.includes(query);
      });
    }
    if (selectedCategory !== "all") {
      products = products.filter((p) => p.category_id === parseInt(selectedCategory));
    }
    return products;
  }, [productsSource, selectedCategory, searchQuery]);

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
    setSelectedCategory("all");
  };

  const handleShowMoreProducts = () => {
    setVisibleProductCount((prev) => prev + PRODUCTS_PER_ROW * INITIAL_PRODUCT_ROWS);
  };

  const handleGroupChange = (groupId) => {
    const id = groupId === "all" ? "all" : groupId.toString();
    sessionStorage.setItem("last_selected_group", id);
    if (groupId === "all") {
      sessionStorage.removeItem("module_id");
    } else {
      sessionStorage.setItem("module_id", id);
    }
    setSelectedGroup(id);
    setSelectedCategory("all");
    setShowCategories(false); // غلق الأقسام عند اختيار مجموعة
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const createTempId = (productId) =>
    `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAddToOrder = useCallback(async (product, customQuantity = 1) => {
    const basePrice = parseFloat(
      product.price_after_discount || product.price || product.originalPrice || 0
    );

    let addonsTotal = 0;
    if (product.selectedExtras && product.selectedExtras.length > 0) {
      const extraCounts = {};
      product.selectedExtras.forEach(extraId => {
        extraCounts[extraId] = (extraCounts[extraId] || 0) + 1;
      });
      Object.entries(extraCounts).forEach(([extraId, count]) => {
        let extra = product.addons?.find(a => a.id === parseInt(extraId));
        if (!extra) extra = product.allExtras?.find(e => e.id === parseInt(extraId));
        if (extra) {
          const extraPrice = parseFloat(
            extra.price_after_discount || extra.price_after_tax || extra.price || 0
          );
          addonsTotal += extraPrice * count;
        }
      });
    }

    let variationsTotal = 0;
    if (product.selectedVariation && product.variations) {
      product.variations.forEach(variation => {
        const selectedOptions = product.selectedVariation[variation.id];
        if (selectedOptions) {
          if (variation.type === 'single') {
            const option = variation.options?.find(opt => opt.id === selectedOptions);
            if (option) variationsTotal += parseFloat(option.price_after_tax || option.price || 0);
          } else if (variation.type === 'multiple') {
            const optionsArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
            optionsArray.forEach(optionId => {
              const option = variation.options?.find(opt => opt.id === optionId);
              if (option) variationsTotal += parseFloat(option.price_after_tax || option.price || 0);
            });
          }
        }
      });
    }

    const itemPrice = basePrice + addonsTotal + variationsTotal;
    if (itemPrice <= 0) {
      toast.error(t("InvalidProductPrice"));
      return;
    }

    const quantity = product.weight_status === 1
      ? Number(product.quantity || customQuantity || 1)
      : parseInt(customQuantity) || 1;

    const itemTotal = itemPrice * quantity;

    if (orderType === "take_away" || orderType === "delivery") {
      const newItem = {
        ...product,
        temp_id: createTempId(product.id),
        count: quantity,
        price: itemPrice,
        originalPrice: basePrice,
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

        let cartId = null;
        if (response?.cart_id) cartId = response.cart_id;
        else if (response?.id) cartId = response.id;
        else if (response?.success?.cart_id) cartId = response.success.cart_id;
        else if (response?.data?.cart_id) cartId = response.data.cart_id;
        else if (response?.data?.id) cartId = response.data.id;
        else if (Array.isArray(response?.products) && response.products[0]?.cart_id) cartId = response.products[0].cart_id;
        else if (Array.isArray(response?.data?.products) && response.data.products[0]?.cart_id) cartId = response.data.products[0].cart_id;

        const newItem = {
          ...product,
          temp_id: createTempId(product.id),
          count: quantity,
          price: itemPrice,
          originalPrice: basePrice,
          totalPrice: itemTotal,
          cart_id: cartId ? cartId.toString() : null,
          preparation_status: "pending",
          notes: product.notes || "",
          allSelectedVariations: product.allSelectedVars || [],
          selectedExtras: product.selectedExtras || [],
          selectedExcludes: product.selectedExcludes || [],
          selectedAddons: product.selectedAddons || [],
        };

        onAddToOrder(newItem);
        toast.success(t("ProductAddedToTable", { table: tableId }));
      } catch (err) {
        console.error("Dine-in order error:", err);
        toast.error(err.response?.data?.message || t("FailedToAddToTable"));
      }
    }
  }, [orderType, onAddToOrder, postOrder, t, refreshCartData]);

  const handleAddFromModal = (enhancedProduct, options = {}) => {
    handleAddToOrder(enhancedProduct, enhancedProduct.quantity, options);
  };

  const isAnyLoading =
    groupLoading ||
    isAllDataLoading ||
    (selectedGroup !== "all" && (isFavCatLoading || !favouriteCategoriesData || !allModulesData));

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
    <div className={` ${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "rtl" : "ltr"}>
      
      {/* 1. الصف العلوي: البحث + النوع */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <input
          type="text"
          placeholder={t("SearchByProductName")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-bg-primary"
        />
        
        <h2 className="text-bg-primary text-2xl font-bold hidden md:block">{t("SelectProduct")}</h2>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => handleProductTypeChange("piece")}
            className={`px-4 py-1 rounded-md transition-all ${productType === "piece" ? "bg-white shadow text-bg-primary font-bold" : "text-gray-500"}`}
          >
            {t("ByPiece")}
          </button>
          <button
            onClick={() => handleProductTypeChange("weight")}
            className={`px-4 py-1 rounded-md transition-all ${productType === "weight" ? "bg-white shadow text-bg-primary font-bold" : "text-gray-500"}`}
          >
            {t("ByWeight")}
          </button>
        </div>
      </div>

      {/* 2. الصف المدمج (Favorite, Groups, Categories) */}
      <div className="flex gap-4 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        
        {/* زر Favorite */}
        <Button
          onClick={() => { handleGroupChange("all"); setSelectedCategory("all"); }}
          className={`min-w-[120px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all ${
            selectedGroup === "all" && selectedCategory === "all" ? "bg-bg-primary text-white border-bg-primary" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span className="text-2xl mb-1">{selectedGroup === "all" && selectedCategory === "all" ? "❤️" : "🤍"}</span>
          <span className="font-bold text-sm">{t("Favorite")}</span>
        </Button>

        {/* زر Normal Prices */}
        <Button
          onClick={() => handleGroupChange("all")}
          className={`min-w-[120px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all ${
            selectedGroup === "all" && !showCategories ? "bg-bg-primary text-white border-bg-primary" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <img src="/path-to-your-icon/normal-price-icon.png" alt="Normal" className="w-8 h-8 mb-1 object-contain" />
          <span className="font-bold text-sm">{t("NormalPrices")}</span>
        </Button>

        {/* المجموعات الديناميكية */}
        {groupProducts.map((group) => (
          <Button
            key={group.id}
            onClick={() => handleGroupChange(group.id)}
            className={`min-w-[120px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all ${
              selectedGroup === group.id.toString() ? "bg-bg-primary text-white border-bg-primary" : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            <img src={group.image_link || "/path-to-your-icon/default-group.png"} alt={group.name} className="w-8 h-8 mb-1 object-contain" />
            <span className="font-bold text-sm">{group.name}</span>
          </Button>
        ))}

        {/* زر Categories */}
        <Button
          onClick={() => setShowCategories(!showCategories)}
          className={`min-w-[120px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all ${
            showCategories ? "bg-bg-primary text-white border-bg-primary" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span className="text-2xl mb-1">🍴</span>
          <span className="font-bold text-sm">{t("Categories")}</span>
        </Button>
      </div>

      <DeliveryInfo
        orderType={orderType}
        deliveryUserData={deliveryUserData}
        userLoading={userLoading}
        userError={userError}
        onClose={onClose}
      />

      {/* 3. عرض التصنيفات عند الضغط على الزر */}
      {showCategories && (
        <div className="mb-6 p-2 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <CategorySelector
            categories={finalCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
          />
        </div>
      )}

      {/* 4. حاوية المنتجات */}
      <div className="bg-white border border-gray-200 rounded-xl p-2 min-h-[400px]">
        <h3 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">{t("Products")}</h3>
        
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-2">🍽️</span>
            <p>{t("Noproductsfoundfor")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleShowMoreProducts}
                  className="bg-bg-primary text-white px-10 py-2 rounded-full hover:opacity-90 transition-opacity"
                >
                  {t("ShowMoreProducts")}
                </Button>
              </div>
            )}
          </>
        )}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <Loading />
        </div>
      )}
    </div>
  );
}