import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function StarRating({ value = 0, size = "text-sm" }) {
  const { t } = useLanguage();
  const rounded = Math.round(value);
  return (
    <span className={`${size} tracking-tight`} style={{ color: "rgb(var(--color-gold))" }} aria-label={t("starRating.label", { value })}>
      {"★".repeat(rounded)}
      <span className="opacity-40">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
