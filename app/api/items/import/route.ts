import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Item from "@/models/Item";

export async function POST(req: Request) {
  await dbConnect();
  const { rows } = (await req.json()) as { rows: { code: string; name: string }[] };

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });

  // server-side strict re-check against DB (source of truth)
  const codes = rows.map((r) => String(r.code).trim());
  const clashes = await Item.find({ code: { $in: codes } })
    .select("code")
    .lean();
  if (clashes.length) {
    return NextResponse.json(
      {
        error: "Import blocked — some codes already exist.",
        details: clashes.map((c) => `Code "${c.code}" already exists in the system.`),
      },
      { status: 409 }
    );
  }

  try {
    const docs = rows.map((r) => ({
      code: String(r.code).trim(),
      name: String(r.name).trim(),
    }));
    const inserted = await Item.insertMany(docs, { ordered: true });
    return NextResponse.json({ inserted: inserted.length }, { status: 201 });
  } catch (e: any) {
    // unique-index guard (race / anything missed)
    if (e?.code === 11000)
      return NextResponse.json(
        { error: "Import blocked — duplicate code detected.", details: [String(e.message)] },
        { status: 409 }
      );
    throw e;
  }
}