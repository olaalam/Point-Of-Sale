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
import { useTranslation } from "react-i18next";

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
   const { t ,i18n } = useTranslation();

  return (
    <>
      {/* Switch للاختيار بين التلقائي واليدوي */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col">
          <span className="font-medium text-sm">{t("AddressSelectionMode")}</span>
          <span className="text-xs text-gray-600">
            {isAutoAddress ? t("Automaticfrommaplocation") : t("Manualaddressentry")}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${!isAutoAddress ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            {t("Manual")}
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
            {t("Auto")}
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
              {t("Address")} {isAutoAddress ? t("fromMap") : t("ManualEntry")}
            </FormLabel>
            <FormControl>
              {isAutoAddress ? (
                <Input
                  placeholder={t("Clickotaddress")}
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
                  placeholder={t("Enteryouraddressmanually")}
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
       
        {[
  { name: "street", label: t("Street") },
  { name: "building_num", label: t("BuildingNumber") },
  { name: "floor_num", label: t("FloorNumber") },
  { name: "apartment", label: t("Apartment") },
].map(({ name, label }) => (
  <FormField
    key={name}
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
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
              <FormLabel>{t("City")}</FormLabel>
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
                    <SelectValue placeholder={t("SelectCity")} />
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
              <FormLabel>{t("Zone")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
                disabled={availableZones.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="!w-full">
                    <SelectValue placeholder={t("SelectZone")} />
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
            <FormLabel>{t("Type")}</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger className="!w-full">
                  <SelectValue placeholder={t("SelectType")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="home">{t("Home")}</SelectItem>
                <SelectItem value="work">{t("Work")}</SelectItem>
                <SelectItem value="other">{t("Other")}</SelectItem>
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
            <FormLabel>{t("AdditionalData")}</FormLabel>
            <FormControl>
              <Input placeholder={t("AdditionalData")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default AddressFormFields;