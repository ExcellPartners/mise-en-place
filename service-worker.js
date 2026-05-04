
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: 'Mise en Place Alert',
    body: 'Your kitchen ledger has been updated.',
    icon: '/icon.png'
  };

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1541696490-8744a5db0223?w=128&h=128&fit=crop',
    badge: 'https://images.unsplash.com/photo-1541696490-8744a5db0223?w=64&h=64&fit=crop',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'explore', title: 'View Shopping List', icon: 'check' },
      { action: 'close', title: 'Dismiss', icon: 'close' },
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
