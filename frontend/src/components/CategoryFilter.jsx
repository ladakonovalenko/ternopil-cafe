const DEFAULT_CATEGORIES = ["Усі", "Кав'ярні", "Ресторани", "Бари", "Інше"];

export default function CategoryFilter({ categories = DEFAULT_CATEGORIES, active, onChange }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-6">
      {categories.map((cat) => {
        const isActive = active === cat || (cat === "Усі" && !active);
        return (
          <button
            key={cat}
            onClick={() => onChange(cat === "Усі" ? null : cat)}
            className={`font-body text-sm px-4 py-2 rounded-full border transition-colors
              ${
                isActive
                  ? "bg-accent text-surface border-accent"
                  : "bg-transparent text-ink-soft border-line hover:border-accent hover:text-accent"
              }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
