// App.jsx
import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./firebase"; // Firebase setup
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
