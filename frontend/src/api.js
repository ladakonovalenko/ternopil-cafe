const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Помилка запиту: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listVenues: (category) =>
    request(`/venues${category ? `?category=${encodeURIComponent(category)}` : ""}`),

  getVenue: (id) => request(`/venues/${id}`),

  search: (query) =>
    request("/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  listReviews: (venueId) => request(`/venues/${venueId}/reviews`),

  createReview: (venueId, review) =>
    request(`/venues/${venueId}/reviews`, {
      method: "POST",
      body: JSON.stringify(review),
    }),
};
