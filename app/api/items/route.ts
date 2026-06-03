import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Item from "@/models/Item";

export async function GET() {
  await dbConnect();
  const items = await Item.find().sort({ code: 1 }).lean();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await dbConnect();
  const { code, name } = await req.json();
  const c = String(code ?? "").trim();
  const n = String(name ?? "").trim();

  if (!c) return NextResponse.json({ error: "Code is required." }, { status: 400 });
  if (!n) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const exists = await Item.findOne({ code: c }).lean();
  if (exists)
    return NextResponse.json(
      { error: `Code "${c}" already exists in the system.` },
      { status: 409 }
    );

  const item = await Item.create({ code: c, name: n });
  return NextResponse.json(item, { status: 201 });
}