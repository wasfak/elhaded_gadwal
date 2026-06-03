import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";

export async function POST(req: Request) {
  await dbConnect();
  const { rows } = (await req.json()) as { rows: { name: string }[] };

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });

  const names = rows.map((r) => String(r.name).trim());

  // case-insensitive clash check against DB
  const existing = await Branch.find({}).select("name").lean();
  const existingLower = new Set(existing.map((b) => b.name.toLowerCase()));
  const clashes = names.filter((n) => existingLower.has(n.toLowerCase()));
  if (clashes.length) {
    return NextResponse.json(
      {
        error: "Import blocked — some branches already exist.",
        details: clashes.map((n) => `Branch "${n}" already exists in the system.`),
      },
      { status: 409 }
    );
  }

  try {
    const inserted = await Branch.insertMany(
      names.map((name) => ({ name })),
      { ordered: true }
    );
    return NextResponse.json({ inserted: inserted.length }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000)
      return NextResponse.json(
        { error: "Import blocked — duplicate branch detected.", details: [String(e.message)] },
        { status: 409 }
      );
    throw e;
  }
}