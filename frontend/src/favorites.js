const STORAGE_KEY = "ternopilcafes_favorites";

export function getFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // приватний режим браузера чи пошкоджені дані — просто вважаємо,
    // що обраних немає, а не ламаємо сторінку
    return [];
  }
}

export function toggleFavorite(id) {
  const current = getFavorites();
  const next = current.includes(id)
    ? current.filter((existingId) => existingId !== id)
    : [...current, id];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage може бути недоступний — тихо ігноруємо, це не критично
  }
  return next;
}
