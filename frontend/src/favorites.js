const STORAGE_KEY = "ternopilcafes_favorites";
const RECENT_KEY = "ternopilcafes_recent";
const RECENT_MAX = 8;

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

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Додає id на початок списку (найновіше — перше), прибирає дублікати,
// обрізає до RECENT_MAX — не потребує жодного окремого "видалити старе".
export function addRecentlyViewed(id) {
  const current = getRecentlyViewed().filter((existingId) => existingId !== id);
  const next = [id, ...current].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // тихо ігноруємо
  }
  return next;
}
