import { useState, useEffect, useCallback } from "react"; // Import useCallback
import axios from "axios";

export function useGet(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Define the fetch function
  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false); // If no URL, stop loading and return
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // You'll need to add authentication headers here if required
   const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
 const response = await axios.get(`${baseUrl}${endpoint}`, { headers });

      setData(response.data);
      setLoading(false);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Error occurred";
      setError(new Error(message)); // Store error as an Error object
      setLoading(false);
    }
  }, [endpoint]); // Dependency: re-create fetchData if URL changes

  // Use useEffect to call fetchData on mount and when URL changes
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Dependency: re-run effect when fetchData itself changes (due to url change)

  return { data, isLoading: loading, error, refetch: fetchData }; // Renamed 'loading' to 'isLoading' for consistency
}