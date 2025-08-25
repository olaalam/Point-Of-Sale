//all logic & API for delivery form is handled in this custom hook
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { addressSchema, adduserSchema } from "@/Pages/Delivery/addressSchema";
import { parseCoordinates, tryGeocode } from "@/components/tryGeocode";

export const useDeliveryForm = () => {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 31.2001, // Default to Alexandria, Egypt
    lng: 29.9187,
  });
  const [locationName, setLocationName] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [availableZones, setAvailableZones] = useState([]);
  const [formattedMapCoordinates, setFormattedMapCoordinates] = useState("");

  const { id } = useParams();
  const isEditMode = Boolean(id);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userIdFromUrl = searchParams.get("user_id");
  const isAddAnotherAddress = searchParams.has("user_id");

  const currentFormSchema =
    isEditMode || isAddAnotherAddress ? addressSchema : adduserSchema;

  const form = useForm({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      f_name: "",
      l_name: "",
      phone: "",
      phone_2: "",
      city_id: "",
      zone_id: "",
      address: "",
      street: "",
      building_num: null,
      floor_num: null,
      apartment: null,
      additional_data: "",
      type: "",
    },
  });

  const { data: addressListsData, isLoading: isLoadingLists } = useGet(
    "cashier/user/address/lists"
  );
  const cities = addressListsData?.cities || [];
  const zones = addressListsData?.zones || [];

  const { data: editAddressData, isLoading: isLoadingEditData } = useGet(
    isEditMode ? `cashier/shift_branch_reports/item/${id}` : null
  );

  const { data: userData, isLoading: isLoadinguserData } = useGet(
    isAddAnotherAddress && userIdFromUrl
      ? `cashier/user/${userIdFromUrl}`
      : null
  );

  const handleCityChange = useCallback(
    (cityId) => {
      setSelectedCityId(cityId);
      form.setValue("city_id", cityId);
      form.setValue("zone_id", "");

      const cityZones = zones.filter((zone) => {
        return (zone.city_id && zone.city_id.toString() === cityId) ||
               (zone.city?.id && zone.city.id.toString() === cityId);
      });
      setAvailableZones(cityZones);
    },
    [form, zones]
  );

  // This useEffect now handles both setting the form data and the available zones.
// ... (rest of the code)

// This useEffect now handles both setting the form data and the available zones.
// This useEffect now handles both setting the form data and the available zones.
useEffect(() => {
    // Wait for all data to load to prevent race conditions.
    if (isEditMode && (isLoadingEditData || isLoadingLists)) {
        return;
    }

    if (isEditMode && editAddressData && cities.length > 0 && zones.length > 0) {
        console.log("🔍 Complete editAddressData:", editAddressData);

        const address = editAddressData.address;
        if (!address) {
            console.error("Address data is missing.");
            return;
        }

        // ✅ FIXED: Look for cityId in both top-level `address.city_id` and nested `address.zone.city_id`
        const cityId = (address.city_id || address.zone?.city_id)?.toString() || "";

        const cityZones = zones.filter((zone) => {
            return (zone.city_id && zone.city_id.toString() === cityId) ||
                   (zone.city?.id && zone.city.id.toString() === cityId);
        });

        setAvailableZones(cityZones);
        setSelectedCityId(cityId);

        const formData = {
            city_id: cityId,
            // ✅ FIXED: Ensure zone_id is always a string and check for both possible locations.
            zone_id: (address.zone_id || address.zone?.id)?.toString() || "",
            address: address.address || "",
            street: address.street || "",
            building_num: address.building_num ? Number(address.building_num) : null,
            floor_num: address.floor_num ? Number(address.floor_num) : null,
            apartment: address.apartment ? Number(address.apartment) : null,
            additional_data: address.additional_data || "",
            type: address.type ? address.type.toLowerCase() : "",
        };
        
        console.log("🔍 Form data being set:", formData);
        form.reset(formData);

        const { latitude, longitude } = parseCoordinates(address.map);
        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
            const loc = { lat: latitude, lng: longitude };
            setSelectedLocation(loc);
        }
        setLocationName(address.address || "");
    }
}, [editAddressData, isEditMode, form, zones, cities, setSelectedCityId, isLoadingEditData, isLoadingLists]);

// ... (rest of the code)

  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const { lat, lng } = marker.getLatLng();
    setSelectedLocation({ lat, lng });
    tryGeocode(lat, lng, setLocationName, form);
  };

  useEffect(() => {
    if (!isEditMode && !isAddAnotherAddress && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setSelectedLocation(loc);
          tryGeocode(loc.lat, loc.lng, setLocationName, form);
        },
        (error) => {
          console.error("Error fetching location", error);
          const fallback = { lat: 31.2001, lng: 29.9187 };
          setSelectedLocation(fallback);
          const defaultAddress = "Alexandria, Egypt (Default Location)";
          setLocationName(defaultAddress);
          form.setValue("address", defaultAddress, { shouldValidate: true });
        }
      );
    } else if (isAddAnotherAddress) {
      if (!locationName) {
        const defaultAddress = "Click on map to select address";
        setLocationName(defaultAddress);
        form.setValue("address", defaultAddress, { shouldValidate: true });
      }
    }
  }, [isEditMode, isAddAnotherAddress, form]);


  useEffect(() => {
    if (zones.length > 0 && !isEditMode) {
      setAvailableZones(zones);
    }
  }, [zones, isEditMode]);

  return {
    form,
    selectedLocation,
    setSelectedLocation,
    locationName,
    setLocationName,
    selectedCityId,
    availableZones,
    formattedMapCoordinates,
    cities,
    zones,
    isEditMode,
    isAddAnotherAddress,
    userIdFromUrl,
    editAddressData,
    userData,
    isLoadingLists,
    isLoadingEditData,
    isLoadinguserData,
    handleCityChange,
    handleMarkerDragEnd,
    currentFormSchema,
  };
};