// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { Provider } from "react-redux";
import { store } from "./Store/store.js";
import { ShiftProvider } from "./context/ShiftContext.jsx";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`)
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ShiftProvider>
      <App />
    </ShiftProvider>
  </Provider>
);
