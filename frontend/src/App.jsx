import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { getFavorites, toggleFavorite, getRecentlyViewed, addRecentlyViewed } from "./favorites.js";
import { getDistanceKm } from "./distance.js";
import { getInitialTheme, applyTheme } from "./theme.js";
import { cloudinarySizes } from "./cloudinary.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import Hero from "./components/Hero.jsx";
import CategoryFilter from "./components/CategoryFilter.jsx";
import VenueGrid from "./components/VenueGrid.jsx";
import VenueGridSkeleton from "./components/VenueGridSkeleton.jsx";
import MapView from "./components/MapView.jsx";
import VenueDetail from "./components/VenueDetail.jsx";
import AdminPanel from "./components/AdminPanel.jsx";

export default function App() {
  const { t } = useLanguage();
  const isAdmin = useMemo(
    () => new URLSearchParams(window.location.search).has("admin"),
    []
  );

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const themeToggle = (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? t("app.themeToLight") : t("app.themeToDark")}
      className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-surface border border-line
                 flex items-center justify-center hover:border-accent transition-colors"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );

  if (isAdmin) {
    return (
      <>
        {themeToggle}
        <AdminPanel />
      </>
    );
  }

  return <PublicSite themeToggle={themeToggle} />;
}

function PublicSite({ themeToggle }) {
  const { t, lang, setLang } = useLanguage();
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [category, setCategory] = useState([]);
  const [view, setView] = useState("grid"); // grid | map
  const [focusVenueId, setFocusVenueId] = useState(null);
  const [searchView, setSearchView] = useState("grid"); // окремий перемикач для результатів пошуку
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [favorites, setFavorites] = useState(() => getFavorites());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState(() => getRecentlyViewed());
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  function handleNearbyToggle() {
    if (userLocation) {
      setUserLocation(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError(t("app.geolocationUnsupported"));
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? t("app.geolocationDenied")
            : t("app.geolocationFailed")
        );
      },
      { timeout: 10000 }
    );
  }

  function handleToggleFavorite(id) {
    setFavorites(toggleFavorite(id));
  }

  // Записуємо перегляд незалежно від того, ЯК заклад відкрився —
  // клік по картці, пряме посилання чи кнопка "назад" — усі шляхи
  // зрештою встановлюють selectedVenue, тож досить одного місця.
  useEffect(() => {
    if (selectedVenue) setRecentlyViewed(addRecentlyViewed(selectedVenue.id));
  }, [selectedVenue]);

  const [query, setQuery] = useState("");
  const [venueNotFound, setVenueNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState(null);
  const [searchResults, setSearchResults] = useState(null); // [{venue_id, name, reason}]
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Відкриття закладу через клік (не через пряме посилання) — додає запис
  // в історію браузера, щоб апаратна/жестова кнопка "назад" на мобільному
  // закривала саме картку, а не виводила з сайту в попередню сторінку.
  function openVenue(venue) {
    setSelectedVenue(venue);
    const url = new URL(window.location);
    url.searchParams.set("venue", venue.id);
    window.history.pushState({ venueId: venue.id }, "", url);
  }

  // "Переглянути на карті" з картки закладу — скидаємо все, що могло б
  // приховати цей заклад (пошук, фільтр категорій, обране, "поруч зі
  // мною"), щоб гарантовано побачити саме його на карті, а не порожньо
  // чи не той заклад через залишений фільтр.
  function handleViewOnMap(venue) {
    clearSearch();
    setCategory([]);
    setShowFavoritesOnly(false);
    setUserLocation(null);
    setView("map");
    setFocusVenueId(venue.id);
    setSelectedVenue(null);
    const url = new URL(window.location);
    url.searchParams.delete("venue");
    window.history.replaceState({}, "", url);
  }

  // Слухач "назад/вперед" — коли ?venue зникає з адреси через натискання
  // "назад" (не через наш власний onClose), синхронізуємо стан з URL.
  useEffect(() => {
    function handlePopState() {
      const venueId = new URLSearchParams(window.location.search).get("venue");
      if (!venueId) {
        setSelectedVenue(null);
        return;
      }
      // URL після "назад/вперед" показує заклад, якого зараз не видно
      // (чи видно інший) — підвантажуємо його заново, щоб адресний
      // рядок і те, що бачить людина, завжди збігались.
      api.getVenue(venueId).then(setSelectedVenue).catch(() => setSelectedVenue(null));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Простий, анонімний облік відвідування — тільки для власної статистики
  // в адмінці, не для стороннього трекінгу. Fire-and-forget, нічого не
  // чекає й не блокує, помилки тихо ігноруються (api.logPageview сам
  // ковтає .catch()).
  useEffect(() => {
    api.logPageview(window.location.pathname + window.location.search);
  }, []);

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
      setSearchError(err.message || t("app.searchFailed"));
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
    let list = category.length > 0 ? venues.filter((v) => category.includes(v.category)) : venues;
    if (showFavoritesOnly) list = list.filter((v) => favorites.includes(v.id));

    if (userLocation) {
      return [...list]
        .filter((v) => v.lat && v.lng) // без координат неможливо порахувати відстань
        .map((v) => ({
          ...v,
          distanceKm: getDistanceKm(userLocation.lat, userLocation.lng, v.lat, v.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return [...list].sort((a, b) => {
      if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
      return a.name.localeCompare(b.name, "uk");
    });
  }, [venues, category, showFavoritesOnly, favorites, userLocation]);

  const recentlyViewedVenues = useMemo(() => {
    const byId = new Map(venues.map((v) => [v.id, v]));
    return recentlyViewed.map((id) => byId.get(id)).filter(Boolean);
  }, [recentlyViewed, venues]);

  // "Тобі може сподобатись" — суто локальна кмітливість, без жодного
  // запиту на сервер: дивимось, яка категорія найчастіше трапляється
  // серед обраного й нещодавно переглянутого, і підказуємо ще заклади
  // тієї ж категорії, яких людина ще не бачила. Нічого не зберігається
  // й не відправляється — увесь сигнал уже й так лежить у браузері.
  const recommendedVenues = useMemo(() => {
    const signalVenues = [
      ...favorites.map((id) => venues.find((v) => v.id === id)),
      ...recentlyViewedVenues,
    ].filter(Boolean);

    if (signalVenues.length === 0) return [];

    const counts = {};
    signalVenues.forEach((v) => {
      counts[v.category] = (counts[v.category] || 0) + 1;
    });
    const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    const alreadySeen = new Set([...favorites, ...recentlyViewed]);
    return venues
      .filter((v) => v.category === topCategory && !alreadySeen.has(v.id))
      .sort((a, b) => b.avg_rating - a.avg_rating)
      .slice(0, 6);
  }, [favorites, recentlyViewedVenues, recentlyViewed, venues]);

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
      {themeToggle}
      <button
        onClick={() => setLang((l) => (l === "uk" ? "en" : "uk"))}
        aria-label={lang === "uk" ? "Switch to English" : "Перемкнути на українську"}
        className="fixed top-4 right-16 z-40 w-10 h-10 rounded-full bg-surface border border-line
                   flex items-center justify-center font-body text-xs font-medium text-ink-soft
                   hover:border-accent hover:text-accent transition-colors"
      >
        {lang === "uk" ? "EN" : "UK"}
      </button>
      {venueNotFound && (
        <div className="bg-accent-soft text-accent-dark font-body text-sm text-center px-6 py-3
                         flex items-center justify-center gap-3">
          <span>{t("app.venueNotFound")}</span>
          <button
            onClick={() => setVenueNotFound(false)}
            className="underline underline-offset-2 hover:text-accent shrink-0"
          >
            {t("app.gotIt")}
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
            <div className="flex items-center justify-between px-6 mb-6 flex-wrap gap-3">
              <p className="font-display italic text-lg text-ink">
                {t("app.searchResultsFor", { query: searchQuery })}
              </p>
              <div className="flex items-center gap-3">
                {!searchLoading && !searchError && searchVenues.length > 0 && (
                  <ViewToggle view={searchView} onChange={setSearchView} />
                )}
                <button
                  onClick={clearSearch}
                  className="font-body text-sm text-ink-soft hover:text-accent underline shrink-0"
                >
                  {t("app.resetSearch")}
                </button>
              </div>
            </div>

            {searchLoading ? (
              <VenueGridSkeleton />
            ) : searchError ? (
              <p className="text-center font-body text-ink-soft py-16">{searchError}</p>
            ) : searchView === "grid" ? (
              <VenueGrid
                venues={searchVenues}
                reasons={searchReasons}
                onSelect={openVenue}
                emptyLabel={t("app.searchEmpty")}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <div className="px-6">
                <MapView
                  venues={searchVenues}
                  onSelect={openVenue}
                  emptyLabel={t("app.searchEmpty")}
                />
              </div>
            )}
          </section>
        ) : (
          <section className="max-w-5xl mx-auto flex flex-col gap-8">
            <HorizontalVenueStrip
              title={t("app.recentlyViewed")}
              venues={recentlyViewedVenues}
              onSelect={openVenue}
            />
            <HorizontalVenueStrip
              title={t("app.recommendedForYou")}
              venues={recommendedVenues}
              onSelect={openVenue}
            />

            <CategoryFilter active={category} onChange={setCategory} />

            <div className="flex flex-col items-center gap-2 px-6 -mt-4">
              <button
                onClick={handleNearbyToggle}
                disabled={locationLoading}
                aria-pressed={!!userLocation}
                className={`font-body text-sm px-4 py-2 rounded-full border transition-colors disabled:opacity-50 ${
                  userLocation
                    ? "bg-accent text-surface border-accent"
                    : "bg-transparent text-ink-soft border-line hover:border-accent hover:text-accent"
                }`}
              >
                {locationLoading
                  ? t("app.locating")
                  : userLocation
                  ? `📍 ${t("app.nearMe")} ✕`
                  : `📍 ${t("app.nearMe")}`}
              </button>
              {locationError && (
                <p className="font-body text-xs text-red-600 text-center">{locationError}</p>
              )}
            </div>

            <div className="flex justify-center items-center gap-3 px-6">
              <ViewToggle view={view} onChange={setView} />
              <button
                onClick={() => setShowFavoritesOnly((v) => !v)}
                aria-pressed={showFavoritesOnly}
                className={`font-body text-sm px-4 py-1.5 rounded-full border transition-colors ${
                  showFavoritesOnly
                    ? "bg-accent text-surface border-accent"
                    : "border-line text-ink-soft hover:border-accent hover:text-accent"
                }`}
              >
                {showFavoritesOnly ? "♥" : "♡"} {t("app.favoritesButton")}
                {favorites.length > 0 ? ` (${favorites.length})` : ""}
              </button>
            </div>

            {loadingVenues ? (
              <VenueGridSkeleton />
            ) : view === "grid" ? (
              <VenueGrid
                venues={filteredVenues}
                onSelect={openVenue}
                emptyLabel={showFavoritesOnly ? t("app.favoritesEmpty") : t("app.categoryEmpty")}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <div className="px-6">
                <MapView
                  venues={filteredVenues}
                  onSelect={openVenue}
                  focusVenueId={focusVenueId}
                  onFocusHandled={() => setFocusVenueId(null)}
                  emptyLabel={showFavoritesOnly ? t("app.favoritesEmptyMap") : t("app.categoryEmpty")}
                />
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-line px-6 py-8 text-center">
        <p className="font-body text-xs text-ink-soft leading-relaxed">
          {t("app.footerText")}
          <br />
          {t("app.mapAttribution")}
        </p>
      </footer>

      {selectedVenue && (
        <VenueDetail
          venue={selectedVenue}
          venues={venues}
          onSelect={openVenue}
          isFavorite={favorites.includes(selectedVenue.id)}
          onToggleFavorite={handleToggleFavorite}
          onViewOnMap={handleViewOnMap}
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
  const { t } = useLanguage();
  return (
    <div className="inline-flex bg-accent-soft rounded-full p-1">
      {[
        ["grid", t("app.viewList")],
        ["map", t("app.viewMap")],
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

function HorizontalVenueStrip({ title, venues, onSelect }) {
  if (venues.length === 0) return null;

  return (
    <div className="px-6 -mb-4">
      <p className="font-body text-xs uppercase tracking-wide text-ink-soft mb-3">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {venues.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v)}
            className="shrink-0 w-40 text-left bg-surface border border-line rounded-xl
                       overflow-hidden hover:border-accent transition-colors"
          >
            <div className="aspect-[4/3] bg-accent-soft overflow-hidden">
              {v.image_urls?.[0] && (
                <img
                  src={cloudinarySizes.strip(v.image_urls[0])}
                  alt={v.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <p className="font-body text-xs text-ink px-2 py-2 truncate">{v.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
