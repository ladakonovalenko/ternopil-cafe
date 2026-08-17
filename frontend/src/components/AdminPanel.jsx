import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import StarRating from "./StarRating.jsx";
import AdminVenueForm from "./AdminVenueForm.jsx";
import AdminReviews from "./AdminReviews.jsx";
import AdminStats from "./AdminStats.jsx";

const STORAGE_KEY = "ternopil-cafe-admin-key";

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // venue object | "new" | null
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadVenues = useCallback(() => {
    setLoading(true);
    api
      .listVenues()
      .then(setVenues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // При завантаженні сторінки — якщо ключ уже лежить у sessionStorage
  // (з попереднього візиту), перевіряємо його на сервері, а не довіряємо
  // сліпо. Ключ, збережений до цього фіксу, міг бути невірним.
  useEffect(() => {
    if (!adminKey) {
      setVerifying(false);
      return;
    }
    api
      .verifyAdmin(adminKey)
      .then(() => loadVenues())
      .catch(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setAdminKey("");
      })
      .finally(() => setVerifying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock(e) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError("");
    try {
      await api.verifyAdmin(keyInput);
      sessionStorage.setItem(STORAGE_KEY, keyInput);
      setAdminKey(keyInput);
      loadVenues();
    } catch (err) {
      setUnlockError("Невірний ключ");
      setKeyInput("");
    } finally {
      setUnlocking(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAdminKey("");
    setKeyInput("");
  }

  async function handleCreate(payload) {
    setSubmitting(true);
    setError("");
    try {
      await api.createVenue(payload, adminKey);
      setEditing(null);
      loadVenues();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(payload) {
    setSubmitting(true);
    setError("");
    try {
      await api.updateVenue(editing.id, payload, adminKey);
      setEditing(null);
      loadVenues();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(venue) {
    if (!confirm(`Видалити «${venue.name}»? Цю дію не можна скасувати.`)) return;
    setError("");
    try {
      await api.deleteVenue(venue.id, adminKey);
      loadVenues();
    } catch (err) {
      setError(err.message);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="font-body text-ink-soft">Перевіряю…</p>
      </div>
    );
  }

  if (!adminKey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form
          onSubmit={handleUnlock}
          className="bg-surface border border-line rounded-2xl p-8 max-w-sm w-full flex flex-col gap-4"
        >
          <h1 className="font-display italic text-2xl text-ink text-center">Адмінка</h1>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Admin key"
            autoFocus
            className="bg-bg border border-line rounded-xl px-4 py-3 font-body text-sm
                       focus:outline-none focus:border-accent"
          />
          {unlockError && (
            <p className="font-body text-sm text-red-600 text-center">{unlockError}</p>
          )}
          <button
            type="submit"
            disabled={unlocking || !keyInput}
            className="bg-accent hover:bg-accent-dark disabled:opacity-40 text-surface font-body font-medium
                       rounded-full px-6 py-3 transition-colors"
          >
            {unlocking ? "Перевіряю…" : "Увійти"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display italic text-2xl sm:text-3xl text-ink">Адмінка закладів</h1>
        <button
          onClick={handleLogout}
          className="font-body text-sm text-ink-soft hover:text-ink"
        >
          Вийти
        </button>
      </div>

      <AdminStats adminKey={adminKey} />

      {error && (
        <p className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {editing ? (
        <AdminVenueForm
          initial={editing === "new" ? null : editing}
          submitting={submitting}
          onSubmit={editing === "new" ? handleCreate : handleUpdate}
          onCancel={() => setEditing(null)}
          adminKey={adminKey}
        />
      ) : (
        <button
          onClick={() => setEditing("new")}
          className="self-start bg-accent hover:bg-accent-dark text-surface font-body
                     font-medium rounded-full px-6 py-3 transition-colors"
        >
          + Додати заклад
        </button>
      )}

      <div>
        <h2 className="font-body text-sm text-ink-soft uppercase tracking-wide mb-4">
          Усі заклади ({venues.length})
        </h2>

        {loading ? (
          <p className="font-body text-ink-soft">Завантажую…</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {venues.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-line
                           rounded-xl px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg text-ink truncate">{v.name}</p>
                  <div className="flex items-center gap-2 font-body text-xs text-ink-soft">
                    <StarRating value={v.avg_rating} size="text-xs" />
                    <span>{v.category}</span>
                    <span>·</span>
                    <span className="truncate">{v.address}</span>
                  </div>
                  <AdminReviews venueId={v.id} adminKey={adminKey} onChanged={loadVenues} />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditing(v)}
                    className="font-body text-sm text-accent hover:text-accent-dark"
                  >
                    Редагувати
                  </button>
                  <button
                    onClick={() => handleDelete(v)}
                    className="font-body text-sm text-red-600 hover:text-red-800"
                  >
                    Видалити
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
