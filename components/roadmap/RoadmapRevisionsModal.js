"use client";

import { useEffect, useState } from "react";

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function RoadmapRevisionsModal({ open, onClose, apiBase, onRestore }) {
  const [tab, setTab] = useState("revisions");
  const [revisions, setRevisions] = useState([]);
  const [dailyBackups, setDailyBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [open, apiBase]);

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiBase);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Geçmiş yüklenemedi");
      setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
      setDailyBackups(Array.isArray(data.daily_backups) ? data.daily_backups : []);
    } catch (err) {
      setError(err?.message || "Geçmiş yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(source, id) {
    if (restoringId) return;
    if (!window.confirm("Bu versiyon geri yüklensin mi? Mevcut canvas önce yedeklenir.")) return;

    setRestoringId(id);
    setError("");
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Geri yüklenemedi");
      onRestore(data);
      onClose();
    } catch (err) {
      setError(err?.message || "Geri yüklenemedi");
    } finally {
      setRestoringId(null);
    }
  }

  if (!open) return null;

  const list = tab === "revisions" ? revisions : dailyBackups;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-revisions-title"
        className="flex h-[75vh] w-[92vw] max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:w-[28rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 id="roadmap-revisions-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Geçmiş
            </h2>
            <p className="text-xs text-zinc-500">Son 20 kayıt + günlük ilk versiyonlar</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-zinc-100 p-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setTab("revisions")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === "revisions"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Son kayıtlar ({revisions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("daily")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === "daily"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Günlük yedekler ({dailyBackups.length})
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-400">Yükleniyor…</p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {tab === "revisions"
                ? "Henüz kayıtlı revizyon yok. Canvas kaydedildikçe burada görünür."
                : "Henüz günlük yedek yok."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tab === "revisions"
                ? revisions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={restoringId === item.id}
                        onClick={() => handleRestore("revision", item.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {formatDateTime(item.created_at)}
                          </p>
                          <p className="text-xs text-zinc-500">{item.node_count} node</p>
                        </div>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {restoringId === item.id ? "…" : "Geri yükle"}
                        </span>
                      </button>
                    </li>
                  ))
                : dailyBackups.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={restoringId === item.id}
                        onClick={() => handleRestore("daily", item.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {formatDate(item.backup_date)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Günün ilk kaydı · {item.node_count} node
                          </p>
                        </div>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {restoringId === item.id ? "…" : "Geri yükle"}
                        </span>
                      </button>
                    </li>
                  ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
