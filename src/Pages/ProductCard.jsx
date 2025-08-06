// components/ProductCard.jsx
import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ProductCard = ({ product, onAddToOrder, onOpenModal, orderLoading }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 relative pb-16">
      {/* Clickable image and name - Opens Modal */}
      <div onClick={() => onOpenModal(product)} className="cursor-pointer">
        <img
          src={product.image_link || "https://via.placeholder.com/150"}
          alt={product.name}
          className="w-full h-32 object-cover"
        />
        <div className="p-3">
          <h3 className="text-base font-semibold text-gray-800 truncate">
            {product.name}
          </h3>
        </div>
      </div>

      {/* Description button that opens modal */}
      {product.description && product.description !== "null" && (
        <div className="px-3 -mt-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-xs text-bg-primary underline mt-1">
                Description
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Description</DialogTitle>
                <DialogDescription>{product.description}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Price */}
      <div className="px-3">
        <div className="mt-1 text-sm font-bold text-bg-primary">
          {product.price_after_discount !== null &&
          product.price_after_discount < product.price ? (
            <>
              <span className="text-red-600 line-through mr-1">
                {product.price} EGP
              </span>
              <span>{product.price_after_discount} EGP</span>
            </>
          ) : (
            <span>{product.price} EGP</span>
          )}
        </div>
      </div>

      {/* Add to Order - Updated with loading state */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white">
        <button
          onClick={() => onAddToOrder(product)}
          disabled={orderLoading}
          className={`w-full py-1 px-2 text-sm rounded transition-colors ${
            orderLoading
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-bg-primary text-white hover:bg-red-700"
          }`}
        >
          {orderLoading ? "Adding..." : "Add to Order"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;