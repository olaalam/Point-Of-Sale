// src/redux/slices/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

// استرجاع اليوزر من localStorage
const storedUser = JSON.parse(localStorage.getItem("user"));

const initialState = {
  user: storedUser || null,
  roles: storedUser?.roles || {}, // ✅ استرجاع الصلاحيات من اليوزر المحفوظ
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.roles = action.payload.roles || {}; // ✅ تخزين الصلاحيات
    },
    logout: (state) => {
      state.user = null;
      state.roles = {};
      localStorage.removeItem("user"); // 🧹 حذف بيانات اليوزر من التخزين
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
