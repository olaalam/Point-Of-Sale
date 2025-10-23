import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
const CustomerSelectionModal = ({
  isOpen,
  onClose,
  onSelectCustomer,
  searchQuery,
  setSearchQuery,
  customers,
  loading,
  requiredTotal,
}) => {
  // التحقق من أن المبلغ المطلوب ضمن حد الائتمان للعميل
  const isWithinDebitLimit = (customer) => {
    return requiredTotal <= customer.can_debit;
  };

  // عند النقر على عميل
  const handleCustomerClick = (customer) => {
    if (isWithinDebitLimit(customer)) {
      onSelectCustomer(customer);
    } else {
      toast.error(
        `Order amount (${requiredTotal.toFixed(2)} EGP) exceeds customer's debit limit (${customer.can_debit.toFixed(2)} EGP).`
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-md bg-white p-6 rounded-lg shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center text-red-600">
          Select Customer for Due Order
        </h2>

        <p className="text-center text-sm mb-4 text-gray-600">
          Order Total: <strong>{requiredTotal.toFixed(2)} EGP</strong>
        </p>

        {/* حقل البحث */}
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        {loading && (
          <p className="text-center text-sm text-gray-500">Searching...</p>
        )}

        {/* قائمة العملاء */}
        <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
          {customers.length > 0 ? (
            customers.map((customer) => {
              const withinLimit = isWithinDebitLimit(customer);
              return (
                <div
                  key={customer.id}
                  className={`flex justify-between items-center p-2 border rounded transition-colors ${
                    withinLimit
                      ? "cursor-pointer hover:bg-gray-50"
                      : "bg-red-50 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={() => handleCustomerClick(customer)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {customer.name} ({customer.phone})
                    </span>
                    <span
                      className={`text-xs ${
                        withinLimit ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Debit Limit: {customer.can_debit.toFixed(2)} EGP
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={withinLimit ? "default" : "outline"}
                    disabled={!withinLimit}
                  >
                    {withinLimit ? "Select" : "Limit Exceeded"}
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center">
              No customers found. Please refine your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectionModal;