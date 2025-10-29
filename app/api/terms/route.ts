import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  text: z.string().min(5).max(300),
  name: z.string().trim().min(1).max(40).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const s = (req.nextUrl.searchParams.get("sort") ?? "recent") as "recent" | "green" | "red";
    const items = await db.list(s);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/terms failed:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (req as any).ip || "unknown";

    if (!(await db.canSubmit(ip))) {
      return NextResponse.json({ error: "Too many submissions—try again in a few seconds." }, { status: 429 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Text must be 5–300 chars; name ≤ 40." }, { status: 400 });
    }

    const text = parsed.data.text.trim();
    const name = (parsed.data.name ?? "Anonymous").trim() || "Anonymous";
    const item = await db.create(text, name);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error("POST /api/terms failed:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
