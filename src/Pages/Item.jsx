import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import ModuleOrderModal from "./ModuleOrderModal";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getAuthToken = () => sessionStorage.getItem("token");
let resturant_logo = sessionStorage.getItem("resturant_logo");
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
export default function Item({ onAddToOrder, onClose }) {
  const [selectedMainCategory, setSelectedMainCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");
  const [selectedGroup, setSelectedGroup] = useState("none");
  const [showCategories, setShowCategories] = useState(true);
  const [isNormalPrice, setIsNormalPrice] = useState(true);
  const [isModuleOrderModalOpen, setIsModuleOrderModalOpen] = useState(false);
  const [tempGroupId, setTempGroupId] = useState(null);
  const [moduleOrderNumber, setModuleOrderNumber] = useState("");
  const { t, i18n } = useTranslation();
  const scannerInputRef = useRef(null);

  // ده هيتركز تلقائيًا كل ما الصفحة تتحمل أو ترجع focus
  useEffect(() => {
    const input = scannerInputRef.current;
    if (input) {
      input.focus();

      // في حالة الـ blur (مثلاً ضغطتي على حاجة تانية) → نرجّعه focus
      const handleBlur = () => {
        setTimeout(() => input.focus(), 10);
      };
      input.addEventListener("blur", handleBlur);
      return () => input.removeEventListener("blur", handleBlur);
    }
  }, []);
  const orderType = sessionStorage.getItem("order_type") || "dine_in";
  const { deliveryUserData, userLoading, userError } =
    useDeliveryUser(orderType);
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
    const stored_branch_id = sessionStorage.getItem("branch_id");
    if (stored_branch_id !== branchIdState) setBranchIdState(stored_branch_id);
  }, [branchIdState]);
  // 1. جلب المجموعات
  const groupEndpoint = branchIdState ? `cashier/group_product` : null;
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ["groupProducts", branchIdState],
    queryFn: () => apiFetcher(groupEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });
  const groupProducts = useMemo(
    () => groupData?.group_product || [],
    [groupData]
  );
  // 2. جلب تصنيفات المجموعة المختارة
  const { data: favouriteCategoriesData, isLoading: isFavCatLoading } =
    useQuery({
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
    return `captain/lists?branch_id=${branchIdState}&locale=${i18n.language}&module=${orderType}`;
  }, [branchIdState, i18n.language, orderType]);
  const { data: allModulesData, isLoading: isAllDataLoading } = useQuery({
    queryKey: ["allData", branchIdState, i18n.language, orderType],
    queryFn: () => apiFetcher(allModulesEndpoint),
    enabled: !!branchIdState,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });
  const finalCategories = useMemo(() => {
    if (isNormalPrice || selectedGroup === "all")
      return allModulesData?.categories || [];
    return (
      favouriteCategoriesData?.categories || allModulesData?.categories || []
    );
  }, [selectedGroup, allModulesData, favouriteCategoriesData, isNormalPrice]);
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

  const allSubCategories = useMemo(() => {
    return finalCategories.flatMap(cat =>
      (cat.sub_categories || []).map(sub => ({
        ...sub,
        main_category_id: cat.id,
        main_category_name: cat.name
      }))
    );
  }, [finalCategories]);

  // 2. Updated Filtering Logic
  const filteredProducts = useMemo(() => {
    let products = [];

    // Priority 1: Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return allProducts.filter(
        (p) =>
          (p.name?.toLowerCase() || "").includes(query) ||
          (p.product_code?.toString().toLowerCase() || "").includes(query)
      );
    }

    // Priority 2: Determine products source
    if (isNormalPrice || selectedGroup === "none") {
      products = allProducts;
    } else if (selectedGroup === "all") {
      products = favouriteProducts;
    } else {
      products = favouriteCategoriesData?.products || [];
    }

    // Priority 3: Main Category Filter
    if (selectedMainCategory !== "all") {
      products = products.filter(p => p.category_id === parseInt(selectedMainCategory));
    }

    // Priority 4: Sub Category Filter
    if (selectedSubCategory) {
      products = products.filter(p => p.sub_category_id === parseInt(selectedSubCategory));
    }

    return products;
  }, [
    allProducts,
    favouriteProducts,
    favouriteCategoriesData,
    selectedMainCategory,
    selectedSubCategory,
    searchQuery,
    isNormalPrice,
    selectedGroup
  ]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);

  const handleCategorySelect = (categoryId, isSub = false) => {
    const idStr = categoryId.toString(); // Always store as string
    if (isSub) {
      setSelectedSubCategory(idStr);
    } else {
      setSelectedMainCategory(idStr);
      setSelectedSubCategory(null); // Reset sub
      setShowCategories(false);
      setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    }
  };

  const handleNormalPricesClick = () => {
    setIsNormalPrice(true);
    setSelectedGroup("none");
    setShowCategories(true);
    setSelectedMainCategory("all");
    setSelectedSubCategory(null);
    sessionStorage.removeItem("module_order_number");
  };

  const handleGroupChange = (groupId) => {
    setIsNormalPrice(false);
    const id = groupId === "all" ? "all" : groupId.toString();
    sessionStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setShowCategories(true);
    setSelectedMainCategory("all");
    setSelectedSubCategory(null);
  };

  const handleAddToOrder = useCallback(
    async (product, options = {}) => {
      const { customQuantity = 1 } = options;
      const finalQuantity = product.quantity || product.count || customQuantity;
      const pricePerUnit = product.totalPrice
        ? (product.totalPrice / finalQuantity)
        : parseFloat(product.final_price || product.price_after_discount || 0);
      const totalAmount = pricePerUnit * finalQuantity;
      if (isNaN(totalAmount)) {
        console.error("❌ Error calculating price", {
          product,
          pricePerUnit,
          finalQuantity,
        });
        return toast.error(t("ErrorCalculatingPrice"));
      }
      const processedItem = buildProductPayload({
        ...product,
        price: pricePerUnit,
        count: finalQuantity,
      });
      const createTempId = (pId) =>
        `${pId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (orderType === "dine_in") {
        const tableId = sessionStorage.getItem("table_id");
        if (!tableId) return toast.error(t("PleaseSelectTableFirst"));
        const payload = {
          table_id: tableId,
          cashier_id: sessionStorage.getItem("cashier_id"),
          amount: totalAmount.toFixed(2),
          // total_tax: (totalAmount * 0.14).toFixed(2),
          total_tax: ((product.tax_val || 0) * finalQuantity).toFixed(2),
          total_discount: "0.00",
          source: "web",
          products: [processedItem],
          module_id: selectedGroup || null,
        };
        try {
          const response = await postOrder("cashier/dine_in_order", payload, {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            },
          });
          const serverCartId = response?.data?.cart_id || response?.cart_id;
          onAddToOrder({
            ...product,
            temp_id: createTempId(product.id),
            cart_id: serverCartId,
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
        onAddToOrder({
          ...product,
          temp_id: createTempId(product.id),
          count: finalQuantity,
          price: pricePerUnit,
          totalPrice: totalAmount,
        });
        toast.success(t("ProductAddedToCart"));
      }
    },
    [orderType, onAddToOrder, postOrder, t]
  );


  if (
    groupLoading ||
    isAllDataLoading ||
    (selectedGroup !== "all" && isFavCatLoading && !isNormalPrice)
  ) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }
  const isArabic = i18n.language === "ar";

  const searchAndToggleSection = (
    <div className="sticky top-0 bg-white z-30 border-b border-gray-100 shadow-sm">
      <div className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <input
            type="text"
            placeholder={t("SearchByProductName")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const code = searchQuery.trim();
                if (!code) return;

                // ─────────────────────────────────────────────
                //          باركود وزن (13 رقم يبدأ بـ 2)
                // ─────────────────────────────────────────────
                if (code.length === 13 && code.startsWith("2")) {
                  const scaleValue = sessionStorage.getItem("scale");

                  console.log("[DEBUG BARCODE]", {
                    rawScale: scaleValue,
                    scaleType: typeof scaleValue,
                    scaleLength: scaleValue?.length,
                    exactRepr: JSON.stringify(scaleValue),
                    atTime: new Date().toISOString(),
                  });

                  const isScaleEnabled = scaleValue && scaleValue !== "0" && scaleValue !== "";

                  if (!isScaleEnabled) {
                    toast.warn(t("ScaleIsNotEnabled") || "الميزان غير مفعّل");
                    setSearchQuery("");
                    return;
                  }

                  // استخراج الكود والوزن
                  const itemCodePart = code.substring(1, 7); // من الخانة 2 إلى 7 (6 أرقام)
                  const weightPart = code.substring(7, 12);
                  const weightGrams = parseInt(weightPart, 10);
                  const weightKg = weightGrams / 1000;

                  console.log("[WEIGHT BARCODE DEBUG]", {
                    fullCode: code,
                    itemCodePart,
                    weightGrams,
                    weightKg: weightKg.toFixed(3),
                  });

                  // مهم جدًا: نبحث في products_weight فقط (لأن المنتجات بالوزن موجودة هناك فقط)
                  const weightProducts = allModulesData?.products_weight || [];

                  const found = weightProducts.find((p) => {
                    const dbCode = String(p.product_code || "").trim();
                    console.log("Comparing weight product code:", itemCodePart, "vs", dbCode);
                    return dbCode === itemCodePart;
                  });

                  if (!found) {
                    console.log("WEIGHT PRODUCT NOT FOUND - searched code:", itemCodePart);
                    toast.error("المنتج بالوزن غير موجود بهذا الكود");
                    setSearchQuery("");
                    return;
                  }

                  // تأكيد أن المنتج مفعل للوزن (weight_status = 1)
                  if (found.weight_status !== 1) {
                    toast.warn("هذا المنتج غير مفعل للبيع بالوزن");
                    setSearchQuery("");
                    return;
                  }

                  const unitPrice = parseFloat(found.final_price || found.price_after_discount || 0);

                  if (!unitPrice || isNaN(unitPrice)) {
                    toast.error("سعر المنتج غير صحيح");
                    setSearchQuery("");
                    return;
                  }

                  const totalPrice = unitPrice * weightKg;

                  const productToAdd = {
                    ...found,
                    // الكمية = الوزن بالكيلو (مع 3 أرقام عشرية)
                    count: Number(weightKg.toFixed(3)),
                    quantity: Number(weightKg.toFixed(3)),
                    price: unitPrice, // سعر الكيلو
                    totalPrice: Number(totalPrice.toFixed(2)),

                    // حقول مساعدة للعرض والـ debugging
                    _source: "scale_barcode",
                    _weight_grams: weightGrams,
                    _weight_kg: weightKg,
                    temp_id: `${found.id}_${Date.now()}_${Math.random()}`
                  };

                  console.log("[WEIGHT PRODUCT TO ADD]", productToAdd);

                  // إضافة المنتج للطلب
                  handleAddToOrder({
                    ...productToAdd,
                    temp_id: `weight_${found.id}_${Date.now()}`
                  });

                  toast.success(
                    `تم إضافة ${found.name} • ${weightKg.toFixed(3)} كجم • ${totalPrice.toFixed(2)} ج.م`
                  );

                  setSearchQuery("");
                  return;
                }

                // ─────────────────────────────────────────────
                //          باركود عادي (قطعة)
                // ─────────────────────────────────────────────
                const found = allProducts.find(
                  (p) => String(p.product_code || "").trim() === code
                );

                if (found) {
                  handleAddToOrder(found);
                  toast.success(`تم إضافة → ${found.name}`);
                } else {
                  toast.error(t("ProductCodeNotFound") || "كود المنتج غير موجود");
                }

                setSearchQuery("");
              }
            }}
            className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-bg-primary outline-none"
          />

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setProductType("piece")}
              className={`px-4 py-1 rounded-md transition-all ${productType === "piece"
                ? "bg-white shadow text-bg-primary font-bold"
                : "text-gray-500"
                }`}
            >
              {t("ByPiece")}
            </button>
            <button
              onClick={() => setProductType("weight")}
              className={`px-4 py-1 rounded-md transition-all ${productType === "weight"
                ? "bg-white shadow text-bg-primary font-bold"
                : "text-gray-500"
                }`}
            >
              {t("ByWeight")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  const groupsBarSection = (
    <div className={`flex gap-3 overflow-x-auto p-4 scrollbar-hide items-center`}>
      {/* Favorite */}
      <Button
        onClick={() => {
          handleGroupChange("all");
          setSelectedMainCategory("all");
          setSelectedSubCategory(null);
        }}
        className={`min-w-[100px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all ${selectedGroup === "all" && !isNormalPrice
          ? "bg-bg-primary text-white border-bg-primary"
          : "bg-white text-gray-700 border-gray-200"
          }`}
      >
        <span className="text-xl mb-1">❤️</span>
        <span className="font-bold text-xs">{t("Favorite")}</span>
      </Button>

      {/* Normal Prices */}
      <Button
        onClick={handleNormalPricesClick}
        className={`group relative min-w-[100px] h-20 flex flex-col items-center justify-center rounded-xl border overflow-hidden p-0 transition-all duration-300 ${isNormalPrice
          ? "border-bg-primary ring-2 ring-bg-primary/50"
          : "border-gray-200"
          }`}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${isNormalPrice ? "opacity-100" : "opacity-40 group-hover:opacity-100"
            }`}
        >
          <img
            src={resturant_logo}
            alt="logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute bottom-0 w-full py-1 bg-black/70 backdrop-blur-sm text-white transition-transform duration-300">
          <span className="font-bold text-[10px] block px-1 truncate text-center uppercase">
            {t("NormalPrices")}
          </span>
        </div>
      </Button>

      <div className="h-10 w-[2px] bg-gray-300 mx-1 flex-shrink-0 rounded-full" />

      {/* الجروبات العادية – هنا نفتح المودال */}
      {groupProducts.map((group) => {
        const isActive =
          selectedGroup === group.id.toString() && !isNormalPrice;

        return (
          <Button
            key={group.id}
            onClick={() => {
              setTempGroupId(group.id);
              setModuleOrderNumber(sessionStorage.getItem("module_order_number") || "");
              setIsModuleOrderModalOpen(true);
            }}
            className={`group relative min-w-[100px] h-20 flex flex-col items-center justify-center rounded-xl border overflow-hidden p-0 transition-all duration-300 ${isActive
              ? "border-bg-primary ring-2 ring-bg-primary/50"
              : "border-gray-200"
              }`}
          >
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                }`}
            >
              <img
                src={group.icon_link || "/default-group.png"}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 w-full py-1 bg-black/70 backdrop-blur-sm text-white transition-transform duration-300">
              <span className="font-bold text-[10px] block px-1 truncate text-center uppercase">
                {group.name}
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );

  const productsGridSection = (
    <div className="flex-1 h-full pr-2" dir={isArabic ? "rtl" : "ltr"}>
      {searchAndToggleSection}
      {groupsBarSection}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg font-medium">{t("No_products_found")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9 gap-3 px-4 pb-4">
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
            <div className="flex justify-center mt-8 pb-8">
              <Button
                onClick={() => setVisibleProductCount((prev) => prev + 10)}
                className="bg-bg-primary text-white px-10 rounded-full shadow-md hover:opacity-90 transition-opacity"
              >
                {t("Load_More")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const categoriesSection = (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      // التعديلات هنا: h-[calc(100vh-120px)] للتحديد الارتفاع، و sticky ليبقى ثابتاً
      className="w-1/4 min-w-[180px] bg-gray-50 rounded-xl  border border-gray-200 p-2 space-y-2 overflow-y-auto scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-64 sticky top-4 h-[calc(100vh-120px)]"
    >
      <h4 className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-2 tracking-widest">
        {t("Categories")}
      </h4>

      {/* زر All */}
      <div
        onClick={() => {
          handleCategorySelect("all");
          setSelectedSubCategory(null);
        }}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${selectedMainCategory === "all" && !selectedSubCategory
          ? "bg-bg-primary text-white border-bg-primary shadow-sm"
          : "bg-white text-gray-700 border-gray-100 hover:bg-red-50"
          }`}
      >
        <div className="w-15 h-15 bg-gray-100 rounded-lg flex items-center justify-center text-lg shadow-inner">
          🍽️
        </div>
        <span className="font-bold text-sm">{t("All")}</span>
      </div>

      {/* عرض الفئات الرئيسية + الفرعية */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {finalCategories.map((cat) => {
          const isMainSelected = selectedMainCategory === cat.id.toString();
          const hasSubCategories = (cat.sub_categories?.length || 0) > 0;

          return (
            <div key={cat.id} className="space-y-1">
              <div
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${isMainSelected && !selectedSubCategory
                  ? "bg-bg-primary text-white border-bg-primary shadow-sm"
                  : "bg-white text-gray-700 border-gray-100 hover:bg-red-50"
                  }`}
              >
                <img
                  src={cat.image_link}
                  alt={cat.name}
                  className="w-12 h-12 rounded-lg object-cover shadow-sm"
                />
                <span className="font-bold text-sm truncate flex-1">{cat.name}</span>
                {hasSubCategories && (
                  <span className="text-[10px] opacity-70">
                    {isMainSelected ? "▼" : "▶"}
                  </span>
                )}
              </div>

              {/* Sub-categories */}
              {isMainSelected && hasSubCategories && (
                <div className="mr-4 space-y-1 mt-1 border-r-2 border-bg-primary/20 pr-2">
                  {cat.sub_categories.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(sub.id, true);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${selectedSubCategory === sub.id.toString()
                        ? "bg-bg-primary/80 text-white border-bg-primary"
                        : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"
                        }`}
                    >
                      <span className="text-xs font-medium truncate">{sub.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  const handleSaveModuleOrder = () => {
    sessionStorage.setItem("module_order_number", moduleOrderNumber.trim());
    setIsNormalPrice(false);
    const id = tempGroupId.toString();
    sessionStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setShowCategories(true);
    setSelectedMainCategory("all");
    setSelectedSubCategory(null);
    setIsModuleOrderModalOpen(false);
    setTempGroupId(null);
    setModuleOrderNumber("");
    toast.success(t("ModuleOrderNumberSaved") || "تم حفظ رقم الطلب بنجاح");
  };
  return (
    <div
      className={`flex flex-col h-full ${isArabic ? "text-right" : "text-left"
        }`}
      dir={isArabic ? "ltr" : "rtl"}
    >
      <DeliveryInfo
        orderType={orderType}
        deliveryUserData={deliveryUserData}
        userLoading={userLoading}
        userError={userError}
        onClose={onClose}
      />
      <div className="flex gap-4 items-start  ">
        {isArabic ? (
          <>
            {productsGridSection}
            {categoriesSection}
          </>
        ) : (
          <>
            {productsGridSection}
            {categoriesSection}
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
        onAddFromModal={handleAddToOrder}
        orderLoading={orderLoading}
        productType={productType}
      />
      {orderLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <Loading />
        </div>
      )}
      <ModuleOrderModal
        isOpen={isModuleOrderModalOpen}
        onClose={() => {
          setIsModuleOrderModalOpen(false);
          setTempGroupId(null);
          setModuleOrderNumber("");
        }}
        moduleOrderNumber={moduleOrderNumber}
        setModuleOrderNumber={setModuleOrderNumber}
        onSave={handleSaveModuleOrder}
      />
    </div>
  );
}