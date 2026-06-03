import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Submission from "@/models/Submission";
import Item from "@/models/Item";
import Branch from "@/models/Branch";

export async function POST(req: Request) {
  await dbConnect();
  const { code, quantity, branchId, photos } = await req.json();

  const c = String(code ?? "").trim();
  const qty = Number(quantity);

  if (!c) return NextResponse.json({ error: "Code is required." }, { status: 400 });
  if (!Number.isFinite(qty) || qty <= 0)
    return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
  if (!branchId)
    return NextResponse.json({ error: "Branch is required." }, { status: 400 });
  if (!Array.isArray(photos) || photos.length < 2)
    return NextResponse.json({ error: "At least 2 photos are required." }, { status: 400 });

  // resolve + snapshot item and branch from the DB (don't trust client names)
  const item = await Item.findOne({ code: c }).lean<{ code: string; name: string }>();
  if (!item)
    return NextResponse.json({ error: `Code "${c}" not found.` }, { status: 404 });

  const branch = await Branch.findById(branchId).lean<{ _id: any; name: string }>();
  if (!branch)
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });

  const doc = await Submission.create({
    code: item.code,
    itemName: item.name,
    quantity: qty,
    branchId: branch._id,
    branchName: branch.name,
    photos: photos.map((p: any) => ({ fullKey: String(p.fullKey) })),
  });

  return NextResponse.json(doc, { status: 201 });
}

export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  
  const q: Record<string, any> = {};
  const code = searchParams.get("code");
  const branchId = searchParams.get("branchId");
  const name = searchParams.get("name");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  if (status === "sent") q.status = "sent";
  else if (status === "not_sent") q.status = { $ne: "sent" }; // missing or "not_sent"
  if (code) q.code = code.trim();
  if (branchId) q.branchId = branchId;
  if (name) q.itemName = { $regex: name.trim(), $options: "i" };
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999); // include the whole "to" day
      q.createdAt.$lte = end;
    }
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const skip = Number(searchParams.get("skip") ?? 0);

  const [rows, total] = await Promise.all([
    Submission.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Submission.countDocuments(q),
  ]);

  return NextResponse.json({ rows, total });
}