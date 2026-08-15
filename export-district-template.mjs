// Витягує АКТУАЛЬНИЙ список закладів із живої бази (з усіма твоїми
// виправленнями) і зберігає шаблон для заповнення району вручну.
//
// Використання:
//   node export-district-template.mjs https://ternopil-cafe-backend.vercel.app

const [, , backendUrl] = process.argv;

if (!backendUrl) {
  console.error("Використання: node export-district-template.mjs <адреса-бекенду>");
  process.exit(1);
}

const base = backendUrl.replace(/\/+$/, "");
const res = await fetch(`${base}/venues`);

if (!res.ok) {
  console.error(`Помилка: ${res.status}`);
  process.exit(1);
}

const venues = await res.json();

// Список районів — той самий, що й у формі адмінки.
// Скопіюй ТОЧНЕ написання одного з цих варіантів у поле "district" нижче.
const DISTRICTS_REFERENCE = [
  "Центр",
  "Східний",
  "Дружба",
  "Старий парк",
  "Пронятин",
  "Березовиця",
  "Кутківці",
  "Об'їзна дорога",
  "Сонячний (БАМ) / Аляска",
];

const template = venues
  .sort((a, b) => a.name.localeCompare(b.name, "uk"))
  .map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    category: v.category,
    district: v.district || "",
    tags: (v.tags || []).join(", "), // напр.: "повноцінні страви, обід, вечеря"
  }));

const fs = await import("fs");
fs.writeFileSync(
  "district-template.json",
  JSON.stringify({ DISTRICTS_REFERENCE, venues: template }, null, 2),
  "utf-8"
);

console.log(`Збережено district-template.json — ${template.length} закладів.`);
console.log('Заповни "district" (варіанти — вгорі файлу) і за бажанням "tags"');
console.log('(ключові слова через кому, напр. "повноцінні страви, обід"),');
console.log("тоді запусти apply-districts.mjs.");
