const CATEGORIES = [
  { label: "Кав'ярні", value: "кав'ярня" },
  { label: "Ресторани", value: "ресторан" },
  { label: "Бари", value: "бар" },
  { label: "Інше", value: "інше" },
];

// active тепер масив обраних категорій ([] означає "усі").
export default function CategoryFilter({ active, onChange }) {
  function toggle(value) {
    if (active.includes(value)) {
      onChange(active.filter((v) => v !== value));
    } else {
      onChange([...active, value]);
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 px-6">
      <button
        onClick={() => onChange([])}
        className={`font-body text-sm px-4 py-2 rounded-full border transition-colors
          ${
            active.length === 0
              ? "bg-accent text-surface border-accent"
              : "bg-transparent text-ink-soft border-line hover:border-accent hover:text-accent"
          }`}
      >
        Усі
      </button>
      {CATEGORIES.map(({ label, value }) => {
        const isActive = active.includes(value);
        return (
          <button
            key={label}
            onClick={() => toggle(value)}
            aria-pressed={isActive}
            className={`font-body text-sm px-4 py-2 rounded-full border transition-colors
              ${
                isActive
                  ? "bg-accent text-surface border-accent"
                  : "bg-transparent text-ink-soft border-line hover:border-accent hover:text-accent"
              }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
