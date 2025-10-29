import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { id: string };

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { id } = await ctx.params;
    const { prev, next } = await req.json(); // prev/next ∈ "green" | "red" | null
    const item = await db.updateFlag(id, prev ?? null, next ?? null);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("Flag toggle failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
