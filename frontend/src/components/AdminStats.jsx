import { useEffect, useState } from "react";
import { api } from "../api.js";

const PERIODS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export default function AdminStats({ adminKey }) {
  const [period, setPeriod] = useState("week");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getStats(period, adminKey)
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [period, adminKey]);

  const maxViews = stats ? Math.max(1, ...stats.buckets.map((b) => b.views)) : 1;

  function formatBucketLabel(dateStr) {
    const d = new Date(dateStr);
    if (period === "day") return d.toLocaleTimeString("uk-UA", { hour: "2-digit" });
    if (period === "year") return d.toLocaleDateString("uk-UA", { month: "short" });
    return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-6">
      <h2 className="font-display text-xl text-ink mb-1">Відвідувачі сайту</h2>

      <div className="flex gap-4 border-b border-line mb-4 mt-3">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`font-body text-sm pb-2 -mb-px border-b-2 transition-colors ${
              period === p.key
                ? "border-accent text-ink font-medium"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-body text-sm text-ink-soft py-8 text-center">Завантажую…</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 py-8 text-center">{error}</p>
      ) : (
        <>
          <div className="flex gap-8 mb-6">
            <div>
              <p className="font-display text-3xl text-ink">{stats.total_views}</p>
              <p className="font-body text-xs text-ink-soft">Перегляди</p>
            </div>
            <div>
              <p className="font-display text-3xl text-ink">{stats.total_visitors}</p>
              <p className="font-body text-xs text-ink-soft">Відвідувачі</p>
            </div>
          </div>

          {stats.buckets.length === 0 ? (
            <p className="font-body text-sm text-ink-soft py-8 text-center">
              Даних за цей період поки немає.
            </p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {stats.buckets.map((b) => (
                <div key={b.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-accent rounded-t-sm transition-all hover:bg-accent-dark"
                    style={{ height: `${Math.max(4, (b.views / maxViews) * 100)}%` }}
                    title={`${b.views} переглядів · ${b.visitors} відвідувачів`}
                  />
                </div>
              ))}
            </div>
          )}

          {stats.buckets.length > 0 && (
            <div className="flex justify-between font-body text-xs text-ink-soft mt-2">
              <span>{formatBucketLabel(stats.buckets[0].date)}</span>
              <span>{formatBucketLabel(stats.buckets[stats.buckets.length - 1].date)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
