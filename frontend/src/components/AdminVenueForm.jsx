import { useState, useEffect } from "react";
import { uploadImage } from "../uploadImage.js";

const CATEGORIES = ["кав'ярня", "ресторан", "бар", "інше"];
const PRICE_LEVELS = ["$", "$$", "$$$"];
const DISTRICTS = [
  "Центр",
  "Східний",
  "Дружба",
  "Старий парк",
  "Пронятин",
  "Березовиця",
  "Кутківці",
  "Об'їзна дорога",
  "Сонячний (БАМ) / Аляска",
];

const emptyVenue = {
  name: "",
  category: "кав'ярня",
  district: "",
  tags: "",
  description: "",
  address: "",
  lat: "",
  lng: "",
  price_level: "$$",
  social_link: "",
  image_urls: "",
};

export default function AdminVenueForm({ initial, onSubmit, onCancel, submitting, adminKey }) {
  const [form, setForm] = useState(emptyVenue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [coordError, setCoordError] = useState("");

  // Щедрий "коридор" навколо Тернополя й найближчих сіл (Байківці,
  // Велика Березовиця тощо) — щоб не блокувати реальні заклади на
  // околицях, але ловити явні одруківки чи випадково переплутані
  // місцями широту/довготу.
  const LAT_RANGE = [49.35, 49.65];
  const LNG_RANGE = [25.35, 25.80];

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        district: initial.district ?? "",
        tags: (initial.tags || []).join(", "),
        lat: initial.lat != null ? String(initial.lat) : "",
        lng: initial.lng != null ? String(initial.lng) : "",
        social_link: initial.social_link ?? "",
        image_urls: (initial.image_urls || []).join("\n"),
      });
    } else {
      setForm(emptyVenue);
    }
  }, [initial]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError("");
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadImage(file, adminKey);
        urls.push(url);
      }
      setForm((f) => ({
        ...f,
        image_urls: [f.image_urls, ...urls].filter(Boolean).join("\n"),
      }));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ""; // дозволяє вибрати той самий файл повторно
    }
  }

  function validateCoord(value, range, label) {
    if (value === "") return null; // порожньо — ок, координати необов'язкові
    if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
      return `${label}: це не схоже на число`;
    }
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num < range[0] || num > range[1]) {
      return `${label}: схоже на помилку (очікується приблизно ${range[0]}–${range[1]})`;
    }
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const latErr = validateCoord(form.lat, LAT_RANGE, "Широта");
    const lngErr = validateCoord(form.lng, LNG_RANGE, "Довгота");
    const isPartialPair = (form.lat === "") !== (form.lng === "");
    const err =
      latErr || lngErr || (isPartialPair
        ? "Заповни і широту, і довготу разом — інакше заклад не з'явиться на карті"
        : null);
    if (err) {
      setCoordError(err);
      return;
    }
    setCoordError("");

    onSubmit({
      name: form.name.trim(),
      category: form.category,
      district: form.district || null,
      tags: form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: form.description.trim(),
      address: form.address.trim(),
      lat: form.lat === "" ? null : parseFloat(form.lat),
      lng: form.lng === "" ? null : parseFloat(form.lng),
      price_level: form.price_level,
      social_link: (form.social_link || "").trim() || null,
      image_urls: form.image_urls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  const inputClass =
    "w-full bg-bg border border-line rounded-xl px-4 py-2.5 font-body text-sm " +
    "focus:outline-none focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-surface border border-line rounded-2xl p-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="font-body text-xs text-ink-soft mb-1 block">Назва</label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="font-body text-xs text-ink-soft mb-1 block">Категорія</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-body text-xs text-ink-soft mb-1 block">Район</label>
          <select
            value={form.district}
            onChange={(e) => update("district", e.target.value)}
            className={inputClass}
          >
            <option value="">— не вказано —</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">Опис</label>
        <textarea
          required
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">
          Ключові слова (через кому) — допомагають LLM точніше підбирати заклад
        </label>
        <input
          value={form.tags}
          onChange={(e) => update("tags", e.target.value)}
          placeholder="напр. повноцінні страви, обід, вечеря"
          className={inputClass}
        />
      </div>

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">Адреса</label>
        <input
          required
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="напр. вул. Валова, 12"
          className={inputClass}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="font-body text-xs text-ink-soft mb-1 block">
            Широта (lat)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.lat}
            onChange={(e) => update("lat", e.target.value)}
            placeholder="49.5535"
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-body text-xs text-ink-soft mb-1 block">
            Довгота (lng)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.lng}
            onChange={(e) => update("lng", e.target.value)}
            placeholder="25.5948"
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-body text-xs text-ink-soft mb-1 block">Ціна</label>
          <select
            value={form.price_level}
            onChange={(e) => update("price_level", e.target.value)}
            className={inputClass}
          >
            {PRICE_LEVELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="font-body text-xs text-ink-soft -mt-2">
        Координати простіше взяти з Google Maps: клацни правою кнопкою на закладі → перше
        число скопійованого рядка — це lat, друге — lng.
      </p>
      {coordError && (
        <p className="font-body text-xs text-red-600 -mt-2">{coordError}</p>
      )}

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">
          Посилання на соцмережу (необов'язково)
        </label>
        <input
          value={form.social_link}
          onChange={(e) => update("social_link", e.target.value)}
          placeholder="https://instagram.com/..."
          className={inputClass}
        />
      </div>

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">
          Фото з галереї
        </label>
        <label
          className="inline-flex items-center gap-2 cursor-pointer bg-bg border border-line
                     rounded-xl px-4 py-2.5 font-body text-sm text-ink hover:border-accent
                     transition-colors w-fit"
        >
          {uploading ? "Завантажую…" : "Обрати фото"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={handleFilesSelected}
            className="hidden"
          />
        </label>
        {uploadError && (
          <p className="font-body text-xs text-red-600 mt-1">{uploadError}</p>
        )}
      </div>

      <div>
        <label className="font-body text-xs text-ink-soft mb-1 block">
          Посилання на фото (заповнюється саме після завантаження вище,
          можна й додати вручну)
        </label>
        <textarea
          rows={2}
          value={form.image_urls}
          onChange={(e) => update("image_urls", e.target.value)}
          placeholder={"https://...\nhttps://..."}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent hover:bg-accent-dark disabled:opacity-40 text-surface
                     font-body font-medium rounded-full px-6 py-2.5 transition-colors"
        >
          {submitting ? "Зберігаю…" : initial ? "Зберегти зміни" : "Додати заклад"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onCancel}
            className="font-body text-sm text-ink-soft hover:text-ink"
          >
            Скасувати
          </button>
        )}
      </div>
    </form>
  );
}
