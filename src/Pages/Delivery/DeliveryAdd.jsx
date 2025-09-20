// التعديل المطلوب على كودك الحالي

import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { useDeliveryForm } from "@/Hooks/useDeliveryForm";
import MapComponent from "@/components/MapComponent";
import UserFormFields from "./UserFormFields";
import AddressFormFields from "./AddressFormFields";

export default function DeliveryAdd() {
  // إضافة state للتحكم في حالة الـ submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    form,
    selectedLocation,
    setSelectedLocation,
    locationName,
    setLocationName,
    availableZones,
    formattedMapCoordinates,
    cities,
    isEditMode,
    isAddAnotherAddress,
    userIdFromUrl,
    editAddressData,
    isLoadingLists,
    isLoadingEditData,
    isLoadinguserData,
    handleCityChange,
    handleMarkerDragEnd,
    isAutoAddress,
    setIsAutoAddress,
    handleMapClick,
  } = useDeliveryForm();

  const navigate = useNavigate();
  const { loading, error, postData } = usePost();

  const onSubmit = async (values) => {
    // منع الـ submission إذا كان هناك عملية قيد التنفيذ
    if (isSubmitting || loading) {
      return;
    }

    // تفعيل حالة الـ submission
    setIsSubmitting(true);

    try {
      console.log("editAddressData:", editAddressData);
      console.log("onSubmit function called!");
      console.log("Form Values:", values);
      console.log("Selected Location:", selectedLocation);

      // Validate required fields before submission
      if (!values.city_id) {
        toast.error("Please select a city");
        return;
      }

      if (!values.zone_id) {
        toast.error("Please select a zone");
        return;
      }

      if (!values.address || values.address.length < 5) {
        toast.error("Please provide a valid address");
        return;
      }

      const addressObject = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        map: formattedMapCoordinates,
        street: values.street || "",
        building_num: values.building_num || "",
        floor_num: values.floor_num || "",
        apartment: values.apartment || "",
        city_id: Number(values.city_id),
        zone_id: Number(values.zone_id),
        address: values.address,
        additional_data: values.additional_data,
        type: values.type,
      };

      let finalPayload;
      let apiEndpoint;

      if (isEditMode) {
        console.log("editAddressData.addresses:", editAddressData?.addresses);
        console.log("editAddressData.address:", editAddressData?.address);
        const addressId = editAddressData?.addresses?.[0]?.id || editAddressData?.address?.id;

        if (!addressId) {
          toast.error("Address ID not found");
          return;
        }

        finalPayload = {
          ...addressObject,
          user_id: editAddressData?.user_id,
        };
        apiEndpoint = `cashier/user/address/update/${addressId}`;
      } else if (isAddAnotherAddress) {
        finalPayload = {
          ...addressObject,
          user_id: Number(userIdFromUrl),
        };
        apiEndpoint = `cashier/user/address/add/${userIdFromUrl}`;
      } else {
        finalPayload = {
          f_name: values.f_name,
          l_name: values.l_name,
          phone: values.phone,
          addresses: [addressObject],
        };
        if (values.phone_2?.trim()) {
          finalPayload.phone_2 = values.phone_2;
        }
        apiEndpoint = "cashier/user/add";
      }

      console.log("Final Payload:", finalPayload);

      const response = await postData(apiEndpoint, finalPayload);
      
      if (response && response.success) {
        toast.success(
          `${isEditMode
            ? "Address updated"
            : isAddAnotherAddress
              ? "Address added"
              : "User added"
          } successfully!`
        );
        
        if (!isEditMode && !isAddAnotherAddress) {
          form.reset();
        }
        
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        toast.error(
          response?.message ||
          `Failed to ${isEditMode
            ? "update address"
            : isAddAnotherAddress
              ? "add address"
              : "add user"
          }.`
        );
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Submission error: " + (err.message || "Unknown error."));
    } finally {
      // إلغاء تفعيل حالة الـ submission في جميع الحالات
      setIsSubmitting(false);
    }
  };

  // Loading state for address lists
  if (isLoadingLists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // Loading state for edit mode or add another address mode
  if (isEditMode && isLoadingEditData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // Show loading for user data in add-another-address mode
  if (isAddAnotherAddress && isLoadinguserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // حساب حالة الـ button (disabled إذا كان هناك loading أو submission)
  const isButtonDisabled = loading || isSubmitting;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
          {isEditMode
            ? "Edit Delivery Address"
            : isAddAnotherAddress
              ? "Add Another Address for User"
              : "Add New Delivery User"}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left - Map */}
          <MapComponent
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            handleMarkerDragEnd={handleMarkerDragEnd}
            handleMapClick={handleMapClick}
            isMapClickEnabled={isAutoAddress}
            isMapInteractionEnabled={isAutoAddress}
            form={form}
          />

          {/* Right - Form */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* User fields only in Add User mode */}
                {!isEditMode && !isAddAnotherAddress && (
                  <UserFormFields form={form} />
                )}

                {/* Address fields - show in all modes */}
                <AddressFormFields
                  form={form}
                  locationName={locationName}
                  setLocationName={setLocationName}
                  cities={cities}
                  availableZones={availableZones}
                  handleCityChange={handleCityChange}
                  isAutoAddress={isAutoAddress}
                  setIsAutoAddress={setIsAutoAddress}
                />

                {/* الزرار المحدث مع الـ disabled state */}
                <Button
                  type="submit"
                  className={`w-full mt-4 transition-all ${
                    isButtonDisabled 
                      ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                      : 'bg-bg-primary hover:bg-red-700 cursor-pointer'
                  }`}
                  disabled={isButtonDisabled}
                >
                  {/* عرض نص مختلف حسب الحالة */}
                  {isButtonDisabled ? (
                    <div className="flex items-center justify-center gap-2">
                      {/* أيقونة التحميل */}
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
                        ></circle>
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>
                        {isEditMode
                          ? "Updating..."
                          : isAddAnotherAddress
                            ? "Adding..."
                            : "Adding..."}
                      </span>
                    </div>
                  ) : (
                    <span>
                      {isEditMode
                        ? "Update Address"
                        : isAddAnotherAddress
                          ? "Add Address"
                          : "Add User"}
                    </span>
                  )}
                </Button>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </form>
            </Form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}