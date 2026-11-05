// Service worker : reçoit les notifications « article urgent ».
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  const t = [self.registration.showNotification(d.title || 'Nos courses', {
    body: d.body || '', tag: 'urgent', renotify: true, vibrate: [200, 100, 200],
  })];
  if (d.badge && self.navigator.setAppBadge) t.push(self.navigator.setAppBadge(d.badge).catch(() => {}));
  e.waitUntil(Promise.all(t));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) { if ('focus' in c) { c.navigate('/#liste').catch(() => {}); return c.focus(); } }
    return self.clients.openWindow('/#liste');
  }));
});
