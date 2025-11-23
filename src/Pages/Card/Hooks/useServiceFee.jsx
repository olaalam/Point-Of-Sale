// داخل نفس الملف بتاع useOrderCalculations أو في utils/hooks.ts
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api"; // أو axios instance بتاعتك

export const useServiceFee = () => {
  return useQuery({
    queryKey: ["cashier", "service_fees"],
    queryFn: async () => {
      const res = await api.get("/cashier/service_fees");
      return res.data; // متوقع: { type: "precentage" | "fixed", amount: number }
    },
    staleTime: 1000 * 60 * 30, // 30 دقيقة
    cacheTime: 1000 * 60 * 60, // ساعة
    placeholderData: { type: "precentage", amount: 0 }, // fallback آمن
  });
};