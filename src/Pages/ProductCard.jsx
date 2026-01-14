//page for product card component that displays product details and allows adding to order (products div)
import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const ProductCard = ({ product, onAddToOrder, onOpenModal }) => {
  // إضافة state منفصل لكل كارت
  const [isCurrentItemLoading, setIsCurrentItemLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // دالة للتعامل مع إضافة المنتج مع loading منفصل
  const handleAddToOrder = async (product) => {
    setIsCurrentItemLoading(true);
    try {
      console.log("ProductCard → handleAddToOrder called", product.id);

      await onAddToOrder(product);
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setIsCurrentItemLoading(false);
    }
  };

  // التحقق من وجود خصم حقيقي
  const hasRealDiscount = Number(product.discount_val || 0) > 0;
  // السعر الأصلي قبل الخصم (السعر الحالي + قيمة الخصم)
  const originalPrice = Number(product.final_price || 0) + Number(product.discount_val || 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 relative pb-16">
      {/* Clickable image and name - Opens Modal */}
      <div onClick={() => onOpenModal(product)} className="cursor-pointer">
        <img
          src={product.image_link }
          alt={product.name}
          className="w-full h-32 object-cover"
        />
        <div className="px-3">
          <h3 className="text-base font-semibold text-gray-800 truncate">
            {product.name}
          </h3>
        </div>
      </div>

      {/* Price Section - النسخة المصححة */}
      <div className="px-3">
        <div className="mt-1 text-sm font-bold text-bg-primary">
          {hasRealDiscount ? (
            <>
              <span className="text-red-600 line-through mr-1">
                {originalPrice.toFixed(2)} {t("EGP")}
              </span>
              <span>
                {Number(product.final_price).toFixed(2)} {t("EGP")}
              </span>
            </>
          ) : (
            <span>
              {Number(product.final_price).toFixed(2)} {t("EGP")}
            </span>
          )}
        </div>
      </div>

      {/* Add to Order - Updated with individual loading state */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white">
        <button
          onClick={() => handleAddToOrder(product)}
          disabled={isCurrentItemLoading}
          className={`w-full py-1 px-2 text-sm rounded transition-colors ${
            isCurrentItemLoading
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-bg-primary text-white hover:bg-red-700"
          }`}
        >
          {isCurrentItemLoading ? t("Adding") : t("AddToOrder")}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;