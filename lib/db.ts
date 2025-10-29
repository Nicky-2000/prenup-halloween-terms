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
  likes: number;
  created_at: string;
};

export const db = {
  list: async (sort: "recent" | "liked") => {
    const order =
      sort === "liked"
        ? "ORDER BY likes DESC, created_at DESC"
        : "ORDER BY created_at DESC";

    const rows = (await sql`
      SELECT id, text, name, likes, created_at
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
      RETURNING id, text, name, likes, created_at
    `) as TermRow[];

    return rows[0];
  },

  like: async (id: string) => {
    const rows = (await sql`
      UPDATE terms
      SET likes = likes + 1
      WHERE id = ${id}
      RETURNING id, text, name, likes, created_at
    `) as TermRow[];

    return rows[0];
  },

  unlike: async (id: string) => {
    const rows = (await sql`
      UPDATE terms
      SET likes = GREATEST(likes - 1, 0)
      WHERE id = ${id}
      RETURNING id, text, name, likes, created_at
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
