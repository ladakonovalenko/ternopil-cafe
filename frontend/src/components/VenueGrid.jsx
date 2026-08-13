import VenueCard from "./VenueCard.jsx";

export default function VenueGrid({ venues, reasons = {}, onSelect, emptyLabel }) {
  if (venues.length === 0) {
    return (
      <p className="text-center font-body text-ink-soft py-16">
        {emptyLabel || "Тут поки нічого немає."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 px-6">
      {venues.map((venue) => (
        <VenueCard
          key={venue.id}
          venue={venue}
          reason={reasons[venue.id]}
          onClick={() => onSelect(venue)}
        />
      ))}
    </div>
  );
}
