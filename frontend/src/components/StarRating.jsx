export default function StarRating({ value = 0, size = "text-sm" }) {
  const rounded = Math.round(value);
  return (
    <span className={`${size} tracking-tight`} style={{ color: "#B98A3E" }} aria-label={`Рейтинг ${value} з 5`}>
      {"★".repeat(rounded)}
      <span className="opacity-25">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
