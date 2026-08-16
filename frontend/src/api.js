const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
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

  similarVenues: (venueId) => request(`/search/${venueId}/similar`),

  listReviews: (venueId) => request(`/venues/${venueId}/reviews`),

  createReview: (venueId, review) =>
    request(`/venues/${venueId}/reviews`, {
      method: "POST",
      body: JSON.stringify(review),
    }),

  // --- адмінські методи: потребують X-Admin-Key ---
  verifyAdmin: (adminKey) =>
    request("/admin/verify", {
      headers: { "X-Admin-Key": adminKey },
    }),

  createVenue: (venue, adminKey) =>
    request("/venues", {
      method: "POST",
      headers: { "X-Admin-Key": adminKey },
      body: JSON.stringify(venue),
    }),

  updateVenue: (id, venue, adminKey) =>
    request(`/venues/${id}`, {
      method: "PUT",
      headers: { "X-Admin-Key": adminKey },
      body: JSON.stringify(venue),
    }),

  deleteVenue: (id, adminKey) =>
    request(`/venues/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey },
    }),
};
