import axiosInstance from "@/Pages/utils/axiosInstance";
import { useState, useEffect, useCallback } from "react";

export function useGet(initialEndpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = useCallback(async (endpoint = initialEndpoint) => {
    if (!endpoint) {
      setLoading(false);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axiosInstance.get(`${baseUrl}${endpoint}`, { headers });
      setData(response.data);
      setLoading(false);
      return response.data; // return the data so it can be used
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Error occurred";
      const errorObj = new Error(message);
      setError(errorObj);
      setLoading(false);
      throw errorObj; // throw the error so it can be caught in components
    }
  }, [baseUrl, initialEndpoint]);

  // Only fetch on mount if initialEndpoint is provided
  useEffect(() => {
    if (initialEndpoint) {
      fetchData();
    }
  }, [fetchData, initialEndpoint]);

  return { data, isLoading: loading, error, refetch: fetchData };
}