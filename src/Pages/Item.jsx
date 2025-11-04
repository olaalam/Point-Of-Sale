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
import ProductModal, { areProductsEqual } from "./ProductModal"; // ✅ Import areProductsEqual
import { useTranslation } from "react-i18next";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://bcknd.food2go.online/";

const getAuthToken = () => {
    return sessionStorage.getItem("token");
};

const apiFetcher = async (path) => {
    const url = `${API_BASE_URL}${path}`;
    const token = getAuthToken();
    
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
    };

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.json();
};

const postFetcher = async (path, data) => {
    const url = `${API_BASE_URL}${path}`;
    const token = getAuthToken();

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
    };

    const response = await fetch(url, options);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorBody.message || `Failed to post to ${url}: ${response.statusText}`);
    }
    return response.json();
};

const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ fetchEndpoint, onAddToOrder, onClose, refreshCartData, orderItems = [] }) {
    // === State Management ===
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
    const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
    const [productType, setProductType] = useState("piece");
    const [selectedGroup, setSelectedGroup] = useState("all");
  const { t, i18n } = useTranslation()

    // === Order Type ===
    const orderType = sessionStorage.getItem("order_type") || "dine_in";

    // === Custom Hooks ===
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

    // === Branch ID Sync ===
    useEffect(() => {
        const storedBranchId = sessionStorage.getItem("branch_id");
        if (storedBranchId !== branchIdState) {
            setBranchIdState(storedBranchId);
        }
    }, [branchIdState]);

    // === React Query Fetching ===
    const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
        queryKey: ['groups', branchIdState],
        queryFn: () => apiFetcher(`cashier/group_product`),
        enabled: !!branchIdState,
        staleTime: Infinity,
    });
    const groupProducts = groupData?.group_product || [];

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

    const allModulesEnabled = selectedGroup === "all" && !!branchIdState;
    const allModulesEndpoint = fetchEndpoint || `captain/lists?branch_id=${branchIdState}`;
    const { data: allModulesData, isLoading: isAllDataLoading, error: allModulesError } = useQuery({
        queryKey: ['allData', branchIdState],
        queryFn: () => apiFetcher(allModulesEndpoint),
        enabled: allModulesEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const allModulesProductEndpoint = useMemo(() => {
        if (selectedCategory === "all") return null;
        return `captain/product_category_lists/${selectedCategory}?branch_id=${branchIdState}`;
    }, [branchIdState, selectedCategory]);

    const { data: allModulesProductData, isLoading: isProductLoading, error: productError } = useQuery({
        queryKey: ['products_all_modules', branchIdState, selectedCategory],
        queryFn: () => apiFetcher(allModulesProductEndpoint),
        enabled: selectedGroup === "all" && selectedCategory !== "all" && !!branchIdState,
        staleTime: 1 * 60 * 1000,
    });

    const moduleFavEnabled = selectedGroup !== "all" && !!branchIdState;
    const fetchFavouriteCategories = async () => {
        return await postFetcher(`cashier/group_product/favourite`, {
            group_id: parseInt(selectedGroup),
            branch_id: parseInt(branchIdState),
        });
    };

    const { data: moduleFavData, isLoading: isFavCatLoading } = useQuery({
        queryKey: ['moduleData', branchIdState, selectedGroup],
        queryFn: fetchFavouriteCategories,
        enabled: moduleFavEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const favouriteCategories = moduleFavData?.categories || [];

    const moduleProductEnabled = selectedGroup !== "all" && selectedCategory !== "all" && !!branchIdState;
    const fetchGroupProductsData = async () => {
        return await postFetcher(`cashier/group_product/product_in_category/${selectedCategory}`, {
            branch_id: parseInt(branchIdState),
            group_id: parseInt(selectedGroup),
        });
    };

    const { data: groupProductsData, isLoading: isGroupProductsLoading } = useQuery({
        queryKey: ['groupProducts', branchIdState, selectedGroup, selectedCategory],
        queryFn: fetchGroupProductsData,
        enabled: moduleProductEnabled,
        staleTime: 1 * 60 * 1000,
    });

    // === Final Data & Derived State ===
    const finalCategories = useMemo(() => {
        if (selectedGroup !== "all") {
            return favouriteCategories;
        }
        return allModulesData?.categories || [];
    }, [selectedGroup, favouriteCategories, allModulesData]);

    const productSourceData = useMemo(() => {
        if (selectedGroup !== "all") {
            if (selectedCategory === "all") {
                return {
                    products: moduleFavData?.favourite_products || [],
                    products_weight: moduleFavData?.favourite_products_weight || [],
                };
            } else {
                return groupProductsData || {};
            }
        }

        if (selectedCategory === "all") {
            return allModulesData || {};
        }
        return allModulesProductData || {};
    }, [selectedGroup, selectedCategory, moduleFavData, groupProductsData, allModulesData, allModulesProductData]);

    const allProducts = useMemo(() => {
        return productType === "weight"
            ? productSourceData.products_weight || []
            : productSourceData.products || [];
    }, [productSourceData, productType]);

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
        const id = groupId === "all" ? "all" : groupId.toString();
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
    const handleAddToOrder = useCallback(async (product, customQuantity = 1, options = {}) => {
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
            notes: product.notes || "",
            ...(orderType === "dine_in" && { preparation_status: "pending" }),
        };

        // ✅ Check for duplicate products if flag is set
        if (options.checkDuplicate && orderItems && Array.isArray(orderItems)) {
            const existingProductIndex = orderItems.findIndex(item => 
                areProductsEqual(item, orderItem)
            );

            if (existingProductIndex !== -1) {
                // Product exists - update quantity instead of adding new row
                const existingItem = orderItems[existingProductIndex];
                const newQuantity = existingItem.count + customQuantity;
                
                // Update the item in the parent component
                onAddToOrder({
                    ...existingItem,
                    count: newQuantity,
                    totalPrice: existingItem.price * newQuantity
                }, { updateExisting: true, index: existingProductIndex });

                if (orderType === "dine_in") {
                    try {
                        await submitItemToBackend(postOrder, orderItem, customQuantity, orderType);
                        if (refreshCartData) await refreshCartData();
  t("QuantityIncreased", { name: product.name, quantity: newQuantity })
                    } catch (error) {
                        console.error("Error submitting item:", error);
  t("UpdateFailed", { name: product.name })
                    }
                } else {
  t("QuantityIncreased", { name: product.name, quantity: newQuantity })
                }
                return;
            }
        }

        // Product is new - add it normally
        onAddToOrder(orderItem);

        if (orderType === "dine_in") {
            try {
                await submitItemToBackend(postOrder, orderItem, customQuantity, orderType);
                if (refreshCartData) await refreshCartData();
toast.success(
  t("ProductAdded", { name: product.name })
);            } catch (error) {
                console.error("Error submitting item:", error);
toast.error(
  t("SubmitFailed", { name: product.name })
);            }
        } else {
            if (!toast.isActive(product.id)) {
toast.success(
  t("ProductAdded", { name: product.name }),
  { toastId: product.id }
);            }
        }
    }, [selectedVariation, selectedExtras, selectedExcludes, orderType, onAddToOrder, productType, postOrder, refreshCartData, orderItems]);

    // ✅ Updated handleAddFromModal to pass checkDuplicate flag
    const handleAddFromModal = (enhancedProduct, options = {}) => {
        handleAddToOrder(enhancedProduct, enhancedProduct.quantity, options);
    };

    // === Loading & Error States ===
    const isAnyLoading =
        isAllDataLoading ||
        isProductLoading ||
        groupLoading ||
        isFavCatLoading ||
        isGroupProductsLoading ||
        orderLoading;

    const hasError = allModulesError || productError || groupError;

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
<p>{t("ErrorLoadingData")}</p>
            </div>
        );
    }

    if (!branchIdState) {
        return (
            <div className="text-center text-gray-500 py-8">
{t("SelectBranchToViewItems")}
            </div>
        );
    }
  const isArabic = i18n.language === "ar";
    // === Render UI ===
    return (
        <div className={`${
        isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
      }`}
      dir={isArabic ? "rtl" : "ltr"}>
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
                    <option value="all">{t("NormalPrice")}</option>
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
                                : finalCategories.find((cat) => cat.id === selectedCategory)?.name || t("SelectedCategory")}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Loading />
                </div>
            )}
        </div>
    );
}