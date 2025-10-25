import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export function useGet(initialEndpoint, { showToast = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = useCallback(
    async (endpoint = initialEndpoint) => {
      if (!endpoint) {
        setLoading(false);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const token = sessionStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${baseUrl}${endpoint}`, { headers });
        setData(response.data);
        setLoading(false);

        if (showToast && !toast.isActive(`get-${endpoint}`)) {
          toast.success("Data loaded successfully!", {
            toastId: `get-${endpoint}`,
          });
        }

        return response.data;
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || "Error occurred";
        const errorObj = new Error(message);
        setError(errorObj);
        setLoading(false);

        if (showToast) {
          toast.error(`Error loading data: ${message}`);
        }

        throw errorObj;
      }
    },
    [baseUrl, initialEndpoint, showToast]
  );

  useEffect(() => {
    if (initialEndpoint) {
      fetchData();
    }
  }, [fetchData, initialEndpoint]);

  return { data, isLoading: loading, error, refetch: fetchData };
}
