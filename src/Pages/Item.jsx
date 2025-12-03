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

  // جلب بيانات المجموعة المفضلة (Categories + favourite_products)
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
  const { data: allModulesData, isLoading: isAllDataLoading, error: allModulesError } = useQuery({
    queryKey: ["allData", branchIdState, i18n.language],
    queryFn: () => apiFetcher(allModulesEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });
  // الكاتيجوريز اللي هتتعرض (من المجموعة أو من الكل)
  const finalCategories = useMemo(() => {
    if (selectedGroup === "all" || !favouriteCategoriesData) {
      return allModulesData?.categories || [];
    }
    return favouriteCategoriesData.categories || [];
  }, [selectedGroup, allModulesData, favouriteCategoriesData]);

  // المنتجات المفضلة من المجموعة (مهمة جداً)
  const favouriteProducts = useMemo(() => {
    if (selectedGroup === "all" || !favouriteCategoriesData) return [];
    return favouriteCategoriesData.favourite_products || [];
  }, [selectedGroup, favouriteCategoriesData]);

  // جلب كل المنتجات والكاتيجوريز العادية (لما يكون Group = all)
  const allModulesEndpoint = useMemo(() => {
    return `captain/lists?branch_id=${branchIdState}&locale=${i18n.language}`;
  }, [branchIdState, i18n.language]);



  const allProducts = useMemo(() => {
    if (!allModulesData) return [];
    return productType === "weight"
      ? allModulesData?.products_weight || []
      : allModulesData?.products || [];
  }, [allModulesData, productType]);

  // المنتجات اللي هتتعرض فعلياً (من المجموعة أو من الكل)
  const productsSource = useMemo(() => {
    return selectedGroup === "all" ? allProducts : favouriteProducts;
  }, [selectedGroup, allProducts, favouriteProducts]);

const filteredProducts = useMemo(() => {
  let products = productsSource;

  const query = searchQuery.trim().toLowerCase();

  // فلترة البحث (بالاسم + الكود)
  if (query) {
    products = products.filter((p) => {
      const name = p.name?.toLowerCase() || "";
      const code = p.product_code?.toString().toLowerCase() || "";
      return name.includes(query) || code.includes(query);
    });
  }

  // فلترة الكاتيجوري
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
    
    // تخزين module_id للاستخدام في checkout
    if (groupId === "all") {
      sessionStorage.removeItem("module_id");
    } else {
      sessionStorage.setItem("module_id", id);
    }
    
    setSelectedGroup(id);
    setSelectedCategory("all");
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    setSearchQuery("");
  };

  const createTempId = (productId) =>
    `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // باقي الكود زي ما هو (handleAddToOrder + Modal + إلخ)
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
        // دعم كل الأشكال الممكنة للـ response
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

  const isAnyLoading = isAllDataLoading || groupLoading || (selectedGroup !== "all" && isFavCatLoading);

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
    <div className={`${isArabic ? "text-right direction-rtl" : "text-left direction-ltr"}`} dir={isArabic ? "rtl" : "ltr"}>
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
                ? t("AllCategories")
                : finalCategories.find((cat) => cat.id === parseInt(selectedCategory))?.name || t("SelectedCategory")
              }" ({productType === "weight" ? t("ByWeight") : t("ByPiece")}).
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