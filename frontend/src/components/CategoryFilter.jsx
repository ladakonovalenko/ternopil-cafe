import { useLanguage } from "../i18n/LanguageContext.jsx";

// value лишається українською — це те саме значення, що зберігається
// в базі й використовується для фільтрації, перекладається лише label.
const CATEGORIES = [
  { key: "categoryFilter.coffee", value: "кав'ярня" },
  { key: "categoryFilter.restaurant", value: "ресторан" },
  { key: "categoryFilter.bar", value: "бар" },
  { key: "categoryFilter.other", value: "інше" },
];

// active — масив обраних категорій ([] означає "усі").
export default function CategoryFilter({ active, onChange }) {
  const { t } = useLanguage();

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
        {t("categoryFilter.all")}
      </button>
      {CATEGORIES.map(({ key, value }) => {
        const isActive = active.includes(value);
        return (
          <button
            key={value}
            onClick={() => toggle(value)}
            aria-pressed={isActive}
            className={`font-body text-sm px-4 py-2 rounded-full border transition-colors
              ${
                isActive
                  ? "bg-accent text-surface border-accent"
                  : "bg-transparent text-ink-soft border-line hover:border-accent hover:text-accent"
              }`}
          >
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}
