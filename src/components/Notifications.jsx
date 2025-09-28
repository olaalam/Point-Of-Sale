// src/components/Notifications.jsx
import { useEffect } from 'react';
import { messaging } from '../firebase';
import { onMessage } from 'firebase/messaging';

function Notifications() {
  useEffect(() => {
    onMessage(messaging, (payload) => {
      console.log('Foreground message:', payload);
      alert(`Notification: ${payload.notification.title}\n${payload.notification.body}`);
    });
  }, []);

  return (
    <div>
      <h2>Notifications</h2>
      <p>Listening for notifications...</p>
    </div>
  );
}

export default Notifications;