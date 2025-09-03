import React from "react";
import { Button } from "@/components/ui/button";

const DoneItemsSection = ({
  doneItems,
  selectedPaymentItems,
  handleSelectAllPaymentItems,
}) => (
  <div className="mt-6 bg-green-50 p-4 rounded-lg sm:overflow-y-auto md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-h-40">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-lg font-semibold text-green-800">
        Ready for Payment ({doneItems.length} items)
      </h3>
      <Button
        onClick={handleSelectAllPaymentItems}
        variant="outline"
        size="sm"
        className="text-green-600 border-green-300 hover:bg-green-100"
      >
        {selectedPaymentItems.length === doneItems.length
          ? "Deselect All"
          : "Select All"}
      </Button>
    </div>
    <p className="text-sm text-green-700 mb-3">
      Select items you want to process payment for (
      {selectedPaymentItems.length} selected)
    </p>



  </div>
);

export default DoneItemsSection;