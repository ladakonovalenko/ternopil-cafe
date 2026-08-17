import { useState } from "react";
import { api } from "../api.js";
import StarRating from "./StarRating.jsx";

export default function AdminReviews({ venueId, adminKey, onChanged }) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle() {
    if (!open) load();
    setOpen(!open);
  }

  function load() {
    setLoading(true);
    setError("");
    api
      .listReviews(venueId)
      .then(setReviews)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleDelete(reviewId) {
    if (!confirm("Видалити цей відгук? Цю дію не можна скасувати.")) return;
    setError("");
    try {
      await api.deleteReview(venueId, reviewId, adminKey);
      setReviews((rs) => rs.filter((r) => r.id !== reviewId));
      onChanged?.(); // рейтинг закладу міг змінитись — оновити список закладів
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="font-body text-xs text-ink-soft hover:text-accent underline underline-offset-2"
      >
        {open ? "Сховати відгуки" : "Відгуки"}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {loading ? (
            <p className="font-body text-xs text-ink-soft">Завантажую…</p>
          ) : reviews.length === 0 ? (
            <p className="font-body text-xs text-ink-soft">Відгуків ще немає.</p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 bg-bg border border-line
                           rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-body text-xs">
                    <span className="font-medium text-ink">{r.author_name}</span>
                    <StarRating value={r.rating} size="text-xs" />
                  </div>
                  {r.comment && (
                    <p className="font-body text-xs text-ink-soft truncate">{r.comment}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="font-body text-xs text-red-600 hover:text-red-800 shrink-0"
                >
                  Видалити
                </button>
              </div>
            ))
          )}
          {error && <p className="font-body text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
