import { useRef, useState } from "react";

export default function Hero({ onSearch, loading, venueCount, query, onQueryChange }) {
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
        return "Немає доступу до мікрофона — дозволь у налаштуваннях браузера.";
      case "no-speech":
        return "Не почула нічого — спробуй ще раз.";
      case "audio-capture":
        return "Не знайшла мікрофон.";
      case "network":
        return "Проблема з мережею під час розпізнавання.";
      default:
        return "Не вдалося розпізнати голос — спробуй ще раз.";
    }
  }

  function handleVoiceInput() {
    if (!SpeechRecognitionAPI) return;
    setVoiceError("");

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "uk-UA";
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
    }

    setListening(true);
    recognitionRef.current.start();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  return (
    <header className="px-4 sm:px-6 pt-14 sm:pt-20 pb-14 text-center max-w-2xl mx-auto">
      <p className="font-body text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-ink-soft mb-4">
        Тернопіль · заклади від людей
      </p>
      <h1 className="font-display italic text-3xl sm:text-5xl leading-tight text-ink mb-8">
        Куди підеш сьогодні?
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Наприклад: тиха кав'ярня в центрі"
            className={`w-full bg-surface border border-line rounded-full px-5 sm:px-6 py-4
                       font-body text-base text-ink placeholder:text-ink-soft/70
                       focus:outline-none focus:border-accent transition-colors
                       ${SpeechRecognitionAPI ? "pr-14" : ""}`}
          />
          {SpeechRecognitionAPI && (
            <button
              type="button"
              onClick={handleVoiceInput}
              aria-label="Голосовий пошук"
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
          {loading ? "Шукаю…" : "Знайти"}
        </button>
      </form>

      {voiceError && (
        <p className="mt-2 font-body text-xs text-red-600">{voiceError}</p>
      )}

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {EXAMPLE_QUERIES.map((ex) => (
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
          ? `${venueCount} ${pluralizeVenues(venueCount)} у базі · оновлюю вручну щотижня`
          : "База поки порожня — заклади додаються вручну"}
      </p>
    </header>
  );
}

const EXAMPLE_QUERIES = [
  "тиха кав'ярня в центрі",
  "хочу на сніданок",
  "куди піти з дитиною",
  "випити пива з друзями",
];

function pluralizeVenues(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заклад";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "заклади";
  return "закладів";
}
