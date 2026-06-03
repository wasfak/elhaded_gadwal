import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Item from "@/models/Item";

export async function GET(req: Request) {
  await dbConnect();
  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ found: false });

  const item = await Item.findOne({ code, active: { $ne: false } }).lean<{ code: string; name: string }>();
  if (!item) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, name: item.name });
}