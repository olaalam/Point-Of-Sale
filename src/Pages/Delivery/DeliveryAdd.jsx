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

// Component to handle map click events - مع حل مشكلة CORS
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
              method: 'GET',
              mode: 'cors',
              headers: {
                'Accept': 'application/json',
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              setLocationName(data.display_name);
              form.setValue("address", data.display_name, { shouldValidate: true });
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
              const address = data.display_name || `${data.locality}, ${data.countryName}`;
              setLocationName(address);
              form.setValue("address", address, { shouldValidate: true });
              return;
            }
          }
        } catch (error) {
          console.warn("Method 2 failed:", error);
        }

        // Fallback: Use coordinates
        const fallbackAddress = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
  zone_id: z.string().min(1, "Zone is required"),
  address: z
    .string()
    .min(5, "Address is required and must be at least 5 characters."),
  street: z.coerce.number().nullable().optional(), // Allow null for street
  building_num: z.coerce.number().nullable().optional(), // Allow null for building_num
  floor_num: z.coerce.number().nullable().optional(), // Allow null for floor_num
  apartment: z.coerce.number().nullable().optional(), // Allow null for apartment
  additional_data: z.string().optional(),
  type: z.string().min(1, "Type is required."),
});

const addCustomerSchema = addressSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().min(5, "Phone must be at least 5 characters."),
});

const editAddressSchema = addressSchema; // When editing, we only validate address fields

export default function DeliveryAdd() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 31.2001, // Default to Alexandria, Egypt
    lng: 29.9187,
  });
  const [locationName, setLocationName] = useState("");
  const { id } = useParams(); // For address ID in edit mode
  const isEditMode = Boolean(id);
  const [formattedMapCoordinates, setFormattedMapCoordinates] = useState("");

  const location = useLocation();
const searchParams = new URLSearchParams(location.search);
const customerIdFromUrl = searchParams.get("customer_id");
const isAddAnotherAddress = searchParams.has("customer_id");


  // Fetch zones for the select input (This fetch is correct for zones list)
  const { data: zonesData } = useGet("cashier/customer");
  const zones = zonesData?.zones || [];

  // useGet for address data in edit mode
  const { data: editAddressData, isLoading: isLoadingEditData } = useGet(
    isEditMode ? `cashier/address/${id}` : null
  );

  // useGet for customer data in "add another address" mode
  const { data: customerData, isLoading: isLoadingCustomerData } = useGet(
    isAddAnotherAddress && customerIdFromUrl ? `cashier/customer/${customerIdFromUrl}` : null
  );

  const navigate = useNavigate();

  // Determine which schema to use based on the mode
  const currentFormSchema = isEditMode ? editAddressSchema : addCustomerSchema;

  const form = useForm({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      zone_id: "",
      address: "",
      street: null, // Change default to null
      building_num: null, // Change default to null
      floor_num: null, // Change default to null
      apartment: null, // Change default to null
      additional_data: "",
      type: "",
    },
  });

  // Helper function to parse coordinates from the map string
  const parseCoordinates = (mapString) => {
    if (!mapString) return { latitude: null, longitude: null };
    const [lat, lng] = mapString.split(",").map(Number);
    return { latitude: lat, longitude: lng };
  };


  // Effect to populate form fields when in EDIT mode
  useEffect(() => {
    if (isEditMode && editAddressData && Object.keys(editAddressData).length > 0) {
      console.log("editAddressData for populating form:", editAddressData); // Debug

      const { latitude, longitude } = parseCoordinates(editAddressData.map);

      form.reset({
        zone_id: editAddressData.zone_id?.toString() || "",
        address: editAddressData.address || "",
        street: editAddressData.street ?? null,
        building_num: editAddressData.building_num ?? null,
        floor_num: editAddressData.floor_num ?? null,
        apartment: editAddressData.apartment ?? null,
        additional_data: editAddressData.additional_data || "",
        type: editAddressData.type || "",
        // Name and phone are not part of editAddressSchema, so don't reset them here
      });

      if (latitude && longitude) {
        const loc = { lat: latitude, lng: longitude };
        setSelectedLocation(loc);
        setLocationName(editAddressData.address || ""); // Set locationName for the input
      }
    }
  }, [editAddressData, isEditMode, form]);

  // Effect to populate name and phone when in ADD ANOTHER ADDRESS mode
  useEffect(() => {
    if (isAddAnotherAddress && customerData) {
      console.log("customerData for add another address:", customerData); // Debug
      form.setValue("name", customerData.name || "");
      form.setValue("phone", customerData.phone || "");
      // You might want to disable these fields in the UI
    }
  }, [customerData, isAddAnotherAddress, form]);

  // Get user's current location on mount (only in Add Mode, not Edit/AddAnotherAddress Mode)
  useEffect(() => {
    if (!isEditMode && !isAddAnotherAddress && navigator.geolocation) { // Added !isAddAnotherAddress
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
                  method: 'GET',
                  mode: 'cors',
                  headers: {
                    'Accept': 'application/json',
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data && data.display_name) {
                  setLocationName(data.display_name);
                  form.setValue("address", data.display_name, { shouldValidate: true });
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
                  const address = data.display_name || `${data.locality}, ${data.countryName}`;
                  setLocationName(address);
                  form.setValue("address", address, { shouldValidate: true });
                  return;
                }
              }
            } catch (error) {
              console.warn("BigDataCloud failed:", error);
            }

            const fallbackAddress = `Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
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
    }
  }, [isEditMode, isAddAnotherAddress, form]); // Added isAddAnotherAddress to dependency array

  // Update formattedMapCoordinates whenever selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setFormattedMapCoordinates(
        `${selectedLocation.lat.toFixed(6)},${selectedLocation.lng.toFixed(6)}`
      );
    }
  }, [selectedLocation]);

  // Handle marker drag end - مع حل مشكلة CORS
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const { lat, lng } = marker.getLatLng();
    setSelectedLocation({ lat, lng });

    const tryGeocode = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&addressdetails=1`,
          {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            setLocationName(data.display_name);
            form.setValue("address", data.display_name, { shouldValidate: true });
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
            const address = data.display_name || `${data.locality}, ${data.countryName}`;
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

 const commonPayload = {
 latitude: selectedLocation.lat,
 longitude: selectedLocation.lng,
 map: formattedMapCoordinates,
 street: values.street === null || values.street === 0 ? undefined : values.street,
 building_num: values.building_num === null || values.building_num === 0 ? undefined : values.building_num,
 floor_num: values.floor_num === null || values.floor_num === 0 ? undefined : values.floor_num,
 apartment: values.apartment === null || values.apartment === 0 ? undefined : values.apartment,
 zone_id: Number(values.zone_id),
 address: values.address,
 additional_data: values.additional_data,
 type: values.type,
 };

 let finalPayload;
 let apiEndpoint;

 if (isEditMode) {
 finalPayload = {
  ...commonPayload,
  customer_id: editAddressData?.customer_id, // Ensure customer_id is sent for update
 };
 apiEndpoint = `cashier/address/update/${id}`;
 } else if (isAddAnotherAddress) {
 // Adding new address for an existing customer
 finalPayload = {
  ...commonPayload,
  customer_id: Number(customerIdFromUrl),
 };
 apiEndpoint = `cashier/address/add`;
 } else {
 // Adding a new customer with their first address
 finalPayload = {
  ...commonPayload,
  name: values.name,
  phone: values.phone,
 };
 apiEndpoint = "cashier/customer/add";
 }

 console.log("Final Payload sent to API:", finalPayload);

 try {
 const response = await postData(apiEndpoint, finalPayload);
 console.log(`${isEditMode ? "Update" : isAddAnotherAddress ? "Add Address" : "Add"} response`, response);
 if (response && response.success) {
  toast.success(
  `Customer ${isEditMode ? "address updated" : isAddAnotherAddress ? "address added" : "added"} successfully!`
  );
  if (!isEditMode && !isAddAnotherAddress) {
  form.reset(); // Reset form only for adding new customer (not adding another address)
  }
  setTimeout(() => {
  navigate("/"); // Navigate back to home or customer list
  }, 1500);
 } else {
  toast.error(
  response?.message || `Failed to ${isEditMode ? "update" : isAddAnotherAddress ? "add address" : "add customer"}.`
  );
 }
 } catch (err) {
 console.error("Submit Error:", err);
 toast.error("Submission error: " + (err.message || "Unknown error."));
 }
};
  // Loading state for edit mode or add another address mode (for customer info)
  if (isEditMode && isLoadingEditData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p><Loading /></p>
      </div>
    );
  }

  // Show loading for customer data in add-another-address mode
  if (isAddAnotherAddress && isLoadingCustomerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p><Loading /></p>
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
            ? "Add Another Address for Customer"
            : "Add New Delivery Customer"}
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

            {/* Manual Location Input - زي الكود الأصلي */}
            <div className="my-5 p-4">
              <Input
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  form.setValue("address", e.target.value, { shouldValidate: true });
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
                {!isEditMode && !isAddAnotherAddress &&( // Show name and phone only if not in edit mode
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Customer Name"
                              {...field}
                              disabled={isAddAnotherAddress} // Disable if adding another address
                            />
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
                            <Input
                              placeholder="Phone Number"
                              {...field}
                              disabled={isAddAnotherAddress} // Disable if adding another address
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

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
                          value={locationName} // ربط بـ locationName
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
                            <FormLabel>{name.replace("_", " ")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? null : Number(value));
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
                  <FormField
                    control={form.control}
                    name="zone_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Zone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zones.map((zone) => (
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

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
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
                </div>

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
                      : "Adding..."
                    : isEditMode
                    ? "Update Address"
                    : isAddAnotherAddress
                    ? "Add Address"
                    : "Add Customer"}
                </Button>

                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
              </form>
            </Form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}