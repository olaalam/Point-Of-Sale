// public/firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Firebase configuration
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
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);
    
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: '/vite.png', // تأكد من وجود هذا الملف في مجلد public
        badge: '/vite.png',
        tag: 'food2go-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'view') {
        // Open the app when notification is clicked
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});