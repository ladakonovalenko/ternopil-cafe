const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

// Клієнтська підстраховка — не дає навіть спробувати відправити завелике
// фото. Це НЕ заміна серверного захисту (Cloudinary не має сигнатурного
// параметра для обмеження розміру файлу під час підписаного завантаження,
// тож жорстке обмеження розміру можна виставити тільки в налаштуваннях
// Cloudinary upload preset у їхній консолі — це поза межами файлів
// репозиторію). Формат файлу, на відміну від розміру, перевіряється і на
// сервері (через allowed_formats у підписі нижче).
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 МБ

/**
 * Завантажує один файл у Cloudinary через ПІДПИСАНЕ завантаження.
 * cloud_name тепер бере ВИКЛЮЧНО з відповіді бекенду (не з власної
 * VITE_-змінної) — раніше значення дублювалось у двох місцях, що могло
 * розійтись, якщо колись зміниш Cloudinary-акаунт і забудеш оновити
 * одне з двох. Тепер єдине джерело правди — бекенд.
 */
export async function uploadImage(file, adminKey) {
  if (!adminKey) {
    throw new Error("Немає адмін-ключа для завантаження");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Файл завеликий — максимум 10 МБ");
  }

  // 1. Питаємо в бекенду дозвіл (короткоживучий підпис + cloud_name +
  // дозволені формати — ці ж значення підуть у підпис нижче, тож міняти
  // їх після отримання підпису не можна, інакше Cloudinary відхилить
  // завантаження як невалідне.
  const sigRes = await fetch(`${API_BASE}/venues/upload-signature`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
  });
  if (!sigRes.ok) {
    throw new Error("Не вдалося отримати дозвіл на завантаження (перевір адмін-ключ)");
  }
  const { timestamp, signature, api_key, folder, cloud_name, allowed_formats } = await sigRes.json();

  // 2. Завантажуємо файл напряму в Cloudinary з цим підписом
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", api_key);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);
  if (allowed_formats) formData.append("allowed_formats", allowed_formats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || "Не вдалося завантажити фото");
  }

  const data = await res.json();
  return data.secure_url;
}