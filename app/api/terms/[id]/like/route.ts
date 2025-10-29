// app/api/terms/[id]/like/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type LikeParams = { id: string };

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<LikeParams> }
) {
  try {
    const { id } = await ctx.params;
    let unlike = false;
    try {
      const body = await req.json();
      unlike = Boolean(body?.unlike);
    } catch { /* no body sent = like */ }

    const item = unlike ? await db.unlike(id) : await db.like(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("POST /api/terms/[id]/like failed:", err);
    return NextResponse.json({ error: "Failed to like" }, { status: 500 });
  }
}
