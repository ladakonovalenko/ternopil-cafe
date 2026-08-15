const CATEGORIES = [
  { label: "Усі", value: null },
  { label: "Кав'ярні", value: "кав'ярня" },
  { label: "Ресторани", value: "ресторан" },
  { label: "Бари", value: "бар" },
  { label: "Інше", value: "інше" },
];

export default function CategoryFilter({ active, onChange }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-6">
      {CATEGORIES.map(({ label, value }) => {
        const isActive = active === value;
        return (
          <button
            key={label}
            onClick={() => onChange(value)}
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
