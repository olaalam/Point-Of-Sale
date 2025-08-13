//all logic & API for delivery form is handled in this custom hook
import { useEffect, useState } from "react";
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

  const { id } = useParams(); // For address ID in edit mode
  const isEditMode = Boolean(id);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userIdFromUrl = searchParams.get("user_id");
  const isAddAnotherAddress = searchParams.has("user_id");

  // Determine which schema to use based on the mode
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

  // Fetch cities and zones data from the new API
  const { data: addressListsData, isLoading: isLoadingLists } = useGet(
    "cashier/user/address/lists"
  );
  const cities = addressListsData?.cities || [];
  const zones = addressListsData?.zones || [];

  // useGet for address data in edit mode
  const { data: editAddressData, isLoading: isLoadingEditData } = useGet(
    isEditMode ? `cashier/shift_branch_reports/item/${id}` : null
  );

  // useGet for user data in "add another address" mode
  const { data: userData, isLoading: isLoadinguserData } = useGet(
    isAddAnotherAddress && userIdFromUrl
      ? `cashier/user/${userIdFromUrl}`
      : null
  );

  // Improved city change handler - filter zones by city_id
  const handleCityChange = (cityId) => {
    setSelectedCityId(cityId);
    form.setValue("city_id", cityId);
    form.setValue("zone_id", ""); // Reset zone selection

    const cityZones = zones.filter((zone) => {
      if (zone.city_id) {
        return zone.city_id.toString() === cityId;
      }

      // Method 2: If zones have a city relationship object
      if (zone.city && zone.city.id) {
        return zone.city.id.toString() === cityId;
      }

      // Method 3: If your API has a different structure, adjust accordingly
      // For now, if no clear relationship exists, show all zones
      return true;
    });

    setAvailableZones(cityZones);

    console.log("🔍 Filtered zones for city", cityId, ":", cityZones);
  };

  // Update formattedMapCoordinates whenever selectedLocation changes
  // Handle edit mode data population
  useEffect(() => {
    if (isEditMode && editAddressData && editAddressData.address) {
      console.log("🔍 Complete editAddressData:", editAddressData);

      // ⚠️ التعديل هنا: نقوم بالوصول مباشرةً إلى كائن العنوان
      const address = editAddressData.address;
      console.log("🔍 Address object:", address);
      console.log("🔍 Available fields:", Object.keys(address));

      // Parse coordinates
      const { latitude, longitude } = parseCoordinates(address.map);

      // Handle city selection - Fixed to handle null city_id
      let cityId = "";
      if (address.city_id !== null && address.city_id !== undefined) {
        cityId = address.city_id.toString();
      } else if (address.zone && address.zone.city_id) {
        // Fallback: try to get city_id from zone relationship
        cityId = address.zone.city_id.toString();
      }

      if (cityId && cities.length > 0) {
        setSelectedCityId(cityId);
        handleCityChange(cityId);
      } else {
        // If no city_id, show all zones
        setAvailableZones(zones);
      }

      // Enhanced form population with better null/undefined handling
      const formData = {
        // Handle city_id - use empty string if null
        city_id: cityId,

        // Handle zone_id - ensure it's a string
        zone_id: address.zone_id ? address.zone_id.toString() : "",

        // Handle address
        address: address.address || "",

        // Handle numeric fields - convert strings to numbers where appropriate
        street: address.street || null,
        building_num:
          address.building_num && address.building_num !== ""
            ? Number(address.building_num)
            : null,
        floor_num:
          address.floor_num && address.floor_num !== ""
            ? Number(address.floor_num)
            : null,
        apartment:
          address.apartment && address.apartment !== ""
            ? Number(address.apartment)
            : null,

        // Handle text fields
        additional_data: address.additional_data || "",

        // Handle type - normalize case
        type: address.type ? address.type.toLowerCase() : "",
      };

      console.log("🔍 Form data being set:", formData);

      // Reset form with the new data
      form.reset(formData);

      // Set location if coordinates exist
      if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
        const loc = { lat: latitude, lng: longitude };
        setSelectedLocation(loc);
        setLocationName(address.address || "");
      }

      // Log final form values after a short delay
      setTimeout(() => {
        console.log("🔍 Final form values:", form.getValues());
      }, 100);
    }
  }, [editAddressData, isEditMode, form, zones, cities]);

  // Handle marker drag end
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const { lat, lng } = marker.getLatLng();
    setSelectedLocation({ lat, lng });
    tryGeocode(lat, lng, setLocationName, form);
  };

  // Get user's current location on mount (only in Add Mode, not Edit/AddAnotherAddress Mode)
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
      // For add another address mode, set a default address if none exists
      if (!locationName) {
        const defaultAddress = "Click on map to select address";
        setLocationName(defaultAddress);
        form.setValue("address", defaultAddress, { shouldValidate: true });
      }
    }
  }, [isEditMode, isAddAnotherAddress, form]);

  // Handle edit mode data population
  useEffect(() => {
    if (
      isEditMode &&
      editAddressData &&
      editAddressData.addresses &&
      editAddressData.addresses.length > 0
    ) {
      console.log("🔍 Complete editAddressData:", editAddressData);

      const address = editAddressData.addresses[0];
      console.log("🔍 Address object:", address);
      console.log("🔍 Available fields:", Object.keys(address));

      // Parse coordinates
      const { latitude, longitude } = parseCoordinates(address.map);

      // Handle city selection - Fixed to handle null city_id
      let cityId = "";
      if (address.city_id !== null && address.city_id !== undefined) {
        cityId = address.city_id.toString();
      } else if (address.zone && address.zone.city_id) {
        // Fallback: try to get city_id from zone relationship
        cityId = address.zone.city_id.toString();
      }

      if (cityId && cities.length > 0) {
        setSelectedCityId(cityId);
        handleCityChange(cityId);
      } else {
        // If no city_id, show all zones
        setAvailableZones(zones);
      }

      // Enhanced form population with better null/undefined handling
      const formData = {
        // Handle city_id - use empty string if null
        city_id: cityId,

        // Handle zone_id - ensure it's a string
        zone_id: address.zone_id ? address.zone_id.toString() : "",

        // Handle address
        address: address.address || "",

        // Handle numeric fields - convert strings to numbers where appropriate
        street: address.street || null,
        building_num:
          address.building_num && address.building_num !== ""
            ? Number(address.building_num)
            : null,
        floor_num:
          address.floor_num && address.floor_num !== ""
            ? Number(address.floor_num)
            : null,
        apartment:
          address.apartment && address.apartment !== ""
            ? Number(address.apartment)
            : null,

        // Handle text fields
        additional_data: address.additional_data || "",

        // Handle type - normalize case
        type: address.type ? address.type.toLowerCase() : "",
      };

      console.log("🔍 Form data being set:", formData);

      // Reset form with the new data
      form.reset(formData);

      // Set location if coordinates exist
      if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
        const loc = { lat: latitude, lng: longitude };
        setSelectedLocation(loc);
        // ⚠️ تعديل هنا: تحديث locationName بقيمة العنوان من الـAPI
        setLocationName(address.address || "");
      }

      // Log final form values after a short delay
      setTimeout(() => {
        console.log("🔍 Final form values:", form.getValues());
      }, 100);
    }
  }, [editAddressData, isEditMode, form, zones, cities]);

  // Initialize zones when data is loaded
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
