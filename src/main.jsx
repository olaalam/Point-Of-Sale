import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import { store } from "./Store/store";
import { ShiftProvider } from "./context/ShiftContext"; 
import './index.css'

// Register Service Worker for Firebase Messaging
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      // First, unregister any existing service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }

      // Register the new service worker
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      
      console.log("✅ Service Worker registered successfully:", registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("✅ Service Worker is ready");
      
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
    }
  } else {
    console.warn("⚠️ Service Worker is not supported in this browser");
  }
};

// Register service worker before rendering the app
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ShiftProvider>
      <App />
    </ShiftProvider>
  </Provider>
);