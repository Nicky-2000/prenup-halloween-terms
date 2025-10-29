// lib/db.ts
import { neon } from "@neondatabase/serverless";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const sql = neon(process.env.DATABASE_URL);

export const db = {
  list: async (sort: "recent" | "liked") => {
    const order =
      sort === "liked"
        ? "ORDER BY likes DESC, created_at DESC"
        : "ORDER BY created_at DESC";
    const rows = await sql<{ id: string; text: string; name: string; likes: number; created_at: string; }[]>`
      SELECT id, text, name, likes, created_at
      FROM terms
      ${sql.unsafe(order)}
      LIMIT 200
    `;
    return rows;
  },

  create: async (text: string, name: string) => {
    const rows = await sql<{ id: string; text: string; name: string; likes: number; created_at: string; }[]>`
      INSERT INTO terms (text, name)
      VALUES (${text}, ${name})
      RETURNING id, text, name, likes, created_at
    `;
    return rows[0];
  },


  like: async (id: string) => {
    const rows = await sql<{ id: string; text: string; name: string; likes: number; created_at: string; }[]>`
      UPDATE terms
      SET likes = likes + 1
      WHERE id = ${id}
      RETURNING id, text, name, likes, created_at
    `;
    return rows[0];
  },

  unlike: async (id: string) => {
    const rows = await sql<{ id: string; text: string; name: string; likes: number; created_at: string; }[]>`
      UPDATE terms
      SET likes = GREATEST(likes - 1, 0)
      WHERE id = ${id}
      RETURNING id, text, name, likes, created_at
    `;
    return rows[0];
  },

  canSubmit: async (ip: string) => {
    await sql`INSERT INTO submit_log (ip) VALUES (${ip})`;
    const rows = await sql<{ c: number }[]>`
      SELECT count(*)::int AS c
      FROM submit_log
      WHERE ip = ${ip} AND created_at > now() - interval '10 seconds'
    `;
    return rows[0].c <= 1;
  }
};
