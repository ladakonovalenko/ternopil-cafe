import { useState } from "react";
import { api } from "../api.js";
import { saveMyReview } from "../myReviews.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function ReviewForm({ venueId, onSubmitted }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || rating === 0) return;

    setStatus("sending");
    setError("");
    try {
      const created = await api.createReview(venueId, {
        author_name: name.trim(),
        rating,
        comment: comment.trim() || null,
        website: "", // honeypot — має лишитись порожнім
      });
      saveMyReview(created.id, created.edit_token);
      setName("");
      setRating(0);
      setComment("");
      setStatus("idle");
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">
          {t("reviewForm.nameLabel")} <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="w-full bg-bg border border-line rounded-xl px-4 py-3
                     font-body text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">
          {t("reviewForm.ratingLabel")} <span className="text-red-600">*</span>
        </label>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={t("reviewForm.ratingLabel")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              onClick={() => setRating(n)}
              aria-label={t("reviewForm.starLabel", { n })}
              className="text-2xl leading-none transition-transform hover:scale-110"
              style={{ color: n <= rating ? "#B98A3E" : "#DFE3DD" }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("reviewForm.commentPlaceholder")}
        maxLength={1000}
        rows={3}
        className="bg-bg border border-line rounded-xl px-4 py-3
                   font-body text-sm focus:outline-none focus:border-accent resize-none"
      />

      {/* honeypot: звичайні відвідувачі його не бачать */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] w-0 h-0 opacity-0"
        aria-hidden="true"
      />

      {error && <p className="font-body text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending" || !name.trim() || rating === 0}
        className="self-start bg-accent hover:bg-accent-dark disabled:opacity-40
                   text-surface font-body font-medium rounded-full px-6 py-3 transition-colors"
      >
        {status === "sending" ? t("reviewForm.sending") : t("reviewForm.submit")}
      </button>
    </form>
  );
}
