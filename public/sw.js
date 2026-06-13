// Service Worker for Push Notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Queue update notification',
    icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855906.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/2855/2855906.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Queue',
        icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855906.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855906.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('QuePulse Alert', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
