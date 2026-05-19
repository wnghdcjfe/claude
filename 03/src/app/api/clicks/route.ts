import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const docs = await db
    .collection<{ href: string; count: number }>("clicks")
    .find({}, { projection: { _id: 0, href: 1, count: 1 } })
    .toArray();

  const counts: Record<string, number> = {};
  for (const doc of docs) {
    counts[doc.href] = doc.count;
  }
  return NextResponse.json({ counts });
}

export async function POST(request: Request) {
  const { href } = (await request.json()) as { href?: string };
  if (!href || typeof href !== "string") {
    return NextResponse.json({ error: "href is required" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db
    .collection<{ href: string; count: number }>("clicks")
    .findOneAndUpdate(
      { href },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" }
    );

  return NextResponse.json({ href, count: result?.count ?? 1 });
}
