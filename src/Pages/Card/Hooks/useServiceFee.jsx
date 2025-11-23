// hooks/useServiceFee.js
import { useGet } from "@/Hooks/useGet";   

export const useServiceFee = () => {
  return useGet("cashier/service_fees");
};