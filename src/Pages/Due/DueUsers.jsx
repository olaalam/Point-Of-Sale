import React, { useState, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";
import DuePaymentModal from "../Checkout/DuePaymentModal";
import { useNavigate } from "react-router-dom";
import { useConfirmDuePayment } from "@/hooks/useConfirmDuePayment";

const DueUsers = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useGet("cashier/customer/due_user");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requiredTotal, setRequiredTotal] = useState(0);

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load due users.");
    }
  }, [error]);

  const { handleConfirmDuePayment } = useConfirmDuePayment({
    navigate,
    onClearCart: () => {}, // No cart to clear
    onClose: () => setIsModalOpen(false),
    setDueSplits: () => {},
    setDueAmount: () => {},
  });

  const handlePayClick = (customer, dueAmount) => {
    setSelectedCustomer(customer); // Ensure customer is set
    setRequiredTotal(dueAmount);
    setIsModalOpen(true);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error?.message}</p>;
  if (!data?.users?.length) return <p>No users with due amounts.</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-[#910000] text-center">Due Users</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {data.users.map((user) => (
          <div
            key={user.id}
            className="bg-white p-4 rounded-lg shadow-md border border-gray-200"
          >
            <h3 className="text-lg font-semibold mb-2">{user.name}</h3>
            <p className="text-red-600 font-bold mb-2">Due: {user.due.toFixed(2)} EGP</p>
            <button
              onClick={() => handlePayClick(user, user.due)}
              className="w-full bg-bg-primary text-white py-2 rounded-md hover:bg-red-700 transition duration-200"
            >
              Pay Now
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && selectedCustomer && ( // Add guard to ensure selectedCustomer exists
        <DuePaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customer={selectedCustomer}
          requiredTotal={requiredTotal}
          onConfirm={(splits, dueAmount) => handleConfirmDuePayment(splits, dueAmount, selectedCustomer)}
        />
      )}
    </div>
  );
};

export default DueUsers;