// hooks/useServiceFee.js
import { useEffect } from "react";
import { useGet } from "@/Hooks/useGet";   

export const useServiceFee = () => {
  const { data, error, isLoading, ...rest } = useGet("cashier/service_fees");

  useEffect(() => {
    // التأكد من أن البيانات وصلت بنجاح وتحتوي على الـ id
    // ملاحظة: بناءً على شكل الرد من الباك، قد يكون الـ id داخل data مباشرة أو data.data
    const serviceFeeId = data?.data?.id || data?.id;

    if (serviceFeeId) {
      sessionStorage.setItem("service_fee_id", serviceFeeId);
      console.log("✅ Service Fee ID saved:", serviceFeeId);
    }
  }, [data]); // سيتم التنفيذ فقط عند تغير قيمة data (أي بعد انتهاء التحميل بنجاح)

  return { data, error, isLoading, ...rest };
};