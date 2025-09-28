import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/Food2go Icon Vector Container.png";
import { User } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut";
import Loading from "@/components/Loading";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

export function CashierButton({
  cashierId,
  cashierName,
  icon: Icon,
  isActive,
  onSelect,
  loadingPost,
}) {
  const bgColor = isActive ? "bg-green-600" : "bg-white";
  const textColor = isActive ? "text-white" : "text-gray-700";
  const hoverBg = isActive ? "hover:bg-green-700" : "hover:bg-[#750000]";
  const iconColor = isActive ? "text-white" : "text-[#910000]";
  const circleColor = isActive
    ? "bg-white border-white"
    : "bg-gray-200 border-gray-300";

  return (
    <Button
      onClick={() => onSelect(cashierId)}
      disabled={loadingPost}
      className={`w-full flex items-center justify-between p-4 h-auto rounded-xl shadow-md
        ${bgColor} ${textColor} ${hoverBg} text-lg font-semibold transition-colors duration-200 ease-in-out`}
    >
      <div className="flex items-center gap-4">
        {Icon && <Icon className={`w-6 h-6 ${iconColor}`} />}
        <span>{cashierName}</span>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 ${circleColor}`}></div>
    </Button>
  );
}

export default function Cashier() {
  const { data, error, isLoading, refetch } = useGet(`cashier/home`);
  const [selectedCashierId, setSelectedCashierId] = useState(null);
  const [showHidden, setShowHidden] = useState(false); // state للتحكم بالـ hidden cashiers
  const { putData, loading: postLoading, error: postError } = usePut();
  const navigate = useNavigate();

  useEffect(() => {
    if (postError) {
      toast.error(
        `Failed to activate cashier: ${postError.message || "Unknown error"}`
      );
    } else if (postLoading === false && selectedCashierId !== null) {
      toast.success(`Cashier ${selectedCashierId} activated successfully!`);
      refetch();
      setSelectedCashierId(null);
    }
  }, [postError, postLoading, selectedCashierId, refetch]);

  const handleCashierSelection = async (id) => {
    setSelectedCashierId(id);
    localStorage.setItem("cashier_id", id);

    try {
      await putData(`cashier/home/active_cashier/${id}`, {});
      navigate("/shift?action=open");
    } catch (err) {
      console.error("Error activating cashier:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }
  if (error)
    return (
      <div>Error loading cashiers: {error.message || "Unknown error"}</div>
    );

  const cashiers = data?.cashiers || [];
  const hiddenCashiers = data?.hidden_cashiers || [];
  const activeCashierIdFromApi = data?.active_cashier_id;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 bg-white min-h-screen">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <h1 className="text-3xl md:text-4xl font-bold text-black text-left">
            Selection Cashier
          </h1>

          <div className="space-y-4 grid grid-cols-1 gap-3">
            {/* Regular cashiers */}
            {cashiers.length > 0 ? (
              cashiers.map((cashier) => (
                <CashierButton
                  key={cashier.id}
                  cashierId={cashier.id}
                  cashierName={cashier.name || `Cashier ${cashier.id}`}
                  icon={User}
                  isActive={cashier.id === activeCashierIdFromApi}
                  onSelect={handleCashierSelection}
                  loadingPost={postLoading && selectedCashierId === cashier.id}
                />
              ))
            ) : (
              <div>No cashiers available.</div>
            )}

            {/* Show More Button */}
            {hiddenCashiers.length > 0 && !showHidden && (
              <Button
                onClick={() => setShowHidden(true)}
                className="w-full bg-gray-200 text-black hover:bg-gray-300 font-semibold rounded-xl p-4"
              >
                Show More
              </Button>
            )}

            {/* Hidden cashiers */}
            {showHidden &&
              hiddenCashiers.map((cashier) => (
                <CashierButton
                  key={cashier.id}
                  cashierId={cashier.id}
                  cashierName={cashier.name || `Cashier ${cashier.id}`}
                  icon={User}
                  isActive={cashier.id === activeCashierIdFromApi}
                  onSelect={handleCashierSelection}
                  loadingPost={postLoading && selectedCashierId === cashier.id}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-white">
        <img
          src={logo}
          alt="Food2go Logo"
          className="w-full h-auto max-w-[378px] max-h-[311px] object-contain"
        />
      </div>
      <ToastContainer />
    </div>
  );
}
