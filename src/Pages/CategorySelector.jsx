// components/CategorySelector.jsx
import React from "react";
import { Button } from "@/components/ui/button";

const CategorySelector = ({ categories, selectedCategory, onCategorySelect }) => {
  if (categories.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No categories found.
      </div>
    );
  }

  return (
    <div className="flex flex-nowrap w-[100%] space-x-4 pb-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ">
      {/* "All" button */}
      <div className="flex-shrink-0">
        <Button
          onClick={() => onCategorySelect("all")}
          className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[80px] h-[100px] transition-all ${
            selectedCategory === "all"
              ? "bg-bg-primary text-white hover:bg-red-700"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <div className="w-10 h-10 mb-1 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-bg-primary font-bold">🍽️</span>
          </div>
          <span className="text-sm font-semibold">All</span>
        </Button>
      </div>

      {/* Dynamic categories */}
      {categories.map((category) => (
        <div key={category.id} className="flex-shrink-0">
          <Button
            onClick={() => onCategorySelect(category.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[80px] h-[100px] transition-all ${
              selectedCategory === category.id
                ? "bg-bg-primary text-white hover:bg-red-700"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <img
              src={category.image_link || "https://via.placeholder.com/40"}
              alt={category.name}
              className="w-10 h-10 mb-1 rounded-full object-cover"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/40";
              }}
            />
            <span className="text-sm font-semibold capitalize text-center">
              {category.name}
            </span>
          </Button>
        </div>
      ))}
    </div>
  );
};

export default CategorySelector;