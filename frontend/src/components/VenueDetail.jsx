import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import StarRating from "./StarRating.jsx";
import ReviewForm from "./ReviewForm.jsx";

export default function VenueDetail({ venue, venues = [], onSelect, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarLoaded, setSimilarLoaded] = useState(false);

  function loadSimilar() {
    setLoadingSimilar(true);
    api
      .similarVenues(venue.id)
      .then((res) => {
        const byId = new Map(venues.map((v) => [v.id, v]));
        setSimilar(res.results.map((r) => byId.get(r.venue_id)).filter(Boolean));
      })
      .catch(() => setSimilar([]))
      .finally(() => {
        setLoadingSimilar(false);
        setSimilarLoaded(true);
      });
  }

  const [linkCopyFailed, setLinkCopyFailed] = useState(false);

  function copyLink() {
    const url = new URL(window.location);
    url.searchParams.set("venue", venue.id);
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        setLinkCopied(true);
        setLinkCopyFailed(false);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {
        // У деяких вбудованих браузерах (Telegram/Instagram in-app) clipboard
        // API мовчки не спрацьовує без явної помилки — показуємо це чесно
        // замість того, щоб кнопка просто нічого не робила.
        setLinkCopyFailed(true);
        setTimeout(() => setLinkCopyFailed(false), 3000);
      });
  }

  const loadReviews = useCallback(() => {
    setLoadingReviews(true);
    api
      .listReviews(venue.id)
      .then(setReviews)
      .finally(() => setLoadingReviews(false));
  }, [venue.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    // при переході на інший заклад (через "Схожі заклади") — скидаємо,
    // щоб знову треба було натиснути кнопку, а не одразу бити по Gemini
    setSimilar([]);
    setSimilarLoaded(false);
  }, [venue.id]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-surface w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Закрити"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/70
                     text-surface flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          ✕
        </button>

        {venue.image_urls?.[0] && (
          <img
            src={venue.image_urls[0]}
            alt={venue.name}
            className="w-full aspect-[16/9] object-cover sm:rounded-t-3xl"
          />
        )}

        <div
          className={`p-6 sm:p-8 flex flex-col gap-6 ${
            !venue.image_urls?.[0] ? "pt-14 sm:pt-16" : ""
          }`}
        >
          <button
            onClick={copyLink}
            className="self-end -mt-2 font-body text-sm text-ink-soft hover:text-accent"
          >
            {linkCopied
              ? "Скопійовано ✓"
              : linkCopyFailed
              ? "Не вдалось скопіювати — виділи посилання вручну"
              : "Скопіювати посилання"}
          </button>

          <div>
            <h2 className="font-display text-3xl text-ink mb-2">{venue.name}</h2>
            <div className="flex items-center gap-2 font-body text-sm text-ink-soft mb-1">
              <StarRating value={venue.avg_rating} />
              <span>
                {venue.avg_rating > 0 ? venue.avg_rating.toFixed(1) : "ще без оцінок"} · {venue.reviews_count}{" "}
                відгуків
              </span>
            </div>
            <p className="font-body text-sm text-ink-soft">
              {venue.category} {venue.price_level && `· ${venue.price_level}`} · {venue.address}
            </p>
          </div>

          <p className="font-body text-ink leading-relaxed">{venue.description}</p>

          {venue.social_link && (
            <a
              href={venue.social_link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm text-accent hover:text-accent-dark underline w-fit"
            >
              Соцмережа закладу →
            </a>
          )}

          <hr className="border-line" />

          <div>
            <h3 className="font-display text-xl text-ink mb-4">Відгуки</h3>

            {loadingReviews ? (
              <p className="font-body text-sm text-ink-soft">Завантажую…</p>
            ) : reviews.length === 0 ? (
              <p className="font-body text-sm text-ink-soft mb-6">
                Ще ніхто не залишив відгук — будь першим.
              </p>
            ) : (
              <ul className="flex flex-col gap-4 mb-6">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-line pb-4 last:border-none">
                    <div className="flex items-center gap-2 font-body text-sm mb-1">
                      <span className="font-medium text-ink">{r.author_name}</span>
                      <StarRating value={r.rating} size="text-xs" />
                    </div>
                    {r.comment && <p className="font-body text-sm text-ink-soft">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}

            <ReviewForm key={venue.id} venueId={venue.id} onSubmitted={loadReviews} />
          </div>

          <hr className="border-line" />
          <div>
            <h3 className="font-display text-xl text-ink mb-4">Схожі заклади</h3>
            {!similarLoaded ? (
              <button
                onClick={loadSimilar}
                disabled={loadingSimilar}
                className="font-body text-sm text-accent hover:text-accent-dark disabled:opacity-50"
              >
                {loadingSimilar ? "Шукаю схожі…" : "Показати схожі заклади"}
              </button>
            ) : similar.length === 0 ? (
              <p className="font-body text-sm text-ink-soft">Не вдалось підібрати схожі.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {similar.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelect?.(s)}
                    className="text-left flex items-center justify-between gap-3
                               border border-line rounded-xl px-4 py-3 hover:border-accent transition-colors"
                  >
                    <span className="font-display text-base text-ink">{s.name}</span>
                    <span className="font-body text-xs text-ink-soft shrink-0">
                      {s.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
