export const translations = {
  // Hero.jsx
  "hero.proposeVenue": { uk: "Запропонувати заклад →", en: "Suggest a venue →" },
  "hero.supportProject": { uk: "☕ Підтримати проєкт", en: "☕ Support the project" },
  "hero.tagline": { uk: "Тернопіль · заклади від людей", en: "Ternopil · venues from locals" },
  "hero.headline": { uk: "Куди підеш сьогодні?", en: "Where are you going today?" },
  "hero.searchPlaceholder": {
    uk: "Наприклад: тиха кав'ярня в центрі",
    en: "For example: a quiet café downtown",
  },
  "hero.voiceSearchLabel": { uk: "Голосовий пошук", en: "Voice search" },
  "hero.searching": { uk: "Шукаю…", en: "Searching…" },
  "hero.findButton": { uk: "Знайти", en: "Search" },
  "hero.voiceError.notAllowed": {
    uk: "Немає доступу до мікрофона — дозволь у налаштуваннях браузера.",
    en: "No microphone access — allow it in your browser settings.",
  },
  "hero.voiceError.noSpeech": {
    uk: "Не почула нічого — спробуй ще раз.",
    en: "Didn't hear anything — try again.",
  },
  "hero.voiceError.audioCapture": {
    uk: "Не знайшла мікрофон.",
    en: "Couldn't find a microphone.",
  },
  "hero.voiceError.network": {
    uk: "Проблема з мережею під час розпізнавання.",
    en: "Network problem during recognition.",
  },
  "hero.voiceError.default": {
    uk: "Не вдалося розпізнати голос — спробуй ще раз.",
    en: "Couldn't recognize speech — try again.",
  },
  "hero.example1": { uk: "тиха кав'ярня в центрі", en: "a quiet café downtown" },
  "hero.example2": { uk: "хочу на сніданок", en: "I want breakfast" },
  "hero.example3": { uk: "куди піти з дитиною", en: "somewhere to go with a kid" },
  "hero.example4": { uk: "випити пива з друзями", en: "grab a beer with friends" },
  "hero.venueCount": {
    uk: "{count} {noun} у базі · оновлюю вручну щотижня",
    en: "{count} {noun} in the database · updated manually every week",
  },
  "hero.venuesEmpty": {
    uk: "База поки порожня — заклади додаються вручну",
    en: "The list is empty for now — venues are added manually",
  },
};

// Українська має три форми множини, англійська — дві. Тримаємо окремо
// від translations вище, бо це логіка відмінювання, не пара рядків.
export function pluralizeVenueNoun(n, lang) {
  if (lang === "en") return n === 1 ? "venue" : "venues";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заклад";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "заклади";
  return "закладів";
}
