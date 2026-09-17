import VenueCard from "./VenueCard.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function VenueGrid({ venues, reasons = {}, onSelect, emptyLabel, favorites = [], onToggleFavorite }) {
  const { t } = useLanguage();

  if (venues.length === 0) {
    return (
      <p className="text-center font-body text-ink-soft py-16">
        {emptyLabel || t("grid.empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-6">
      {venues.map((venue) => (
        <VenueCard
          key={venue.id}
          venue={venue}
          reason={reasons[venue.id]}
          onClick={() => onSelect(venue)}
          isFavorite={favorites.includes(venue.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
