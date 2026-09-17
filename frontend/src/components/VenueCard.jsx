import { useState } from "react";
import StarRating from "./StarRating.jsx";
import { formatDistance } from "../distance.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { CATEGORY_KEY } from "../i18n/translations.js";
import { cloudinarySizes } from "../cloudinary.js";

const NEW_BADGE_DAYS = 7;

function isRecentlyAdded(createdAt) {
  if (!createdAt) return false;
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= NEW_BADGE_DAYS;
}

export default function VenueCard({ venue, reason, onClick, isFavorite, onToggleFavorite }) {
  const { t } = useLanguage();
  const [justToggled, setJustToggled] = useState(false);
  const image = venue.image_urls?.[0];
  const categoryLabel = CATEGORY_KEY[venue.category] ? t(CATEGORY_KEY[venue.category]) : venue.category;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="text-left bg-surface border border-line rounded-2xl overflow-hidden
                 hover:border-accent hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col cursor-pointer"
    >
      <div className="relative aspect-[4/3] bg-accent-soft overflow-hidden">
        {isRecentlyAdded(venue.created_at) && (
          <span
            className="absolute top-3 left-3 bg-accent text-surface font-body text-xs
                       font-medium px-2.5 py-1 rounded-full"
          >
            {t("venueCard.new")}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(venue.id);
            setJustToggled(true);
          }}
          aria-label={isFavorite ? t("venueCard.removeFavorite") : t("venueCard.addFavorite")}
          aria-pressed={isFavorite}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/40 hover:bg-ink/60
                     backdrop-blur-sm flex items-center justify-center transition-colors"
        >
          <span
            className={`inline-block ${isFavorite ? "text-red-500" : "text-surface"} ${
              justToggled ? "animate-heart-pop" : ""
            }`}
            onAnimationEnd={() => setJustToggled(false)}
          >
            {isFavorite ? "♥" : "♡"}
          </span>
        </button>

        {image ? (
          <img
            src={cloudinarySizes.card(image)}
            alt={venue.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-soft font-display italic">
            {venue.name}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug text-ink">{venue.name}</h3>
          {venue.price_level && (
            <span className="font-body text-xs text-ink-soft shrink-0 pt-1">{venue.price_level}</span>
          )}
        </div>

        <div className="flex items-center gap-2 font-body text-sm text-ink-soft">
          <StarRating value={venue.avg_rating} />
          <span>{venue.avg_rating > 0 ? venue.avg_rating.toFixed(1) : t("venueCard.noRatingsYet")}</span>
          <span>·</span>
          <span>{categoryLabel}</span>
          {venue.distanceKm != null && (
            <>
              <span>·</span>
              <span>{formatDistance(venue.distanceKm)}</span>
            </>
          )}
        </div>

        {reason && (
          <p className="font-display italic text-sm text-accent-dark mt-1 leading-snug">
            «{reason}»
          </p>
        )}
      </div>
    </div>
  );
}
