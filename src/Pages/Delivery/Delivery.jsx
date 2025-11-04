import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Phone, MapPin, User, Pencil } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { usePost } from "@/Hooks/usePost";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export default function Delivery({ orderType: propOrderType }) {
  const [searchQuery, setSearchQuery] = useState("");
  const orderType = propOrderType || "delivery";
  const { t ,i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [filteredusers, setFilteredusers] = useState([]);
  const navigate = useNavigate();
  const [selecteduser, setSelecteduser] = useState(null);
  const [editData, setEditData] = useState({ name: "", phone: "" });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // إضافة state للـ submission في الـ dialog
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, error, isLoading, refetch } = useGet("cashier/user");
  const { postData, loading } = usePost(); // تأكد من أخذ loading من usePost

  useEffect(() => {
    console.log("Raw data from API:", data);
    if (data?.users) {
      console.log("users array:", data?.users);
      data?.users.forEach((user, index) => {
        console.log(`user ${index}:`, user);
        console.log(`user ${index} address:`, user?.address);
      });
      setFilteredusers(data.users);
    }
  }, [data]);

  const handleInstantSearch = (query) => {
    setSearchQuery(query);

    if (!data?.users) {
      setFilteredusers([]);
      return;
    }

    if (!query) {
      setFilteredusers(data.users);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const filtered = data.users.filter((user) => {
      const fullName = `${user.f_name} ${user.l_name}`.toLowerCase();
      const matchesName = fullName.includes(lowerCaseQuery);
      const matchesPhone =
        user.phone && String(user.phone).includes(lowerCaseQuery);
      return matchesName || matchesPhone;
    });
    setFilteredusers(filtered);
  };

  const handleAddUser = () => {
    navigate("/add");
  };

  const handleEditClick = (user) => {
    setSelecteduser(user);
    setEditData({
      f_name: user.f_name,
      l_name: user.l_name,
      phone: user.phone,
      phone_2: user.phone_2,
    });
    setOpenDialog(true);
  };

  // تعديل دالة handleSaveEdit لإضافة الـ disabled state
  const handleSaveEdit = async () => {
    if (!selecteduser) return;
    
    // منع الـ submission إذا كان هناك عملية قيد التنفيذ
    if (isSubmitting || loading) {
      return;
    }

    // تفعيل حالة الـ submission
    setIsSubmitting(true);

    try {
      await postData(`cashier/user/update/${selecteduser.id}`, editData);
      setOpenDialog(false);
      refetch();
    } catch (error) {
      console.error("Error updating user:", error);
      // يمكنك إضافة toast error هنا
    } finally {
      // إلغاء تفعيل حالة الـ submission
      setIsSubmitting(false);
    }
  };

  const handleEditAddressClick = (address) => {
    navigate(`order-page/add/${address.id}`);
  };

  const handleConfirmDelivery = (user, addressId) => {
    const selectedAddress = user.address.find((addr) => addr.id === addressId);

    sessionStorage.setItem("selected_user_id", user.id);
    sessionStorage.setItem("selected_address_id", addressId);
    sessionStorage.setItem("order_type", "delivery");

    const userData = {
      id: user.id,
      f_name: user.f_name,
      l_name: user.l_name,
      phone: user.phone,
      phone_2: user.phone_2,
      selectedAddress: selectedAddress,
    };
    sessionStorage.setItem("selected_user_data", JSON.stringify(userData));
    console.log("Attempting to navigate to /order-page with state:", {
      orderType: "delivery",
      userId: user.id,
      addressId: addressId,
    });

navigate("/delivery-order", {
  state: { orderType: "delivery", userId: user.id, addressId: addressId },
  replace: true,
});
  };

  // حساب حالة الـ disabled للـ form في الـ dialog
  const isFormDisabled = loading || isSubmitting;

  console.log("Order Type:", orderType);
  
  return (
    <div className={`bg-gray-100 min-h-screen ${
        isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
      } ${!searchQuery && filteredusers.length === 0 ? "flex items-center justify-center" : ""}`}
            dir={isArabic ? "rtl" : "ltr"}

      >
      <div className="max-w-6xl mx-auto px-6 py-3">
        {/* Search and Add User */}
        <div className="flex gap-2 items-center my-6">
          <Input
            type="text"
            placeholder={t("SearchuserNameorPhone")}
            value={searchQuery}
            onChange={(e) => handleInstantSearch(e.target.value)}
            className="flex-grow p-3 text-lg rounded-lg border-gray-300 bg-white"
          />
          <Button
            onClick={handleAddUser}
            className="bg-bg-primary hover:bg-red-700 text-white rounded-lg px-4 py-3"
          >
            <UserPlus className="w-5 h-5 mr-1" />
            {t('AddUser')}
          </Button>
        </div>

        {isLoading && <Loading />}
        {error && <p className="text-bg-primary">Error: {error.message}</p>}

        {searchQuery ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredusers.length === 0 && !isLoading && !error ? (
              <p className="text-gray-500 text-center col-span-2">
              {t("Nousersfoundmatchingyoursearch")}
              </p>
            ) : (
              filteredusers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg border"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-bg-primary" />
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        {user.f_name} {user.l_name}
                      </div>
                    </div>
                    <Pencil
                      className="w-5 h-5 text-bg-primary cursor-pointer"
                      onClick={() => handleEditClick(user)}
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <Phone className="w-4 h-4 text-bg-primary" />
                    <span className="text-md">{user.phone}</span>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-3">
                    {user.address && user.address.length > 0 ? (
                      user.address.map((address, index) => (
                        <div
                          key={`${user.id}-${address.id}-${index}`}
                          className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${
                            selectedAddressId === address.id
                              ? "bg-red-50 border-red-500"
                              : "bg-gray-50"
                          }`}
                          onClick={() => {
                            setSelectedAddressId(address.id);
                            setSelectedUserId(user.id);
                            setSelecteduser(user);
                          }}
                        >
                          <div className="flex gap-2 items-start">
                            <MapPin className="w-5 h-5 mt-1 text-bg-primary" />
                            <span className="text-sm text-gray-800">
                              {address.zone?.zone ||
                                address.zone ||
                                "Unknown Zone"}{" "}
                              -{" "}
                              {address.address || address.name || "No address"}
                            </span>
                          </div>
                          <Pencil
                            className="w-4 h-4 text-bg-primary cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddressClick(address);
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{t("Noaddressavailable")}</span>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 mt-5">
                    <button
                      className="w-1/2 bg-bg-primary hover:bg-red-700 text-white py-2 rounded-md"
                      onClick={() => navigate(`/add?user_id=${user.id}`)}
                    >
                      + {t("AddAddress")}
                    </button>

                    {selectedAddressId && selectedUserId === user.id && (
                      <button
                        className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                        onClick={() =>
                          handleConfirmDelivery(user, selectedAddressId)
                        }
                      >
                        {t("ConfirmDelivery")}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-center text-gray-500 text-lg">
              🔍 {t("Pleasesearchbynameorphonetofindusers")}
            </p>
          </div>
        )}
      </div>

      {/* Dialog مع الـ disabled state */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="space-y-4 bg-white">
          <h2 className="text-xl font-semibold text-center text-bg-primary">
            {t("Edituser")}
          </h2>
          
          {/* Input Fields مع الـ disabled state */}
          <Input
            value={editData.f_name}
            onChange={(e) =>
              setEditData({ ...editData, f_name: e.target.value })
            }
            placeholder={t("FirstName")}
            className={`border-gray-300 ${
              isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
            }`}
            disabled={isFormDisabled}
          />
          
          <Input
            value={editData.l_name}
            onChange={(e) =>
              setEditData({ ...editData, l_name: e.target.value })
            }
            placeholder={t("LastName")}
            className={`border-gray-300 ${
              isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
            }`}
            disabled={isFormDisabled}
          />
          
          <Input
            value={editData.phone}
            onChange={(e) =>
              setEditData({ ...editData, phone: e.target.value })
            }
            placeholder={t("Phone")}
            className={`border-gray-300 ${
              isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
            }`}
            disabled={isFormDisabled}
          />
          
          <Input
            value={editData.phone_2}
            onChange={(e) =>
              setEditData({ ...editData, phone_2: e.target.value })
            }
            placeholder={t("AnotherPhone")}
            className={`border-gray-300 ${
              isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
            }`}
            disabled={isFormDisabled}
          />
          
          {/* Button مع الـ disabled state والـ loading indicator */}
          <Button
            onClick={handleSaveEdit}
            disabled={isFormDisabled}
            className={`w-full transition-all ${
              isFormDisabled
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : 'bg-bg-primary hover:bg-red-700'
            } text-white`}
          >
            {isFormDisabled ? (
              <div className="flex items-center justify-center gap-2">
                {/* Spinner Icon */}
                <svg 
                  className="animate-spin h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>{t("Saving")}</span>
              </div>
            ) : (
              t("Save")
            )}
          </Button>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}