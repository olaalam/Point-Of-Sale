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
import { ArrowLeft, LayoutGrid } from "lucide-react"; // أيقونات إضافية للجمالية

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
  
  // الحالة المسؤولة عن التبديل بين شاشة التصنيفات والمنتجات
  const [showCategories, setShowCategories] = useState(true); 

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
    return productType === "weight" 
      ? allModulesData.favourite_products_weight || [] 
      : allModulesData.favourite_products || [];
  }, [allModulesData, productType]);

  const allProducts = useMemo(() => {
    if (!allModulesData) return [];
    return productType === "weight"
      ? allModulesData?.products_weight || []
      : allModulesData?.products || [];
  }, [allModulesData, productType]);

  const filteredProducts = useMemo(() => {
    let products = (selectedCategory === "all" && selectedGroup === "all") ? favouriteProducts : allProducts;
    
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
  }, [allProducts, favouriteProducts, selectedCategory, selectedGroup, searchQuery]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  // دالة عند اختيار تصنيف
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowCategories(false); // إخفاء شاشة التصنيفات لإظهار المنتجات
    setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
  };

  // العودة لشاشة التصنيفات
  const handleBackToCategories = () => {
    setShowCategories(true);
    setSelectedCategory("all");
    setSearchQuery("");
  };

  const handleGroupChange = (groupId) => {
    const id = groupId === "all" ? "all" : groupId.toString();
    sessionStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setShowCategories(true); // عند تغيير المجموعة نعود لعرض تصنيفاتها
    setSelectedCategory("all");
  };

  const handleProductTypeChange = (type) => {
    setProductType(type);
    setShowCategories(true); // العودة للتصنيفات عند تغيير النوع (قطعة/وزن)
    setSelectedCategory("all");
  };

  const createTempId = (productId) => `${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleAddToOrder = useCallback(async (product, customQuantity = 1) => {
    // ... منطق الإضافة (نفس الكود السابق لضمان العمل)
    const basePrice = parseFloat(product.price_after_discount || product.price || 0);
    const quantity = product.weight_status === 1 ? Number(product.quantity || customQuantity) : parseInt(customQuantity);
    const itemTotal = basePrice * quantity;

    if (orderType === "dine_in") {
        const tableId = sessionStorage.getItem("table_id");
        if (!tableId) return toast.error(t("PleaseSelectTableFirst"));
        const processedItem = buildProductPayload({ ...product, price: basePrice, count: quantity });
        const payload = { table_id: tableId, cashier_id: sessionStorage.getItem("cashier_id"), amount: itemTotal.toFixed(2), total_tax: (itemTotal * 0.14).toFixed(2), total_discount: "0.00", source: "web", products: [processedItem] };
        try {
            await postOrder("cashier/dine_in_order", payload, { headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token")}` }});
            onAddToOrder({ ...product, temp_id: createTempId(product.id), count: quantity, price: basePrice, totalPrice: itemTotal });
            toast.success(t("ProductAddedToTable"));
        } catch (err) { toast.error(t("FailedToAddToTable"),err); }
    } else {
        onAddToOrder({ ...product, temp_id: createTempId(product.id), count: quantity, price: basePrice, totalPrice: itemTotal });
        toast.success(t("ProductAddedToCart"));
    }
  }, [orderType, onAddToOrder, postOrder, t]);

  if (groupLoading || isAllDataLoading || (selectedGroup !== "all" && isFavCatLoading)) return <div className="flex justify-center items-center h-40"><Loading /></div>;

  const isArabic = i18n.language === "ar";

  return (
    <div className={`${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "rtl" : "ltr"}>
      
      {/* 1. البحث والنوع */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <input
          type="text"
          placeholder={t("SearchByProductName")}
          value={searchQuery}
          onChange={(e) => {
              setSearchQuery(e.target.value);
              if(e.target.value.length > 0) setShowCategories(false); // إذا بحث يظهر النتائج فوراً
          }}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-bg-primary"
        />
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => handleProductTypeChange("piece")} className={`px-4 py-1 rounded-md ${productType === "piece" ? "bg-white shadow text-bg-primary font-bold" : "text-gray-500"}`}>{t("ByPiece")}</button>
          <button onClick={() => handleProductTypeChange("weight")} className={`px-4 py-1 rounded-md ${productType === "weight" ? "bg-white shadow text-bg-primary font-bold" : "text-gray-500"}`}>{t("ByWeight")}</button>
        </div>
      </div>

{/* 2. شريط المجموعات وزر الأقسام */}
<div className="flex gap-4 overflow-x-auto pb-2 mb-4 scrollbar-hide items-center">
  
  {/* زر المفضلة */}
  <Button
    onClick={() => handleGroupChange("all")}
    className={`min-w-[120px] h-28 flex flex-col items-center justify-center rounded-xl border transition-all ${selectedGroup === "all" ? "bg-bg-primary text-white border-bg-primary" : "bg-white text-gray-700 border-gray-200"}`}
  >
    <span className="text-2xl mb-1">❤️</span>
    <span className="font-bold text-sm">{t("Favorite")}</span>
  </Button>

  {/* زر الأقسام */}
  <Button
    onClick={handleBackToCategories}
    className={`min-w-[120px] h-28 flex flex-col items-center justify-center rounded-xl border transition-all ${showCategories ? "bg-red-700 text-white border-red-700" : "bg-white text-gray-700 border-gray-200"}`}
  >
    <LayoutGrid className="mb-1 text-13xl " />
    <span className="font-bold text-sm">{t("Categories")}</span>
  </Button>

  {/* --- الفاصل البصري هنا --- */}
  <div className="h-12 w-[2px] bg-gray-300 mx-2 flex-shrink-0 rounded-full" />
  {/* ------------------------ */}

  {/* المجموعات الديناميكية */}
  {groupProducts.map((group) => (
<Button
  key={group.id}
  onClick={() => handleGroupChange(group.id)}
  className={`min-w-[120px] h-28 flex flex-col items-center justify-start rounded-xl border overflow-hidden p-0 transition-all ${
    selectedGroup === group.id.toString() 
    ? "bg-bg-primary text-white border-bg-primary" 
    : "bg-white text-gray-700 border-gray-200 hover:text-white"
  }`}
>
  {/* حاوية الصورة لتأخذ المساحة العلوية كاملة */}
  <div className="w-full h-20 overflow-hidden">
    <img 
      src={group.icon_link || "/default-group.png"} 
      alt={group.name} 
      className="w-full h-full object-cover" 
    />
  </div>

  {/* اسم المجموعة بالأسفل */}
  <div className="flex items-center justify-center flex-1 w-full px-1">
    <span className="font-bold text-[11px] leading-tight text-center break-words hover:text-white">
      {group.name}
    </span>
  </div>
</Button>
  ))}

</div>

      <DeliveryInfo orderType={orderType} deliveryUserData={deliveryUserData} userLoading={userLoading} userError={userError} onClose={onClose} />

      {/* 3. تبديل الشاشات التفاعلي */}
      {showCategories ? (
        /* شاشة التصنيفات */
        <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px]">
          <h3 className="text-xl font-bold mb-6 text-gray-700 border-b pb-2">{t("SelectCategory")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {finalCategories.map((cat) => (
              <div 
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="group cursor-pointer flex flex-col items-center p-4 rounded-2xl border-2 border-transparent hover:border-bg-primary hover:bg-red-50 transition-all duration-300"
              >
                <div className="w-24 h-24 bg-gray-50 rounded-full mb-3 overflow-hidden shadow-sm group-hover:shadow-md">
                   <img src={cat.image_link || "/default-category.png"} alt={cat.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <span className="font-bold text-center text-gray-800 group-hover:text-bg-primary">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* شاشة المنتجات */
        <div className="bg-white border border-gray-200 rounded-xl p-4 min-h-[400px]">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBackToCategories} className="rounded-full h-8 w-8 p-0">
                    <ArrowLeft size={16} />
                </Button>
                <h3 className="text-lg font-bold text-gray-700">
                    {selectedCategory === "all" ? t("Search_Results") : finalCategories.find(c => c.id === parseInt(selectedCategory))?.name}
                </h3>
             </div>
             <span className="text-sm text-gray-400">{filteredProducts.length} {t("Products")}</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-lg font-medium">{t("Noproductsfound")}</p>
              <Button onClick={handleBackToCategories} variant="link" className="text-bg-primary mt-2">{t("BackToCategories")}</Button>
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
                  <Button onClick={() => setVisibleProductCount(prev => prev + 8)} className="bg-bg-primary text-white px-10 rounded-full">{t("ShowMoreProducts")}</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* المودال واللودينج الخارجي */}
      <ProductModal isOpen={isProductModalOpen} onClose={closeProductModal} selectedProduct={selectedProduct} selectedVariation={selectedVariation} selectedExtras={selectedExtras} selectedExcludes={selectedExcludes} quantity={quantity} totalPrice={totalPrice} onVariationChange={handleVariationChange} onExtraChange={handleExtraChange} onExclusionChange={handleExclusionChange} onExtraDecrement={handleExtraDecrement} onQuantityChange={setQuantity} onAddFromModal={handleAddToOrder} orderLoading={orderLoading} productType={productType} />
      {orderLoading && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"><Loading /></div>}
    </div>
  );
}