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
  // إضافة props جديدة للتحكم في الـ switch من الأب
  isAutoAddress = true,
  setIsAutoAddress,
}) => {
  return (
    <>
      {/* Switch للاختيار بين التلقائي واليدوي */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col">
          <span className="font-medium text-sm">Address Selection Mode</span>
          <span className="text-xs text-gray-600">
            {isAutoAddress ? "Automatic from map location" : "Manual address entry"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${!isAutoAddress ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            Manual
          </span>
          <button
            type="button"
            onClick={() => {
              const newValue = !isAutoAddress;
              if (setIsAutoAddress) {
                setIsAutoAddress(newValue);
              }
              // مسح العنوان عند التبديل للوضع اليدوي
              if (!newValue) {
                form.setValue("address", "");
              }
            }}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isAutoAddress ? 'bg-blue-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out
                ${isAutoAddress ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <span className={`text-sm ${isAutoAddress ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            Auto
          </span>
        </div>
      </div>

      {/* Address field */}
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Address {isAutoAddress ? "(from Map)" : "(Manual Entry)"}
            </FormLabel>
            <FormControl>
              {isAutoAddress ? (
                // وضع تلقائي - قراءة فقط من الخريطة
                <Input
                  placeholder="Click on map to select address"
                  {...field}
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    field.onChange(e.target.value);
                  }}
                  className="bg-blue-50 border-blue-200"
                  readOnly={false}
                />
              ) : (
                // وضع يدوي - المستخدم يكتب بنفسه - بدون تدخل من locationName
                <Input
                  placeholder="Enter your address manually"
                  {...field}
                  onChange={(e) => {
                    // لا نحدث locationName في الوضع اليدوي
                    field.onChange(e.target.value);
                  }}
                  value={field.value || ""} // القيمة من الـ form فقط
                  className="bg-white border-gray-300"
                />
              )}
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