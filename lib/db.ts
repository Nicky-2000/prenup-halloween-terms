// lib/db.ts
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local");
}

const sql = neon(process.env.DATABASE_URL);

export type TermRow = {
  id: string;
  text: string;
  name: string;
  green_flags: number;
  red_flags: number;
  created_at: string;
};

export const db = {
  list: async (sort: "recent" | "green" | "red") => {
    const order =
      sort === "green"
        ? "ORDER BY green_flags DESC, created_at DESC"
        : sort === "red"
        ? "ORDER BY red_flags DESC, created_at DESC"
        : "ORDER BY created_at DESC";

    const rows = (await sql`
      SELECT id, text, name, green_flags, red_flags, created_at
      FROM terms
      ${sql.unsafe(order)}
      LIMIT 200
    `) as TermRow[];

    return rows;
  },

  create: async (text: string, name: string) => {
    const rows = (await sql`
      INSERT INTO terms (text, name)
      VALUES (${text}, ${name})
      RETURNING id, text, name, green_flags, red_flags, created_at
    `) as TermRow[];
    return rows[0];
  },

  // toggle flag counters: prev ∈ ('green'|'red'|null), next ∈ ('green'|'red'|null)
  updateFlag: async (id: string, prev: "green" | "red" | null, next: "green" | "red" | null) => {
    const updates: string[] = [];
    if (prev === "green") updates.push(`green_flags = GREATEST(green_flags - 1, 0)`);
    if (prev === "red")   updates.push(`red_flags   = GREATEST(red_flags   - 1, 0)`);
    if (next === "green") updates.push(`green_flags = green_flags + 1`);
    if (next === "red")   updates.push(`red_flags   = red_flags + 1`);

    if (updates.length === 0) {
      const rows = (await sql`
        SELECT id, text, name, green_flags, red_flags, created_at
        FROM terms
        WHERE id = ${id}
      `) as TermRow[];
      return rows[0];
    }

    const rows = (await sql`
      UPDATE terms
      SET ${sql.unsafe(updates.join(", "))}
      WHERE id = ${id}
      RETURNING id, text, name, green_flags, red_flags, created_at
    `) as TermRow[];
    return rows[0];
  },

  // ≤1 submission per 10s per IP
  canSubmit: async (ip: string) => {
    await sql`INSERT INTO submit_log (ip) VALUES (${ip})`;
    const rows = (await sql`
      SELECT count(*)::int AS c
      FROM submit_log
      WHERE ip = ${ip} AND created_at > now() - interval '10 seconds'
    `) as { c: number }[];
    return (rows[0]?.c ?? 0) <= 1;
  },
};
