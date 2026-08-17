import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import Hero from "./components/Hero.jsx";
import CategoryFilter from "./components/CategoryFilter.jsx";
import VenueGrid from "./components/VenueGrid.jsx";
import MapView from "./components/MapView.jsx";
import VenueDetail from "./components/VenueDetail.jsx";
import AdminPanel from "./components/AdminPanel.jsx";

export default function App() {
  const isAdmin = useMemo(
    () => new URLSearchParams(window.location.search).has("admin"),
    []
  );

  if (isAdmin) {
    return <AdminPanel />;
  }

  return <PublicSite />;
}

function PublicSite() {
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [category, setCategory] = useState(null);
  const [view, setView] = useState("grid"); // grid | map
  const [selectedVenue, setSelectedVenue] = useState(null);

  const [query, setQuery] = useState("");
  const [venueNotFound, setVenueNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState(null);
  const [searchResults, setSearchResults] = useState(null); // [{venue_id, name, reason}]
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    api
      .listVenues()
      .then(setVenues)
      .catch(() => {})
      .finally(() => setLoadingVenues(false));
  }, []);

  // Пряме посилання на заклад: ?venue=<id> одразу відкриває його картку.
  // Якщо заклад уже видалено — чесно повідомляємо, а не мовчки провалюємось
  // (важливо саме тому, що це той самий лінк, який людина могла отримати
  // від когось у Telegram — "порожня сторінка без пояснень" виглядає як
  // зламаний сайт, а не як "цього закладу вже немає").
  useEffect(() => {
    const venueId = new URLSearchParams(window.location.search).get("venue");
    if (!venueId) return;
    api
      .getVenue(venueId)
      .then(setSelectedVenue)
      .catch(() => {
        setVenueNotFound(true);
        const url = new URL(window.location);
        url.searchParams.delete("venue");
        window.history.replaceState({}, "", url);
      });
  }, []);

  async function handleSearch(query) {
    setSearchLoading(true);
    setSearchError("");
    setSearchQuery(query);
    try {
      const res = await api.search(query);
      setSearchResults(res.results);
    } catch (err) {
      setSearchError(err.message || "Не вдалося виконати пошук");
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setSearchQuery(null);
    setSearchResults(null);
    setSearchError("");
  }

  const filteredVenues = useMemo(() => {
    const list = category ? venues.filter((v) => v.category === category) : venues;
    return [...list].sort((a, b) => {
      if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
      return a.name.localeCompare(b.name, "uk");
    });
  }, [venues, category]);

  const searchVenues = useMemo(() => {
    if (!searchResults) return [];
    const byId = new Map(venues.map((v) => [v.id, v]));
    return searchResults
      .map((r) => byId.get(r.venue_id))
      .filter(Boolean);
  }, [searchResults, venues]);

  const searchReasons = useMemo(() => {
    if (!searchResults) return {};
    return Object.fromEntries(searchResults.map((r) => [r.venue_id, r.reason]));
  }, [searchResults]);

  return (
    <div className="min-h-screen flex flex-col">
      {venueNotFound && (
        <div className="bg-accent-soft text-accent-dark font-body text-sm text-center px-6 py-3
                         flex items-center justify-center gap-3">
          <span>Цей заклад більше не доступний — можливо, його прибрали з бази.</span>
          <button
            onClick={() => setVenueNotFound(false)}
            className="underline underline-offset-2 hover:text-accent shrink-0"
          >
            Зрозуміло
          </button>
        </div>
      )}
      <Hero
        onSearch={handleSearch}
        loading={searchLoading}
        venueCount={venues.length}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="flex-1 pb-24">
        {searchQuery ? (
          <section className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between px-6 mb-6">
              <p className="font-display italic text-lg text-ink">
                Ось що я знайшла для «{searchQuery}»
              </p>
              <button
                onClick={clearSearch}
                className="font-body text-sm text-ink-soft hover:text-accent underline shrink-0 ml-4"
              >
                Скинути пошук
              </button>
            </div>

            {searchLoading ? (
              <p className="text-center font-body text-ink-soft py-16">Шукаю…</p>
            ) : searchError ? (
              <p className="text-center font-body text-ink-soft py-16">{searchError}</p>
            ) : (
              <VenueGrid
                venues={searchVenues}
                reasons={searchReasons}
                onSelect={setSelectedVenue}
                emptyLabel="Нічого влучного не знайшлось — спробуй сформулювати інакше."
              />
            )}
          </section>
        ) : (
          <section className="max-w-5xl mx-auto flex flex-col gap-8">
            <CategoryFilter active={category} onChange={setCategory} />

            <div className="flex justify-center gap-2 px-6">
              <ViewToggle view={view} onChange={setView} />
            </div>

            {loadingVenues ? (
              <p className="text-center font-body text-ink-soft py-16">Завантажую заклади…</p>
            ) : view === "grid" ? (
              <VenueGrid
                venues={filteredVenues}
                onSelect={setSelectedVenue}
                emptyLabel="У цій категорії поки немає закладів."
              />
            ) : (
              <div className="px-6">
                <MapView venues={filteredVenues} onSelect={setSelectedVenue} />
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-line px-6 py-8 text-center">
        <p className="font-body text-xs text-ink-soft leading-relaxed">
          Заклади додаю вручну й регулярно оновлюю. Знаєш місце, якого тут не вистачає —
          напиши мені.
          <br />
          Карта: © OpenStreetMap contributors
        </p>
      </footer>

      {selectedVenue && (
        <VenueDetail
          venue={selectedVenue}
          venues={venues}
          onSelect={setSelectedVenue}
          onClose={() => {
            setSelectedVenue(null);
            const url = new URL(window.location);
            url.searchParams.delete("venue");
            window.history.replaceState({}, "", url);
          }}
        />
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex bg-accent-soft rounded-full p-1">
      {[
        ["grid", "Список"],
        ["map", "Карта"],
      ].map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`font-body text-sm px-4 py-1.5 rounded-full transition-colors ${
            view === key ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
