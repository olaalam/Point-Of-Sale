import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export function usePost() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const token = sessionStorage.getItem("token");

  const postData = async (endpoint, body, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      setData(response.data);
      setLoading(false);

      // ✅ Toast عند النجاح
      if (!options.silent) {
        toast.success(response.data?.message || "Operation completed successfully!");
      }

      return response.data;
    } catch (err) {
      const message =
        err?.response?.data?.faield ||
        err.response?.data?.message ||
        "An error occurred";

      setError(message);
      setLoading(false);

      // ❌ Toast عند الفشل
      if (!options.silent) {
        toast.error(message);
      }

      throw err;
    }
  };

  return { data, loading, error, postData };
}
