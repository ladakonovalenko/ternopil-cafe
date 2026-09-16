import { useState } from "react";
import { api } from "../api.js";
import { getMyReviewToken, removeMyReview } from "../myReviews.js";
import StarRating from "./StarRating.jsx";

export default function ReviewItem({ review, venueId, onChanged }) {
  const editToken = getMyReviewToken(review.id);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.updateMyReview(
        venueId,
        review.id,
        { rating, comment: comment.trim() || null },
        editToken
      );
      setEditing(false);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Видалити свій відгук? Це не можна скасувати.")) return;
    setSaving(true);
    setError("");
    try {
      await api.deleteMyReview(venueId, review.id, editToken);
      removeMyReview(review.id);
      onChanged?.();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="border-b border-line pb-4 last:border-none">
        <div className="flex items-center gap-1 mb-2" role="radiogroup" aria-label="Оцінка">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              onClick={() => setRating(n)}
              aria-label={`${n} з 5`}
              className="text-xl leading-none transition-transform hover:scale-110"
              style={{ color: n <= rating ? "#B98A3E" : "#DFE3DD" }}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={2}
          className="w-full bg-bg border border-line rounded-xl px-3 py-2
                     font-body text-sm focus:outline-none focus:border-accent resize-none mb-2"
        />
        {error && <p className="font-body text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || rating === 0}
            className="font-body text-xs text-accent hover:text-accent-dark disabled:opacity-40"
          >
            {saving ? "Зберігаю…" : "Зберегти"}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="font-body text-xs text-ink-soft hover:text-ink"
          >
            Скасувати
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="border-b border-line pb-4 last:border-none">
      <div className="flex items-center gap-2 font-body text-sm mb-1">
        <span className="font-medium text-ink">{review.author_name}</span>
        <StarRating value={review.rating} size="text-xs" />
      </div>
      {review.comment && (
        <p className="font-body text-sm text-ink-soft">{review.comment}</p>
      )}
      {editToken && (
        <div className="flex gap-3 mt-1.5">
          <button
            onClick={() => setEditing(true)}
            className="font-body text-xs text-ink-soft hover:text-accent underline underline-offset-2"
          >
            Редагувати
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="font-body text-xs text-ink-soft hover:text-red-600 underline underline-offset-2"
          >
            Видалити
          </button>
        </div>
      )}
      {error && <p className="font-body text-xs text-red-600 mt-1">{error}</p>}
    </li>
  );
}
