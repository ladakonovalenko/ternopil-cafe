import { useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { pluralizeVenueNoun } from "../i18n/translations.js";

export default function Hero({ onSearch, loading, venueCount, query, onQueryChange }) {
  const { t, lang } = useLanguage();
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  const SpeechRecognitionAPI =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  function voiceErrorMessage(errorCode) {
    switch (errorCode) {
      case "not-allowed":
      case "permission-denied":
        return t("hero.voiceError.notAllowed");
      case "no-speech":
        return t("hero.voiceError.noSpeech");
      case "audio-capture":
        return t("hero.voiceError.audioCapture");
      case "network":
        return t("hero.voiceError.network");
      default:
        return t("hero.voiceError.default");
    }
  }

  function handleVoiceInput() {
    if (!SpeechRecognitionAPI) return;
    setVoiceError("");

    // Мова розпізнавання йде за поточною мовою інтерфейсу — інакше
    // голосовий пошук англійською намагався б розпізнати мову як
    // українську й помилявся б.
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === "en" ? "en-US" : "uk-UA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onQueryChange(transcript);
      onSearch(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      setVoiceError(voiceErrorMessage(event.error));
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  const exampleQueries = [
    t("hero.example1"),
    t("hero.example2"),
    t("hero.example3"),
    t("hero.example4"),
  ];

  return (
    <header className="px-4 sm:px-6 pt-14 sm:pt-20 pb-14 text-center max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <a
          href="https://t.me/твій_юзернейм"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-body text-xs text-accent hover:text-accent-dark
                     underline underline-offset-2"
        >
          {t("hero.proposeVenue")}
        </a>

        <a
          href="https://send.monobank.ua/твоє-посилання"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-body text-xs font-medium
                     bg-accent-soft hover:bg-accent hover:text-surface text-accent-dark
                     rounded-full px-4 py-1.5 transition-colors"
        >
          {t("hero.supportProject")}
        </a>
      </div>

      <p className="font-body text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-ink-soft mb-4">
        {t("hero.tagline")}
      </p>
      <h1 className="font-display italic text-3xl sm:text-5xl leading-tight text-ink mb-8">
        {t("hero.headline")}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("hero.searchPlaceholder")}
            className={`w-full bg-surface border border-line rounded-full px-5 sm:px-6 py-4
                       font-body text-base text-ink placeholder:text-ink-soft/70
                       focus:outline-none focus:border-accent transition-colors
                       ${SpeechRecognitionAPI ? "pr-14" : ""}`}
          />
          {SpeechRecognitionAPI && (
            <button
              type="button"
              onClick={handleVoiceInput}
              aria-label={t("hero.voiceSearchLabel")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                         flex items-center justify-center transition-colors
                         ${listening ? "bg-accent text-surface animate-pulse" : "text-ink-soft hover:text-accent"}`}
            >
              🎤
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-accent hover:bg-accent-dark disabled:opacity-40
                     text-surface font-body font-medium rounded-full px-8 py-4
                     transition-colors shrink-0"
        >
          {loading ? t("hero.searching") : t("hero.findButton")}
        </button>
      </form>

      {voiceError && (
        <p className="mt-2 font-body text-xs text-red-600">{voiceError}</p>
      )}

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {exampleQueries.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              onQueryChange(ex);
              onSearch(ex);
            }}
            className="font-body text-xs text-ink-soft border border-line rounded-full
                       px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <p className="mt-6 font-body text-sm text-ink-soft">
        {venueCount > 0
          ? t("hero.venueCount", { count: venueCount, noun: pluralizeVenueNoun(venueCount, lang) })
          : t("hero.venuesEmpty")}
      </p>
    </header>
  );
}
