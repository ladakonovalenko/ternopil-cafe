import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function StarRating({ value = 0, size = "text-sm" }) {
  const { t } = useLanguage();
  const rounded = Math.round(value);
  return (
    <span className={`${size} tracking-tight`} style={{ color: "#B98A3E" }} aria-label={t("starRating.label", { value })}>
      {"★".repeat(rounded)}
      <span className="opacity-25">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
