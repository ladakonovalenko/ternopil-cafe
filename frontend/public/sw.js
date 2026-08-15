// Мінімальний service worker — потрібен лише для того, щоб браузер
// дозволив "Додати на головний екран". Свідомо НІЧОГО не кешує.
//
// ВАЖЛИВО: раніше тут був event.respondWith(fetch(event.request)) для
// геть усіх запитів — це ламало CORS для запитів на інший домен
// (бекенд на іншому Vercel-проєкті), бо перефетч cross-origin запиту
// через service worker псує його CORS-заголовки. Тепер чіпаємо тільки
// запити на той самий домен, усе інше service worker просто ігнорує
// (без event.respondWith запит іде звичайним шляхом браузера).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // не чіпати чужі домени (бекенд)
  event.respondWith(fetch(event.request)); // той самий домен — просто пропускаємо, без кешу
});
