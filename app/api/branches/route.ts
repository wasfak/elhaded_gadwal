import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";

export async function GET() {
  await dbConnect();
  const branches = await Branch.find().sort({ name: 1 }).lean();
  return NextResponse.json(branches);
}

export async function POST(req: Request) {
  await dbConnect();
  const { name } = await req.json();
  const n = String(name ?? "").trim();

  if (!n) return NextResponse.json({ error: "Branch name is required." }, { status: 400 });

  // case-insensitive existence check
  const exists = await Branch.findOne({
    name: { $regex: `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  }).lean();
  if (exists)
    return NextResponse.json(
      { error: `Branch "${n}" already exists in the system.` },
      { status: 409 }
    );

  const branch = await Branch.create({ name: n });
  return NextResponse.json(branch, { status: 201 });
}