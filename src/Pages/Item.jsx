import React, { useState, useMemo, useEffect, useCallback } from "react";
import { usePost } from "@/Hooks/usePost";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useDeliveryUser } from "@/Hooks/useDeliveryUser";
import { useProductModal } from "@/Hooks/useProductModal";
import DeliveryInfo from "./Delivery/DeliveryInfo";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import { useTranslation } from "react-i18next";
import { buildProductPayload } from "@/services/productProcessor";
import { ArrowLeft, LayoutGrid, Tag } from "lucide-react";

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

export default function Item({ onAddToOrder, onClose, refreshCartData }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [showCategories, setShowCategories] = useState(true);
  const [isNormalPrice, setIsNormalPrice] = useState(false);

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
    if (storedBranchId !== branchIdState) setBranchIdState(storedBranchId);
  }, [branchIdState]);

  // 1. جلب المجموعات
  const groupEndpoint = branchIdState ? `cashier/group_product` : null;
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ["groupProducts", branchIdState],
    queryFn: () => apiFetcher(groupEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  const groupProducts = useMemo(() => groupData?.group_product || [], [groupData]);

  // 2. جلب تصنيفات المجموعة المختارة
  const { data: favouriteCategoriesData, isLoading: isFavCatLoading } = useQuery({
    queryKey: ["favouriteCategories", selectedGroup, branchIdState],
    queryFn: () =>
      apiPoster(`cashier/group_product/favourite`, {
        group_id: parseInt(selectedGroup),
        branch_id: parseInt(branchIdState),
      }),
    enabled: selectedGroup !== "all" && !!branchIdState && !isNormalPrice,
    staleTime: 5 * 60 * 1000,
  });

  // 3. جلب البيانات الأساسية
  const allModulesEndpoint = useMemo(() => {
    return `captain/lists?branch_id=${branchIdState}&locale=${i18n.language}`;
  }, [branchIdState, i18n.language]);

  const { data: allModulesData, isLoading: isAllDataLoading } = useQuery({
    queryKey: ["allData", branchIdState, i18n.language],
    queryFn: () => apiFetcher(allModulesEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });

  const finalCategories = useMemo(() => {
    if (isNormalPrice || selectedGroup === "all") return allModulesData?.categories || [];
    return favouriteCategoriesData?.categories || allModulesData?.categories || [];
  }, [selectedGroup, allModulesData, favouriteCategoriesData, isNormalPrice]);

  const favouriteProducts = useMemo(() => {
    if (!allModulesData) return [];
    return productType === "weight" ? allModulesData.favourite_products_weight || [] : allModulesData.favourite_products || [];
  }, [allModulesData, productType]);

  const allProducts = useMemo(() => {
    if (!allModulesData) return [];
    return productType === "weight" ? allModulesData?.products_weight || [] : allModulesData?.products || [];
  }, [allModulesData, productType]);

  const filteredProducts = useMemo(() => {
    let products = (isNormalPrice) ? allProducts : (selectedCategory === "all" && selectedGroup === "all") ? favouriteProducts : allProducts;
    
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      products = products.filter((p) => (p.name?.toLowerCase() || "").includes(query) || (p.product_code?.toString().toLowerCase() || "").includes(query));
    }
    if (selectedCategory !== "all") products = products.filter((p) => p.category_id === parseInt(selectedCategory));
    return products;
  }, [allProducts, favouriteProducts, selectedCategory, selectedGroup, searchQuery, isNormalPrice]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  // الدوال
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowCategories(false);
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
  };

  const handleBackToCategories = () => {
    setShowCategories(true);
    setSelectedCategory("all");
    setSearchQuery("");
  };

  const handleNormalPricesClick = () => {
    setIsNormalPrice(true);
    setSelectedGroup("none");
    setShowCategories(true);
    setSelectedCategory("all");
  };

  const handleGroupChange = (groupId) => {
    setIsNormalPrice(false);
    const id = groupId === "all" ? "all" : groupId.toString();
    sessionStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setShowCategories(true);
    setSelectedCategory("all");
  };

const handleAddToOrder = useCallback(async (product, options = {}) => {
    const { customQuantity = 1 } = options;
    
    // 1️⃣ استخراج الكمية (سواء من المودال أو إضافة مباشرة)
    const finalQuantity = product.quantity || customQuantity;

    // 2️⃣ الاعتماد على السعر القادم من المودال (totalPrice) 
    // أو حساب السعر الأساسي إذا كانت إضافة مباشرة من الكارد
    // ملاحظة: totalPrice القادم من useProductModal يكون شامل الـ variations والـ extras
    const pricePerUnit = product.totalPrice ? (product.totalPrice / finalQuantity) : parseFloat(product.price || product.price_after_discount || 0);
    const totalAmount = pricePerUnit * finalQuantity;

    if (isNaN(totalAmount)) {
      console.error("❌ Error calculating price", { product, pricePerUnit, finalQuantity });
      return toast.error(t("ErrorCalculatingPrice"));
    }

    // 3️⃣ استخدام الـ Processor لبناء الـ Payload الموحد
    // نمرر البيانات للـ processor وهو سيتكفل بتحويلها لشكل يفهمه الـ API
    const processedItem = buildProductPayload({ 
      ...product, 
      price: pricePerUnit, // السعر للوحدة الواحدة شامل إضافاتها
      count: finalQuantity 
    });

    console.log("📦 Processed Item via Processor:", processedItem);

    const createTempId = (pId) => `${pId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (orderType === "dine_in") {
      const tableId = sessionStorage.getItem("table_id");
      if (!tableId) return toast.error(t("PleaseSelectTableFirst"));

      const payload = {
        table_id: tableId,
        cashier_id: sessionStorage.getItem("cashier_id"),
        amount: totalAmount.toFixed(2),
        total_tax: (totalAmount * 0.14).toFixed(2), // مثال للضريبة
        total_discount: "0.00",
        source: "web",
        products: [processedItem],
      };

      try {
        await postOrder("cashier/dine_in_order", payload, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` },
        });
        
        onAddToOrder({
          ...product,
          temp_id: createTempId(product.id),
          count: finalQuantity,
          price: pricePerUnit,
          totalPrice: totalAmount,
        });
        toast.success(t("ProductAddedToTable"));
      } catch (err) {
        console.error("❌ API Error:", err);
        toast.error(t("FailedToAddToTable"));
      }
    } else {
      // الـ Takeaway / Delivery
      onAddToOrder({
        ...product,
        temp_id: createTempId(product.id),
        count: finalQuantity,
        price: pricePerUnit,
        totalPrice: totalAmount,
      });
      toast.success(t("ProductAddedToCart"));
    }
  }, [orderType, onAddToOrder, postOrder, t]);

  if (groupLoading || isAllDataLoading || (selectedGroup !== "all" && isFavCatLoading && !isNormalPrice)) {
    return <div className="flex justify-center items-center h-40"><Loading /></div>;
  }

  const isArabic = i18n.language === "ar";

  return (
    <div className={`${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "rtl" : "ltr"}>
      
      {/* البحث والنوع */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <input
          type="text"
          placeholder={t("SearchByProductName")}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length > 0) setShowCategories(false); }}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-bg-primary outline-none"
        />
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => { setProductType("piece"); setShowCategories(true); }} className={`px-4 py-1 rounded-md transition-all ${productType === "piece" ? "bg-white shadow text-bg-primary font-bold" : "text-gray-500"}`}>{t("ByPiece")}</button>
          <button onClick={() => { setProductType("weight"); setShowCategories(true); }} className={`px-4 py-1 rounded-md transition-all ${productType === "weight" ? "bg-white shadow text-bg-primary font-bold" : "text-gray-500"}`}>{t("ByWeight")}</button>
        </div>
      </div>

      {/* شريط الأدوات والمجموعات */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-4 scrollbar-hide items-center">
        {/* المفضلة */}
        <Button
          onClick={() => handleGroupChange("all")}
          className={`min-w-[110px] h-28 flex flex-col items-center justify-center rounded-xl border transition-all ${selectedGroup === "all" && !isNormalPrice ? "bg-bg-primary text-white border-bg-primary" : "bg-white text-gray-700 border-gray-200"}`}
        >
          <span className="text-2xl mb-1">❤️</span>
          <span className="font-bold text-sm">{t("Favorite")}</span>
        </Button>

        {/* الأقسام */}
        <Button
          onClick={() => { setIsNormalPrice(false); handleBackToCategories(); }}
          className={`min-w-[110px] h-28 flex flex-col items-center justify-center rounded-xl border transition-all ${showCategories && !isNormalPrice && selectedGroup === "all" ? "bg-red-700 text-white border-red-700" : "bg-white text-gray-700 border-gray-200"}`}
        >
          <LayoutGrid className="mb-1" size={28} />
          <span className="font-bold text-sm">{t("Categories")}</span>
        </Button>

        <div className="h-12 w-[2px] bg-gray-300 mx-1 flex-shrink-0 rounded-full" />

        {/* الأسعار العادية */}
        <Button
          onClick={handleNormalPricesClick}
          className={`min-w-[110px] h-28 flex flex-col items-center justify-center rounded-xl border transition-all ${isNormalPrice ? "bg-bg-primary text-white border-bg-primary shadow-lg" : "bg-white text-gray-700 border-gray-200"}`}
        >
          <Tag className="mb-1" size={28} />
          <span className="font-bold text-sm">{t("NormalPrices")}</span>
        </Button>

        {/* المجموعات الديناميكية بالتصميم الجديد */}
        {groupProducts.map((group) => {
          const isActive = selectedGroup === group.id.toString() && !isNormalPrice;
          return (
            <Button
              key={group.id}
              onClick={() => handleGroupChange(group.id)}
              className={`group relative min-w-[110px] h-28 flex flex-col items-center justify-center rounded-xl border overflow-hidden p-0 transition-all duration-300 ${isActive ? "border-bg-primary ring-2 ring-bg-primary/50" : "border-gray-200"}`}
            >
              {/* الصورة مع الطبقة الشفافة */}
              <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"}`}>
                <img src={group.icon_link || "/default-group.png"} alt={group.name} className="w-full h-full object-cover" />
                {!isActive && <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent" />}
              </div>

              {/* الاسم يظهر عند الـ Hover أو Active */}
              <div className={`absolute bottom-0 w-full py-2 bg-black/70 backdrop-blur-sm text-white transition-transform duration-300 ${isActive ? "translate-y-0" : "translate-y-full group-hover:translate-y-0"}`}>
                <span className="font-bold text-[10px] block px-1 truncate text-center uppercase">
                  {group.name}
                </span>
              </div>
            </Button>
          );
        })}
      </div>

      <DeliveryInfo orderType={orderType} deliveryUserData={deliveryUserData} userLoading={userLoading} userError={userError} onClose={onClose} />

      {/* عرض التصنيفات أو المنتجات */}
      {showCategories ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px]">
          <h3 className="text-xl font-bold mb-6 text-gray-700 border-b pb-2 uppercase tracking-wide">
            {isNormalPrice ? t("Standard_Menu") : t("Select_Category")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {finalCategories.map((cat) => (
              <div key={cat.id} onClick={() => handleCategorySelect(cat.id)} className="group cursor-pointer flex flex-col items-center p-4 rounded-2xl border-2 border-transparent hover:border-bg-primary hover:bg-red-50 transition-all duration-300">
                <div className="w-24 h-24 bg-gray-50 rounded-full mb-3 overflow-hidden shadow-sm group-hover:shadow-md border border-gray-100">
                  <img src={cat.image_link || "/default-category.png"} alt={cat.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <span className="font-bold text-center text-gray-800 group-hover:text-bg-primary">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 min-h-[400px]">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBackToCategories} className="rounded-full h-8 w-8 p-0"><ArrowLeft size={16} /></Button>
              <h3 className="text-lg font-bold text-gray-700">
                {selectedCategory === "all" ? t("Results") : finalCategories.find(c => c.id === parseInt(selectedCategory))?.name}
              </h3>
            </div>
            <span className="text-sm font-medium text-gray-400">{filteredProducts.length} {t("Items")}</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-lg font-medium">{t("No_products_found")}</p>
              <Button onClick={handleBackToCategories} variant="link" className="text-bg-primary mt-2">{t("Back_to_Categories")}</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {productsToDisplay.map((product) => (
                  <ProductCard key={product.id} product={product} onAddToOrder={handleAddToOrder} onOpenModal={openProductModal} orderLoading={orderLoading} />
                ))}
              </div>
              {visibleProductCount < filteredProducts.length && (
                <div className="flex justify-center mt-8">
                  <Button onClick={() => setVisibleProductCount(prev => prev + 10)} className="bg-bg-primary text-white px-10 rounded-full shadow-md hover:opacity-90 transition-opacity">{t("Load_More")}</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ProductModal isOpen={isProductModalOpen} onClose={closeProductModal} selectedProduct={selectedProduct} selectedVariation={selectedVariation} selectedExtras={selectedExtras} selectedExcludes={selectedExcludes} quantity={quantity} totalPrice={totalPrice} onVariationChange={handleVariationChange} onExtraChange={handleExtraChange} onExclusionChange={handleExclusionChange} onExtraDecrement={handleExtraDecrement} onQuantityChange={setQuantity} onAddFromModal={handleAddToOrder} orderLoading={orderLoading} productType={productType} />
      {orderLoading && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]"><Loading /></div>}
    </div>
  );
}