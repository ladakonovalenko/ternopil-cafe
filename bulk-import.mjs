// Масове додавання закладів з одного JSON-файлу через адмінське API.
//
// Використання:
//   node bulk-import.mjs venues.json https://ternopil-cafe-backend.vercel.app ТВІЙ_ADMIN_API_KEY
//
// Формат venues.json — масив об'єктів, дивись venues.template.json для прикладу.

const [, , dataFile, backendUrl, adminKey] = process.argv;

if (!dataFile || !backendUrl || !adminKey) {
  console.error(
    "Використання: node bulk-import.mjs <файл.json> <адреса-бекенду> <admin-key>"
  );
  process.exit(1);
}

const fs = await import("fs");
const raw = fs.readFileSync(dataFile, "utf-8");
const venues = JSON.parse(raw);

if (!Array.isArray(venues)) {
  console.error("Файл має містити масив закладів [ {...}, {...} ]");
  process.exit(1);
}

const base = backendUrl.replace(/\/+$/, "");

console.log(`Додаю ${venues.length} закладів...\n`);

let ok = 0;
let failed = 0;

for (const venue of venues) {
  try {
    const res = await fetch(`${base}/venues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify(venue),
    });

    if (res.ok) {
      console.log(`✓ ${venue.name}`);
      ok++;
    } else {
      const err = await res.json().catch(() => ({}));
      console.log(`✗ ${venue.name} — ${res.status} ${err.detail || ""}`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${venue.name} — ${e.message}`);
    failed++;
  }

  // невелика пауза, щоб не закидати безкоштовний бекенд запитами одночасно
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\nГотово: ${ok} додано, ${failed} з помилками.`);
