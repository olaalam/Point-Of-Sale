// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "missing-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "missing-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "missing-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "missing-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "missing-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "missing-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "missing-measurement-id"
};

// Debug: Log config to check values
console.log("Firebase Config:", firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);

// Export services
export { app, analytics, messaging };