// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBQMVFuPVC4_ZrIvSMaofHGRe4lUoqG62c",
  authDomain: "food2go-ff78a.firebaseapp.com",
  projectId: "food2go-ff78a",
  storageBucket: "food2go-ff78a.appspot.com",
  messagingSenderId: "773030834667",
  appId: "1:773030834667:web:50864fdab6cbb0bb91a9ae",
  measurementId: "G-QWQV6CLHMZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

// Function to request FCM permission and get token
export const requestFCMPermission = async () => {
  console.log("🔔 Requesting notification permission...");
  
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn("Service Worker is not supported in this browser");
      return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn("Notifications are not supported in this browser");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log("📢 Notification permission:", permission);

    if (permission === "granted") {
      try {
        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: "BAQ9bkxYETuzz6aL6-DNi1iWa2dc5z9T8AiaFzYaDvJ2E9LyExYCKlYpHAkACyv4nnC30oShGcLMFB-wey28VQ4",
        });

        if (token) {
          console.log("🎯 FCM Token generated successfully:", token);
          return token;
        } else {
          console.log("❌ No registration token available.");
          return null;
        }
      } catch (tokenError) {
        console.error("❌ Error getting FCM token:", tokenError);
        return null;
      }
    } else {
      console.warn("🚫 Notification permission not granted.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error requesting FCM permission:", error);
    return null;
  }
};

// Listen for messages when the app is in the foreground
onMessage(messaging, (payload) => {
  console.log("📩 Message received in foreground: ", payload);
  
  // You can show a custom notification here or update the UI
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/logo.png',
  };

  // Show notification if the app is in focus
  if (document.visibilityState === 'visible') {
    new Notification(notificationTitle, notificationOptions);
  }
});

export { messaging };