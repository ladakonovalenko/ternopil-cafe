import { useState } from "react";

export default function Hero({ onSearch, loading, venueCount }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  return (
    <header className="px-4 sm:px-6 pt-14 sm:pt-20 pb-14 text-center max-w-2xl mx-auto">
      <p className="font-body text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-ink-soft mb-4">
        Тернопіль · заклади від людей, а не від алгоритму
      </p>
      <h1 className="font-display italic text-3xl sm:text-5xl leading-tight text-ink mb-8">
        Куди підеш сьогодні?
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Наприклад: тиха кав'ярня в центрі, недорого"
          className="flex-1 min-w-0 bg-surface border border-line rounded-full px-5 sm:px-6 py-4
                     font-body text-base text-ink placeholder:text-ink-soft/70
                     focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-accent hover:bg-accent-dark disabled:opacity-40
                     text-surface font-body font-medium rounded-full px-8 py-4
                     transition-colors shrink-0"
        >
          {loading ? "Шукаю…" : "Знайти"}
        </button>
      </form>

      <p className="mt-6 font-body text-sm text-ink-soft">
        {venueCount > 0
          ? `${venueCount} ${pluralizeVenues(venueCount)} у базі · оновлюю вручну щотижня`
          : "База поки порожня — заклади додаються вручну"}
      </p>
    </header>
  );
}

function pluralizeVenues(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заклад";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "заклади";
  return "закладів";
}
