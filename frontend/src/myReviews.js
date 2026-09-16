const STORAGE_KEY = "ternopilcafes_my_reviews";

function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMyReview(reviewId, editToken) {
  const all = getAll();
  all[reviewId] = editToken;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage може бути недоступний — тихо ігноруємо
  }
}

export function getMyReviewToken(reviewId) {
  return getAll()[reviewId];
}

export function removeMyReview(reviewId) {
  const all = getAll();
  delete all[reviewId];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // тихо ігноруємо
  }
}
