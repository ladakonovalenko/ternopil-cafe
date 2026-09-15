// Перевіряє всі заклади й ділить фото на дві категорії:
// - тимчасові (googleusercontent.com — можуть "зламатись" будь-коли)
// - постійні (res.cloudinary.com — залишаються робочими назавжди)
//
// Використання:
//   node check-image-sources.mjs https://ternopil-cafe-backend.vercel.app

const [, , backendUrl] = process.argv;

if (!backendUrl) {
  console.error("Використання: node check-image-sources.mjs <адреса-бекенду>");
  process.exit(1);
}

const base = backendUrl.replace(/\/+$/, "");
const res = await fetch(`${base}/venues`);

if (!res.ok) {
  console.error(`Помилка: ${res.status}`);
  process.exit(1);
}

const venues = await res.json();

const googleHosted = [];
const cloudinaryHosted = [];
const noImages = [];

for (const v of venues) {
  const urls = v.image_urls || [];
  if (urls.length === 0) {
    noImages.push(v.name);
    continue;
  }
  const hasGoogle = urls.some((u) => u.includes("googleusercontent.com"));
  const hasCloudinary = urls.some((u) => u.includes("res.cloudinary.com"));

  if (hasGoogle) googleHosted.push({ name: v.name, id: v.id, urls });
  if (hasCloudinary && !hasGoogle) cloudinaryHosted.push(v.name);
}

console.log(`Усього закладів: ${venues.length}\n`);

console.log(`⚠️  На тимчасових Google-посиланнях (потребують заміни): ${googleHosted.length}`);
googleHosted.forEach((v) => console.log(`   [id ${v.id}] ${v.name}`));

console.log(`\n✅ На постійних Cloudinary-посиланнях (безпечні): ${cloudinaryHosted.length}`);

console.log(`\n➖ Без жодного фото: ${noImages.length}`);
noImages.forEach((name) => console.log(`   ${name}`));
