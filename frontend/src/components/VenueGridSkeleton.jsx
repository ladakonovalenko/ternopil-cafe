export default function VenueGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 px-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-line rounded-2xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-accent-soft" />
          <div className="p-5 flex flex-col gap-3">
            <div className="h-4 bg-line rounded w-3/4" />
            <div className="h-3 bg-line rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
