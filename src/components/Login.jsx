import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/Food2go Icon Vector Container.png";
import Loading from "./Loading";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { loginAuth } from "./Auth/Login";
import { requestFCMPermission } from "@/firebase";

export default function LoginPage() {
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

const handleLogin = async () => {
  console.log("Login clicked");
  if (!user_name || !password) {
    toast.error("Please fill in all fields");
    return;
  }

  try {
    const fcmToken = await requestFCMPermission();
    console.log("🔥 FCM Token before login:", fcmToken);

    if (!fcmToken) {
      toast.error("FCM Token not generated! Please allow notifications.");
      return;
    }

    const url = `${import.meta.env.VITE_API_BASE_URL}api/cashier/auth/login`;
    const res = await axios.post(url, null, {
      params: {
        user_name,
        password,
        fcm_token: fcmToken,
      },
    });

    console.log("Login Response:", res.data);
    toast.success("Logged in successfully");

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.cashier));
    localStorage.setItem("branch_id", res.data.cashier.branch_id);

    navigate("/cashier");
  } catch (err) {
    console.error("Error:", err);
    const errorMessage =
      err?.response?.data?.faield ||
      err?.response?.data?.message ||
      "An error occurred";
    toast.error(errorMessage);
  }
};


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-[#910000]">Food2go</h1>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Log in to Food2go </h2>
            <p className="text-sm text-gray-500">Welcome back</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <Input
              type="text"
              placeholder="Username"
              value={user_name}
              onChange={(e) => setUserName(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              disabled={loading}
              type="submit"
              className="w-full bg-[#910000] hover:bg-[#750000]"
            >
              {loading ? <Loading /> : "Login"}
            </Button>
          </form>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <img
          src={logo}
          alt="Food2go Logo"
          className="w-full h-auto max-w-[378px] max-h-[311px] object-contain"
        />
      </div>
      <ToastContainer />
    </div>
  );
}
