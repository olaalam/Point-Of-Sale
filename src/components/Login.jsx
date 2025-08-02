import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/Food2go Icon Vector Container.png";
import Loading from "./Loading";
import { usePost } from "@/Hooks/usePost";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

const { postData, loading } = usePost();


const handleLogin = async () => {
  if (!user_name || !password) {
    toast.error("Please fill in all fields");
    return;
  }

  try {
    const res = await postData("api/cashier/auth/login", { user_name, password });

    toast.success("Logged in successfully");
    console.log("Login Response:", res);

    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.cashier));
    localStorage.setItem("branch_id", res.cashier.branch_id);

    // 👇 اقري cashier_id بعد التخزين
    const cashierId = localStorage.getItem("cashier_id");

    if (!cashierId) {
      navigate("/cashier");
    } else {
      navigate("/");
    }
  } catch (err) {
    toast.error(err?.message || "An error occurred");
  }
};


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-[#910000]">Food2go</h1>

          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Log in to Wegostores</h2>
            <p className="text-sm text-gray-500">Welcome back</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
              onClick={handleLogin}
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
