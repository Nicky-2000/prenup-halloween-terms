"use client";

import { useEffect, useState, useTransition } from "react";

type Term = {
  id: string;
  text: string;
  name: string;
  green_flags: number;
  red_flags: number;
  created_at: string;
};

const NAME_KEY = "prenup_name";
const REACT_KEY = "prenup_flags"; // { [id]: "green" | "red" }

export default function Page() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [sort, setSort] = useState<"recent" | "green" | "red">("recent");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, "green" | "red">>({});
  const [isPending, startTransition] = useTransition();

  // Load saved name + reactions
  useEffect(() => {
    try {
      const savedName = localStorage.getItem(NAME_KEY);
      if (savedName) setName(savedName);
      const savedFlags = localStorage.getItem(REACT_KEY);
      if (savedFlags) setFlags(JSON.parse(savedFlags));
    } catch {}
  }, []);

  const saveName = (v: string) => {
    setName(v);
    try { localStorage.setItem(NAME_KEY, v); } catch {}
  };
  const persistFlags = (obj: Record<string, "green" | "red">) => {
    try { localStorage.setItem(REACT_KEY, JSON.stringify(obj)); } catch {}
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

  // Set to green, red, or clear (null) based on what was clicked
  const setFlag = async (id: string, target: "green" | "red") => {
    if (busyId) return;
    const prev = flags[id] ?? null;
    const next =
      prev === target ? null : target; // clicking same flag clears; clicking other switches

    setBusyId(id);
    try {
      await fetch(`/api/terms/${id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prev, next }),
      });

      const updated = { ...flags };
      if (next === null) delete updated[id];
      else updated[id] = next;
      setFlags(updated);
      persistFlags(updated);

      startTransition(() => fetchTerms(sort));
    } finally {
      setBusyId(null);
    }
  };

  // Pretty timestamp
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? "st" :
                   day === 2 || day === 22 ? "nd" :
                   day === 3 || day === 23 ? "rd" : "th";
    const h = d.getHours(), m = d.getMinutes().toString().padStart(2,"0");
    const hour12 = h % 12 || 12, ampm = h >= 12 ? "PM" : "AM";
    return `${month} ${day}${suffix}, ${hour12}:${m}${ampm}`;
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-200/70 via-amber-200/60 to-rose-200/60 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white/90 p-5">
          <h1 className="text-3xl font-extrabold tracking-tight">Nicky's Silly Little Prenup</h1>
          <p className="mt-1 text-sm text-gray-600">Add a term, Green-flag it ✅ or call out the sus 🚩</p>
          <p className="mt-1 text-xs text-gray-600"><b>NOT LEGALLY BINDING</b></p>

        </div>
      </div>

      {/* Composer */}
      <section className="rounded-2xl border bg-white/95 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="name" className="text-sm text-gray-600 w-16">Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="Anonymous"
            maxLength={40}
            className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <textarea
          className="w-full min-h-[110px] rounded-xl border p-3 text-[15px] leading-6 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          placeholder={`e.g., "No chipmunks during foreplay", "No scrolling TikTok during sex 😡",  "Must share french fries 🍟",  `}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <div className="h-5 text-sm text-red-600">{error}</div>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-xl border px-4 py-2 text-sm font-medium bg-emerald-600 text-white shadow hover:opacity-95 disabled:opacity-60"
          >
            Submit
          </button>
        </div>
      </section>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Sort:</span>
        <button
          onClick={() => setSort("recent")}
          className={`rounded-full px-3 py-1.5 text-sm border ${
            sort === "recent" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Most Recent
        </button>
        <button
          onClick={() => setSort("green")}
          className={`rounded-full px-3 py-1.5 text-sm border ${
            sort === "green" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Most Green Flags ✅
        </button>
        <button
          onClick={() => setSort("red")}
          className={`rounded-full px-3 py-1.5 text-sm border ${
            sort === "red" ? "bg-rose-600 text-white border-rose-600" : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Most 🚩
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
            const me = flags[t.id]; // "green" | "red" | undefined
            const busy = busyId === t.id;
            return (
              <li key={t.id} className="rounded-2xl border bg-white/95 shadow-sm p-5">
                <p className="whitespace-pre-wrap text-[15px] leading-6">{t.text}</p>

                <div className="mt-2 text-sm flex gap-4 text-gray-600">
                  <span>✅ {t.green_flags}</span>
                  <span>🚩 {t.red_flags}</span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {(t.name ? `Submitted By: ${t.name} · ` : "") + fmt(t.created_at)}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setFlag(t.id, "green")}
                      disabled={busy}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        me === "green"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      } ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
                      title={me === "green" ? "Clear green flag" : "Mark green flag"}
                    >
                      ✅
                    </button>

                    <button
                      onClick={() => setFlag(t.id, "red")}
                      disabled={busy}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        me === "red"
                          ? "bg-rose-50 border-rose-300 text-rose-700"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      } ${busy ? "opacity-60 cursor-not-allowed" : ""}`}
                      title={me === "red" ? "Clear red flag" : "Mark red flag"}
                    >
                      🚩
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <p className="pt-2 text-center text-xs text-gray-500">
        ⚠️ This is not legal advice.
      </p>
    </main>
  );
}
