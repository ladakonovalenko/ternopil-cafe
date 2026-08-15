// Мінімальний service worker — потрібен лише для того, щоб браузер
// дозволив "Додати на головний екран". Свідомо НІЧОГО не кешує:
// жодного ризику показати застарілі заклади чи стару версію сайту
// після наступного деплою. Просто пропускає всі запити напряму в мережу.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
