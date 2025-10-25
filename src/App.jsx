// App.jsx
import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./firebase"; // Firebase setup
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <RouterProvider router={router} />

      {/* ✅ ToastContainer هنا علشان يبقى متاح في كل الصفحات */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}

export default App;
