const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

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

  // 1. Питаємо в бекенду дозвіл (короткоживучий підпис + cloud_name)
  const sigRes = await fetch(`${API_BASE}/venues/upload-signature`, {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
  });
  if (!sigRes.ok) {
    throw new Error("Не вдалося отримати дозвіл на завантаження (перевір адмін-ключ)");
  }
  const { timestamp, signature, api_key, folder, cloud_name } = await sigRes.json();

  // 2. Завантажуємо файл напряму в Cloudinary з цим підписом
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", api_key);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);

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