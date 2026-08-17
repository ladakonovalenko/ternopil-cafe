import StarRating from "./StarRating.jsx";

const NEW_BADGE_DAYS = 7;

function isRecentlyAdded(createdAt) {
  if (!createdAt) return false;
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= NEW_BADGE_DAYS;
}

export default function VenueCard({ venue, reason, onClick }) {
  const image = venue.image_urls?.[0];

  return (
    <button
      onClick={onClick}
      className="text-left bg-surface border border-line rounded-2xl overflow-hidden
                 hover:border-accent transition-colors flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-accent-soft overflow-hidden">
        {isRecentlyAdded(venue.created_at) && (
          <span
            className="absolute top-3 left-3 bg-accent text-surface font-body text-xs
                       font-medium px-2.5 py-1 rounded-full"
          >
            Нове
          </span>
        )}
        {image ? (
          <img
            src={image}
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
          <span>{venue.avg_rating > 0 ? venue.avg_rating.toFixed(1) : "ще без оцінок"}</span>
          <span>·</span>
          <span>{venue.category}</span>
        </div>

        {reason && (
          <p className="font-display italic text-sm text-accent-dark mt-1 leading-snug">
            «{reason}»
          </p>
        )}
      </div>
    </button>
  );
}
