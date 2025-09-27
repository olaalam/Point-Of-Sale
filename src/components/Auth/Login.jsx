import axios from "axios";
import { requestFCMPermission } from "@/firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const loginAuth = async (user_name, password) => {
  try {
    const fcmToken = await requestFCMPermission();

    const response = await axios.post(`${API_BASE_URL}api/cashier/auth/login`, {
      user_name,
      password,
      fcm_token: fcmToken || null,
    });

    return { data: response.data, fcmToken };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};
