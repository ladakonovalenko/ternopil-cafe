// Зберігає знімок усіх закладів з бекенду у локальний JSON-файл.
// Публічний ендпоінт /venues, admin-ключ не потрібен.
//
// Використання:
//   node export-venues.mjs https://ternopil-cafe-backend.vercel.app

const [, , backendUrl] = process.argv;

if (!backendUrl) {
  console.error("Використання: node export-venues.mjs <адреса-бекенду>");
  process.exit(1);
}

const base = backendUrl.replace(/\/+$/, "");
const res = await fetch(`${base}/venues`);

if (!res.ok) {
  console.error(`Помилка: ${res.status}`);
  process.exit(1);
}

const venues = await res.json();

const timestamp = new Date().toISOString().slice(0, 10);
const filename = `backup-venues-${timestamp}.json`;

const fs = await import("fs");
fs.writeFileSync(filename, JSON.stringify(venues, null, 2), "utf-8");

console.log(`Збережено ${venues.length} закладів у ${filename}`);
