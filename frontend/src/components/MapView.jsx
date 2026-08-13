import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TERNOPIL_CENTER = [49.5535, 25.5948];

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 14px; height: 14px; border-radius: 999px;
    background: #2B6C5E; border: 2px solid #F5F6F3;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function MapView({ venues, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

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

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    venues
      .filter((v) => v.lat && v.lng)
      .forEach((venue) => {
        const marker = L.marker([venue.lat, venue.lng], { icon: markerIcon })
          .addTo(mapRef.current)
          .bindPopup(
            `<strong style="font-family: 'Golos Text', sans-serif;">${escapeHtml(venue.name)}</strong>` +
              `<br/><span style="font-family: 'Golos Text', sans-serif; color:#5B6660;">${escapeHtml(venue.category)}</span>`
          );
        marker.on("click", () => onSelect(venue));
        markersRef.current.push(marker);
      });
  }, [venues, onSelect]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] rounded-2xl overflow-hidden border border-line"
    />
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
