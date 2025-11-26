
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAgaN1LUXu3Lrf-0N3jHluInqFSZDVnogg",
  authDomain: "cashierfood2go.firebaseapp.com",
  projectId: "cashierfood2go",
  storageBucket: "cashierfood2go.firebasestorage.app",
  messagingSenderId: "895313027167",
  appId: "1:895313027167:web:0bf8ebb9fea7c002e63bea",
  measurementId: "G-FTS1L3MDSS"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/point-of-sale/favicon.ico' // Matches base path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});