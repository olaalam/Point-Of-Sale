//related to map , location selection & marker
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Input } from "@/components/ui/input";
import MapClickHandler from "./MapClickHandler";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MapComponent = ({
  selectedLocation,
  setSelectedLocation,
  locationName,
  setLocationName,
  form,
  onMarkerDragEnd,
}) => {
  return (
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
              dragend: onMarkerDragEnd,
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
  );
};

export default MapComponent;