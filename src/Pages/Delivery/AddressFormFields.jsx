import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddressFormFields = ({
  form,
  locationName,
  setLocationName,
  cities,
  availableZones,
  handleCityChange,
}) => {
  return (
    <>
      {/* Address field */}
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
        {["street", "building_num", "floor_num", "apartment"].map((name) => (
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
                    type={name === "street" ? "text" : "number"}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (name === "street") {
                        field.onChange(value === "" ? null : value);
                      } else {
                        field.onChange(value === "" ? null : Number(value));
                      }
                    }}
                    value={field.value === null ? "" : field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* City Selection */}
        <FormField
          control={form.control}
          name="city_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <Select 
                onValueChange={(value) => {
                  console.log("City select changed:", value);
                  field.onChange(value);
                  handleCityChange(value);
                }} 
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger className="!w-full">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id.toString()}>
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
              <FormLabel>Zone</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
                disabled={availableZones.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="!w-full">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableZones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
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
            <FormLabel>Type</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger className="!w-full">
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
    </>
  );
};

export default AddressFormFields;