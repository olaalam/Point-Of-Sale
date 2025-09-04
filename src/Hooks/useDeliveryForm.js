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

  const currentFormSchema = isEditMode || isAddAnotherAddress ? addressSchema : adduserSchema;

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

  // تحميل بيانات الـ lists (cities)
  const { data: addressListsData, isLoading: isLoadingLists } = useGet("cashier/user/address/lists");
  const cities = addressListsData?.cities || [];

  // تحميل بيانات التعديل
  const { data: editAddressData, isLoading: isLoadingEditData } = useGet(
    isEditMode ? `cashier/shift_branch_reports/item/${id}` : null
  );

  const { data: userData, isLoading: isLoadinguserData } = useGet(
    isAddAnotherAddress && userIdFromUrl ? `cashier/user/${userIdFromUrl}` : null
  );

  // دالة الفلترة البسيطة
  const filterZonesByCity = useCallback((zones, cityId) => {
    if (!zones || !cityId) return [];
    return zones.filter(zone => zone.city_id && zone.city_id.toString() === cityId.toString());
  }, []);

  // معالجة تغيير المدينة
  const handleCityChange = useCallback((cityId) => {
    console.log("City changed to:", cityId);
    setSelectedCityId(cityId);
    form.setValue("city_id", cityId);
    form.setValue("zone_id", "");

    // استخدم zones من editAddressData إذا كان متوفر
    const zonesSource = editAddressData?.zones || [];
    const filteredZones = filterZonesByCity(zonesSource, cityId);
    console.log("Filtered zones:", filteredZones);
    setAvailableZones(filteredZones);
  }, [form, editAddressData, filterZonesByCity]);

  // تهيئة البيانات عند التحميل
  useEffect(() => {
    // انتظر حتى تكتمل كل البيانات المطلوبة
    if (isEditMode) {
      if (isLoadingEditData || isLoadingLists) {
        console.log("Loading data...");
        return;
      }

      if (!editAddressData || !cities.length) {
        console.log("Data not ready yet");
        return;
      }

      const address = editAddressData.address;
      const zones = editAddressData.zones || [];

      console.log("Setting up edit data:", { address, zones, cities });

      // استخراج city_id
      const cityId = address.city_id?.toString() || address.zone?.city_id?.toString() || "";
      
      // فلترة zones حسب المدينة
      const cityZones = filterZonesByCity(zones, cityId);
      
      // تحديث الـ states
      setSelectedCityId(cityId);
      setAvailableZones(cityZones);
      setLocationName(address.address || "");

      // تحديث الـ form
      const formData = {
        city_id: cityId,
        zone_id: address.zone_id?.toString() || address.zone?.id?.toString() || "",
        address: address.address || "",
        street: address.street || "",
        building_num: address.building_num ? Number(address.building_num) : null,
        floor_num: address.floor_num ? Number(address.floor_num) : null,
        apartment: address.apartment ? Number(address.apartment) : null,
        additional_data: address.additional_data || "",
        type: address.type ? address.type.toLowerCase() : "",
      };

      console.log("Form data:", formData);
      
      // تحديث الـ form مرة واحدة
      setTimeout(() => {
        form.reset(formData);
      }, 0);

      // تحديث الموقع على الخريطة
      const { latitude, longitude } = parseCoordinates(address.map);
      if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
        setSelectedLocation({ lat: latitude, lng: longitude });
      }
    }
  }, [editAddressData, cities, isEditMode, isLoadingEditData, isLoadingLists, form, filterZonesByCity]);

  // تهيئة الموقع للوضع العادي
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
    } else if (isAddAnotherAddress && !locationName) {
      const defaultAddress = "Click on map to select address";
      setLocationName(defaultAddress);
      form.setValue("address", defaultAddress, { shouldValidate: true });
    }
  }, [isEditMode, isAddAnotherAddress, form, locationName]);

  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const { lat, lng } = marker.getLatLng();
    setSelectedLocation({ lat, lng });
    tryGeocode(lat, lng, setLocationName, form);
  };

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
    zones: editAddressData?.zones || [],
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