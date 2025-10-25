import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export function usePut() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const putData = async (endpoint, body, options = {}) => {
    setLoading(true);
    setError(null);

    const url =
      baseUrl.endsWith("/") && endpoint.startsWith("/")
        ? baseUrl + endpoint.slice(1)
        : baseUrl + endpoint;

    try {
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.put(url, body, { headers });
      setData(response.data);
      setLoading(false);

      // ✅ Toast عند النجاح
      if (!options.silent) {
        toast.success(response.data?.message || "Updated successfully!");
      }

      // 🔁 Reload إذا كان endpoint خاص بالـ tables_status
      if (endpoint.includes("tables_status") && options.reloadPage !== false) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Error occurred";

      setError(message);
      setLoading(false);

      // ❌ Toast عند الفشل
      if (!options.silent) {
        toast.error(message);
      }

      throw err;
    }
  };

  return { data, loading, error, putData };
}
