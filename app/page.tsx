"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type Term = {
  id: string;
  text: string;
  name: string;
  likes: number;
  created_at: string;
};

const LIKES_KEY = "prenup_likes";
const NAME_KEY = "prenup_name";

export default function Page() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [sort, setSort] = useState<"recent" | "liked">("recent");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load saved session data
  useEffect(() => {
    try {
      const savedName = localStorage.getItem(NAME_KEY);
      if (savedName) setName(savedName);
      const savedLikes = localStorage.getItem(LIKES_KEY);
      if (savedLikes) setLikedIds(new Set(JSON.parse(savedLikes) as string[]));
    } catch {}
  }, []);
  const persistLikes = (ids: Set<string>) => {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify([...ids])); } catch {}
  };
  const saveName = (v: string) => {
    setName(v);
    try { localStorage.setItem(NAME_KEY, v); } catch {}
  };

  const fetchTerms = async (s = sort) => {
    try {
      const res = await fetch(`/api/terms?sort=${s}`, { cache: "no-store" });
      const data = await res.json();
      setTerms(data.items ?? []);
    } catch (e) {
      console.error("Fetch terms error:", e);
      setTerms([]);
    }
  };
  useEffect(() => { fetchTerms(); }, []);
  useEffect(() => { fetchTerms(sort); }, [sort]);

  const submit = async () => {
    setError(null);
    const cleanText = text.trim();
    const cleanName = (name || "Anonymous").trim().slice(0, 40);
    if (cleanText.length < 5) { setError("Say a little more (≥ 5 characters)."); return; }

    try {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, name: cleanName || "Anonymous" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || "Could not submit"); return; }
      setText("");
      startTransition(() => fetchTerms(sort));
    } catch (e) {
      console.error("Submit error:", e);
      setError("Network error. Try again.");
    }
  };

  const toggleLike = async (id: string) => {
    if (busyId) return; // prevent double taps
    const already = likedIds.has(id);
    setBusyId(id);
    try {
      const res = await fetch(`/api/terms/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlike: already }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error("Like toggle failed:", j?.error || res.status);
        return;
      }
      const next = new Set(likedIds);
      already ? next.delete(id) : next.add(id);
      setLikedIds(next);
      persistLikes(next);
      startTransition(() => fetchTerms(sort));
    } catch (e) {
      console.error("Toggle like error:", e);
    } finally {
      setBusyId(null);
    }
  };

  // stable timestamp (no hydration mismatch)
  const fmt = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z";

  // UI helpers
  const headerGradient = useMemo(
    () => "bg-gradient-to-r from-amber-300/70 via-pink-300/60 to-purple-300/60",
    []
  );

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-5">
      {/* Hero */}
      <div className={`rounded-2xl ${headerGradient} p-[1px] shadow-sm`}>
        <div className="rounded-2xl bg-white/90 p-5">
          <h1 className="text-3xl font-extrabold tracking-tight">Nicky’s Silly Little Prenup</h1>
          <p className="mt-1 text-sm text-gray-600">
            <b>Add a term, like the best ones.</b>
          </p>
          <p className="mt-1 text-xs text-gray-600">
            <b>*NOT LEGALLY BINDING</b>
          </p>
        </div>
      </div>

      {/* Composer card */}
      <section className="rounded-2xl border bg-white/95 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="name" className="text-sm text-gray-600 w-16">Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="Anonymous"
            maxLength={40}
            className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <textarea
          className="w-full min-h-[110px] rounded-xl border p-3 text-[15px] leading-6 focus:outline-none focus:ring-2 focus:ring-purple-300"
          placeholder={`e.g., "Partner A must hold Partner B’s hand for a cumulative 3 days per month."`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <div className="h-5 text-sm text-red-600">{error}</div>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-xl border px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow hover:opacity-95 disabled:opacity-60"
          >
            Submit
          </button>
        </div>
      </section>

      {/* Sort chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Sort:</span>
        <button
          onClick={() => setSort("recent")}
          className={`rounded-full px-3 py-1.5 text-sm border transition ${
            sort === "recent" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Most Recent
        </button>
        <button
          onClick={() => setSort("liked")}
          className={`rounded-full px-3 py-1.5 text-sm border transition ${
            sort === "liked" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Most Liked
        </button>
      </div>

      {/* Feed */}
      <ul className="grid gap-3">
        {terms.length === 0 ? (
          <li className="rounded-2xl border p-5 text-sm text-gray-500 bg-white/95 shadow-sm">
            No terms yet. Be the first!
          </li>
        ) : (
          terms.map((t) => {
            const already = likedIds.has(t.id);
            const disabled = busyId === t.id;
            return (
              <li key={t.id} className="rounded-2xl border bg-white/95 shadow-sm p-5">
                <p className="whitespace-pre-wrap text-[15px] leading-6">{t.text}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {(t.name ? `${t.name} · ` : "") + fmt(t.created_at)}
                  </span>
                  <button
                    onClick={() => toggleLike(t.id)}
                    disabled={disabled}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      already
                        ? "bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                    aria-label={already ? "Unlike" : "Like"}
                    title={already ? "Unlike" : "Like"}
                  >
                    {already ? "💛 " : "👍 "} {t.likes}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <p className="pt-2 text-center text-xs text-gray-500">
        PG-13 vibes. This is for laughs, not legal advice.
      </p>
    </main>
  );
}
