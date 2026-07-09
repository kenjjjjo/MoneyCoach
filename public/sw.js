self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'MoneyCoachからの通知';
    const options = {
      body: data.body || '新しいメッセージがあります。',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      data: data.url || '/'
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
