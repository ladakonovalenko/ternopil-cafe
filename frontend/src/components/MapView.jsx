import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const TERNOPIL_CENTER = [49.5535, 25.5948];

// Кольори за категорією — дві вже взяті з палітри сайту (акцент і золотий
// для зірок), дві нові підібрані в тому ж стриманому дусі, щоб не ламати
// загальний вигляд.
const CATEGORY_COLORS = {
  "кав'ярня": "#2B6C5E", // акцентний теал сайту
  ресторан: "#B98A3E", // той самий золотий, що й зірки рейтингу
  бар: "#7C3F58", // приглушений винний
  інше: "#5B6660", // ink-soft
};

function iconForCategory(category) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS["інше"];
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 14px; height: 14px; border-radius: 999px;
      background: ${color}; border: 2px solid #F5F6F3;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MapView({ venues, onSelect, emptyLabel }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, {
      center: TERNOPIL_CENTER,
      zoom: 14,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Кластер-група — зближені маркери об'єднуються в число, поки не
    // наблизиш зум; клік по кластеру сам розкриває чи наближає карту.
    clusterRef.current = L.markerClusterGroup({
      maxClusterRadius: 45,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            width: 34px; height: 34px; border-radius: 999px;
            background: #2B6C5E; color: #F5F6F3; border: 2px solid #F5F6F3;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Golos Text', sans-serif; font-size: 13px; font-weight: 600;
            box-shadow: 0 1px 4px rgba(0,0,0,0.35);
          ">${count}</div>`,
          className: "",
          iconSize: [34, 34],
        });
      },
    });
    mapRef.current.addLayer(clusterRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!clusterRef.current) return;

    clusterRef.current.clearLayers();

    venues
      .filter((v) => v.lat && v.lng)
      .forEach((venue) => {
        const marker = L.marker([venue.lat, venue.lng], {
          icon: iconForCategory(venue.category),
        }).bindPopup(
          `<strong style="font-family: 'Golos Text', sans-serif;">${escapeHtml(venue.name)}</strong>` +
            `<br/><span style="font-family: 'Golos Text', sans-serif; color:#5B6660;">${escapeHtml(venue.category)}</span>`
        );
        marker.on("click", () => onSelect(venue));
        clusterRef.current.addLayer(marker);
      });

    // Підганяємо межі карти під видимі маркери — без цього при вузькому
    // фільтрі (напр. "Бари") зум і центр лишались фіксовані на весь
    // Тернопіль, і частина закладів могла опинитись поза кадром без
    // жодної підказки, що вони взагалі є.
    const coords = venues.filter((v) => v.lat && v.lng).map((v) => [v.lat, v.lng]);
    if (coords.length > 0) {
      mapRef.current.fitBounds(coords, { padding: [30, 30], maxZoom: 15 });
    }
  }, [venues, onSelect]);

  const categoriesPresent = [...new Set(venues.map((v) => v.category))];

  return (
    <div>
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[420px] rounded-2xl overflow-hidden border border-line"
        />
        {venues.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/90 rounded-2xl pointer-events-none">
            <p className="font-body text-sm text-ink-soft px-6 text-center">
              {emptyLabel || "Тут поки нічого немає."}
            </p>
          </div>
        )}
      </div>
      {categoriesPresent.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-3">
          {categoriesPresent.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1.5 font-body text-xs text-ink-soft">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: CATEGORY_COLORS[cat] || CATEGORY_COLORS["інше"] }}
              />
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
