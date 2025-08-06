import React, { useEffect, useState } from "react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePost } from "@/Hooks/usePost";
import { toast, ToastContainer } from "react-toastify";
import { useGet } from "@/Hooks/useGet";
// --- Leaflet Imports ---
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { useParams } from "react-router-dom";
import Loading from "@/components/Loading";

// Fix for default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Component to handle map click events
const MapClickHandler = ({ setSelectedLocation, setLocationName, form }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });

      // Try different approaches to avoid CORS
      const tryGeocode = async () => {
        try {
          // Method 1: Try with different parameters
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&addressdetails=1`,
            {
              method: "GET",
              mode: "cors",
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              setLocationName(data.display_name);
              form.setValue("address", data.display_name, {
                shouldValidate: true,
              });
              return;
            }
          }
        } catch (error) {
          console.warn("Method 1 failed:", error);
        }

        // Method 2: Try with JSONP-like approach using a different service
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );

          if (response.ok) {
            const data = await response.json();
            if (data && (data.display_name || data.locality)) {
              const address =
                data.display_name || `${data.locality}, ${data.countryName}`;
              setLocationName(address);
              form.setValue("address", address, { shouldValidate: true });
              return;
            }
          }
        } catch (error) {
          console.warn("Method 2 failed:", error);
        }

        // Fallback: Use coordinates
        const fallbackAddress = `Location: ${lat.toFixed(4)}, ${lng.toFixed(
          4
        )}`;
        setLocationName(fallbackAddress);
        form.setValue("address", fallbackAddress, { shouldValidate: true });
      };

      tryGeocode();
    },
  });
  return null;
};

// --- Schema Definition ---
const addressSchema = z.object({
  city_id: z.string().min(1, "City is required"),
  zone_id: z.string().min(1, "Zone is required"),
  address: z
    .string()
    .min(5, "Address is required and must be at least 5 characters."),
  street: z.coerce.number().nullable().optional(),
  building_num: z.coerce.number().nullable().optional(),
  floor_num: z.coerce.number().nullable().optional(),
  apartment: z.coerce.number().nullable().optional(),
  additional_data: z.string().optional(),
  type: z.string().min(1, "Type is required."),
});

const adduserSchema = addressSchema.extend({
  f_name: z.string().min(2, "First name must be at least 2 characters."),
  l_name: z.string().min(2, "Last name must be at least 2 characters."),
  phone: z.string().min(5, "Phone must be at least 5 characters."),
  phone_2: z.string().optional(),
});

export default function DeliveryAdd() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 31.2001, // Default to Alexandria, Egypt
    lng: 29.9187,
  });
  const [locationName, setLocationName] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [availableZones, setAvailableZones] = useState([]);

  const { id } = useParams(); // For address ID in edit mode
  const isEditMode = Boolean(id);
  const [formattedMapCoordinates, setFormattedMapCoordinates] = useState("");

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userIdFromUrl = searchParams.get("user_id");
  const isAddAnotherAddress = searchParams.has("user_id");

  // Fetch cities and zones data from the new API
  const { data: addressListsData, isLoading: isLoadingLists } = useGet(
    "cashier/user/address/lists"
  );
  const cities = addressListsData?.cities || [];
  const zones = addressListsData?.zones || [];

  // useGet for address data in edit mode
  const { data: editAddressData, isLoading: isLoadingEditData } = useGet(
    isEditMode ? `cashier/user/address/${id}` : null
  );

  // useGet for user data in "add another address" mode
  const { data: userData, isLoading: isLoadinguserData } = useGet(
    isAddAnotherAddress && userIdFromUrl
      ? `cashier/user/${userIdFromUrl}`
      : null
  );

  const navigate = useNavigate();

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
      street: null,
      building_num: null,
      floor_num: null,
      apartment: null,
      additional_data: "",
      type: "",
    },
  });

  // Helper function to parse coordinates from the map string
  const parseCoordinates = (mapString) => {
    if (!mapString) return { latitude: null, longitude: null };

    // Check if it's a Google Maps URL
    if (mapString.includes("maps?q=")) {
      const url = new URL(mapString);
      const qParam = url.searchParams.get("q");
      if (qParam) {
        const [lat, lng] = qParam.split(",").map(Number);
        return { latitude: lat, longitude: lng };
      }
    }

    // Assume it's a comma-separated string
    const [lat, lng] = mapString.split(",").map(Number);
    return { latitude: lat, longitude: lng };
  };

  // Improved city change handler - filter zones by city_id
  const handleCityChange = (cityId) => {
    setSelectedCityId(cityId);
    form.setValue("city_id", cityId);
    form.setValue("zone_id", ""); // Reset zone selection

    // Filter zones based on actual city relationship
    // You might need to adjust this based on your API response structure
    const cityZones = zones.filter((zone) => {
      // If your zones have a city_id field, use that
      if (zone.city_id) {
        return zone.city_id.toString() === cityId;
      }
      // Otherwise, you might need a different filtering logic
      // For now, show all zones if no city_id relationship exists
      return true;
    });

    setAvailableZones(cityZones);
  };

  // Effect to populate form fields when in EDIT mode
  useEffect(() => {
    if (
      isEditMode &&
      editAddressData &&
      editAddressData.addresses &&
      editAddressData.addresses.length > 0
    ) {
      console.log("editAddressData for populating form:", editAddressData);

      // 🔴 التغيير هنا: قراءة أول كائن من مصفوفة 'addresses'
      const address = editAddressData.addresses[0];

      // 🔴 الكود الآن يستخدم 'address' بدلاً من 'editAddressData'
      const { latitude, longitude } = parseCoordinates(address.map);

      // Set available zones and handle city selection
      const cityId = address.city_id?.toString() || "";
      if (cityId) {
        setSelectedCityId(cityId);
        handleCityChange(cityId);
      } else {
        setAvailableZones(zones);
      }

      form.reset({
        city_id: cityId,
        zone_id: address.zone_id?.toString() || "",
        address: address.address || "",
        street: address.street ?? null,
        building_num: address.building_num ?? null,
        floor_num: address.floor_num ?? null,
        apartment: address.apartment ?? null,
        additional_data: address.additional_data || "",
        type: address.type?.toLowerCase() || "",
      });

      if (latitude && longitude) {
        const loc = { lat: latitude, lng: longitude };
        setSelectedLocation(loc);
        setLocationName(address.address || "");
      }
    }
  }, [editAddressData, isEditMode, form, zones]);

  // Initialize zones when data is loaded
  useEffect(() => {
    if (zones.length > 0 && !isEditMode) {
      setAvailableZones(zones);
    }
  }, [zones, isEditMode]);

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

          const tryGeocode = async () => {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&accept-language=en&addressdetails=1`,
                {
                  method: "GET",
                  mode: "cors",
                  headers: {
                    Accept: "application/json",
                  },
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                  setLocationName(data.display_name);
                  form.setValue("address", data.display_name, {
                    shouldValidate: true,
                  });
                  return;
                }
              }
            } catch (error) {
              console.warn("Nominatim failed:", error);
            }

            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lng}&localityLanguage=en`
              );

              if (response.ok) {
                const data = await response.json();
                if (data && (data.display_name || data.locality)) {
                  const address =
                    data.display_name ||
                    `${data.locality}, ${data.countryName}`;
                  setLocationName(address);
                  form.setValue("address", address, { shouldValidate: true });
                  return;
                }
              }
            } catch (error) {
              console.warn("BigDataCloud failed:", error);
            }

            const fallbackAddress = `Location: ${loc.lat.toFixed(
              4
            )}, ${loc.lng.toFixed(4)}`;
            setLocationName(fallbackAddress);
            form.setValue("address", fallbackAddress, { shouldValidate: true });
          };

          tryGeocode();
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

  // Update formattedMapCoordinates whenever selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setFormattedMapCoordinates(
        `${selectedLocation.lat.toFixed(6)},${selectedLocation.lng.toFixed(6)}`
      );
    }
  }, [selectedLocation]);

  // Handle marker drag end
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const { lat, lng } = marker.getLatLng();
    setSelectedLocation({ lat, lng });

    const tryGeocode = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&addressdetails=1`,
          {
            method: "GET",
            mode: "cors",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            setLocationName(data.display_name);
            form.setValue("address", data.display_name, {
              shouldValidate: true,
            });
            return;
          }
        }
      } catch (error) {
        console.warn("Nominatim failed:", error);
      }

      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );

        if (response.ok) {
          const data = await response.json();
          if (data && (data.display_name || data.locality)) {
            const address =
              data.display_name || `${data.locality}, ${data.countryName}`;
            setLocationName(address);
            form.setValue("address", address, { shouldValidate: true });
            return;
          }
        }
      } catch (error) {
        console.warn("BigDataCloud failed:", error);
      }

      const fallbackAddress = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationName(fallbackAddress);
      form.setValue("address", fallbackAddress, { shouldValidate: true });
    };

    tryGeocode();
  };

  const { loading, error, postData } = usePost();

  const onSubmit = async (values) => {
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
      // Edit Address Mode - Changed to send a single object
      finalPayload = {
        ...addressObject, // Spread the address object
        user_id: editAddressData?.user_id,
      };
      apiEndpoint = `cashier/user/address/update/${id}`;
    } else if (isAddAnotherAddress) {
      // Add Another Address Mode - Changed to send a single object
      finalPayload = {
        ...addressObject, // Spread the address object
        user_id: Number(userIdFromUrl),
      };
      apiEndpoint = `cashier/user/address/add/${userIdFromUrl}`;
    } else {
      // Add User Mode - This case remains the same
      finalPayload = {
        f_name: values.f_name,
        l_name: values.l_name,
        phone: values.phone,
        phone_2: values.phone_2 || null,
        addresses: [addressObject],
      };
      apiEndpoint = "cashier/user/add";
    }

    console.log("Final Payload:", finalPayload);

    try {
      const response = await postData(apiEndpoint, finalPayload);
      if (response && response.success) {
        toast.success(
          `${
            isEditMode
              ? "Address updated"
              : isAddAnotherAddress
              ? "Address added"
              : "User added"
          } successfully!`
        );
        if (!isEditMode && !isAddAnotherAddress) {
          form.reset();
          setSelectedCityId("");
          setAvailableZones([]);
        }
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        toast.error(
          response?.message ||
            `Failed to ${
              isEditMode
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
          <div className="rounded-2xl overflow-hidden shadow-lg h-[600px]">
            {selectedLocation.lat && selectedLocation.lng ? (
              <MapContainer
                center={selectedLocation}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-full"
                style={{ minHeight: "100%", zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={selectedLocation}
                  draggable={true}
                  eventHandlers={{
                    dragend: handleMarkerDragEnd,
                  }}
                />
                <MapClickHandler
                  setSelectedLocation={setSelectedLocation}
                  setLocationName={setLocationName}
                  form={form}
                />
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                Loading Map...
              </div>
            )}

            {/* Manual Location Input */}
            <div className="my-5 p-4">
              <Input
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  form.setValue("address", e.target.value, {
                    shouldValidate: true,
                  });
                }}
                placeholder="Enter your location manually or click on map"
                className="w-full"
              />
            </div>
          </div>

          {/* Right - Form */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* User fields only in Add User mode */}
                {!isEditMode && !isAddAnotherAddress && (
                  <>
                    <FormField
                      control={form.control}
                      name="f_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="l_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone_2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number 2 (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone Number 2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Address fields - show in all modes */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (from Map)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Address"
                          {...field}
                          value={locationName}
                          onChange={(e) => {
                            setLocationName(e.target.value);
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Grid for number fields */}
                <div className="grid grid-cols-2 gap-4">
                  {["street", "building_num", "floor_num", "apartment"].map(
                    (name) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {name
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(
                                    value === "" ? null : Number(value)
                                  );
                                }}
                                value={field.value === null ? "" : field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* City Selection */}
                  <FormField
                    control={form.control}
                    name="city_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <Select
                          onValueChange={handleCityChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select City" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem
                                key={city.id}
                                value={city.id.toString()}
                              >
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Zone Selection */}
                  <FormField
                    control={form.control}
                    name="zone_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={availableZones.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Zone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableZones.map((zone) => (
                              <SelectItem
                                key={zone.id}
                                value={zone.id.toString()}
                              >
                                {zone.zone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additional_data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Data</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional Data" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Map coordinates display */}
                {formattedMapCoordinates && (
                  <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-700">
                    <strong>Location Coordinates:</strong>{" "}
                    {formattedMapCoordinates}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full mt-4 bg-bg-primary hover:bg-red-700 cursor-pointer transition-all"
                  disabled={loading}
                >
                  {loading
                    ? isEditMode
                      ? "Updating..."
                      : isAddAnotherAddress
                      ? "Adding..."
                      : "Adding..."
                    : isEditMode
                    ? "Update Address"
                    : isAddAnotherAddress
                    ? "Add Address"
                    : "Add User"}
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
