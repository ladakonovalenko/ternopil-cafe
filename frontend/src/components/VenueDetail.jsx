import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../api.js";
import StarRating from "./StarRating.jsx";
import ReviewForm from "./ReviewForm.jsx";

export default function VenueDetail({ venue, venues = [], onSelect, onClose, isFavorite, onToggleFavorite }) {
  const modalRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
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
    function handleKeydown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Проста фокус-пастка: Tab не повинен виводити фокус за межі
      // модалки на приховані елементи під затемненим фоном.
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeydown);
    modalRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  useEffect(() => {
    // при переході на інший заклад (через "Схожі заклади") — скидаємо,
    // щоб знову треба було натиснути кнопку, а не одразу бити по Gemini
    setSimilar([]);
    setSimilarLoaded(false);
    setPhotoIndex(0); // теж скидаємо — щоб не лишався індекс, якого може не бути в нового закладу
  }, [venue.id]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-detail-title"
        tabIndex={-1}
        className="relative bg-surface w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onToggleFavorite?.(venue.id)}
          aria-label={isFavorite ? "Прибрати з обраного" : "Додати в обране"}
          aria-pressed={isFavorite}
          className="absolute top-4 right-16 z-10 w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/70
                     text-surface flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <span className={isFavorite ? "text-red-500" : "text-surface"}>
            {isFavorite ? "♥" : "♡"}
          </span>
        </button>

        <button
          onClick={onClose}
          aria-label="Закрити"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/70
                     text-surface flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          ✕
        </button>

        {venue.image_urls?.length > 0 && (
          <div className="relative">
            <img
              src={venue.image_urls[photoIndex]}
              alt={`${venue.name} — фото ${photoIndex + 1} з ${venue.image_urls.length}`}
              className="w-full aspect-[16/9] object-cover sm:rounded-t-3xl"
            />

            {venue.image_urls.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setPhotoIndex((i) => (i === 0 ? venue.image_urls.length - 1 : i - 1))
                  }
                  aria-label="Попереднє фото"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/70
                             text-surface flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setPhotoIndex((i) => (i === venue.image_urls.length - 1 ? 0 : i + 1))
                  }
                  aria-label="Наступне фото"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/70
                             text-surface flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  ›
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {venue.image_urls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`Фото ${i + 1}`}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === photoIndex ? "bg-surface" : "bg-surface/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div
          className={`p-6 sm:p-8 flex flex-col gap-6 ${
            !(venue.image_urls?.length > 0) ? "pt-14 sm:pt-16" : ""
          }`}
        >
          <div className="self-end -mt-2 flex items-center gap-4">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(
                `${window.location.origin}/?venue=${venue.id}`
              )}&text=${encodeURIComponent(venue.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm text-ink-soft hover:text-accent"
              aria-label="Поділитись у Telegram"
            >
              Telegram
            </a>
            <a
              href={`viber://forward?text=${encodeURIComponent(
                `${venue.name} — ${window.location.origin}/?venue=${venue.id}`
              )}`}
              className="font-body text-sm text-ink-soft hover:text-accent"
              aria-label="Поділитись у Viber"
            >
              Viber
            </a>
            <button
              onClick={copyLink}
              className="font-body text-sm text-ink-soft hover:text-accent"
            >
              {linkCopied
                ? "Скопійовано ✓"
                : linkCopyFailed
                ? "Не вдалось скопіювати"
                : "Скопіювати посилання"}
            </button>
          </div>

          <div>
            <h2 id="venue-detail-title" className="font-display text-3xl text-ink mb-2">{venue.name}</h2>
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

          <div className="flex items-center gap-4 flex-wrap">
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
            <a
              href={`https://t.me/твій_юзернейм?text=${encodeURIComponent(
                `Заклад «${venue.name}»: `
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-xs text-ink-soft hover:text-accent underline underline-offset-2"
            >
              Повідомити про помилку в цьому закладі
            </a>
          </div>

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
