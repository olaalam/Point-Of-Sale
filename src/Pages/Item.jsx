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
import GroupSelector from "./GroupSelector";
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
export default function Item({ onAddToOrder, onClose, onClearCart, cartHasItems }) {
  const [selectedMainCategory, setSelectedMainCategory] = useState("favorite");
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [branchIdState, setBranchIdState] = useState(sessionStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");
  const [selectedGroup, setSelectedGroup] = useState("none");
  const [showCategories, setShowCategories] = useState(true);
  const [isNormalPrice, setIsNormalPrice] = useState(true);
  const [isModuleOrderModalOpen, setIsModuleOrderModalOpen] = useState(false);
  const [tempGroupId, setTempGroupId] = useState(null);
  const [moduleOrderNumber, setModuleOrderNumber] = useState("");
  const [selectedGroupInfo, setSelectedGroupInfo] = useState(null);
  const { t, i18n } = useTranslation();
  const scrollRef = useRef(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const scannerInputRef = useRef(null);
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
    const input = scannerInputRef.current;
    if (!input) return;

    // تركيز أولي
    input.focus();

    const handleBlur = (e) => {
      // 1. لا تعيد التركيز إذا كان هناك مودال مفتوح
      if (isProductModalOpen || isModuleOrderModalOpen) return;

      // 2. لا تعيد التركيز إذا كان العنصر الجديد الذي تم الضغط عليه هو حقل إدخال (Input)
      if (
        e.relatedTarget &&
        (e.relatedTarget.tagName === "INPUT" || e.relatedTarget.tagName === "SELECT")
      ) {
        return;
      }

      // 3. انتظر قليلاً ثم تأكد أن المستخدم لم ينتقل لحقل آخر قبل إعادة التركيز
      setTimeout(() => {
        if (
          !isProductModalOpen &&
          !isModuleOrderModalOpen &&
          document.activeElement.tagName !== "INPUT" &&
          document.activeElement.tagName !== "SELECT"
        ) {
          input.focus();
        }
      }, 150);
    };

    input.addEventListener("blur", handleBlur);
    return () => input.removeEventListener("blur", handleBlur);
  }, [isProductModalOpen, isModuleOrderModalOpen]); // ضروري إضافة الـ States هنا ليحدث الكود نفسه
  const orderType = sessionStorage.getItem("order_type") || "dine_in";
  const { deliveryUserData, userLoading, userError } =
    useDeliveryUser(orderType);
  const { postData: postOrder, loading: orderLoading } = usePost();

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

  const currentOffers = useMemo(() => {
    if (!allModulesData) return [];
    if (orderType === "take_away") return allModulesData.offers_take_away || [];
    if (orderType === "dine_in") return allModulesData.offers_dine_id || [];
    if (orderType === "delivery") return allModulesData.offers_delivery || [];
    return [];
  }, [allModulesData, orderType]);

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

    // 1. البحث أولاً
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return allProducts.filter(
        (p) =>
          (p.name?.toLowerCase() || "").includes(query) ||
          (p.product_code?.toString().toLowerCase() || "").includes(query)
      );
    }

    // 2. تحديد المصدر (المهم هنا)
    if (selectedGroup === "all") {
      // دي الحالة اللي الزرار الجانبي بيعملها دلوقتي (بترجع favouriteProducts)
      products = favouriteProducts;
    } else if (isNormalPrice || selectedGroup === "none") {
      products = allProducts;
    } else {
      // لو مختارين مجموعة معينة (Module)
      products = favouriteCategoriesData?.products || [];
    }

    // 3. الفلترة حسب الـ Category لو مش مختارين "favorite"
    if (selectedMainCategory !== "all" && selectedMainCategory !== "favorite") {
      products = products.filter(p => p.category_id === parseInt(selectedMainCategory));
    }

    // 4. الفلترة حسب الـ Sub Category
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
      setSelectedOffer(null); // Reset offer
      setShowCategories(false);
      setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);
    }
  };

  const handleNormalPricesClick = () => {
    // 1. تعريف ماذا سيحدث عند التحويل (هذا هو الكود القديم الخاص بك)
    const performSwitch = () => {
      if (onClearCart && !isNormalPrice) {
        onClearCart();
      }
      setIsNormalPrice(true);
      setSelectedGroup("none");
      setShowCategories(true);
      setSelectedMainCategory("all");
      setSelectedSubCategory(null);
      sessionStorage.removeItem("module_order_number");
      setShowClearModal(false); // إغلاق المودال إن كان مفتوحاً
    };

    // 2. التحقق قبل التنفيذ
    // لو احنا حالياً مش في الـ Normal والسلة فيها منتجات، طلع تحذير
    if (!isNormalPrice && cartHasItems) {
      setPendingAction(() => performSwitch); // خزن العملية عشان ننفذها لو داس موافق
      setShowClearModal(true);
    } else {
      performSwitch(); // نفذ فوراً لو مفيش منتجات أو احنا في نفس المود
    }
  };

  const handleGroupChange = (groupId) => {
    setIsNormalPrice(false);
    const id = groupId.toString();
    setSelectedGroup(id);

    // لو عاوزة يفتح مودال رقم الطلب أول ما يختار من الـ select:
    setTempGroupId(id);
    setModuleOrderNumber(sessionStorage.getItem("module_order_number") || "");
    setIsModuleOrderModalOpen(true);
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
    <div className="sticky top-0 bg-white z-9 border-b border-gray-100 shadow-sm p-3">
      <div className="flex flex-col md:flex-row items-center gap-3">

        {/* 1. اللوجو والـ Select (اختيار المجموعة) */}
        <GroupSelector
          selectedGroup={selectedGroup}
          isNormalPrice={isNormalPrice}
          groupProducts={groupProducts}
          resturantLogo={resturant_logo}
          onSelectGroup={(groupId, groupInfo) => {
            setTempGroupId(groupId);
            setModuleOrderNumber(sessionStorage.getItem("module_order_number") || "");
            setSelectedGroupInfo(groupInfo);
            setIsModuleOrderModalOpen(true);
          }}
          onSelectNormalPrice={handleNormalPricesClick}
        />

        {/* 2. حقل البحث - أخد مساحة أكبر */}
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder={t("SearchByProductName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            ref={scannerInputRef}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-bg-primary transition-all"
          />
        </div>

        {/* 3. By Piece / By Weight */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 flex-shrink-0">
          <button
            onClick={() => setProductType("piece")}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${productType === "piece" ? "bg-white shadow text-bg-primary" : "text-gray-500"
              }`}
          >
            {t("ByPiece")}
          </button>
          <button
            onClick={() => setProductType("weight")}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${productType === "weight" ? "bg-white shadow text-bg-primary" : "text-gray-500"
              }`}
          >
            {t("ByWeight")}
          </button>
        </div>
      </div>
    </div>
  );
  const groupsBarSection = (
    <div className={`flex gap-3 overflow-x-auto p-4 scrollbar-hide items-center`}>
      {/* Favorite
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
      </Button> */}

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
        {/* <div className="absolute bottom-0 w-full py-1 bg-black/70 backdrop-blur-sm text-white transition-transform duration-300">
          <span className="font-bold text-[10px] block px-1 truncate text-center uppercase">
            {t("NormalPrices")}
          </span>
        </div> */}
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
              setSelectedGroupInfo({
                name: group.name,
                image: group.icon_link || "/default-group.png",
              });
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
            {/* <div className="absolute bottom-0 w-full py-1 bg-black/70 backdrop-blur-sm text-white transition-transform duration-300">
              <span className="font-bold text-[10px] block px-1 truncate text-center uppercase">
                {group.name}
              </span>
            </div> */}
          </Button>
        );
      })}
    </div>
  );

  const productsGridSection = (
    <div className="flex-1 h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" dir={isArabic ? "rtl" : "ltr"}>
      {searchAndToggleSection}
      {/* {  groupsBarSection} */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg font-medium">{t("No_products_found")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 p-2">            {productsToDisplay.map((product) => (
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

  const offersGridSection = (
    <div className="flex-1 h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-width-none [&::-webkit-scrollbar]:hidden" dir={isArabic ? "rtl" : "ltr"}>
      {searchAndToggleSection}
      {selectedOffer ? (
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedOffer(null)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 text-bg-primary font-bold"
            >
              {isArabic ? "➡️ عودة" : "⬅️ Back"}
            </button>
            <h2 className="text-xl font-bold">{selectedOffer.name}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {selectedOffer.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToOrder={handleAddToOrder}
                onOpenModal={openProductModal}
                orderLoading={orderLoading}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {currentOffers.map((offer, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedOffer(offer)}
              className="bg-white border-2 border-transparent hover:border-bg-primary rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group relative"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={offer.products[0]?.image_link || "/placeholder.png"}
                  alt={offer.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-2xl text-sm font-black shadow-xl transform group-hover:scale-110 transition-transform">
                  {offer.discount}% {t("OFF")}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-black text-xl mb-1 drop-shadow-lg">
                  {offer.name}
                </h3>
                <p className="text-sm font-medium opacity-90">
                  {offer.products.length} {t("Products")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 1. تأكدي من إضافة هذا الجزء قبل تعريف categoriesSection

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      if (direction === "up") {
        scrollRef.current.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      } else if (direction === "down") {
        scrollRef.current.scrollBy({ top: scrollAmount, behavior: "smooth" });
      } else if (direction === "left") {
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else if (direction === "right") {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  // 2. كود categoriesSection الكامل المعدل
  const categoriesSection = (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="lg:w-45 w-full lg:sticky lg:top-4 lg:h-[calc(100vh-120px)] flex flex-col gap-2"
    >
      {/* الجزء العلوي: العنوان والأسهم بجانبه */}
      <div className="flex items-center justify-between px-2 mb-1">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {t("Categories")}
        </h4>

        {/* أزرار الأسهم - تظهر فقط في الشاشات الكبيرة */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => scroll("up")}
            className="p-1 rounded-full hover:bg-bg-primary hover:text-white text-gray-400 transition-colors border border-gray-100 shadow-sm"
            title="Scroll Up"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("down")}
            className="p-1 rounded-full hover:bg-bg-primary hover:text-white text-gray-400 transition-colors border border-gray-100 shadow-sm"
            title="Scroll Down"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* الحاوية الأساسية للتصنيفات */}
      <div
        ref={scrollRef}
        className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 gap-2 scrollbar-hide scroll-smooth"
      >
        {/* زر العروض */}
        {currentOffers.length > 0 && (
          <div
            onClick={() => {
              setSelectedMainCategory("offers");
              setSelectedSubCategory(null);
              setSelectedOffer(null);
              setShowCategories(false);
            }}
            className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-xl cursor-pointer transition-all border shrink-0 min-w-[120px] lg:min-w-0 ${selectedMainCategory === "offers"
              ? "bg-bg-primary text-white border-bg-primary shadow-md"
              : "bg-white text-gray-700 border-gray-100 hover:border-red-200"
              }`}
          >
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center text-base lg:text-lg">
              🎁
            </div>
            <span className="font-bold text-xs lg:text-sm whitespace-nowrap">{t("Offers")}</span>
          </div>
        )}

        {/* زر المفضلة */}
        <div
          onClick={() => {
            setIsNormalPrice(false);
            setSelectedGroup("all");
            setSelectedMainCategory("favorite");
            setSelectedSubCategory(null);
            setSelectedOffer(null);
          }}
          className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-xl cursor-pointer transition-all border shrink-0 min-w-[120px] lg:min-w-0 ${(selectedGroup === "all" || selectedMainCategory === "favorite") && !isNormalPrice
            ? "bg-bg-primary text-white border-bg-primary shadow-md"
            : "bg-white text-gray-700 border-gray-100 hover:border-red-200"
            }`}
        >
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center text-base lg:text-lg">
            ❤️
          </div>
          <span className="font-bold text-xs lg:text-sm whitespace-nowrap">{t("Favorite")}</span>
        </div>

        {/* باقي التصنيفات */}
        {finalCategories.map((cat) => {
          const isMainSelected = selectedMainCategory === cat.id.toString();
          const hasSubCategories = (cat.sub_categories?.length || 0) > 0;

          return (
            <div key={cat.id} className="flex lg:flex-col gap-1 shrink-0 lg:shrink">
              <div
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-2 rounded-xl cursor-pointer transition-all border min-w-[140px] lg:min-w-0 ${isMainSelected && !selectedSubCategory
                  ? "bg-bg-primary text-white border-bg-primary shadow-md"
                  : "bg-white text-gray-700 border-gray-100 hover:border-red-200"
                  }`}
              >
                <img
                  src={cat.image_link}
                  alt={cat.name}
                  className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg object-cover shadow-sm"
                />
                <span className="font-bold text-xs lg:text-sm truncate flex-1">
                  {cat.name}
                </span>
              </div>

              {/* التصنيفات الفرعية */}
              {isMainSelected && hasSubCategories && (
                <div className="hidden lg:flex flex-col mr-4 space-y-1 mt-1 border-r-2 border-bg-primary/20 pr-2">
                  {cat.sub_categories.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(sub.id, true);
                      }}
                      className={`p-2 rounded-lg cursor-pointer transition-all border text-center ${selectedSubCategory === sub.id.toString()
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
    // 1. تعريف عملية التحويل والحفظ
    const performSave = () => {
      if (onClearCart && isNormalPrice) {
        onClearCart();
      }
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
      setShowClearModal(false);
    };

    // 2. التحقق قبل التنفيذ
    // لو احنا حالياً في Normal والسلة فيها منتجات، طلع تحذير
    if (isNormalPrice && cartHasItems) {
      setPendingAction(() => performSave);
      setShowClearModal(true);
    } else {
      performSave();
    }
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
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full px-2">
        {selectedMainCategory === "offers" ? (
          <>
            <div className=" w-full lg:w-[85%]">
              {offersGridSection}
            </div>
            <div className="w-full lg:w-[15%]">
              {categoriesSection}
            </div>
          </>
        ) : isArabic ? (
          <>
            <div className=" w-full lg:w-[85%]">
              {productsGridSection}
            </div>
            <div className="w-full lg:w-[15%]">
              {categoriesSection}
            </div>
          </>
        ) : (
          <>
            <div className=" w-full lg:w-[85%]">
              {productsGridSection}
            </div>
            <div className="w-full lg:w-[15%]">
              {categoriesSection}
            </div>
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
          setSelectedGroupInfo(null);
        }}
        moduleOrderNumber={moduleOrderNumber}
        setModuleOrderNumber={setModuleOrderNumber}
        onSave={handleSaveModuleOrder}
        groupImage={selectedGroupInfo?.image}
        groupName={selectedGroupInfo?.name}
      />
      {/* --- بداية كود مودال تأكيد المسح --- */}
      {showClearModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              {/* أيقونة تحذير */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t("Attention") || "تنبيه"}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {t("ChangingModeWillClearCart") || "الانتقال لهذا النظام سيقوم بمسح محتويات السلة الحالية. هل أنت متأكد؟"}
              </p>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowClearModal(false)}
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  {t("Cancel") || "إلغاء"}
                </Button>
                <Button
                  onClick={() => {
                    if (pendingAction) pendingAction(); // تنفيذ العملية المؤجلة
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                >
                  {t("Confirm") || "موافق ومسح"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- نهاية كود مودال تأكيد المسح --- */}

    </div>
  );
}