// Застосовує заповнений district-template.json до бази — оновлює ТІЛЬКИ
// поле district за id, решту даних заклад бере зі свіжого GET (нічого
// іншого не чіпає й не може випадково затерти).
//
// Використання:
//   node apply-districts.mjs district-template.json https://ternopil-cafe-backend.vercel.app ТВІЙ_ADMIN_API_KEY

const [, , templateFile, backendUrl, adminKey] = process.argv;

if (!templateFile || !backendUrl || !adminKey) {
  console.error(
    "Використання: node apply-districts.mjs <template.json> <адреса-бекенду> <admin-key>"
  );
  process.exit(1);
}

const base = backendUrl.replace(/\/+$/, "");
const fs = await import("fs");
const { venues: filled } = JSON.parse(fs.readFileSync(templateFile, "utf-8"));

// Свіжий знімок бази — щоб PUT відправити з АКТУАЛЬНИМИ даними,
// а не тими, що були в момент експорту шаблону.
const res = await fetch(`${base}/venues`);
const current = await res.json();
const byId = new Map(current.map((v) => [v.id, v]));

let updated = 0,
  skipped = 0,
  failed = 0;

for (const row of filled) {
  const hasDistrict = row.district && row.district.trim();
  const hasTags = row.tags && row.tags.trim();

  if (!hasDistrict && !hasTags) {
    skipped++;
    continue;
  }

  const live = byId.get(row.id);
  if (!live) {
    console.log(`✗ ${row.name} — заклад з id=${row.id} більше не існує`);
    failed++;
    continue;
  }

  const payload = {
    name: live.name,
    category: live.category,
    district: hasDistrict ? row.district.trim() : live.district,
    tags: hasTags
      ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : live.tags || [],
    description: live.description,
    address: live.address,
    lat: live.lat,
    lng: live.lng,
    price_level: live.price_level,
    social_link: live.social_link,
    image_urls: live.image_urls || [],
  };

  const putRes = await fetch(`${base}/venues/${row.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
    body: JSON.stringify(payload),
  });

  if (putRes.ok) {
    console.log(`✓ ${live.name} → район: ${payload.district || "—"} | теги: ${payload.tags.join(", ") || "—"}`);
    updated++;
  } else {
    const err = await putRes.json().catch(() => ({}));
    console.log(`✗ ${live.name} — ${putRes.status} ${err.detail || ""}`);
    failed++;
  }

  await new Promise((r) => setTimeout(r, 200));
}

console.log(`\nОновлено: ${updated} | Пропущено (порожньо): ${skipped} | Помилок: ${failed}`);
